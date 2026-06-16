import { useMemo, type CSSProperties } from "react";
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
  const normalized = name.toLowerCase();
  if (normalized.includes("nat")) return "pool";
  if (normalized.includes("fut")) return "sports_soccer";
  if (normalized.includes("gim")) return "fitness_center";
  if (normalized.includes("atle")) return "sprint";
  if (normalized.includes("box") || normalized.includes("art")) return "sports_martial_arts";
  if (normalized.includes("baile") || normalized.includes("danza")) return "music_note";
  if (normalized.includes("basquet") || normalized.includes("básquet")) return "sports_basketball";
  return "exercise";
};

const getSchedule = (name: string, index: number) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("nat")) return "Lunes y Miércoles · 16:00";
  if (normalized.includes("gim")) return "Sábados · 10:00";
  if (normalized.includes("fut")) return "Martes y Jueves · 18:00";
  return index % 2 === 0 ? "Martes · 17:00" : "Viernes · 16:30";
};

const getInitials = (student: StudentSummary) =>
  `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();

const isActiveDiscipline = (discipline: StudentDiscipline) => discipline.status === "ACTIVE";

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const todayLabel = () => {
  try {
    return capitalize(
      new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date())
    );
  } catch {
    return "Tu resumen de hoy";
  }
};

export const ResumenPage = () => {
  const { user } = useAuth();
  const { students, selectedStudent, selectedStudentId, setSelectedStudentId, loading, error } = useStudents();

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
      <section className="rs-empty">
        <MaterialIcon name="exercise" />
        <h3>Cargando atletas…</h3>
        <p>Estamos preparando el resumen de tu familia.</p>
      </section>
    );
  }

  if (!activeStudent) {
    return (
      <section className="rs-empty">
        <MaterialIcon name="group_add" />
        <h3>Aún no tienes atletas activos</h3>
        <p>Cuando el staff asigne alumnos a tu cuenta, aparecerán aquí automáticamente.</p>
      </section>
    );
  }

  return (
    <div className="rs">
      {!hasRealData && (
        <div className="rs-banner demo">
          <MaterialIcon name="science" />
          <span>Vista demo. Aún no hay atletas asignados al tutor autenticado.</span>
        </div>
      )}

      {error && (
        <div className="rs-banner error">
          <MaterialIcon name="warning" filled />
          <span>{error}</span>
        </div>
      )}

      {/* Greeting */}
      <header>
        <p className="rs-greet-date">{todayLabel()}</p>
        <h1 className="rs-greet-title">¡Hola, {tutorName}! 👋</h1>
        <p className="rs-greet-sub">Seguí de cerca el entrenamiento y los logros de tu familia.</p>
      </header>

      {/* Athlete selector */}
      <section>
        <div className="rs-head">
          <h2 className="rs-head-title">Mis atletas</h2>
          <button className="rs-link" type="button">
            Gestionar
            <MaterialIcon name="chevron_right" />
          </button>
        </div>

        <div className="rs-athletes">
          {roster.map((student) => {
            const isActive = hasRealData ? student.id === selectedStudentId : student.id === activeStudent.id;

            return (
              <button
                className={`rs-athlete ${isActive ? "active" : ""}`}
                key={student.id}
                onClick={() => hasRealData && setSelectedStudentId(student.id)}
                type="button"
              >
                <span className="rs-avatar">{getInitials(student)}</span>
                <span>{student.firstName}</span>
              </button>
            );
          })}

          <button className="rs-athlete" type="button">
            <span className="rs-avatar add">
              <MaterialIcon name="add" />
            </span>
            <span>Añadir</span>
          </button>
        </div>
      </section>

      {/* Hero credential */}
      <section className="rs-hero">
        <div className="rs-hero-top">
          <span className="rs-hero-tag">
            <MaterialIcon name="verified" filled />
            Atleta activo
          </span>
          <span className="rs-hero-logo">
            <MaterialIcon name="bolt" filled />
          </span>
        </div>

        <div className="rs-hero-id">
          <span className="rs-hero-avatar">{getInitials(activeStudent)}</span>
          <div>
            <p className="rs-hero-eyebrow">FICHA DEL ATLETA</p>
            <h2 className="rs-hero-name">
              {activeStudent.firstName} {activeStudent.lastName}
            </h2>
            <p className="rs-hero-meta">
              <MaterialIcon name="location_on" filled />
              {activeStudent.sede?.name ?? "Sucursal Central"}
            </p>
          </div>
        </div>

        <div className="rs-hero-foot">
          <div className="rs-hero-kpi">
            <strong>{activeDisciplines.length}</strong>
            <small>Disciplinas</small>
          </div>
          <div className="rs-hero-kpi">
            <strong>{streakWeeks}</strong>
            <small>Sem. activo</small>
          </div>
          <div className="rs-hero-kpi">
            <strong>{levelOrder ?? "—"}</strong>
            <small>Nivel</small>
          </div>
        </div>
      </section>

      {/* Weekly energy / attendance */}
      {activeDisciplines.length > 0 && (
        <section className="rs-ringcard">
          <div className="rs-ring" style={{ "--pct": attendance } as CSSProperties}>
            <div className="rs-ring-inner">
              <strong>{attendance}%</strong>
              <small>Asistencia</small>
            </div>
          </div>
          <div className="rs-ringcard-side">
            <p className="rs-ringcard-title">¡Gran semana!</p>
            <p className="rs-ringcard-sub">
              {activeStudent.firstName} asistió a {classesAttended} de 5 clases.
            </p>
            <span className="rs-streak">
              <MaterialIcon name="local_fire_department" filled />
              {streakWeeks} semanas en racha
            </span>
          </div>
        </section>
      )}

      {/* Disciplines */}
      <section>
        <div className="rs-head">
          <h2 className="rs-head-title">Disciplinas activas</h2>
          {activeDisciplines.length > 0 && <span className="rs-count">{activeDisciplines.length}</span>}
        </div>

        {activeDisciplines.length > 0 ? (
          <div className="rs-disc-list">
            {activeDisciplines.map((item, index) => (
              <Link className="rs-disc" key={item.id} to="/niveles">
                <span className="rs-disc-icon">
                  <MaterialIcon name={getDisciplineIcon(item.discipline.name)} filled />
                </span>
                <div className="rs-disc-body">
                  <p className="rs-disc-name">{item.discipline.name}</p>
                  <p className="rs-disc-sched">
                    <MaterialIcon name="schedule" />
                    {getSchedule(item.discipline.name, index)}
                  </p>
                  {item.level?.name && <span className="rs-disc-level">Nivel {item.level.name}</span>}
                </div>
                <span className="rs-disc-go">
                  <MaterialIcon name="chevron_right" />
                </span>
              </Link>
            ))}

            <Link className="rs-disc add" to="/niveles">
              <span className="rs-disc-icon">
                <MaterialIcon name="add" />
              </span>
              <div className="rs-disc-body">
                <p className="rs-disc-name">Sumar disciplina</p>
                <p className="rs-disc-sched">Explorá las actividades disponibles</p>
              </div>
              <span className="rs-disc-go">
                <MaterialIcon name="chevron_right" />
              </span>
            </Link>
          </div>
        ) : (
          <div className="rs-empty">
            <MaterialIcon name="exercise" />
            <h3>Sin disciplinas activas</h3>
            <p>Cuando el staff asigne disciplinas, aparecerán en este bloque.</p>
          </div>
        )}
      </section>

      {/* Coach tip */}
      <section className="rs-coach">
        <p className="rs-coach-head">
          <MaterialIcon name="tips_and_updates" filled />
          Consejo de la semana
        </p>
        <p className="rs-coach-text">La hidratación es el combustible invisible del campeón.</p>
        <p className="rs-coach-author">— Equipo de entrenadores</p>
      </section>
    </div>
  );
};
