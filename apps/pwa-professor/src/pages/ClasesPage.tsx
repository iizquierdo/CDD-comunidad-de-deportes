import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { fetchMyClasses } from "../lib/data";
import type { ProfessorClass } from "../types";

const getDisciplineIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("nat")) return "pool";
  if (n.includes("fut")) return "sports_soccer";
  if (n.includes("gim")) return "fitness_center";
  if (n.includes("atle")) return "sprint";
  if (n.includes("box") || n.includes("art")) return "sports_martial_arts";
  if (n.includes("baile") || n.includes("danza")) return "music_note";
  if (n.includes("basquet") || n.includes("básquet")) return "sports_basketball";
  return "exercise";
};

const ICON_COLORS = [
  "bg-[var(--primary-softer)] text-[var(--primary)]",
  "bg-amber-50 text-amber-600",
  "bg-emerald-50 text-emerald-600",
  "bg-violet-50 text-violet-600"
];

const demoClasses: ProfessorClass[] = [
  {
    id: "demo-1",
    name: "Natación Infantil — Intermedio",
    discipline: { id: "nat", name: "Natación Infantil", active: true },
    level: { id: "lv-2", name: "Intermedio", levelOrder: 2, active: true },
    schedule: "Lun. y Mié. · 16:00",
    room: "Pileta A",
    studentCount: 12,
    sede: { id: "s1", name: "Sucursal Central" }
  },
  {
    id: "demo-2",
    name: "Natación Adultos — Formativo",
    discipline: { id: "nat2", name: "Natación Adultos", active: true },
    level: { id: "lv-1", name: "Formativo", levelOrder: 1, active: true },
    schedule: "Mar. y Jue. · 18:30",
    room: "Pileta B",
    studentCount: 9,
    sede: { id: "s1", name: "Sucursal Central" }
  },
  {
    id: "demo-3",
    name: "Natación Competitiva",
    discipline: { id: "nat3", name: "Natación Competitiva", active: true },
    level: { id: "lv-3", name: "Avanzado", levelOrder: 3, active: true },
    schedule: "Vie. · 17:00",
    room: "Pileta A",
    studentCount: 6,
    sede: { id: "s2", name: "Sucursal Norte" }
  },
  {
    id: "demo-4",
    name: "Natación Bebés",
    discipline: { id: "nat4", name: "Natación Bebés", active: true },
    level: null,
    schedule: "Sáb. · 10:00",
    room: "Pileta C",
    studentCount: 8,
    sede: { id: "s1", name: "Sucursal Central" }
  }
];

export const ClasesPage = () => {
  const [classes, setClasses] = useState<ProfessorClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMyClasses();
        setClasses(data);
      } catch {
        setError("No se pudo cargar las clases. Mostrando datos de ejemplo.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const hasRealData = classes.length > 0;
  const display = hasRealData ? classes : demoClasses;

  const totalStudents = display.reduce((sum, c) => sum + c.studentCount, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-sm text-slate-400">Cargando clases...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5">
      {!hasRealData && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <MaterialIcon name="science" className="text-base" />
          <span>Vista demo — conectá la API para ver tus clases reales.</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <MaterialIcon name="warning" className="text-base" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Mis Clases</h1>
        <p className="mt-1 text-sm text-slate-500">
          {display.length} clases · {totalStudents} alumnos en total
        </p>
      </header>

      {/* Summary chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: "Todas", count: display.length, active: true },
          { label: "Hoy", count: 2, active: false },
          { label: "Semana", count: display.length, active: false }
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab.active
                ? "bg-[var(--primary)] text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab.active ? "bg-white/20" : "bg-slate-200"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Class list */}
      <div className="space-y-3">
        {display.map((cls, index) => (
          <Link
            key={cls.id}
            to={`/clases/${cls.id}`}
            className="block rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
          >
            <div className="flex items-start gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ICON_COLORS[index % ICON_COLORS.length]}`}>
                <MaterialIcon name={getDisciplineIcon(cls.discipline.name)} filled className="text-xl" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-slate-900">{cls.name}</h3>
                {cls.level && (
                  <span className="mt-1 inline-block rounded-full bg-[var(--primary-softer)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                    {cls.level.name}
                  </span>
                )}
              </div>
              <MaterialIcon name="chevron_right" className="mt-1 text-slate-300" />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-50 pt-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MaterialIcon name="schedule" className="text-sm text-slate-400" />
                <span className="truncate">{cls.schedule}</span>
              </div>
              {cls.room && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MaterialIcon name="location_on" className="text-sm text-slate-400" />
                  <span className="truncate">{cls.room}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MaterialIcon name="group" className="text-sm text-slate-400" />
                <span>{cls.studentCount} alumnos</span>
              </div>
            </div>

            {/* Quick attendance CTA */}
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-[var(--primary-softer)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--primary)]">
                Tomar asistencia de hoy
              </span>
              <MaterialIcon name="how_to_reg" filled className="text-base text-[var(--primary)]" />
            </div>
          </Link>
        ))}
      </div>

      {display.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-12 text-center">
          <MaterialIcon name="school" className="text-4xl text-slate-200" />
          <h3 className="font-semibold text-slate-600">Sin clases asignadas</h3>
          <p className="text-sm text-slate-400">Cuando el administrador asigne clases, aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
};
