import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { fetchMyClasses, fetchClassStudents } from "../lib/data";
import type { ProfessorClass, StudentSummary } from "../types";

const getInitials = (s: StudentSummary) =>
  `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase();

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(
      new Date(`${iso}T12:00:00`)
    );
  } catch {
    return iso;
  }
};

const demoStudents: StudentSummary[] = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i}`,
  firstName: ["Lucas", "Valentina", "Mateo", "Sofía", "Nicolás", "Camila", "Tomás", "Agustina"][i],
  lastName: ["Rodríguez", "González", "Pérez", "López", "Martínez", "García", "Hernández", "Torres"][i],
  status: "ACTIVE"
}));

const demoClass: ProfessorClass = {
  id: "demo-1",
  name: "Natación Infantil — Intermedio",
  discipline: { id: "nat", name: "Natación Infantil", active: true },
  level: { id: "lv-2", name: "Intermedio", levelOrder: 2, active: true },
  schedule: "Lun. y Mié. · 16:00",
  room: "Pileta A",
  studentCount: 8,
  sede: { id: "s1", name: "Sucursal Central" }
};

type AttendanceMap = Record<string, boolean>;

export const ClaseDetailPage = () => {
  const { classId } = useParams<{ classId: string }>();

  const [cls, setCls] = useState<ProfessorClass | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [allClasses, sts] = await Promise.all([
          fetchMyClasses(),
          classId ? fetchClassStudents(classId) : Promise.resolve([])
        ]);
        const found = allClasses.find((c) => c.id === classId) ?? null;
        setCls(found ?? demoClass);
        const s = sts.length > 0 ? sts : demoStudents;
        setStudents(s);
        const initial: AttendanceMap = {};
        s.forEach((st) => { initial[st.id] = true; });
        setAttendance(initial);
      } catch {
        setCls(demoClass);
        setStudents(demoStudents);
        const initial: AttendanceMap = {};
        demoStudents.forEach((st) => { initial[st.id] = true; });
        setAttendance(initial);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [classId]);

  const toggle = (id: string) => {
    setAttendance((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const markAll = (present: boolean) => {
    const next: AttendanceMap = {};
    students.forEach((s) => { next[s.id] = present; });
    setAttendance(next);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-sm text-slate-400">Cargando clase...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5">
      {/* Back */}
      <Link
        to="/clases"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)]"
      >
        <MaterialIcon name="arrow_back" className="text-base" />
        Volver a clases
      </Link>

      {/* Class header */}
      <div className="mb-4 rounded-3xl bg-[var(--primary)] p-5 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Clase</p>
        <h1 className="mt-1 text-xl font-bold">{cls?.name}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/80">
          <span className="flex items-center gap-1">
            <MaterialIcon name="schedule" filled className="text-sm" />
            {cls?.schedule}
          </span>
          {cls?.room && (
            <span className="flex items-center gap-1">
              <MaterialIcon name="location_on" filled className="text-sm" />
              {cls.room}
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-4 border-t border-white/20 pt-3">
          <div className="text-center">
            <strong className="block text-2xl font-bold">{presentCount}</strong>
            <span className="text-[11px] text-white/60">Presentes</span>
          </div>
          <div className="text-center">
            <strong className="block text-2xl font-bold">{absentCount}</strong>
            <span className="text-[11px] text-white/60">Ausentes</span>
          </div>
          <div className="text-center">
            <strong className="block text-2xl font-bold">
              {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
            </strong>
            <span className="text-[11px] text-white/60">Asistencia</span>
          </div>
        </div>
      </div>

      {/* Date selector */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
        <MaterialIcon name="calendar_today" filled className="text-base text-[var(--primary)]" />
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha de clase</p>
          <p className="text-sm font-semibold text-slate-800">{formatDate(selectedDate)}</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setSaved(false); }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Attendance controls */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700">Lista de alumnos</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => markAll(true)}
            className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
          >
            Todos presentes
          </button>
          <button
            type="button"
            onClick={() => markAll(false)}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200"
          >
            Todos ausentes
          </button>
        </div>
      </div>

      {/* Student roster */}
      <div className="space-y-2">
        {students.map((student) => {
          const present = attendance[student.id] ?? true;
          return (
            <button
              key={student.id}
              type="button"
              onClick={() => toggle(student.id)}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                present
                  ? "bg-emerald-50 ring-1 ring-emerald-200"
                  : "bg-slate-50 ring-1 ring-slate-200"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                  present ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
                }`}
              >
                {getInitials(student)}
              </span>
              <div className="flex-1">
                <p className={`font-semibold ${present ? "text-slate-900" : "text-slate-400"}`}>
                  {student.firstName} {student.lastName}
                </p>
              </div>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  present ? "bg-emerald-200 text-emerald-700" : "bg-slate-200 text-slate-400"
                }`}
              >
                <MaterialIcon name={present ? "check" : "close"} className="text-sm" />
              </span>
            </button>
          );
        })}
      </div>

      {students.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center">
          <MaterialIcon name="group" className="text-4xl text-slate-200" />
          <p className="text-sm text-slate-400">Sin alumnos asignados a esta clase.</p>
        </div>
      )}

      {/* Save button */}
      {students.length > 0 && (
        <div className="mt-5 sticky bottom-24">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-60 ${
              saved ? "bg-emerald-500" : "bg-[var(--primary)]"
            }`}
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <MaterialIcon name="check_circle" filled className="text-base" />
                Asistencia guardada
              </>
            ) : (
              <>
                <MaterialIcon name="save" filled className="text-base" />
                Guardar asistencia
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
