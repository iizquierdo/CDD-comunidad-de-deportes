import type { Pool } from 'pg';
import {
  ensureSystemModule,
  grantModulePermission,
  seedModuleMenu,
  NATACION_ROLES
} from '@sinapsis/module-sdk-server';

interface InstallContext {
  pool: Pool;
  moduleCode: string;
  moduleName: string;
  moduleDescription?: string | null;
}

export default async function installMessagingModule(ctx: InstallContext) {
  const { pool, moduleCode, moduleName, moduleDescription } = ctx;

  await ensureSystemModule(pool, {
    code: moduleCode,
    name: moduleName,
    description: moduleDescription || 'Mensajeria entre padres y profesores vinculada a alumnos'
  });

  await Promise.all([
    grantModulePermission(pool, { roleName: NATACION_ROLES.TUTOR, moduleCode, canRead: true, canCreate: true, canWrite: true, canDelete: false }),
    grantModulePermission(pool, { roleName: NATACION_ROLES.PROFESOR, moduleCode, canRead: true, canCreate: true, canWrite: true, canDelete: false }),
    grantModulePermission(pool, { roleName: NATACION_ROLES.ADMIN_SEDE, moduleCode, canRead: true, canCreate: false, canWrite: false, canDelete: false }),
  ]);

  await seedModuleMenu(pool, {
    moduleCode,
    group: { key: 'messaging', label: 'Mensajeria', icon: 'fa-comments', sortOrder: 70 },
    items: [{ label: 'Mensajes', icon: 'fa-envelope', viewKey: 'Messaging', sortOrder: 0 }]
  });
}
