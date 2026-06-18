import { useEffect, useState } from "react";
import { MaterialIcon } from "../components/MaterialIcon";
import { fetchStudents, fetchReports, createReport } from "../lib/data";
import { extractErrorMessage } from "../lib/api";
import type { StudentSummary, StudentReport } from "../types";

const getInitials = (s: StudentSummary) =>
  `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase();

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso ?? "";
  }
};

const demoStudents: StudentSummary[] = [
  { id: "s1", firstName: "Lucas", lastName: "Rodríguez", status: "ACTIVE" },
  { id: "s2", firstName: "Valentina", lastName: "González", status: "ACTIVE" },
  { id: "s3", firstName: "Mateo", lastName: "Pérez", status: "ACTIVE" },
  { id: "s4", firstName: "Sofía", lastName: "López", status: "ACTIVE" },
  { id: "s5", firstName: "Nicolás", lastName: "Martínez", status: "ACTIVE" }
];

const demoReports: Record<string, StudentReport[]> = {
  s1: [
    {
      id: "r1", studentId: "s1", authorId: "me", type: "PROGRESS",
      title: "Progreso mensual — Mayo",
      content: "Lucas ha mostrado una mejora notable en el estilo mariposa. Su técnica de respiración es más consistente.",
      status: "PUBLISHED", visibility: "MEMBERS_ONLY",
      publishedAt: new Date(Date.now() - 604800000).toISOString(),
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      author: { id: "me", firstName: "Prof.", lastName: "Gómez" }
    }
  ],
  s2: []
};

const REPORT_TYPES = [
  { value: "PROGRESS", label: "Progreso" },
  { value: "BEHAVIOR", label: "Conducta" },
  { value: "ATTENDANCE", label: "Asistencia" },
  { value: "GENERAL", label: "General" }
];

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-slate-100 text-slate-500",
  ARCHIVED: "bg-blue-50 text-blue-600"
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Publicado",
  DRAFT: "Borrador",
  ARCHIVED: "Archivado"
};

export const CuadernoPage = () => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [reports, setReports] = useState<Record<string, StudentReport[]>>({});
  const [selected, setSelected] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "PROGRESS", title: "", content: "", status: "PUBLISHED" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStudents();
        const s = data.filter((st) => st.status === "ACTIVE");
        setStudents(s.length > 0 ? s : demoStudents);
      } catch {
        setStudents(demoStudents);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setReportsLoading(true);
    setFetchError(null);
    fetchReports(selected.id)
      .then((data) => setReports((prev) => ({ ...prev, [selected.id]: data })))
      .catch((err: unknown) => {
        setFetchError(extractErrorMessage(err));
        setReports((prev) => ({ ...prev, [selected.id]: demoReports[selected.id] ?? [] }));
      })
      .finally(() => setReportsLoading(false));
  }, [selected]);

  const handleSubmit = async () => {
    if (!selected || !form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const report = await createReport(selected.id, form);
      setReports((prev) => ({ ...prev, [selected.id]: [report, ...(prev[selected.id] ?? [])] }));
      setShowForm(false);
      setForm({ type: "PROGRESS", title: "", content: "", status: "PUBLISHED" });
    } catch (err: unknown) {
      setSubmitError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const studentReports = selected ? (reports[selected.id] ?? []) : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-sm text-slate-400">Cargando alumnos...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5">
      {/* Header */}
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Cuaderno</h1>
        <p className="mt-1 text-sm text-slate-500">
          Informes y seguimiento de {students.length} alumnos
        </p>
      </header>

      {/* Student selector */}
      <div className="mb-4 rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Seleccioná un alumno
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {students.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => { setSelected(st); setShowForm(false); }}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                  selected?.id === st.id
                    ? "bg-[var(--primary)] text-white shadow-md"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {getInitials(st)}
              </span>
              <span className={`text-[10px] font-semibold ${selected?.id === st.id ? "text-[var(--primary)]" : "text-slate-400"}`}>
                {st.firstName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected student panel */}
      {selected && (
        <>
          {/* Student info + new report button */}
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[var(--primary-softer)] px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">Alumno</p>
              <p className="mt-0.5 font-bold text-slate-900">{selected.firstName} {selected.lastName}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
            >
              <MaterialIcon name={showForm ? "close" : "add"} className="text-sm" />
              {showForm ? "Cancelar" : "Nuevo informe"}
            </button>
          </div>

          {/* New report form */}
          {showForm && (
            <div className="mb-4 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <h3 className="mb-3 text-sm font-bold text-slate-700">
                Nuevo informe — {selected.firstName}
              </h3>

              {/* Type */}
              <div className="mb-3">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Tipo de informe
                </label>
                <div className="flex flex-wrap gap-2">
                  {REPORT_TYPES.map((rt) => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: rt.value }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        form.type === rt.value
                          ? "bg-[var(--primary)] text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <input
                type="text"
                placeholder="Título del informe..."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--primary)] focus:bg-white"
              />

              {/* Content */}
              <textarea
                placeholder="Describe el progreso, observaciones o notas sobre el alumno..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--primary)] focus:bg-white"
              />

              {/* Status */}
              <div className="mt-3 flex gap-2">
                {["PUBLISHED", "DRAFT"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      form.status === s
                        ? "bg-[var(--primary)] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s === "PUBLISHED" ? "Publicar" : "Guardar borrador"}
                  </button>
                ))}
              </div>

              {submitError && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  <MaterialIcon name="error" className="mt-0.5 shrink-0 text-sm text-red-500" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!form.title.trim() || !form.content.trim() || submitting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Guardando..." : "Guardar informe"}
                <MaterialIcon name="save" className="text-sm" />
              </button>
            </div>
          )}

          {/* Reports list */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">
                Informes de {selected.firstName}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                {studentReports.length}
              </span>
            </div>

            {fetchError && (
              <div className="mb-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <MaterialIcon name="warning" className="mt-0.5 shrink-0 text-sm text-amber-500" />
                <span>Error al cargar informes: {fetchError}</span>
              </div>
            )}

            {reportsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
              </div>
            ) : studentReports.length > 0 ? (
              <div className="space-y-3">
                {studentReports.map((report) => (
                  <div key={report.id} className="rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[report.status] ?? "bg-slate-100 text-slate-500"}`}>
                            {STATUS_LABELS[report.status] ?? report.status}
                          </span>
                          <span className="text-[10px] text-slate-400">{report.type}</span>
                        </div>
                        <h4 className="mt-2 font-bold text-slate-900">{report.title}</h4>
                        <p className="mt-1 line-clamp-3 text-sm text-slate-500">{report.content}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-50 pt-3 text-xs text-slate-400">
                      <MaterialIcon name="edit" className="text-xs" />
                      <span>{report.author.firstName} {report.author.lastName}</span>
                      <span>·</span>
                      <span>{formatDate(report.publishedAt ?? report.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-12 text-center">
                <MaterialIcon name="menu_book" className="text-4xl text-slate-200" />
                <h3 className="font-semibold text-slate-600">Sin informes aún</h3>
                <p className="text-sm text-slate-400">Creá el primer informe para {selected.firstName}.</p>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Crear informe
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {!selected && !loading && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-14 text-center">
          <MaterialIcon name="menu_book" className="text-4xl text-slate-200" />
          <h3 className="font-semibold text-slate-600">Seleccioná un alumno</h3>
          <p className="text-sm text-slate-400">Elegí un alumno arriba para ver y crear informes.</p>
        </div>
      )}
    </div>
  );
};
