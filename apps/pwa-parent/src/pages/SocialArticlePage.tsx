import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useStudents } from "../context/StudentContext";
import { extractErrorMessage } from "../lib/api";
import { fetchCommunities } from "../lib/data";
import type { CommunityDetail, CommunityPost } from "../types";

const formatDate = (v?: string | null) => {
  if (!v) return "Reciente";
  const t = Date.parse(v);
  if (Number.isNaN(t)) return "Reciente";
  return new Date(t).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
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

export const SocialArticlePage = () => {
  const { postId } = useParams<{ postId: string }>();
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

  const article = useMemo(() => {
    for (const c of communities) {
      const post = c.posts.find((p) => p.id === postId);
      if (post) return { ...post, communityName: c.name };
    }
    return null;
  }, [communities, postId]);

  const heroMedia = article ? getMediaFromPost(article) : null;
  const publishedLabel = formatDate(article?.publishedAt ?? article?.createdAt);
  const attachments = article?.attachments ?? [];

  return (
    <div className="px-4 pb-6 pt-5">
      {/* Back link */}
      <Link
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        to="/social"
      >
        <MaterialIcon name="arrow_back" className="text-base" />
        Volver a Social
      </Link>

      {loading && (
        <div className="rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-sm text-slate-400">Cargando artículo...</p>
        </div>
      )}

      {error && (
        <div className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && !article && (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <MaterialIcon name="article" className="text-4xl text-slate-200" />
          <p className="text-sm text-slate-400">
            No encontramos este artículo para el alumno seleccionado.
          </p>
        </div>
      )}

      {!loading && !error && article && (
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* Media */}
          <div className="relative bg-slate-100" style={{ aspectRatio: "16/9" }}>
            {heroMedia?.url ? (
              heroMedia.kind === "video" ? (
                <video
                  className="h-full w-full object-cover"
                  controls
                  poster={article.coverUrl ?? undefined}
                  src={heroMedia.url}
                />
              ) : (
                <img
                  alt={article.title}
                  className="h-full w-full object-cover"
                  src={heroMedia.url}
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MaterialIcon name="article" className="text-5xl text-slate-300" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
              Artículo completo
            </span>
            <h1 className="mt-2 text-xl font-bold text-slate-900">{article.title}</h1>

            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                {article.communityName}
              </span>
              <span className="text-[11px] text-slate-400">{publishedLabel}</span>
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              {article.content.split(/\r?\n/).map((paragraph, i) => (
                <p key={`${article.id}-${i}`} className="text-sm leading-relaxed text-slate-700">
                  {paragraph || " "}
                </p>
              ))}
            </div>

            {attachments.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Archivos adjuntos
                </h2>
                <div className="mt-2 space-y-2">
                  {attachments.map((att) => (
                    <a
                      key={att.fileUrl}
                      className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      href={att.fileUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <MaterialIcon name="attach_file" className="text-slate-400" />
                      {att.fileName}
                      <MaterialIcon name="open_in_new" className="ml-auto text-xs text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
