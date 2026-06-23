import { useState } from "react";
import { resolveMediaUrl } from "../lib/media";
import type { ClassTeacherRef } from "../types";

const getInitials = (teacher: Pick<ClassTeacherRef, "firstName" | "lastName">) =>
  `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(0)}`.toUpperCase();

type TeacherAvatarVariant = "dark" | "light";

const imageRingClasses: Record<TeacherAvatarVariant, string> = {
  dark: "ring-2 ring-white/30",
  light: "ring-1 ring-slate-100"
};

const fallbackClasses: Record<TeacherAvatarVariant, string> = {
  dark: "bg-white/20 text-[10px] font-bold text-white ring-2 ring-white/30",
  light: "bg-[var(--primary-softer)] text-[10px] font-bold text-[var(--primary)] ring-1 ring-slate-100"
};

interface TeacherAvatarProps {
  teacher: Pick<ClassTeacherRef, "firstName" | "lastName" | "avatarUrl">;
  size?: string;
  variant?: TeacherAvatarVariant;
  className?: string;
}

export const TeacherAvatar = ({
  teacher,
  size = "h-6 w-6",
  variant = "dark",
  className = ""
}: TeacherAvatarProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(teacher);
  const src = resolveMediaUrl(teacher.avatarUrl);
  const showImage = Boolean(src) && !imgFailed;
  const label = `${teacher.firstName} ${teacher.lastName}`.trim();

  if (showImage) {
    return (
      <img
        alt={label}
        className={`${size} shrink-0 rounded-full object-cover ${imageRingClasses[variant]} ${className}`}
        onError={() => setImgFailed(true)}
        src={src!}
      />
    );
  }

  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full ${fallbackClasses[variant]} ${className}`}
    >
      {initials || "?"}
    </span>
  );
};
