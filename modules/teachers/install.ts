import type { Pool } from 'pg';
import {
  ensureSystemModule,
  ensureRole,
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

export default async function installTeachersModule(ctx: InstallContext) {
  const { pool, moduleCode, moduleName, moduleDescription } = ctx;

  await ensureSystemModule(pool, { code: moduleCode, name: moduleName, description: moduleDescription });

  // A "Profesor" is a User with the Profesor role; ensure the extra contact columns exist.
  await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT');
  await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "document" TEXT');

  await ensureRole(pool, NATACION_ROLES.SUPER_ADMIN, 'Acceso total al sistema');
  await ensureRole(pool, NATACION_ROLES.ADMIN_SEDE, 'Administrador de una sede');
  await ensureRole(pool, NATACION_ROLES.PROFESOR, 'Profesor / staff técnico');

  // Only staff (Super Admin / Admin Sede) manage teachers.
  await grantModulePermission(pool, { roleName: NATACION_ROLES.SUPER_ADMIN, moduleCode, canRead: true, canCreate: true, canWrite: true, canDelete: true });
  await grantModulePermission(pool, { roleName: NATACION_ROLES.ADMIN_SEDE, moduleCode, canRead: true, canCreate: true, canWrite: true, canDelete: true });

  await seedModuleMenu(pool, {
    moduleCode,
    group: { key: 'teachers', label: 'Profesores', icon: 'fa-chalkboard-user', sortOrder: 30 },
    items: [{ label: 'Profesores', icon: 'fa-chalkboard-user', viewKey: 'Teachers', sortOrder: 0 }]
  });
}
