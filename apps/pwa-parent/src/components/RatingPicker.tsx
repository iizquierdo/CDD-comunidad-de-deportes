export const RATING_THEMES = [
  { key: "stars", emoji: "⭐", label: "Estrellas", empty: "☆", filled: "⭐", fillUp: true },
  { key: "hearts", emoji: "❤️", label: "Corazones", empty: "🤍", filled: "❤️", fillUp: true },
  { key: "faces", emoji: "😊", label: "Caritas", fillUp: false, icons: ["😢", "😕", "😐", "🙂", "😄"] },
  { key: "trophies", emoji: "🏆", label: "Copas", empty: "🥉", filled: "🏆", fillUp: true },
  { key: "fire", emoji: "🔥", label: "Fuego", empty: "⚪", filled: "🔥", fillUp: true },
  { key: "lightning", emoji: "⚡", label: "Rayos", empty: "⚪", filled: "⚡", fillUp: true },
  { key: "muscles", emoji: "💪", label: "Fuerza", empty: "⚪", filled: "💪", fillUp: true },
  { key: "medals", emoji: "🥇", label: "Medallas", empty: "⚪", filled: "🥇", fillUp: true }
] as const;

type FillUpTheme = (typeof RATING_THEMES)[number] & { fillUp: true; empty: string; filled: string };
type FacesTheme = (typeof RATING_THEMES)[number] & { fillUp: false; icons: readonly string[] };

const getTheme = (theme: string) => RATING_THEMES.find((x) => x.key === theme) ?? RATING_THEMES[0];

export const RatingDisplay = ({ rating, theme }: { rating: number; theme: string }) => {
  const t = getTheme(theme);
  if (!t.fillUp) {
    const faces = t as FacesTheme;
    const icon = faces.icons[rating - 1];
    return (
      <span className="flex items-center gap-1">
        <span className="text-xl leading-none">{icon}</span>
        <span className="text-[10px] text-slate-400">{rating}/5</span>
      </span>
    );
  }
  const fill = t as FillUpTheme;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`text-sm leading-none ${i < rating ? "opacity-100" : "opacity-20 grayscale"}`}>
          {i < rating ? fill.filled : fill.empty}
        </span>
      ))}
      <span className="ml-1 text-[10px] text-slate-400">{rating}/5</span>
    </span>
  );
};
