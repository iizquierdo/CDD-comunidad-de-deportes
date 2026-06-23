import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useStudents } from "../context/StudentContext";
import { extractErrorMessage } from "../lib/api";
import { fetchLibraryResources } from "../lib/data";
import {
  collectMultimediaScope,
  getLibraryResourceLabel,
  getResourceVisuals,
  type MediaKind
} from "../lib/multimedia";
import type { LibraryResource } from "../types";

interface MediaItem {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  imageUrl: string | null;
  previewUrl: string | null;
  href: string | null;
  kind: MediaKind;
  date: string | null;
}

const getDateValue = (v?: string | null) => {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

const dedupeMedia = (items: MediaItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.coverUrl ?? item.previewUrl ?? item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const MediaCover = ({
  coverUrl,
  imageUrl,
  title,
  logoSize = "h-12 w-12"
}: {
  coverUrl: string | null;
  imageUrl: string | null;
  title: string;
  logoSize?: string;
}) => (
  <>
    {coverUrl ? (
      <img
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        src={coverUrl}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-slate-900">
        <MaterialIcon name="image" className="text-5xl text-slate-600" />
      </div>
    )}
    {imageUrl ? (
      <div className="absolute left-4 top-4 z-10">
        <img
          alt={title}
          className={`${logoSize} rounded-xl object-cover ring-2 ring-white/30 shadow-lg`}
          src={imageUrl}
        />
      </div>
    ) : null}
  </>
);

export const MultimediaPage = () => {
  const { students } = useStudents();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<LibraryResource[]>([]);

  const scope = useMemo(() => collectMultimediaScope(students), [students]);
  const { disciplineIds, classIds, scopeKey, disciplineNameById, classNameById } = scope;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const next = await fetchLibraryResources({ disciplineIds, classIds });
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
  }, [scopeKey, disciplineIds, classIds]);

  const mediaItems = useMemo(() => {
    const items = resources.map<MediaItem>((r) => {
      const visuals = getResourceVisuals(r, scope);
      return {
        id: r.id,
        title: r.title,
        subtitle: getLibraryResourceLabel(r, { disciplineNameById, classNameById }),
        coverUrl: visuals.coverUrl,
        imageUrl: visuals.imageUrl,
        previewUrl: visuals.previewUrl,
        href: r.resourceUrl ?? r.thumbnailUrl ?? null,
        kind: visuals.kind,
        date: r.publishedAt ?? r.createdAt ?? null
      };
    });
    return dedupeMedia(items).sort((a, b) => getDateValue(b.date) - getDateValue(a.date));
  }, [classNameById, disciplineNameById, resources, scope]);

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
              No hay recursos multimedia publicados todavía para las clases o disciplinas de tus alumnos.
            </p>
          </div>
        )}

        {mainMedia && (
          <Link
            className="group relative col-span-2 overflow-hidden rounded-3xl bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
            to={`/multimedia/${mainMedia.id}`}
            style={{ aspectRatio: "16/9" }}
          >
            <MediaCover
              coverUrl={mainMedia.coverUrl}
              imageUrl={mainMedia.imageUrl}
              title={mainMedia.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                {mainMedia.subtitle}
              </p>
              <p className="mt-1 text-base font-bold text-white">{mainMedia.title}</p>
            </div>
            {mainMedia.kind === "video" && (
              <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <MaterialIcon name="play_arrow" filled className="text-2xl text-slate-900" />
                </div>
              </div>
            )}
          </Link>
        )}

        {sideMedia.map((item) => (
          <Link
            key={item.id}
            className="group relative overflow-hidden rounded-3xl bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            to={`/multimedia/${item.id}`}
            style={{ aspectRatio: "1/1" }}
          >
            <MediaCover
              coverUrl={item.coverUrl}
              imageUrl={item.imageUrl}
              logoSize="h-9 w-9"
              title={item.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs font-semibold leading-tight text-white">{item.title}</p>
            </div>
            {item.kind === "video" && (
              <div className="absolute top-2 right-2 z-10">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50">
                  <MaterialIcon name="play_circle" className="text-sm text-white" />
                </div>
              </div>
            )}
          </Link>
        ))}

        {remainingMedia.length > 0 && (
          <div className="col-span-2 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Más recursos
            </h3>
            <div className="space-y-2">
              {remainingMedia.map((item) => {
                const thumb = item.imageUrl ?? item.coverUrl ?? item.previewUrl;
                return (
                  <Link
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                    to={`/multimedia/${item.id}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200">
                      {thumb ? (
                        <img alt={item.title} className="h-full w-full object-cover" src={thumb} />
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
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
