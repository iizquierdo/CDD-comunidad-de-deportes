import React, { useEffect, useState } from 'react';
import MenuManagement from '@/components/MenuManagement';
import { getClientModules } from '@/module-registry';
import { adminFetch, getAdminToken } from '../api';

const MenusPage: React.FC = () => {
  const token = getAdminToken();
  const clientModules = getClientModules();
  const [activeModuleCodes, setActiveModuleCodes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    adminFetch('/api/admin/modules')
      .then((res) => (res.ok ? res.json() : []))
      .then((mods: { code?: string; status?: string }[]) => {
        if (cancelled) return;
        setActiveModuleCodes(
          (Array.isArray(mods) ? mods : [])
            .filter((mod) => String(mod.status || '') === 'Active')
            .map((mod) => String(mod.code || '').toUpperCase())
            .filter(Boolean)
        );
      })
      .catch(() => {
        if (!cancelled) setActiveModuleCodes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MenuManagement
      clientModules={clientModules}
      activeModuleCodes={activeModuleCodes}
      apiBasePath="/api/admin/menu-config"
      defaultHeaders={{ Authorization: `Bearer ${token}` }}
    />
  );
};

export default MenusPage;
