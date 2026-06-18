import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { fetchCommunities } from "../lib/data";
import type { CommunityPost } from "../types";

const demoPosts: CommunityPost[] = [
  {
    id: "p1",
    communityId: "c1",
    title: "Resultados del Torneo Interescolar de Natación",
    content: "¡Felicitamos a todos los alumnos que participaron en el torneo interescolar!\n\nNuestros chicos demostraron un gran nivel técnico y deportivo. El equipo de Natación Infantil obtuvo el segundo lugar en la categoría 8-10 años, y varios alumnos del grupo Avanzado clasificaron para la siguiente fase regional.\n\nEstamos muy orgullosos del esfuerzo y la dedicación de cada uno. ¡Sigamos entrenando fuerte!",
    status: "PUBLISHED",
    membersOnly: false,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    author: { id: "a1", firstName: "Coach", lastName: "Marcos" },
    attachments: []
  },
  {
    id: "p2",
    communityId: "c1",
    title: "Cambio de horario — Pileta A",
    content: "Les informamos que la clase del lunes en Pileta A se traslada a las 17:00 hs. por trabajos de mantenimiento.\n\nLos cambios son temporales y durarán aproximadamente dos semanas. El cronograma completo de mantenimiento está disponible en recepción.\n\nDisculpen las molestias ocasionadas.",
    status: "PUBLISHED",
    membersOnly: true,
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    author: { id: "a1", firstName: "Prof.", lastName: "Gómez" },
    attachments: []
  },
  {
    id: "p3",
    communityId: "c2",
    title: "Tips para mejorar el estilo crol",
    content: "Esta semana trabajamos en la posición de la cabeza durante el crol.\n\nRecordá mantenerla alineada con la columna para reducir la resistencia en el agua. Algunos puntos clave:\n\n• La cabeza debe mirar ligeramente hacia abajo, no al frente.\n• La oreja debe quedar sumergida al rotar para respirar.\n• Los codos altos en la entrada al agua mejoran la tracción.\n\n¡Practiquen estos tips en casa con ejercicios de coordinación!",
    status: "PUBLISHED",
    membersOnly: false,
    publishedAt: new Date(Date.now() - 259200000).toISOString(),
    author: { id: "a1", firstName: "Prof.", lastName: "Gómez" },
    attachments: []
  }
];

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric", month: "long", year: "numeric"
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

export const SocialArticlePage = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const communities = await fetchCommunities();
        const allPosts = communities.flatMap((c) => c.posts);
        const found = allPosts.find((p) => p.id === postId);
        setPost(found ?? demoPosts.find((p) => p.id === postId) ?? null);
      } catch {
        setPost(demoPosts.find((p) => p.id === postId) ?? null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-sm text-slate-400">Cargando publicación...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <MaterialIcon name="article" className="text-4xl text-slate-200" />
        <h3 className="font-semibold text-slate-600">Publicación no encontrada</h3>
        <Link to="/social" className="text-sm font-semibold text-[var(--primary)]">
          Volver a la comunidad
        </Link>
      </div>
    );
  }

  const paragraphs = post.content.split("\n\n").filter(Boolean);

  return (
    <div className="px-4 pb-6 pt-5">
      <Link
        to="/social"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)]"
      >
        <MaterialIcon name="arrow_back" className="text-base" />
        Comunidad
      </Link>

      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        {/* Media placeholder */}
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dim)]">
          <MaterialIcon name="stars" filled className="text-5xl text-white/30" />
        </div>

        <div className="p-5">
          {post.membersOnly && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-600">
              <MaterialIcon name="lock" className="text-[10px]" />
              Solo miembros
            </span>
          )}
          <h1 className="text-xl font-bold text-slate-900 leading-snug">{post.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-softer)] text-[10px] font-bold text-[var(--primary)]">
              {post.author.firstName.charAt(0)}
            </span>
            <span>{post.author.firstName} {post.author.lastName}</span>
            {post.publishedAt && (
              <>
                <span>·</span>
                <span>{formatDateTime(post.publishedAt)}</span>
              </>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-700">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
