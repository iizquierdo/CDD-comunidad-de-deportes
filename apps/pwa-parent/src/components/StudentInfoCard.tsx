import { MaterialIcon } from "./MaterialIcon";
import { StudentAvatar } from "./StudentAvatar";
import type { StudentSummary } from "../types";

export const studentLabel = (s: Pick<StudentSummary, "firstName" | "lastName">) =>
  `${s.firstName} ${s.lastName}`.trim();

interface StudentInfoCardProps {
  student: StudentSummary | null;
  loading?: boolean;
  className?: string;
}

export const StudentInfoCard = ({ student, loading = false, className = "" }: StudentInfoCardProps) => {
  if (!student && !loading) return null;

  const activeClasses = (student?.classes ?? []).filter((c) => c.status === "ACTIVE");
  const teachers = student?.teachers ?? [];

  return (
    <div className={`rounded-2xl bg-white p-3 shadow-[0_4px_20px_rgb(0,0,0,0.04)] ${className}`}>
      <div className="flex items-center gap-2.5">
        {student ? (
          <StudentAvatar size="h-10 w-10" student={student} variant="active" shape="rounded" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-400">
            ?
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {student ? studentLabel(student) : "—"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {student?.sede && (
              <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
                <MaterialIcon name="location_on" className="text-[12px]" />
                {student.sede.name}
              </span>
            )}
            {student?.disciplines
              ?.filter((d) => d.status === "ACTIVE")
              .map((d) => (
                <span
                  key={d.id}
                  className="rounded-full bg-[var(--primary-softer)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]"
                >
                  {d.discipline.name}
                  {d.level ? ` · ${d.level.name}` : ""}
                </span>
              ))}
          </div>
        </div>
        {loading && (
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--primary)]" />
        )}
      </div>

      {!loading && student && (activeClasses.length > 0 || teachers.length > 0) && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {activeClasses.length > 0 && (
            <div className="flex min-w-0 items-center gap-1.5 text-xs leading-tight">
              <MaterialIcon name="school" className="shrink-0 text-[14px] text-slate-400" />
              <span className="shrink-0 text-slate-400">Clases</span>
              <span className="truncate font-medium text-slate-700">
                {activeClasses.map((c) => c.name).join(" · ")}
              </span>
            </div>
          )}
          {teachers.length > 0 && (
            <div className="flex min-w-0 items-center gap-1.5 text-xs leading-tight">
              <MaterialIcon name="person" className="shrink-0 text-[14px] text-slate-400" />
              <span className="shrink-0 text-slate-400">
                {teachers.length > 1 ? "Profesores" : "Profesor"}
              </span>
              <span className="truncate font-medium text-slate-700">
                {teachers.map((t) => `${t.firstName} ${t.lastName}`.trim()).join(" · ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
