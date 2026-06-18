import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useStudents } from "../context/StudentContext";
import { api, extractErrorMessage } from "../lib/api";
import type { DisciplineResource, StudentDiscipline } from "../types";

type MediaKind = "image" | "video" | "file";

interface MediaItem {
  id: string;
  title: string;
  subtitle: string;
  previewUrl: string | null;
  href: string | null;
  kind: MediaKind;
  date: string | null;
}

const isActiveDiscipline = (d: StudentDiscipline) => d.status === "ACTIVE";

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

const getMediaKindFromUrl = (v: string, mimeType?: string | null): MediaKind => {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  if (isVideoUrl(v)) return "video";
  if (isImageUrl(v)) return "image";
  return "file";
};

const dedupeMedia = (items: MediaItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.previewUrl ?? item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const MultimediaPage = () => {
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

  const mediaItems = useMemo(() => {
    const items = resources.map<MediaItem>((r) => {
      const previewUrl = r.thumbnailUrl ?? r.resourceUrl ?? null;
      const kind =
        previewUrl && r.type === "EXERCISE_VIDEO"
          ? "video"
          : previewUrl
            ? getMediaKindFromUrl(previewUrl)
            : "file";
      return {
        id: r.id,
        title: r.title,
        subtitle: disciplineNameById[r.disciplineId] ?? "Disciplina",
        previewUrl,
        href: r.resourceUrl ?? r.thumbnailUrl ?? null,
        kind,
        date: r.publishedAt ?? r.createdAt ?? null
      };
    });
    return dedupeMedia(items).sort((a, b) => getDateValue(b.date) - getDateValue(a.date));
  }, [disciplineNameById, resources]);

  const mainMedia = mediaItems[0] ?? null;
  const sideMedia = mediaItems.slice(1, 4);
  const remainingMedia = mediaItems.slice(4);

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
          Contenido educativo
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Biblioteca</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">

        {loading && (
          <div className="col-span-2 rounded-3xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="text-sm text-slate-400">Cargando recursos...</p>
          </div>
        )}

        {!loading && !mainMedia && (
          <div className="col-span-2 flex flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <MaterialIcon name="video_library" className="text-4xl text-slate-200" />
            <p className="text-sm text-slate-400">
              No hay recursos multimedia publicados todavía para las disciplinas de tus alumnos.
            </p>
          </div>
        )}

        {/* Featured card */}
        {mainMedia && (
          <Link
            className="col-span-2 group relative overflow-hidden rounded-3xl bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
            to={`/multimedia/${mainMedia.id}`}
            style={{ aspectRatio: "16/9" }}
          >
            {mainMedia.previewUrl ? (
              <img
                alt={mainMedia.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={mainMedia.previewUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MaterialIcon name="image" className="text-5xl text-slate-600" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                {mainMedia.subtitle}
              </p>
              <p className="mt-1 text-base font-bold text-white">{mainMedia.title}</p>
            </div>
            {mainMedia.kind === "video" && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <MaterialIcon name="play_arrow" filled className="text-2xl text-slate-900" />
                </div>
              </div>
            )}
          </Link>
        )}

        {/* Side cards */}
        {sideMedia.map((item) => (
          <Link
            key={item.id}
            className="group relative overflow-hidden rounded-3xl bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            to={`/multimedia/${item.id}`}
            style={{ aspectRatio: "1/1" }}
          >
            {item.previewUrl ? (
              <img
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={item.previewUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MaterialIcon name="image" className="text-3xl text-slate-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs font-semibold leading-tight text-white">{item.title}</p>
            </div>
            {item.kind === "video" && (
              <div className="absolute top-2 right-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50">
                  <MaterialIcon name="play_circle" className="text-sm text-white" />
                </div>
              </div>
            )}
          </Link>
        ))}

        {/* Remaining items list */}
        {remainingMedia.length > 0 && (
          <div className="col-span-2 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Más recursos
            </h3>
            <div className="space-y-2">
              {remainingMedia.map((item) => (
                <Link
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                  to={`/multimedia/${item.id}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200">
                    {item.previewUrl ? (
                      <img alt={item.title} className="h-full w-full object-cover" src={item.previewUrl} />
                    ) : (
                      <MaterialIcon
                        name={item.kind === "video" ? "play_circle" : "description"}
                        className="text-base text-slate-500"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                  <MaterialIcon name="chevron_right" className="text-slate-300" />
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
