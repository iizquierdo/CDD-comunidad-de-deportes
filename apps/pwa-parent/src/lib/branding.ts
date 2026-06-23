import type { GlobalSettings } from "../types";

const BRANDING_STORAGE_KEY = "ecosistema_parent_branding";

export interface BrandingSnapshot {
  appName: string;
  logoUrl: string | null;
  isologoUrl: string | null;
  loginBackgroundUrl: string | null;
}

export const DEFAULT_BRANDING: BrandingSnapshot = {
  appName: "Ecosistema Deporbas",
  logoUrl: "https://deporbas.com/wp-content/uploads/2024/08/cropped-cropped-logo-contorno-blanco-192x192.png",
  isologoUrl: null,
  loginBackgroundUrl: null
};

const str = (v: unknown): string | null => {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};

export const readBrandingFromStorage = (): BrandingSnapshot => {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;

    const parsed = JSON.parse(raw) as Partial<BrandingSnapshot>;
    return {
      appName: str(parsed.appName) ?? DEFAULT_BRANDING.appName,
      logoUrl: str(parsed.logoUrl) ?? DEFAULT_BRANDING.logoUrl,
      isologoUrl: str(parsed.isologoUrl),
      loginBackgroundUrl: str(parsed.loginBackgroundUrl)
    };
  } catch {
    return DEFAULT_BRANDING;
  }
};

export const saveBrandingToStorage = (
  settings?: Pick<GlobalSettings, "appName" | "logoUrl" | "isologoUrl" | "loginBackgroundUrl"> | null
) => {
  if (!settings?.appName?.trim()) return;

  const snapshot: BrandingSnapshot = {
    appName: settings.appName,
    logoUrl: settings.logoUrl ?? null,
    isologoUrl: settings.isologoUrl ?? null,
    loginBackgroundUrl: settings.loginBackgroundUrl ?? null
  };

  localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(snapshot));
};

export const applyDocumentTitle = (appName: string) => {
  document.title = `${appName} | Familias`;
};
