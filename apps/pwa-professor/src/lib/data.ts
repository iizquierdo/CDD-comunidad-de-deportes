import { api } from "./api";
import type {
  AuthUser,
  CommunityDetail,
  CommunityPost,
  CommunityPostComment,
  Community,
  GlobalSettings,
  Role,
  StudentConversation,
  StudentReport,
  StudentSummary,
  ProfessorClass,
  ClassScheduleSlot,
  Discipline,
  DisciplineLevel
} from "../types";

const splitName = (full?: string | null): { firstName: string; lastName: string } => {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const ROLE_MAP: Record<string, Role> = {
  "super admin": "SUPER_ADMIN",
  administrator: "SUPER_ADMIN",
  admin: "SUPER_ADMIN",
  "admin sede": "ADMIN_SEDE",
  profesor: "PROFESOR",
  tutor: "TUTOR"
};

export const mapAuthUser = (raw: unknown): AuthUser => {
  const r = raw as Record<string, unknown>;
  const roleName = String((r?.roleRef as Record<string, unknown>)?.name || r?.role || "").trim().toLowerCase();
  const fromName = splitName(r?.name as string | null);
  return {
    id: String(r?.id || ""),
    email: String(r?.email || ""),
    firstName: (r?.firstName as string) || fromName.firstName,
    lastName: (r?.lastName as string) || fromName.lastName,
    role: ROLE_MAP[roleName] || "PROFESOR",
    avatarUrl: (r?.avatar as string | null) ?? (r?.avatarUrl as string | null) ?? null
  };
};

// ---- Discipline/level catalog (cached) ------------------------------------
interface CatalogLevel { id: string; name: string; levelOrder: number }
interface CatalogDiscipline { id: string; name: string; levels: CatalogLevel[] }

let catalogPromise: Promise<CatalogDiscipline[]> | null = null;
const getCatalog = (): Promise<CatalogDiscipline[]> => {
  if (!catalogPromise) {
    catalogPromise = api
      .get<{ disciplines?: CatalogDiscipline[] }>("/students/meta")
      .then((r) => r.data?.disciplines ?? [])
      .catch(() => []);
  }
  return catalogPromise;
};

const mapStudentSummary = (raw: Record<string, unknown>, catalog: CatalogDiscipline[]): StudentSummary => ({
  id: String(raw.id),
  firstName: (raw.firstName as string) || "",
  lastName: (raw.lastName as string) || "",
  status: raw.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  sede: raw.companyId ? { id: String(raw.companyId), name: (raw.companyName as string) || "Sede" } : null,
  disciplines: Array.isArray(raw.disciplines)
    ? (raw.disciplines as Record<string, unknown>[]).map((d) => {
        const disc = catalog.find((c) => c.id === d.disciplineId);
        const lvl = disc?.levels.find((l) => l.id === d.levelId);
        return {
          id: String(d.id),
          status: d.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          discipline: { id: String(d.disciplineId), name: disc?.name || "Disciplina", active: true },
          level: lvl ? { id: lvl.id, name: lvl.name, levelOrder: lvl.levelOrder, active: true } : null
        };
      })
    : []
});

/** Students visible to the logged-in professor. */
export const fetchStudents = async (): Promise<StudentSummary[]> => {
  const [{ data: list }, catalog] = await Promise.all([
    api.get<Record<string, unknown>[]>("/students"),
    getCatalog()
  ]);
  const rows = Array.isArray(list) ? list : [];
  return Promise.all(
    rows.map((row) =>
      api
        .get<Record<string, unknown>>(`/students/${String(row.id)}`)
        .then((r) => mapStudentSummary(r.data, catalog))
        .catch(() => mapStudentSummary(row, catalog))
    )
  );
};

/** Classes assigned to the logged-in professor. */
export const fetchMyClasses = async (): Promise<ProfessorClass[]> => {
  const { data } = await api.get<Record<string, unknown>[]>("/classes");
  const rows = Array.isArray(data) ? data : [];
  return rows.map((c) => {
    const disc = c.discipline as Record<string, unknown> | null;
    const lvl = c.level as Record<string, unknown> | null;
    return {
      id: String(c.id),
      name: (c.name as string) || (disc?.name as string) || "Clase",
      discipline: {
        id: String(disc?.id || c.disciplineId || ""),
        name: (disc?.name as string) || "Disciplina",
        active: true
      } as Discipline,
      level: lvl
        ? ({
            id: String(lvl.id),
            name: (lvl.name as string) || "",
            levelOrder: (lvl.levelOrder as number) || 0,
            active: true
          } as DisciplineLevel)
        : null,
      schedule: (c.schedule as string) || (c.scheduleName as string) || "",
      room: (c.room as string) || null,
      studentCount: (c.studentCount as number) || (c._count as Record<string, unknown>)?.students as number || 0,
      sede: c.companyId
        ? { id: String(c.companyId), name: (c.companyName as string) || "Sede" }
        : null,
      schedules: Array.isArray(c.schedules)
        ? (c.schedules as Record<string, unknown>[]).map((s): ClassScheduleSlot => ({
            dayOfWeek: Number(s.dayOfWeek),
            startTime: String(s.startTime || ""),
            endTime: String(s.endTime || "")
          }))
        : undefined
    };
  });
};

/** Students enrolled in a specific class. */
export const fetchClassStudents = async (classId: string): Promise<StudentSummary[]> => {
  const [{ data }, catalog] = await Promise.all([
    api.get<Record<string, unknown>[]>(`/classes/${classId}/students`),
    getCatalog()
  ]);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => mapStudentSummary(row, catalog));
};

export const fetchReports = async (studentId: string): Promise<StudentReport[]> => {
  const { data } = await api.get<Record<string, unknown>[]>(`/students/${studentId}/reports`);
  return (Array.isArray(data) ? data : []).map((r) => ({
    ...(r as object),
    author: { id: String(r.authorId || ""), ...splitName(r.authorName as string | null) },
    recipients: []
  } as StudentReport));
};

export const createReport = async (
  studentId: string,
  payload: { type: string; title: string; content: string; summary?: string; status: string }
): Promise<StudentReport> => {
  const { data } = await api.post<Record<string, unknown>>(`/students/${studentId}/reports`, payload);
  return {
    ...(data as object),
    author: { id: String(data.authorId || ""), ...splitName(data.authorName as string | null) },
    recipients: []
  } as StudentReport;
};

export const fetchConversations = async (studentId: string): Promise<StudentConversation[]> => {
  const { data: list } = await api.get<Record<string, unknown>[]>(`/students/${studentId}/conversations`);
  const rows = Array.isArray(list) ? list : [];
  return Promise.all(
    rows.map(async (row) => {
      const { data } = await api.get<Record<string, unknown>>(`/students/conversations/${String(row.id)}`);
      return {
        id: String(data.id),
        studentId,
        subject: (data.subject ?? row.subject) as string | null,
        status: (data.status || row.status || "OPEN") as string,
        createdAt: (data.createdAt ?? row.createdAt) as string | undefined,
        updatedAt: (data.updatedAt ?? row.updatedAt) as string | undefined,
        participants: ((data.participants || []) as Record<string, unknown>[]).map((p) => ({
          id: String(p.id),
          conversationId: String(data.id),
          userId: String(p.userId),
          active: Boolean(p.active),
          user: { id: String(p.userId), ...splitName(p.userName as string | null) }
        })),
        messages: ((data.messages || []) as Record<string, unknown>[]).map((m) => ({
          id: String(m.id),
          conversationId: String(data.id),
          senderId: String(m.senderId),
          body: (m.body as string) || "",
          createdAt: m.createdAt as string,
          sender: { id: String(m.senderId), ...splitName(m.senderName as string | null) },
          attachments: []
        }))
      } as StudentConversation;
    })
  );
};

export const sendConversationMessage = async (conversationId: string, body: string): Promise<void> => {
  await api.post(`/students/conversations/${conversationId}/messages`, { body });
};

const mapCommunityDetail = (community: Community, members: Record<string, unknown>[], posts: Record<string, unknown>[]): import("../types").CommunityDetail => ({
  ...community,
  members: (members || []).map((m) => ({
    id: String(m.id),
    active: Boolean(m.active),
    student: { id: String(m.studentId), firstName: (m.firstName as string) || "", lastName: (m.lastName as string) || "" }
  })),
  posts: (posts || []).map((p) => ({
    id: String(p.id),
    communityId: String(community.id),
    title: (p.title as string) || "",
    content: (p.content as string) || "",
    coverUrl: (p.coverUrl as string) ?? null,
    status: (p.status as CommunityPost["status"]) || "PUBLISHED",
    membersOnly: Boolean(p.membersOnly),
    publishedAt: (p.publishedAt as string) ?? null,
    createdAt: p.createdAt as string | undefined,
    author: { id: String(p.authorId || ""), ...splitName(p.authorName as string | null) },
    likesCount: (p.likesCount as number) ?? 0,
    commentsCount: (p.commentsCount as number) ?? 0,
    likedByMe: Boolean(p.likedByMe),
    attachments: []
  }))
});

export const fetchCommunities = async (): Promise<CommunityDetail[]> => {
  const { data: list } = await api.get<Record<string, unknown>[]>("/communities");
  const rows = Array.isArray(list) ? list : [];
  return Promise.all(
    rows.map(async (c) => {
      const [members, posts] = await Promise.all([
        api.get<Record<string, unknown>[]>(`/communities/${String(c.id)}/members`).then((r) => r.data).catch(() => []),
        api.get<Record<string, unknown>[]>(`/communities/${String(c.id)}/posts`).then((r) => r.data).catch(() => [])
      ]);
      return mapCommunityDetail(c as Community, members, posts);
    })
  );
};

export const fetchPostComments = async (
  communityId: string,
  postId: string
): Promise<CommunityPostComment[]> => {
  const { data } = await api.get<CommunityPostComment[]>(
    `/communities/${communityId}/posts/${postId}/comments`
  );
  return Array.isArray(data) ? data : [];
};

export const createPostComment = async (
  communityId: string,
  postId: string,
  content: string
): Promise<CommunityPostComment> => {
  const { data } = await api.post<CommunityPostComment>(
    `/communities/${communityId}/posts/${postId}/comments`,
    { content }
  );
  return data;
};

export const deletePostComment = async (
  communityId: string,
  postId: string,
  commentId: string
): Promise<void> => {
  await api.delete(`/communities/${communityId}/posts/${postId}/comments/${commentId}`);
};

export const uploadFile = async (
  file: File,
  sourceModule: string,
  sourceId: string
): Promise<string> => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sourceModule", sourceModule);
  fd.append("sourceId", sourceId);
  const { data } = await api.post<{ fileUrl: string }>("/public/files/upload", fd);
  return String(data?.fileUrl || "");
};

export const togglePostLike = async (
  communityId: string,
  postId: string
): Promise<{ liked: boolean; count: number }> => {
  const { data } = await api.post<{ liked: boolean; count: number }>(
    `/communities/${communityId}/posts/${postId}/like`
  );
  return data;
};

export const createCommunityPost = async (
  communityId: string,
  payload: {
    title: string;
    content: string;
    status: string;
    coverUrl?: string | null;
    membersOnly?: boolean;
  }
): Promise<{ id: string }> => {
  const { data } = await api.post<{ id: string }>(`/communities/${communityId}/posts`, payload);
  return { id: String(data?.id || "") };
};

export const fetchWeeklyAttendance = async (
  classIds: string[]
): Promise<{ rate: number | null; present: number; total: number }> => {
  if (!classIds.length) return { rate: null, present: 0, total: 0 };

  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const from = monday.toISOString().split("T")[0];
  const to = now.toISOString().split("T")[0];

  let totalPresent = 0;
  let totalRecords = 0;

  await Promise.all(
    classIds.map(async (id) => {
      try {
        const { data } = await api.get<{ studentId: string; date: string; present: boolean }[]>(
          `/classes/${id}/attendance?from=${from}&to=${to}`
        );
        if (Array.isArray(data)) {
          totalPresent += data.filter((r) => r.present).length;
          totalRecords += data.length;
        }
      } catch {
        // ignore per-class errors
      }
    })
  );

  if (totalRecords === 0) return { rate: null, present: 0, total: 0 };
  return { rate: Math.round((totalPresent / totalRecords) * 100), present: totalPresent, total: totalRecords };
};

export const fetchPublicBranding = async (): Promise<GlobalSettings | null> => {
  try {
    const { data } = await api.get<Record<string, unknown>>("/public/core");
    if (!data) return null;
    return {
      id: 1,
      appName: (data.appName as string) || "Natación",
      logoUrl: (data.logoUrl ?? data.sidebarLogoUrl) as string | null ?? null,
      isologoUrl: (data.isologoUrl as string | null) ?? null,
      loginBackgroundUrl: (data.loginBackgroundUrl as string | null) ?? null,
      primaryColor: (data.primaryColor as string) || "#00666d",
      secondaryColor: (data.secondaryColor as string) || "#874e00",
      accentColor: (data.accentColor ?? data.secondaryColor) as string || "#006b1b"
    };
  } catch {
    return null;
  }
};
