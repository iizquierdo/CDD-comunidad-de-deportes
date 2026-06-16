import type { Pool } from 'pg';
import { removeModuleMenu } from '@sinapsis/module-sdk-server';

interface UninstallContext {
  pool: Pool;
  moduleCode: string;
  moduleName: string;
  moduleDescription?: string | null;
  purgeData?: boolean;
}

export default async function uninstallClassesModule(ctx: UninstallContext) {
  const { pool, moduleCode, purgeData } = ctx;

  await pool.query('UPDATE "SystemModule" SET status = $1, "updatedAt" = NOW() WHERE code = $2', ['Inactive', moduleCode]);
  await removeModuleMenu(pool, 'classes');

  // Only drop class data when explicitly requested. Class tables cascade on
  // their own rows; discipline/student records (other modules) are never touched.
  if (purgeData) {
    await pool.query('DROP TABLE IF EXISTS "ClassStudent" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "ClassSchedule" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "ClassTeacher" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "ClassLevel" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "Class" CASCADE');
  }
}
