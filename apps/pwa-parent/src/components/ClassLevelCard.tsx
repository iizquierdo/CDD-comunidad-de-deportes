import { DisciplineAvatar } from "./DisciplineAvatar";
import { TeacherAvatar } from "./TeacherAvatar";
import type { ClassTeacherRef } from "../types";

interface ClassLevelCardProps {
  name: string;
  coverUrl?: string | null;
  imageUrl?: string | null;
  iconName: string;
  levelOrder?: number | null;
  levelName?: string | null;
  description?: string | null;
  teachers?: ClassTeacherRef[];
}

export const ClassLevelCard = ({
  name,
  coverUrl,
  imageUrl,
  iconName,
  levelOrder,
  levelName,
  description,
  teachers = []
}: ClassLevelCardProps) => {
  const title = levelName || name;

  return (
    <div className="col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      {coverUrl ? (
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          src={coverUrl}
        />
      ) : (
        <>
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/5" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/20" />

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <DisciplineAvatar
            className="ring-2 ring-white/30"
            iconName={iconName}
            imageUrl={imageUrl}
            name={name}
            size="h-14 w-14"
          />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              Nivel {levelOrder ?? 0}
            </span>
            <h2 className="mt-2 text-2xl font-bold leading-tight">{title}</h2>
            {levelName && name !== levelName && (
              <p className="mt-1 truncate text-sm font-medium text-white/80">{name}</p>
            )}
          </div>
        </div>

        {description && (
          <p className="mt-4 text-sm leading-relaxed text-white/75">{description}</p>
        )}

        {teachers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
            {teachers.map((teacher) => {
              const label = `${teacher.firstName} ${teacher.lastName}`.trim();
              return (
                <div key={teacher.id} className="flex min-w-0 max-w-full items-center gap-1.5">
                  <TeacherAvatar teacher={teacher} />
                  <span className="truncate text-xs font-medium text-white/90">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
