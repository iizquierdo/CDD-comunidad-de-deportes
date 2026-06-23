import { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "../components/CustomSelect";
import { MaterialIcon } from "../components/MaterialIcon";
import { RatingDisplay } from "../components/RatingPicker";
import { StudentInfoCard, studentLabel } from "../components/StudentInfoCard";
import { TeacherAvatar } from "../components/TeacherAvatar";
import { useStudents } from "../context/StudentContext";
import { extractErrorMessage } from "../lib/api";
import { fetchReports } from "../lib/data";
import type { StudentReport } from "../types";

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso ?? "";
  }
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  PROGRESS: "Progreso",
  BEHAVIOR: "Conducta",
  ATTENDANCE: "Asistencia",
  GENERAL: "General"
};

export const CuadernoReportsPage = () => {
  const { students, selectedStudent, selectedStudentId, setSelectedStudentId, loading: studentsLoading } =
    useStudents();

  const [reports, setReports] = useState<StudentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const activeStudents = useMemo(
    () => students.filter((s) => s.status === "ACTIVE"),
    [students]
  );

  const selected = selectedStudent;

  useEffect(() => {
    if (!selected?.id) {
      setReports([]);
      return;
    }

    let cancelled = false;
    setReportsLoading(true);
    setFetchError(null);

    void fetchReports(selected.id)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchError(extractErrorMessage(err));
          setReports([]);
        }
      })
      .finally(() => {
        if (!cancelled) setReportsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const studentOptions = useMemo(
    () => activeStudents.map((st) => ({ value: st.id, label: studentLabel(st) })),
    [activeStudents]
  );

  if (studentsLoading && activeStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-sm text-slate-400">Cargando atletas...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Cuaderno</h1>
        <p className="mt-1 text-sm text-slate-500">
          Informes del profesor sobre{" "}
          {selected ? selected.firstName : "tu atleta"}
        </p>
      </header>

      {activeStudents.length > 1 && (
        <div className="mb-4 rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Seleccioná un atleta
          </p>
          <CustomSelect
            options={studentOptions}
            value={selectedStudentId ?? ""}
            onChange={setSelectedStudentId}
            placeholder="Elegí un atleta..."
          />
        </div>
      )}

      {selected && (
        <>
          <StudentInfoCard student={selected} className="mb-4" />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">
                Informes de {selected.firstName}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                {reports.length}
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
            ) : reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            Publicado
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {REPORT_TYPE_LABELS[report.type] ?? report.type}
                          </span>
                        </div>
                        <h4 className="mt-2 font-bold text-slate-900">{report.title}</h4>
                        {report.summary && (
                          <p className="mt-1 text-sm font-medium text-slate-600">{report.summary}</p>
                        )}
                        {report.rating ? (
                          <div className="mt-2">
                            <RatingDisplay
                              rating={report.rating}
                              theme={report.ratingTheme || "stars"}
                            />
                          </div>
                        ) : null}
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-500">
                          {report.content}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-50 pt-3 text-xs text-slate-400">
                      <TeacherAvatar
                        teacher={report.author}
                        size="h-5 w-5"
                        variant="light"
                      />
                      <span>
                        {report.author.firstName} {report.author.lastName}
                      </span>
                      <span>·</span>
                      <span>{formatDate(report.publishedAt ?? report.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-12 text-center">
                <MaterialIcon name="menu_book" className="text-4xl text-slate-200" />
                <h3 className="font-semibold text-slate-600">Sin informes aún</h3>
                <p className="max-w-xs text-sm text-slate-400">
                  Cuando el profesor publique un informe para {selected.firstName}, lo verás acá.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {!selected && !studentsLoading && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-14 text-center">
          <MaterialIcon name="person_search" className="text-4xl text-slate-200" />
          <h3 className="font-semibold text-slate-600">Sin atleta seleccionado</h3>
          <p className="text-sm text-slate-400">
            {activeStudents.length === 0
              ? "Vinculá un alumno desde Resumen para ver sus informes."
              : "Elegí un atleta para ver sus informes del profesor."}
          </p>
        </div>
      )}
    </div>
  );
};
