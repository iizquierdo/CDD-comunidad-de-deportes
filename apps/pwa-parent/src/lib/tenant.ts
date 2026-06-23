const TENANT_KEY = "ecosistema_parent_tenant";

export const getTenantId = (): string | null => {
  try {
    return localStorage.getItem(TENANT_KEY) || null;
  } catch {
    return null;
  }
};

export const setTenantId = (id: string) => {
  try {
    localStorage.setItem(TENANT_KEY, id.trim());
  } catch {}
};
