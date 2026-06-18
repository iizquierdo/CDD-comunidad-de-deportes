import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useAuth } from "../context/AuthContext";
import { fetchMyClasses, fetchWeeklyAttendance } from "../lib/data";
import type { ClassScheduleSlot, ProfessorClass } from "../types";

const getNextClassDate = (schedules: ClassScheduleSlot[] | undefined): Date | null => {
  if (!schedules?.length) return null;
  const now = new Date();
  let closest: Date | null = null;
  for (const slot of schedules) {
    if (!slot.startTime) continue;
    const [hStr, mStr] = slot.startTime.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr ?? "0", 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const today = now.getDay();
    let daysUntil = (slot.dayOfWeek - today + 7) % 7;
    if (daysUntil === 0) {
      const candidate = new Date(now);
      candidate.setHours(h, m, 0, 0);
      if (candidate <= now) daysUntil = 7;
    }
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntil);
    next.setHours(h, m, 0, 0);
    if (!closest || next < closest) closest = next;
  }
  return closest;
};

const CountdownHero = ({ schedules }: { schedules?: ClassScheduleSlot[] }) => {
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const next = getNextClassDate(schedules);
  if (!next) return null;

  const diffMs = next.getTime() - now.getTime();

  if (diffMs <= 0) {
    return (
      <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white/20 py-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <span className="text-xs font-bold text-white">Clase en curso ahora</span>
      </div>
    );
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const segments = [
    { value: days, label: "días" },
    { value: hours, label: "hrs" },
    { value: mins, label: "min" },
    { value: secs, label: "seg" },
  ];

  return (
    <div className="mt-3 rounded-xl bg-white/15 px-4 py-2">
      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/50">
        Comienza en
      </p>
      <div className="flex items-end gap-1.5">
        {segments.map((seg, i) => (
          <Fragment key={seg.label}>
            {i > 0 && (
              <span className="mb-1 text-lg font-bold leading-none text-white/25">:</span>
            )}
            <div className="text-center">
              <span className="block text-[26px] font-bold tabular-nums leading-none tracking-tight text-white">
                {String(seg.value).padStart(2, "0")}
              </span>
              <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-white/55">
                {seg.label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const todayLabel = () => {
  try {
    const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
    return capitalize(
      new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date())
    );
  } catch {
    return "Tu resumen de hoy";
  }
};

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
    name: "Natación Avanzado",
    discipline: { id: "nat3", name: "Natación Competitiva", active: true },
    level: { id: "lv-3", name: "Avanzado", levelOrder: 3, active: true },
    schedule: "Vie. · 17:00",
    room: "Pileta A",
    studentCount: 6,
    sede: { id: "s1", name: "Sucursal Central" }
  }
];

export const ResumenPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ProfessorClass[]>([]);
  const [attendance, setAttendance] = useState<{ rate: number | null; present: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cls = await fetchMyClasses();
        setClasses(cls);
        setApiLoaded(true);
        if (cls.length > 0) {
          const att = await fetchWeeklyAttendance(cls.map((c) => c.id));
          setAttendance(att);
        }
      } catch {
        setError("No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const hasRealData = apiLoaded && classes.length > 0;
  const displayClasses = hasRealData ? classes : (apiLoaded ? [] : demoClasses);

  const nextClass = useMemo(() => displayClasses[0] ?? null, [displayClasses]);
  const totalStudents = displayClasses.reduce((sum, cls) => sum + (cls.studentCount ?? 0), 0);
  const attendanceRate = attendance?.rate ?? null;
  const professorName = user?.firstName?.trim() || "Profesor";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-sm text-slate-400">Cargando tu panel...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5">
      {!apiLoaded && !loading && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <MaterialIcon name="science" className="text-base" />
          <span>Vista demo — conectá la API para ver tus datos reales.</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <MaterialIcon name="warning" filled className="text-base" />
          <span>{error}</span>
        </div>
      )}

      {/* Greeting */}
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{todayLabel()}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">¡Hola, Profe {professorName}!</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aquí está el resumen de tu actividad de hoy.
        </p>
      </header>

      <div className="flex flex-col gap-3">

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Mis clases", value: apiLoaded ? displayClasses.length : "—", icon: "school", color: "bg-[var(--primary-softer)] text-[var(--primary)]" },
            { label: "Alumnos", value: totalStudents, icon: "group", color: "bg-amber-50 text-amber-600" },
            { label: "Asistencia", value: attendanceRate !== null ? `${attendanceRate}%` : "—", icon: "how_to_reg", color: "bg-emerald-50 text-emerald-600" }
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-3xl bg-white p-3 text-center shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${kpi.color}`}>
                <MaterialIcon name={kpi.icon} filled className="text-lg" />
              </span>
              <strong className="mt-2 block text-xl font-bold text-slate-900">{kpi.value}</strong>
              <span className="text-[10px] font-medium text-slate-400">{kpi.label}</span>
            </div>
          ))}
        </div>

        {/* Next class hero */}
        {nextClass && (
          <Link
            to={`/clases/${nextClass.id}`}
            className="relative overflow-hidden rounded-3xl bg-[var(--primary)] text-white no-underline block"
          >
            {/* Decorative rings */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full border-[28px] border-white/10" />
            <div className="pointer-events-none absolute -bottom-8 left-1/2 h-32 w-32 rounded-full border-[20px] border-white/5" />

            <div className="relative p-5">
              {/* Label row */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/55">
                  Próxima clase
                </p>
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                  <MaterialIcon name="school" className="text-xs" />
                  {nextClass.discipline.name}
                </span>
              </div>

              {/* Class identity */}
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <MaterialIcon name={getDisciplineIcon(nextClass.discipline.name)} filled className="text-2xl" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold leading-tight">{nextClass.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/65">
                    {nextClass.schedule && (
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="schedule" className="text-xs" />
                        {nextClass.schedule}
                      </span>
                    )}
                    {nextClass.room && (
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="location_on" className="text-xs" />
                        {nextClass.room}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Countdown hero */}
              <CountdownHero schedules={nextClass.schedules} />

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-4">
                <div className="flex items-center gap-1.5 text-sm text-white/70">
                  <MaterialIcon name="group" filled className="text-sm" />
                  <span>{nextClass.studentCount} alumnos</span>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white">
                  Tomar asistencia
                  <MaterialIcon name="arrow_forward" className="text-xs" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Attendance ring card */}
        <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
            style={{
              background: attendanceRate !== null
                ? `conic-gradient(var(--primary) ${attendanceRate}%, color-mix(in srgb, var(--primary) 14%, #ffffff) 0)`
                : "conic-gradient(#e2e8f0 100%, #e2e8f0 0)"
            }}
          >
            <div className="flex items-center justify-center rounded-full bg-white" style={{ width: "3.75rem", height: "3.75rem" }}>
              <div className="text-center">
                <strong className="block text-sm font-bold text-[var(--primary-strong)]">
                  {attendanceRate !== null ? `${attendanceRate}%` : "—"}
                </strong>
                <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">semana</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Asistencia semanal</h3>
            <p className="mt-1 text-sm text-slate-500">
              {attendance && attendance.total > 0
                ? `${attendance.present} de ${attendance.total} registros presentes esta semana.`
                : "Sin registros de asistencia esta semana."}
            </p>
          </div>
        </div>

        {/* My classes */}
        <div className="rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Mis clases
            </h2>
            <Link to="/clases" className="text-xs font-semibold text-[var(--primary)]">
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {displayClasses.slice(0, 3).map((cls) => (
              <Link
                key={cls.id}
                to={`/clases/${cls.id}`}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition-colors hover:bg-slate-100"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-softer)] text-[var(--primary)]">
                  <MaterialIcon name={getDisciplineIcon(cls.discipline.name)} filled />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{cls.name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MaterialIcon name="schedule" className="text-xs" />
                    {cls.schedule}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-slate-700">{cls.studentCount}</span>
                  <span className="text-[10px] text-slate-400">alumnos</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/clases"
            className="flex flex-col items-center gap-2 rounded-3xl bg-[var(--primary-softer)] p-4 transition-colors hover:bg-[var(--primary-soft)]"
          >
            <MaterialIcon name="how_to_reg" filled className="text-2xl text-[var(--primary)]" />
            <span className="text-center text-sm font-semibold text-[var(--primary)]">Tomar asistencia</span>
          </Link>
          <Link
            to="/cuaderno"
            className="flex flex-col items-center gap-2 rounded-3xl bg-amber-50 p-4 transition-colors hover:bg-amber-100"
          >
            <MaterialIcon name="edit_note" filled className="text-2xl text-amber-600" />
            <span className="text-center text-sm font-semibold text-amber-700">Nuevo informe</span>
          </Link>
        </div>

        {/* Coach tip */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-blue-50 to-slate-50 p-5">
          <div className="pointer-events-none absolute -top-4 -right-4 h-20 w-20 rounded-full bg-violet-200/30 blur-2xl" />
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
            <MaterialIcon name="tips_and_updates" filled className="text-sm" />
            Consejo del día
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">
            Documenta el progreso de tus alumnos después de cada clase para un seguimiento más preciso.
          </p>
          <p className="mt-2 text-xs text-slate-500">— Sistema de gestión deportiva</p>
        </div>

      </div>
    </div>
  );
};
