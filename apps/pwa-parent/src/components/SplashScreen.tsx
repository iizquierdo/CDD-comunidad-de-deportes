import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { readBrandingFromStorage } from "../lib/branding";
import { MaterialIcon } from "./MaterialIcon";

interface Props {
  onDone: () => void;
}

const PARTICLES = [
  { icon: "pool",               x: 7,  size: 30, opacity: 0.13, dur: 13, delay: 0    },
  { icon: "sports_soccer",      x: 19, size: 20, opacity: 0.09, dur: 10, delay: -4   },
  { icon: "sports_basketball",  x: 33, size: 34, opacity: 0.11, dur: 15, delay: -8   },
  { icon: "sports_tennis",      x: 48, size: 18, opacity: 0.16, dur: 11, delay: -1.5 },
  { icon: "sports_volleyball",  x: 62, size: 26, opacity: 0.10, dur: 14, delay: -6   },
  { icon: "fitness_center",     x: 77, size: 22, opacity: 0.13, dur: 10, delay: -10  },
  { icon: "directions_run",     x: 88, size: 28, opacity: 0.08, dur: 16, delay: -2.5 },
  { icon: "surfing",            x: 13, size: 24, opacity: 0.10, dur: 12, delay: -7   },
  { icon: "kayaking",           x: 41, size: 20, opacity: 0.12, dur:  9, delay: -3   },
  { icon: "skateboarding",      x: 56, size: 32, opacity: 0.09, dur: 13, delay: -11  },
  { icon: "sports_gymnastics",  x: 70, size: 22, opacity: 0.14, dur: 11, delay: -5   },
  { icon: "sports_handball",    x: 24, size: 18, opacity: 0.10, dur: 14, delay: -9   },
  { icon: "snowboarding",       x: 82, size: 26, opacity: 0.08, dur: 12, delay: -0.5 },
  { icon: "sports_martial_arts",x: 95, size: 20, opacity: 0.11, dur: 10, delay: -13  },
];

export const SplashScreen = ({ onDone }: Props) => {
  const [visible, setVisible] = useState(true);
  const branding = readBrandingFromStorage();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const logoSrc = branding.isologoUrl ?? branding.logoUrl ?? null;
  const hasLogo = Boolean(logoSrc && !logoLoadFailed);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), 3500);
    const doneTimer = setTimeout(() => onDone(), 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        background:
          "radial-gradient(ellipse 90% 55% at 15% 10%, rgba(255,255,255,0.20) 0%, transparent 55%)," +
          "radial-gradient(ellipse 70% 45% at 85% 95%, rgba(0,0,0,0.28) 0%, transparent 55%)," +
          "radial-gradient(ellipse 60% 50% at 80% 5%,  rgba(255,255,255,0.08) 0%, transparent 40%)," +
          "var(--primary)",
      }}
    >
      {/* Floating sports icons */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="material-symbols-rounded icon-filled absolute select-none"
          style={{
            left: `${p.x}%`,
            bottom: "-10%",
            fontSize: `${p.size}px`,
            color: "white",
            opacity: p.opacity,
            animation: `splash-rise ${p.dur}s linear ${p.delay}s infinite`,
          }}
        >
          {p.icon}
        </span>
      ))}

      {/* Center content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5">
        {hasLogo ? (
          <img
            alt={branding.appName}
            className="h-24 w-24 rounded-2xl object-contain"
            onError={() => setLogoLoadFailed(true)}
            src={logoSrc ?? undefined}
            style={{ animation: "splash-pulse 2.5s ease-in-out infinite" }}
          />
        ) : (
          <MaterialIcon
            name="pool"
            filled
            className="text-[6rem] text-white"
            style={{ animation: "splash-pulse 2.5s ease-in-out infinite" } as CSSProperties}
          />
        )}

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            {branding.appName}
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">Portal de Familias</p>
        </div>
      </div>

      {/* Bottom loader dots */}
      <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/60"
            style={{ animation: `splash-pulse 1.2s ease-in-out ${i * 0.3}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
};
