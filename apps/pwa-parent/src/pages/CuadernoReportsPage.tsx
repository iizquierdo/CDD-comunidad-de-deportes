import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "../components/MaterialIcon";
import { useAuth } from "../context/AuthContext";
import { useStudents } from "../context/StudentContext";
import { extractErrorMessage } from "../lib/api";
import { deleteReport, fetchReports, updateReport } from "../lib/data";
import type { StudentReport } from "../types";

const RATING_THEMES = [
  { key: "stars",     empty: "☆",  filled: "⭐", fillUp: true  },
  { key: "hearts",    empty: "🤍", filled: "❤️", fillUp: true  },
  { key: "faces",     fillUp: false, icons: ["😢","😕","😐","🙂","😄"] },
  { key: "trophies",  empty: "🥉", filled: "🏆", fillUp: true  },
  { key: "fire",      empty: "⚪", filled: "🔥", fillUp: true  },
  { key: "lightning", empty: "⚪", filled: "⚡", fillUp: true  },
  { key: "muscles",   empty: "⚪", filled: "💪", fillUp: true  },
  { key: "medals",    empty: "⚪", filled: "🥇", fillUp: true  },
] as const;

const RatingDisplay = ({ rating, theme }: { rating: number; theme: string }) => {
  const t = RATING_THEMES.find((x) => x.key === theme) ?? RATING_THEMES[0];
  if (t.fillUp === false) {
    const icon = (t as { icons: readonly string[] }).icons[rating - 1];
    return (
      <span className="flex items-center gap-1">
        <span className="text-xl leading-none">{icon}</span>
        <span className="text-[10px] text-slate-400">{rating}/5</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`text-sm leading-none ${i < rating ? "opacity-100" : "opacity-20 grayscale"}`}>
          {i < rating ? (t as { filled: string }).filled : (t as { empty: string }).empty}
        </span>
      ))}
      <span className="ml-1 text-[10px] text-slate-400">{rating}/5</span>
    </span>
  );
};

const statusLabel: Record<StudentReport["status"], string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado"
};

const statusColors: Record<StudentReport["status"], { pill: string; dot: string }> = {
  DRAFT: { pill: "bg-amber-50 text-amber-600 border border-amber-200", dot: "bg-amber-400" },
  PUBLISHED: { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400" },
  ARCHIVED: { pill: "bg-slate-100 text-slate-500 border border-slate-200", dot: "bg-slate-400" }
};

const formatDateTime = (v?: string | null) => {
  const t = v ? Date.parse(v) : NaN;
  if (Number.isNaN(t)) return { date: "Sin fecha", time: "" };
  const d = new Date(t);
  return {
    date: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  };
};

const timeAgo = (v?: string | null): string => {
  const t = v ? Date.parse(v) : NaN;
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months !== 1 ? "es" : ""}`;
};

const getReportRef = (report: StudentReport) => report.publishedAt ?? report.createdAt;

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: string;
}

const Avatar = ({ name, url, size = "h-10 w-10" }: AvatarProps) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  if (url) {
    return (
      <img
        alt={name}
        className={`${size} rounded-full object-cover`}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        src={url}
      />
    );
  }

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-xs font-bold text-white`}
    >
      {initials || "?"}
    </div>
  );
};

interface EditFormProps {
  report: StudentReport;
  studentId: string;
  onSaved: (r: StudentReport) => void;
  onCancel: () => void;
}

const EditForm = ({ report, studentId, onSaved, onCancel }: EditFormProps) => {
  const [title, setTitle] = useState(report.title);
  const [summary, setSummary] = useState(report.summary ?? "");
  const [content, setContent] = useState(report.content ?? "");
  const [status, setStatus] = useState<StudentReport["status"]>(report.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateReport(studentId, report.id, {
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim(),
        status
      });
      onSaved(updated);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Título
        </label>
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del informe"
          required
          type="text"
          value={title}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Resumen
        </label>
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Breve resumen (opcional)"
          type="text"
          value={summary}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Contenido
        </label>
        <textarea
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contenido del informe..."
          rows={4}
          value={content}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Estado
        </label>
        <select
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
          onChange={(e) => setStatus(e.target.value as StudentReport["status"])}
          value={status}
        >
          <option value="DRAFT">Borrador</option>
          <option value="PUBLISHED">Publicado</option>
          <option value="ARCHIVED">Archivado</option>
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          className="flex-1 rounded-full bg-teal-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={saving || !title.trim()}
          type="submit"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

interface ReportCardProps {
  report: StudentReport;
  studentId: string;
  canEdit: boolean;
  onUpdated: (r: StudentReport) => void;
  onDeleted: (id: string) => void;
}

const ReportCard = ({ report, studentId, canEdit, onUpdated, onDeleted }: ReportCardProps) => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ref = getReportRef(report);
  const { date, time } = formatDateTime(ref);
  const ago = timeAgo(ref);
  const authorName = `${report.author.firstName} ${report.author.lastName}`.trim();
  const sc = statusColors[report.status];

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteReport(studentId, report.id);
      onDeleted(report.id);
    } catch (err) {
      setDeleteError(extractErrorMessage(err));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Card header: author + meta */}
      <div className="flex items-center gap-3 border-b border-slate-50 bg-slate-50/60 px-4 py-3">
        <Avatar name={authorName} url={report.author.avatarUrl} size="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{authorName || "Profesor"}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{date}</span>
            {time && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                <span>{time}</span>
              </>
            )}
            {ago && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                <span className="text-slate-400">{ago}</span>
              </>
            )}
          </div>
        </div>
        {/* Status badge */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${sc.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {statusLabel[report.status]}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-4">
        {!editing ? (
          <>
            <h4 className="text-sm font-bold text-slate-900">{report.title}</h4>
            {report.summary && (
              <p className="mt-1 text-sm font-medium text-slate-600">{report.summary}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{report.content}</p>

            {report.rating ? (
              <div className="mt-3">
                <RatingDisplay rating={report.rating} theme={report.ratingTheme || "stars"} />
              </div>
            ) : null}

            {canEdit && !confirmDelete && (
              <div className="mt-4 flex gap-2">
                <button
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-teal-300 hover:text-teal-600"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  <MaterialIcon name="edit" className="text-xs" />
                  Editar
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-300 hover:text-red-500"
                  onClick={() => setConfirmDelete(true)}
                  type="button"
                >
                  <MaterialIcon name="delete" className="text-xs" />
                  Eliminar
                </button>
              </div>
            )}

            {confirmDelete && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-3">
                {deleteError && (
                  <p className="mb-2 text-xs text-red-600">{deleteError}</p>
                )}
                <p className="text-xs font-semibold text-red-700">¿Eliminar este informe?</p>
                <p className="mt-0.5 text-[11px] text-red-500">Esta acción no se puede deshacer.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="flex-1 rounded-full bg-red-500 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    disabled={deleting}
                    onClick={handleDelete}
                    type="button"
                  >
                    {deleting ? "Eliminando..." : "Sí, eliminar"}
                  </button>
                  <button
                    className="flex-1 rounded-full border border-slate-200 py-2 text-xs font-medium text-slate-600"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EditForm
            onCancel={() => setEditing(false)}
            onSaved={(r) => { onUpdated(r); setEditing(false); }}
            report={report}
            studentId={studentId}
          />
        )}
      </div>
    </article>
  );
};

export const CuadernoReportsPage = () => {
  const { user } = useAuth();
  const { selectedStudent } = useStudents();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);

  const studentId = selectedStudent?.id ?? null;

  const loadReports = useCallback(async () => {
    if (!studentId) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReports(studentId);
      setReports(data);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const sortedReports = useMemo(
    () =>
      [...reports].sort((a, b) => {
        const aDate = Date.parse(getReportRef(a));
        const bDate = Date.parse(getReportRef(b));
        return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
      }),
    [reports]
  );

  const handleUpdated = (updated: StudentReport) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleted = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  if (!selectedStudent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <MaterialIcon name="description" className="text-4xl text-slate-200" />
        <h3 className="font-semibold text-slate-700">Sin alumno seleccionado</h3>
        <p className="text-sm text-slate-400">
          Seleccioná un atleta en Resumen para ver sus informes.
        </p>
      </div>
    );
  }

  const isStaff = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_SEDE";

  return (
    <div className="px-4 pb-6 pt-5">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <MaterialIcon name="warning" className="text-base" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 p-5 text-white">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
            Seguimiento del alumno
          </p>
          <h1 className="mt-1 text-xl font-bold">
            Informes de <em className="not-italic text-teal-200">Progreso</em>
          </h1>
        </div>
      </div>

      {/* Reports card */}
      <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Informes cargados</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
            {sortedReports.length} registro{sortedReports.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="p-3">
          {loading && (
            <p className="py-8 text-center text-sm text-slate-400">Cargando informes...</p>
          )}

          {!loading && sortedReports.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10">
              <MaterialIcon name="description" className="text-4xl text-slate-200" />
              <p className="text-sm text-slate-400">No hay informes para este alumno.</p>
            </div>
          )}

          {!loading && sortedReports.length > 0 && (
            <div className="space-y-3">
              {sortedReports.map((report) => {
                const canEdit = isStaff || report.author.id === user?.id;
                return (
                  <ReportCard
                    canEdit={canEdit}
                    key={report.id}
                    onDeleted={handleDeleted}
                    onUpdated={handleUpdated}
                    report={report}
                    studentId={selectedStudent.id}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
