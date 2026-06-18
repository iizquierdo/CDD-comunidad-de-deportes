import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useStudents } from "../context/StudentContext";
import { api, extractErrorMessage } from "../lib/api";
import type { DisciplineResource, StudentDiscipline } from "../types";

const isActiveDiscipline = (d: StudentDiscipline) => d.status === "ACTIVE";

const getDateValue = (v?: string | null) => {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

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

const extractYouTubeId = (v?: string | null) => {
  if (!v) return null;
  try {
    const url = new URL(v);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.replace("/", "").trim() || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/embed/"))
        return url.pathname.split("/embed/")[1]?.split("/")[0] || null;
      if (url.pathname.startsWith("/shorts/"))
        return url.pathname.split("/shorts/")[1]?.split("/")[0] || null;
    }
  } catch {
    return null;
  }
  return null;
};

const getResourcePreview = (resource: DisciplineResource) => {
  const youtubeId = extractYouTubeId(resource.resourceUrl);
  if (youtubeId) {
    return {
      kind: "youtube" as const,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      imageUrl:
        resource.thumbnailUrl ?? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    };
  }
  const mediaUrl = resource.thumbnailUrl ?? resource.resourceUrl ?? null;
  if (!mediaUrl) return { kind: "none" as const, imageUrl: null };
  if (isImageUrl(mediaUrl)) return { kind: "image" as const, imageUrl: mediaUrl };
  return { kind: "external" as const, imageUrl: resource.thumbnailUrl ?? null };
};

export const MultimediaResourcePage = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const { students } = useStudents();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<DisciplineResource[]>([]);

  const disciplineAssignments = useMemo(
    () => students.flatMap((s) => s.disciplines ?? []).filter(isActiveDiscipline),
    [students]
  );

  const disciplineIds = useMemo(
    () =>
      Array.from(
        new Set(disciplineAssignments.map((a) => a.discipline.id).filter(Boolean))
      ),
    [disciplineAssignments]
  );

  const disciplineIdsKey = useMemo(() => disciplineIds.join("|"), [disciplineIds]);

  const disciplineNameById = useMemo(() => {
    const map: Record<string, string> = {};
    disciplineAssignments.forEach((a) => {
      map[a.discipline.id] = a.discipline.name;
    });
    return map;
  }, [disciplineAssignments]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          disciplineIds.map((id) =>
            api.get<DisciplineResource[]>(`/disciplines/${id}/resources`, {
              params: { active: true }
            })
          )
        );
        const next = results.flatMap((r) => (r.status === "fulfilled" ? r.value.data : []));
        if (cancelled) return;
        setResources(next);
      } catch (e) {
        if (cancelled) return;
        setError(extractErrorMessage(e));
        setResources([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [disciplineIdsKey]);

  const resource = useMemo(
    () =>
      [...resources]
        .sort(
          (a, b) =>
            getDateValue(b.publishedAt ?? b.createdAt ?? null) -
            getDateValue(a.publishedAt ?? a.createdAt ?? null)
        )
        .find((r) => r.id === resourceId) ?? null,
    [resourceId, resources]
  );

  const preview = resource ? getResourcePreview(resource) : null;
  const publishedLabel = formatDate(resource?.publishedAt ?? resource?.createdAt);

  return (
    <div className="px-4 pb-6 pt-5">
      {/* Back link */}
      <Link
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        to="/multimedia"
      >
        <MaterialIcon name="arrow_back" className="text-base" />
        Volver a Biblioteca
      </Link>

      {loading && (
        <div className="rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-sm text-slate-400">Cargando recurso...</p>
        </div>
      )}

      {error && (
        <div className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && !resource && (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <MaterialIcon name="library_books" className="text-4xl text-slate-200" />
          <p className="text-sm text-slate-400">
            No encontramos este recurso para los alumnos vinculados a tu cuenta.
          </p>
        </div>
      )}

      {!loading && !error && resource && (
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* Media */}
          <div className="relative bg-slate-100" style={{ aspectRatio: "16/9" }}>
            {preview?.kind === "youtube" ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
                referrerPolicy="strict-origin-when-cross-origin"
                src={preview.embedUrl}
                title={resource.title}
              />
            ) : preview?.kind === "image" && preview.imageUrl ? (
              <img
                alt={resource.title}
                className="h-full w-full object-cover"
                src={preview.imageUrl}
              />
            ) : preview?.imageUrl ? (
              <img
                alt={resource.title}
                className="h-full w-full object-cover"
                src={preview.imageUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MaterialIcon name="library_books" className="text-5xl text-slate-300" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
              Recurso completo
            </span>
            <h1 className="mt-2 text-xl font-bold text-slate-900">{resource.title}</h1>

            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                {disciplineNameById[resource.disciplineId] ?? "Disciplina"}
              </span>
              <span className="text-[11px] text-slate-400">{publishedLabel}</span>
            </div>

            {resource.description && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                {resource.description.split(/\r?\n/).map((paragraph, i) => (
                  <p
                    key={`${resource.id}-${i}`}
                    className="text-sm leading-relaxed text-slate-700"
                  >
                    {paragraph || " "}
                  </p>
                ))}
              </div>
            )}

            {resource.resourceUrl && preview?.kind !== "youtube" && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Abrir recurso
                </h2>
                <a
                  className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-3.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
                  href={resource.resourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Ver contenido original
                  <MaterialIcon name="open_in_new" className="text-sm" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
