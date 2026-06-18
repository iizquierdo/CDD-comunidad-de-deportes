import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../lib/api";
import { fetchPublicBranding } from "../lib/data";
import {
  applyDocumentTitle,
  readBrandingFromStorage,
  saveBrandingToStorage
} from "../lib/branding";
import { applyThemeFromSettings } from "../lib/theme";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState(() => readBrandingFromStorage());
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const hasCustomLogo = Boolean(branding.logoUrl && !logoLoadFailed);

  useEffect(() => {
    let cancelled = false;

    const loadBranding = async () => {
      try {
        const data = await fetchPublicBranding();
        if (cancelled || !data) return;

        applyThemeFromSettings(data);
        saveBrandingToStorage(data);
        setBranding({
          appName: data.appName,
          logoUrl: data.logoUrl ?? null
        });
        setLogoLoadFailed(false);
      } catch {
        if (cancelled) return;
      }
    };

    void loadBranding();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyDocumentTitle(branding.appName);
  }, [branding.appName]);

  const canSubmit = useMemo(
    () => !loading && email.trim().length > 0 && password.trim().length >= 8,
    [email, loading, password]
  );

  if (isAuthenticated) {
    return <Navigate to="/resumen" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.includes("@")) {
      setError("Ingresa un email válido para iniciar sesión.");
      return;
    }

    setLoading(true);

    try {
      await login(email, password, remember);
      navigate("/resumen", { replace: true });
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  const autofillDemo = () => {
    setEmail("tutor.demo@natacion.local");
    setPassword("Demo1234");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Aurora blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-20 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-blue-200/25 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-48 w-48 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          {hasCustomLogo ? (
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <img
                alt={branding.appName}
                className="h-full w-full object-contain"
                onError={() => setLogoLoadFailed(true)}
                src={branding.logoUrl ?? undefined}
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] shadow-lg">
              <MaterialIcon name="fitness_center" filled className="text-2xl text-white" />
            </div>
          )}
          <h1 className="text-lg font-bold text-slate-900">{branding.appName}</h1>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <h2 className="text-xl font-bold text-slate-900">Bienvenido</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa tus credenciales para acceder al seguimiento de tu familia.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                htmlFor="email"
              >
                Email
              </label>
              <div className="mt-1 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors focus-within:border-[var(--primary)] focus-within:bg-white">
                <MaterialIcon name="mail" className="text-base text-slate-400" />
                <input
                  autoComplete="email"
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <button className="text-xs font-medium text-[var(--primary)]" type="button">
                  ¿Olvidaste?
                </button>
              </div>
              <div className="mt-1 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors focus-within:border-[var(--primary)] focus-within:bg-white">
                <MaterialIcon name="lock" className="text-base text-slate-400" />
                <input
                  autoComplete="current-password"
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  type="button"
                >
                  <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} className="text-base" />
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                checked={remember}
                className="accent-[var(--primary)] h-4 w-4 rounded"
                onChange={(e) => setRemember(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm text-slate-600">Mantener sesión iniciada</span>
            </label>

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-4 text-sm font-semibold text-white shadow-lg transition-opacity disabled:opacity-50"
              disabled={!canSubmit}
              type="submit"
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
              <MaterialIcon name="arrow_forward" className="text-base" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Nuevo en la familia?{" "}
            <button className="font-semibold text-[var(--primary)]" type="button">
              Contactá a tu asesor
            </button>
          </p>
        </div>

        {/* Demo chip */}
        <button
          className="mt-3 w-full rounded-full border border-slate-200 bg-white/70 py-3 text-sm font-medium text-slate-500 backdrop-blur-sm transition-colors hover:bg-white"
          onClick={autofillDemo}
          type="button"
        >
          Usar Credenciales DEMO
        </button>
      </div>
    </div>
  );
};
