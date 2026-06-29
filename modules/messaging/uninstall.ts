import type { Pool } from 'pg';
import { removeModuleMenu } from '@sinapsis/module-sdk-server';

interface UninstallContext {
  pool: Pool;
  moduleCode: string;
  purgeData?: boolean;
}

export default async function uninstallMessagingModule(ctx: UninstallContext) {
  const { pool, moduleCode, purgeData = false } = ctx;

  await pool.query('UPDATE "SystemModule" SET status = $1, "updatedAt" = NOW() WHERE code = $2', ['Inactive', moduleCode]);
  await removeModuleMenu(pool, 'messaging');

  if (!purgeData) return;

  await pool.query('DELETE FROM "MessageRead"');
  await pool.query('DELETE FROM "Message"');
  await pool.query('DELETE FROM "ConversationParticipant"');
  await pool.query('DELETE FROM "Conversation"');
}
