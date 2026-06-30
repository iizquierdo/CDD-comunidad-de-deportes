import { useEffect, useRef, useState } from "react";
import { CustomSelect, type SelectOption } from "../components/CustomSelect";
import { MaterialIcon } from "../components/MaterialIcon";
import { useAuth } from "../context/AuthContext";
import { useStudents } from "../context/StudentContext";
import { extractErrorMessage } from "../lib/api";
import {
  createPostComment,
  deletePostComment,
  fetchCommunities,
  fetchPostComments,
  togglePostLike,
  updatePostComment
} from "../lib/data";
import { resolveMediaUrl } from "../lib/media";
import type { CommunityDetail, CommunityPost, CommunityPostComment, UserRef } from "../types";

const isImageUrl = (v: string) =>
  [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].some((e) =>
    v.split("?")[0].toLowerCase().endsWith(e)
  );

const isVideoUrl = (v: string) =>
  [".mp4", ".webm", ".mov", ".m3u8"].some((e) =>
    v.split("?")[0].toLowerCase().endsWith(e)
  );

const getMediaAttachment = (post: CommunityPost) => {
  const cover = resolveMediaUrl(post.coverUrl);
  if (cover) {
    if (isImageUrl(cover)) return { url: cover, kind: "image" as const };
    if (isVideoUrl(cover)) return { url: cover, kind: "video" as const };
  }
  const att = post.attachments.find(
    (a) =>
      a.mimeType?.startsWith("image/") ||
      a.mimeType?.startsWith("video/") ||
      isImageUrl(a.fileUrl) ||
      isVideoUrl(a.fileUrl)
  );
  if (!att) return null;
  const url = resolveMediaUrl(att.fileUrl) ?? att.fileUrl;
  return {
    url,
    kind: (att.mimeType?.startsWith("video/") || isVideoUrl(url) ? "video" : "image") as
      | "image"
      | "video"
  };
};

const getDocAttachments = (post: CommunityPost) =>
  post.attachments.filter(
    (a) =>
      !a.mimeType?.startsWith("image/") &&
      !a.mimeType?.startsWith("video/") &&
      !isImageUrl(a.fileUrl) &&
      !isVideoUrl(a.fileUrl)
  );

const relativeTime = (iso?: string | null): string => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora mismo";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return `hace ${Math.floor(d / 7)} sem`;
};

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(d);
    const time = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
    return `${date}, ${time} (${relativeTime(iso)})`;
  } catch {
    return "";
  }
};

const initials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

interface AvatarProps {
  user: Pick<UserRef, "firstName" | "lastName" | "avatarUrl">;
  size?: "sm" | "md";
}

const Avatar = ({ user, size = "md" }: AvatarProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";
  const src = resolveMediaUrl(user.avatarUrl);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={`${user.firstName} ${user.lastName}`}
        onError={() => setImgFailed(true)}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-[var(--primary-softer)] font-bold text-[var(--primary)]`}
    >
      {initials(user.firstName, user.lastName)}
    </div>
  );
};

const commentDisplayName = (c: CommunityPostComment) => {
  if (c.firstName || c.lastName) return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return c.authorName ?? "Usuario";
};

interface PostCardProps {
  post: CommunityPost;
  onToggleLike: (postId: string, communityId: string) => Promise<void>;
  currentUser: { id?: string; firstName: string; lastName: string; avatarUrl?: string | null };
}

const CONTENT_THRESHOLD = 240;

const PostCard = ({ post, onToggleLike, currentUser }: PostCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityPostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const media = getMediaAttachment(post);
  const docs = getDocAttachments(post);
  const isLong = post.content.length > CONTENT_THRESHOLD;
  const liked = post.likedByMe ?? false;
  const likeCount = post.likesCount ?? 0;
  const body = post.content.trim();
  const title = post.title.trim();
  const firstLine = body.split("\n")[0]?.trim() ?? "";
  const titleDuplicatesFirstLine = Boolean(
    title &&
      firstLine &&
      (title === body || title === firstLine || firstLine.startsWith(title) || title.startsWith(firstLine))
  );
  const distinctTitle = Boolean(title && !titleDuplicatesFirstLine);

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setCommentsLoading(true);
      try {
        const data = await fetchPostComments(post.communityId, post.id);
        setComments(data);
      } catch {
        // leave empty
      } finally {
        setCommentsLoading(false);
        setTimeout(() => commentInputRef.current?.focus(), 100);
      }
    } else if (next) {
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditText("");
    }
    try {
      await deletePostComment(post.communityId, post.id, commentId);
    } catch {
      // ignore
    }
  };

  const startEditComment = (comment: CommunityPostComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
    setTimeout(() => editInputRef.current?.focus(), 60);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId || !editText.trim() || savingEdit) return;
    setSavingEdit(true);
    const trimmed = editText.trim();
    setComments((prev) =>
      prev.map((c) => (c.id === editingCommentId ? { ...c, content: trimmed } : c))
    );
    const commentId = editingCommentId;
    setEditingCommentId(null);
    setEditText("");
    try {
      const updated = await updatePostComment(post.communityId, post.id, commentId, trimmed);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    } catch {
      // keep optimistic text
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    setCommentError(null);
    const content = commentText.trim();
    const optimistic: CommunityPostComment = {
      id: `opt-${Date.now()}`,
      postId: post.id,
      content,
      createdAt: new Date().toISOString(),
      authorId: currentUser.id || "me",
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      avatarUrl: currentUser.avatarUrl ?? null
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentText("");
    try {
      const created = await createPostComment(post.communityId, post.id, content);
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? created : c)));
    } catch (e) {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setCommentText(content);
      setCommentError(extractErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgb(0,0,0,0.06)]">
      <div className="flex items-center gap-2.5 px-3.5 pb-2 pt-3.5">
        <Avatar user={post.author} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-none text-slate-900">
            {post.author.firstName} {post.author.lastName}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
            {formatDateTime(post.publishedAt ?? post.createdAt)}
            {post.membersOnly && (
              <span className="inline-flex items-center gap-0.5 text-violet-500">
                <MaterialIcon name="lock" className="text-[10px]" />
                Solo miembros
              </span>
            )}
          </p>
        </div>
      </div>

      {distinctTitle && (
        <p className="px-3.5 pb-1 text-[13px] font-bold leading-snug text-slate-900">{title}</p>
      )}

      <div className="px-3.5 pb-2.5">
        {body &&
          (expanded || !isLong ? (
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-600">{body}</p>
          ) : (
            <p className="line-clamp-3 text-[13px] leading-relaxed text-slate-600">
              {body.replace(/\n/g, " ")}
            </p>
          ))}
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 text-[11px] font-semibold text-[var(--primary)]"
          >
            {expanded ? "Ver menos" : "Ver más"}
          </button>
        )}
      </div>

      {media && (
        <div className="mx-3 mb-2.5 overflow-hidden rounded-xl bg-slate-100">
          {media.kind === "image" ? (
            <img
              src={media.url}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="w-full max-h-64 object-cover"
            />
          ) : (
            <video src={media.url} controls className="w-full max-h-64 bg-black" />
          )}
        </div>
      )}

      {docs.length > 0 && (
        <div className="mx-3 mb-2.5 space-y-1.5">
          {docs.map((att, i) => (
            <a
              key={i}
              href={resolveMediaUrl(att.fileUrl) ?? att.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-100"
            >
              <MaterialIcon name="description" className="text-sm text-slate-400" />
              <span className="truncate">{att.fileName}</span>
              <MaterialIcon name="download" className="ml-auto shrink-0 text-sm text-slate-400" />
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center border-t border-slate-50 px-2 py-1">
        <button
          type="button"
          onClick={() => void onToggleLike(post.id, post.communityId)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
            liked ? "bg-red-50 text-red-500" : "text-slate-400 hover:bg-slate-50 hover:text-red-400"
          }`}
        >
          <MaterialIcon name="favorite" filled={liked} className="text-sm" />
          <span>{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
            showComments
              ? "bg-[var(--primary-softer)] text-[var(--primary)]"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          }`}
        >
          <MaterialIcon
            name={showComments ? "chat_bubble" : "chat_bubble_outline"}
            filled={showComments}
            className="text-sm"
          />
          <span>
            {comments.length > 0
              ? comments.length
              : (post.commentsCount ?? 0) > 0
                ? post.commentsCount
                : "Comentar"}
          </span>
        </button>
      </div>

      {showComments && (
        <div className="border-t border-slate-50 bg-slate-50/60 px-3.5 pb-3 pt-2.5">
          {commentsLoading ? (
            <p className="py-2 text-center text-[11px] text-slate-400">Cargando comentarios...</p>
          ) : comments.length === 0 ? (
            <p className="pb-2 text-[11px] text-slate-400">Sé el primero en comentar.</p>
          ) : (
            <div className="mb-2.5 space-y-2.5">
              {comments.map((c) => {
                const name = commentDisplayName(c);
                const avatarUser = {
                  firstName: c.firstName ?? name.split(" ")[0] ?? "",
                  lastName: c.lastName ?? name.split(" ")[1] ?? "",
                  avatarUrl: c.avatarUrl
                };
                const isOwn =
                  currentUser.id && c.authorId && String(c.authorId) === String(currentUser.id);
                return (
                  <div key={c.id} className="flex gap-2">
                    <Avatar user={avatarUser} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="rounded-2xl rounded-tl-none bg-white px-3 py-2 shadow-[0_1px_4px_rgb(0,0,0,0.05)]">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-semibold text-slate-800">{name}</p>
                          {isOwn && editingCommentId !== c.id && (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => startEditComment(c)}
                                title="Editar comentario"
                                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[var(--primary)]"
                              >
                                <MaterialIcon name="edit" className="text-[14px]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteComment(c.id)}
                                title="Eliminar comentario"
                                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              >
                                <MaterialIcon name="delete" className="text-[14px]" />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="mt-1.5 space-y-2">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  void handleSaveEdit();
                                }
                                if (e.key === "Escape") cancelEditComment();
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-800 outline-none focus:border-[var(--primary)]"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditComment}
                                className="text-[11px] font-semibold text-slate-400"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit()}
                                disabled={!editText.trim() || savingEdit}
                                className="text-[11px] font-semibold text-[var(--primary)] disabled:opacity-40"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mt-0.5 whitespace-pre-line text-[12px] leading-relaxed text-slate-600">
                              {c.content}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">{relativeTime(c.createdAt)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {commentError && (
            <p className="mb-2 text-[11px] font-medium text-red-500">{commentError}</p>
          )}

          <div className="flex items-center gap-2">
            <Avatar user={currentUser} size="sm" />
            <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Escribí un comentario..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendComment();
                  }
                }}
                className="flex-1 bg-transparent text-[12px] text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => void handleSendComment()}
                disabled={!commentText.trim() || sending}
                className="text-[var(--primary)] transition-opacity disabled:opacity-30"
              >
                <MaterialIcon name="send" filled className="text-[16px]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SocialPage = () => {
  const { user } = useAuth();
  const { selectedStudent } = useStudents();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [communities, setCommunities] = useState<CommunityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCommunityId, setFilterCommunityId] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const selectedStudentId = selectedStudent?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setFilterCommunityId("");

      try {
        const result = await fetchCommunities(selectedStudentId);
        if (cancelled) return;

        setCommunities(result);
        const allPosts = result.flatMap((c) => c.posts.filter((p) => p.status !== "ARCHIVED"));
        const sorted = [...allPosts].sort((a, b) => {
          const ta = Date.parse(a.publishedAt ?? a.createdAt ?? "") || 0;
          const tb = Date.parse(b.publishedAt ?? b.createdAt ?? "") || 0;
          return tb - ta;
        });
        setPosts(sorted);
      } catch (e) {
        if (cancelled) return;
        setError(extractErrorMessage(e));
        setCommunities([]);
        setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId]);

  useEffect(() => {
    setDisplayCount(10);
  }, [filterCommunityId, selectedStudentId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setDisplayCount((prev) => prev + 10);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [posts.length]);

  const handleLike = async (postId: string, communityId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nowLiked = !(p.likedByMe ?? false);
        const base = p.likesCount ?? 0;
        return {
          ...p,
          likedByMe: nowLiked,
          likesCount: nowLiked ? base + 1 : Math.max(0, base - 1)
        };
      })
    );
    try {
      const result = await togglePostLike(communityId, postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id !== postId ? p : { ...p, likedByMe: result.liked, likesCount: result.count }
        )
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const reverted = !(p.likedByMe ?? false);
          const base = p.likesCount ?? 0;
          return {
            ...p,
            likedByMe: reverted,
            likesCount: reverted ? base + 1 : Math.max(0, base - 1)
          };
        })
      );
    }
  };

  const currentUser = user
    ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl ?? null
      }
    : { firstName: "Tutor", lastName: "", avatarUrl: null };

  const filteredPosts = filterCommunityId
    ? posts.filter((p) => p.communityId === filterCommunityId)
    : posts;

  const communityOptions: SelectOption[] = [
    { value: "", label: "Todas las comunidades" },
    ...communities.map((c) => ({ value: c.id, label: c.name }))
  ];

  const subtitle = selectedStudent
    ? `Publicaciones de ${selectedStudent.firstName}`
    : "Seleccioná un atleta para ver sus comunidades";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-xs text-slate-400">Cargando comunidad...</p>
      </div>
    );
  }

  return (
    <div className="px-3.5 pb-6 pt-4">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <MaterialIcon name="warning" className="text-base" />
          <span>{error}</span>
        </div>
      )}

      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Comunidad</h1>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {filteredPosts.length} publicaciones · {subtitle}
        </p>
        {communities.length > 1 && (
          <CustomSelect
            options={communityOptions}
            value={filterCommunityId}
            onChange={setFilterCommunityId}
            placeholder="Todas las comunidades"
            className="mt-3"
          />
        )}
      </header>

      {communities.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <MaterialIcon name="groups" className="text-3xl text-slate-200" />
          <h3 className="text-sm font-semibold text-slate-600">Sin comunidades asignadas</h3>
          <p className="max-w-xs text-xs text-slate-400">
            {selectedStudent
              ? `${selectedStudent.firstName} aún no está invitado a ninguna comunidad.`
              : "Seleccioná un atleta para ver en qué comunidades participa."}
          </p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <MaterialIcon name="people" className="text-3xl text-slate-200" />
          <h3 className="text-sm font-semibold text-slate-600">Sin publicaciones aún</h3>
          <p className="text-xs text-slate-400">
            Todavía no hay novedades en {filterCommunityId ? "esta comunidad" : "estas comunidades"}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.slice(0, displayCount).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onToggleLike={handleLike}
              currentUser={currentUser}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {displayCount < filteredPosts.length && (
            <p className="py-3 text-center text-[11px] text-slate-400">Cargando más...</p>
          )}
        </div>
      )}
    </div>
  );
};
