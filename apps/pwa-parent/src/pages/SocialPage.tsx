import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useStudents } from "../context/StudentContext";
import { extractErrorMessage } from "../lib/api";
import { fetchCommunities } from "../lib/data";
import type { CommunityDetail, CommunityPost } from "../types";

const getDateValue = (v?: string | null) => {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

const isImageUrl = (v: string) =>
  [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"].some((e) =>
    v.split("?")[0].toLowerCase().endsWith(e)
  );

const isVideoUrl = (v: string) =>
  [".mp4", ".webm", ".mov", ".m3u8"].some((e) =>
    v.split("?")[0].toLowerCase().endsWith(e)
  );

const getMediaFromPost = (post: CommunityPost) => {
  if (post.coverUrl && (isImageUrl(post.coverUrl) || isVideoUrl(post.coverUrl))) {
    return {
      url: post.coverUrl,
      kind: isVideoUrl(post.coverUrl) ? "video" : ("image" as const)
    };
  }
  const attachment = post.attachments.find(
    (a) =>
      a.mimeType?.startsWith("image/") ||
      a.mimeType?.startsWith("video/") ||
      isImageUrl(a.fileUrl) ||
      isVideoUrl(a.fileUrl)
  );
  if (!attachment) return null;
  return {
    url: attachment.fileUrl,
    kind:
      attachment.mimeType?.startsWith("video/") || isVideoUrl(attachment.fileUrl)
        ? "video"
        : ("image" as const)
  };
};

const truncate = (v: string, max = 170) =>
  v.length <= max ? v : `${v.slice(0, max).trimEnd()}...`;

export const SocialPage = () => {
  const { selectedStudent } = useStudents();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communities, setCommunities] = useState<CommunityDetail[]>([]);

  const selectedStudentId = selectedStudent?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const full = await fetchCommunities();
        const scoped = selectedStudentId
          ? full.filter((c) =>
              c.members.some((m) => m.active && m.student.id === selectedStudentId)
            )
          : full;
        if (cancelled) return;
        setCommunities(scoped);
      } catch (e) {
        if (cancelled) return;
        setError(extractErrorMessage(e));
        setCommunities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [selectedStudentId]);

  const visiblePosts = useMemo(() => {
    const all = communities.flatMap((c) => c.posts);
    const nonArchived = all.filter((p) => p.status !== "ARCHIVED");
    const published = nonArchived.filter((p) => p.status === "PUBLISHED");
    const base = published.length > 0 ? published : nonArchived;
    return [...base].sort(
      (a, b) =>
        getDateValue(b.publishedAt ?? b.createdAt) - getDateValue(a.publishedAt ?? a.createdAt)
    );
  }, [communities]);

  const featuredPost = visiblePosts[0] ?? null;
  const restPosts = visiblePosts.slice(1);

  const communityNames = useMemo(
    () => Array.from(new Set(communities.map((c) => c.name))),
    [communities]
  );

  const communityLabel =
    communityNames.length === 0
      ? "Sin comunidad asignada"
      : communityNames.length === 1
        ? communityNames[0]
        : `${communityNames[0]} +${communityNames.length - 1}`;

  return (
    <div className="px-4 pb-6 pt-5">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <MaterialIcon name="warning" className="text-base" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {communityLabel}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {selectedStudent ? `${selectedStudent.firstName} en comunidad` : "Comunidad del atleta"}
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3">

        {loading && (
          <div className="col-span-2 rounded-3xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="text-sm text-slate-400">Cargando publicaciones...</p>
          </div>
        )}

        {!loading && !featuredPost && (
          <div className="col-span-2 flex flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <MaterialIcon name="groups" className="text-4xl text-slate-200" />
            <p className="text-sm text-slate-400">
              No hay publicaciones disponibles. Cargá eventos y publicaciones en Admin y
              asignalo a la comunidad.
            </p>
          </div>
        )}

        {/* Featured post */}
        {!loading && featuredPost && (
          <div className="col-span-2 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            {/* Media */}
            <div className="relative bg-slate-100" style={{ aspectRatio: "16/9" }}>
              {getMediaFromPost(featuredPost)?.url ? (
                <img
                  alt={featuredPost.title}
                  className="h-full w-full object-cover"
                  src={getMediaFromPost(featuredPost)!.url}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MaterialIcon name="imagesmode" className="text-5xl text-slate-300" />
                </div>
              )}
              <span className="absolute top-3 left-3 rounded-full bg-[var(--primary)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                Destacado
              </span>
            </div>
            {/* Content */}
            <div className="p-5">
              <h3 className="text-base font-bold text-slate-900">{featuredPost.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {truncate(featuredPost.content, 160)}
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]"
                to={`/social/${featuredPost.id}`}
              >
                Leer más
                <MaterialIcon name="arrow_forward" className="text-sm" />
              </Link>
            </div>
          </div>
        )}

        {/* Rest of posts */}
        {restPosts.map((post) => {
          const media = getMediaFromPost(post);
          return (
            <Link
              key={post.id}
              className="group col-span-2 flex items-center gap-3 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors hover:bg-slate-50"
              to={`/social/${post.id}`}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                {media?.url ? (
                  <img alt={post.title} className="h-full w-full object-cover" src={media.url} />
                ) : (
                  <MaterialIcon name="article" className="text-xl text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{post.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                  {truncate(post.content, 80)}
                </p>
              </div>
              <MaterialIcon name="chevron_right" className="shrink-0 text-slate-300" />
            </Link>
          );
        })}

      </div>
    </div>
  );
};
