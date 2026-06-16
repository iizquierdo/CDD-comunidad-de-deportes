import type { Pool } from 'pg';
import { removeModuleMenu } from '@sinapsis/module-sdk-server';

interface UninstallContext {
  pool: Pool;
  moduleCode: string;
  moduleName: string;
  moduleDescription?: string | null;
  purgeData?: boolean;
}

export default async function uninstallTeachersModule(ctx: UninstallContext) {
  const { pool, moduleCode } = ctx;

  await pool.query('UPDATE "SystemModule" SET status = $1, "updatedAt" = NOW() WHERE code = $2', ['Inactive', moduleCode]);
  await removeModuleMenu(pool, 'teachers');

  // Teachers are real User accounts (role Profesor) shared with the rest of the app
  // (login, class assignments, messaging) — never delete them on uninstall.
}
