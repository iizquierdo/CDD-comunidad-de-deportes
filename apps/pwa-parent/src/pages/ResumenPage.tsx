import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useAuth } from "../context/AuthContext";
import { useStudents } from "../context/StudentContext";
import type { StudentDiscipline, StudentSummary } from "../types";

const demoRoster: StudentSummary[] = [
  {
    id: "demo-mateo",
    firstName: "Mateo",
    lastName: "Valenzuela",
    status: "ACTIVE",
    sede: { id: "demo-sede", name: "Sucursal Central" },
    disciplines: [
      {
        id: "demo-natacion",
        status: "ACTIVE",
        discipline: {
          id: "nat",
          name: "Natación Infantil",
          active: true,
          description: "Desarrollo técnico y resistencia acuática."
        },
        level: {
          id: "lv-nat-2",
          active: true,
          levelOrder: 2,
          name: "Intermedio",
          description: "Dominio básico de crol y espalda.",
          color: "#63d972"
        }
      },
      {
        id: "demo-gimnasia",
        status: "ACTIVE",
        discipline: {
          id: "gim",
          name: "Gimnasia Artística",
          active: true,
          description: "Coordinación corporal y ritmo."
        },
        level: {
          id: "lv-gim-1",
          active: true,
          levelOrder: 1,
          name: "Formativo",
          description: "Bases de fuerza y flexibilidad."
        }
      }
    ]
  },
  {
    id: "demo-sofia",
    firstName: "Sofía",
    lastName: "Ruiz",
    status: "ACTIVE",
    sede: { id: "demo-sede", name: "Sucursal Norte" },
    disciplines: []
  }
];

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

const getSchedule = (name: string, index: number) => {
  const n = name.toLowerCase();
  if (n.includes("nat")) return "Lun. y Mié. · 16:00";
  if (n.includes("gim")) return "Sáb. · 10:00";
  if (n.includes("fut")) return "Mar. y Jue. · 18:00";
  return index % 2 === 0 ? "Mar. · 17:00" : "Vie. · 16:30";
};

const getInitials = (student: StudentSummary) =>
  `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();

const isActiveDiscipline = (d: StudentDiscipline) => d.status === "ACTIVE";

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

const todayLabel = () => {
  try {
    return capitalize(
      new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date()
      )
    );
  } catch {
    return "Tu resumen de hoy";
  }
};

export const ResumenPage = () => {
  const { user } = useAuth();
  const { students, selectedStudent, selectedStudentId, setSelectedStudentId, loading, error } =
    useStudents();

  const hasRealData = students.length > 0;
  const roster = hasRealData ? students : demoRoster;
  const activeStudent = selectedStudent ?? roster[0] ?? null;

  const activeDisciplines = useMemo(
    () => (activeStudent?.disciplines ?? []).filter(isActiveDiscipline),
    [activeStudent]
  );

  const primaryDiscipline = activeDisciplines[0] ?? null;
  const attendance = activeDisciplines.length === 0 ? 0 : Math.min(96, 80 + activeDisciplines.length * 4);
  const classesAttended = Math.round((attendance / 100) * 5);
  const streakWeeks = activeDisciplines.length === 0 ? 0 : 4 + activeDisciplines.length;
  const levelOrder = primaryDiscipline?.level?.levelOrder ?? null;
  const tutorName = user?.firstName?.trim() || "tutor";

  if (loading && !activeStudent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <MaterialIcon name="exercise" className="text-4xl text-slate-300" />
        <h3 className="font-semibold text-slate-700">Cargando atletas…</h3>
        <p className="text-sm text-slate-400">Estamos preparando el resumen de tu familia.</p>
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <MaterialIcon name="group_add" className="text-4xl text-slate-300" />
        <h3 className="font-semibold text-slate-700">Aún no tenés atletas activos</h3>
        <p className="text-sm text-slate-400">
          Cuando el staff asigne alumnos a tu cuenta, aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5">
      {/* Demo / error banners */}
      {!hasRealData && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <MaterialIcon name="science" className="text-base" />
          <span>Vista demo — aún no hay atletas asignados.</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <MaterialIcon name="warning" filled className="text-base" />
          <span>{error}</span>
        </div>
      )}

      {/* Greeting */}
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{todayLabel()}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">¡Hola, {tutorName}! 👋</h1>
        <p className="mt-1 text-sm text-slate-500">
          Seguí de cerca el entrenamiento y los logros de tu familia.
        </p>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-3">

        {/* Athlete selector */}
        <div className="col-span-2 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Mis atletas
            </h2>
            <button className="text-xs font-medium text-[var(--primary)]" type="button">
              Gestionar
            </button>
          </div>
          <div className="flex gap-3">
            {roster.map((student) => {
              const isActive = hasRealData
                ? student.id === selectedStudentId
                : student.id === activeStudent.id;
              return (
                <button
                  key={student.id}
                  className={`flex flex-col items-center gap-1 transition-opacity ${isActive ? "opacity-100" : "opacity-40"}`}
                  onClick={() => hasRealData && setSelectedStudentId(student.id)}
                  type="button"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? "bg-[var(--primary)] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getInitials(student)}
                  </span>
                  <span className="text-xs font-medium text-slate-700">{student.firstName}</span>
                </button>
              );
            })}
            <button
              className="flex flex-col items-center gap-1"
              type="button"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <MaterialIcon name="add" className="text-base" />
              </span>
              <span className="text-xs font-medium text-slate-400">Añadir</span>
            </button>
          </div>
        </div>

        {/* Hero card */}
        <div className="col-span-2 relative overflow-hidden rounded-3xl bg-[var(--primary)] p-5 text-white">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              Ficha del atleta
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold">
                {getInitials(activeStudent)}
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">
                  {activeStudent.firstName} {activeStudent.lastName}
                </h2>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-white/70">
                  <MaterialIcon name="location_on" filled className="text-sm" />
                  {activeStudent.sede?.name ?? "Sucursal Central"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-4 border-t border-white/20 pt-4">
              {[
                { value: activeDisciplines.length, label: "Disciplinas" },
                { value: streakWeeks, label: "Sem. activo" },
                { value: levelOrder ?? "—", label: "Nivel" }
              ].map((kpi) => (
                <div key={kpi.label} className="flex-1 text-center">
                  <strong className="block text-2xl font-bold">{kpi.value}</strong>
                  <span className="text-[11px] text-white/60">{kpi.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Attendance */}
        {activeDisciplines.length > 0 && (
          <div className="rounded-3xl bg-blue-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
              Asistencia
            </p>
            <strong className="mt-2 block text-3xl font-bold text-slate-900">{attendance}%</strong>
            <p className="mt-1 text-xs text-slate-500">
              {classesAttended} de 5 clases
            </p>
          </div>
        )}

        {/* Streak */}
        {activeDisciplines.length > 0 && (
          <div className="rounded-3xl bg-amber-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
              Racha
            </p>
            <strong className="mt-2 block text-3xl font-bold text-slate-900">{streakWeeks}</strong>
            <p className="mt-1 text-xs text-slate-500">semanas activo</p>
          </div>
        )}

        {/* Disciplines */}
        <div className="col-span-2 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Disciplinas activas
            </h2>
            {activeDisciplines.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                {activeDisciplines.length}
              </span>
            )}
          </div>

          {activeDisciplines.length > 0 ? (
            <div className="space-y-2">
              {activeDisciplines.map((item, index) => (
                <Link
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                  to="/niveles"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-softer)] text-[var(--primary)]">
                    <MaterialIcon name={getDisciplineIcon(item.discipline.name)} filled />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.discipline.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <MaterialIcon name="schedule" className="text-xs" />
                      {getSchedule(item.discipline.name, index)}
                    </p>
                  </div>
                  {item.level?.name && (
                    <span className="shrink-0 rounded-full bg-[var(--primary-softer)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
                      {item.level.name}
                    </span>
                  )}
                </Link>
              ))}

              <Link
                className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-3 transition-colors hover:bg-slate-50"
                to="/niveles"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <MaterialIcon name="add" className="text-base" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Sumar disciplina</p>
                  <p className="text-xs text-slate-400">Explorá las actividades disponibles</p>
                </div>
              </Link>
            </div>
          ) : (
            <div className="py-6 text-center">
              <MaterialIcon name="exercise" className="text-3xl text-slate-200" />
              <p className="mt-2 text-sm text-slate-400">Sin disciplinas activas aún</p>
            </div>
          )}
        </div>

        {/* Coach tip */}
        <div className="col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-blue-50 to-slate-50 p-5">
          <div className="pointer-events-none absolute -top-4 -right-4 h-20 w-20 rounded-full bg-violet-200/30 blur-2xl" />
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
            <MaterialIcon name="tips_and_updates" filled className="text-sm" />
            Consejo de la semana
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">
            La hidratación es el combustible invisible del campeón.
          </p>
          <p className="mt-2 text-xs text-slate-500">— Equipo de entrenadores</p>
        </div>

      </div>
    </div>
  );
};
