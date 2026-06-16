import type { Pool } from 'pg';
import {
  ensureCategoryWithItems,
  ensureSystemModule,
  ensureRole,
  grantModulePermission,
  seedModuleMenu,
  ensureCoreReferenceTemplate,
  propagateReferenceTemplateToAllCompanies,
  NATACION_ROLES
} from '@sinapsis/module-sdk-server';

interface InstallContext {
  pool: Pool;
  moduleCode: string;
  moduleName: string;
  moduleDescription?: string | null;
}

export default async function installClassesModule(ctx: InstallContext) {
  const { pool, moduleCode, moduleName, moduleDescription } = ctx;

  await ensureSystemModule(pool, { code: moduleCode, name: moduleName, description: moduleDescription });

  await ensureCategoryWithItems(pool, {
    code: 'CLASS_STATUS',
    name: 'Class Status',
    module: 'Classes',
    description: 'Estados de una clase',
    items: ['ACTIVE', 'INACTIVE', 'ARCHIVED']
  });

  // Auto-incrementing class code (CLS-0001) per company.
  await ensureCoreReferenceTemplate(pool, { module: 'CLASSES', code: 'CLASSES', prefix: 'CLS-', digits: 4, reference: 0 });
  await propagateReferenceTemplateToAllCompanies(pool, 'CLASSES', 'CLASSES');

  await ensureRole(pool, NATACION_ROLES.SUPER_ADMIN, 'Acceso total al sistema');
  await ensureRole(pool, NATACION_ROLES.ADMIN_SEDE, 'Administrador de una sede');
  await ensureRole(pool, NATACION_ROLES.PROFESOR, 'Profesor / staff técnico');
  await ensureRole(pool, NATACION_ROLES.TUTOR, 'Tutor / responsable de alumno');

  // Coarse module access; fine-grained scoping (own classes for a profesor, sede
  // scoping for an admin sede) is enforced in the server.
  await grantModulePermission(pool, { roleName: NATACION_ROLES.SUPER_ADMIN, moduleCode, canRead: true, canCreate: true, canWrite: true, canDelete: true });
  await grantModulePermission(pool, { roleName: NATACION_ROLES.ADMIN_SEDE, moduleCode, canRead: true, canCreate: true, canWrite: true, canDelete: true });
  await grantModulePermission(pool, { roleName: NATACION_ROLES.PROFESOR, moduleCode, canRead: true });
  await grantModulePermission(pool, { roleName: NATACION_ROLES.TUTOR, moduleCode, canRead: true });

  await seedModuleMenu(pool, {
    moduleCode,
    group: { key: 'classes', label: 'Clases', icon: 'fa-calendar-days', sortOrder: 41 },
    items: [{ label: 'Clases', icon: 'fa-calendar-days', viewKey: 'Classes', sortOrder: 0 }]
  });
}
