import express from 'express';
import crypto from 'crypto';
import type { Pool } from 'pg';
import {
  resolveTenantAuthContext,
  resolveRequesterScope,
  getRequesterUserId,
  ensureRole,
  NATACION_ROLES,
  type RequesterScope
} from '@sinapsis/module-sdk-server';

interface TeachersModuleContext {
  app: express.Express;
  pool: Pool;
}

const MODULE_CODE = 'TEACHERS';

/**
 * A "Profesor" is a User with the Profesor role. This module is the tenant-side ABM
 * for those accounts (basic data only). Profesor↔class links live in the Classes
 * module (ClassTeacher) and are managed from the class record.
 */
export default function registerTeachersModule({ app, pool }: TeachersModuleContext) {
  const router = express.Router();

  const requesterId = (req: express.Request): string =>
    String((req as any).authUserId || getRequesterUserId(req) || '').trim();

  const ensureActive = async () => {
    const mod = await pool.query('SELECT status FROM "SystemModule" WHERE code = $1 LIMIT 1', [MODULE_CODE]);
    return String(mod.rows[0]?.status || '') === 'Active';
  };

  let columnsEnsured = false;
  const ensureColumns = async () => {
    if (columnsEnsured) return;
    await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT');
    await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "document" TEXT');
    columnsEnsured = true;
  };

  const tableExists = async (name: string) => {
    const r = await pool.query('SELECT to_regclass($1) AS t', [`public."${name}"`]);
    return Boolean(r.rows[0]?.t);
  };

  const getProfesorRoleId = () => ensureRole(pool, NATACION_ROLES.PROFESOR, 'Profesor / staff técnico');

  /**
   * SQL WHERE fragment (+params) limiting profesor users to the requester's scope.
   * Always confined to the requester's organization; Admin Sede is further
   * limited to its companies. Returns 'false' when nothing is visible.
   */
  const scopedClause = (scope: RequesterScope, organizationId: string, params: any[]): string => {
    params.push(organizationId);
    let clause = `c."organizationId" = $${params.length}`;
    if (!scope.isSuperAdmin) {
      if (!scope.companyScope.length) return 'false';
      params.push(scope.companyScope);
      clause += ` AND u."companyId" = ANY($${params.length})`;
    }
    return clause;
  };

  const loadTeacher = async (id: string) => {
    const r = await pool.query(
      `SELECT u.id, u.email, u.name, u."firstName", u."lastName", u.phone, u.document,
              u."companyId", c.name AS "companyName", u."createdAt"
       FROM "User" u JOIN "Company" c ON c.id = u."companyId"
       WHERE u.id = $1 LIMIT 1`,
      [id]
    );
    return r.rows[0] || null;
  };

  type Auth = { scope: RequesterScope; organizationId: string };
  const authStaff = async (req: express.Request, res: express.Response): Promise<Auth | null> => {
    const uid = requesterId(req);
    const scope = await resolveRequesterScope(pool, uid);
    const ctx = await resolveTenantAuthContext(pool, uid);
    if (!scope || !ctx) { res.status(401).json({ error: 'Authenticated user is required.' }); return null; }
    if (!scope.isStaff) { res.status(403).json({ error: 'Only staff can manage teachers.' }); return null; }
    return { scope, organizationId: ctx.organizationId };
  };

  /** Loads a profesor user if it is within the requester's org + company scope. */
  const findInScope = async (auth: Auth, id: string) => {
    const r = await pool.query(
      `SELECT u.*, c."organizationId" AS "orgId"
       FROM "User" u JOIN "Company" c ON c.id = u."companyId" JOIN "Role" r ON r.id = u."roleId"
       WHERE u.id = $1 AND r.name = $2 LIMIT 1`,
      [id, NATACION_ROLES.PROFESOR]
    );
    const row = r.rows[0];
    if (!row || row.orgId !== auth.organizationId) return null;
    if (!auth.scope.isSuperAdmin && !auth.scope.companyScope.includes(row.companyId)) return null;
    return row;
  };

  /** Validates a sede belongs to the org and is reachable by the requester. */
  const assertSede = async (auth: Auth, companyId: string, res: express.Response): Promise<boolean> => {
    const cc = await pool.query('SELECT 1 FROM "Company" WHERE id = $1 AND "organizationId" = $2 LIMIT 1', [companyId, auth.organizationId]);
    if (!cc.rows[0]) { res.status(400).json({ error: 'Sede out of scope.' }); return false; }
    if (!auth.scope.isSuperAdmin && !auth.scope.companyScope.includes(companyId)) { res.status(403).json({ error: 'Sede out of scope.' }); return false; }
    return true;
  };

  // ---- List -----------------------------------------------------------------
  router.get('/', async (req, res) => {
    try {
      if (!(await ensureActive())) return res.status(409).json({ error: 'Teachers module is not active.' });
      await ensureColumns();
      const auth = await authStaff(req, res);
      if (!auth) return;

      const params: any[] = [];
      const clause = scopedClause(auth.scope, auth.organizationId, params);
      if (clause === 'false') return res.json([]);

      const search = String(req.query.search || '').trim();
      let searchClause = '';
      if (search) {
        params.push(`%${search}%`);
        searchClause = `AND (LOWER(COALESCE(u."firstName",'') || ' ' || COALESCE(u."lastName",'')) LIKE LOWER($${params.length}) OR LOWER(u.email) LIKE LOWER($${params.length}) OR LOWER(COALESCE(u.document,'')) LIKE LOWER($${params.length}))`;
      }

      params.push(NATACION_ROLES.PROFESOR);
      const result = await pool.query(
        `SELECT u.id, u.email, u.name, u."firstName", u."lastName", u.phone, u.document,
                u."companyId", c.name AS "companyName", u."createdAt"
         FROM "User" u
         JOIN "Company" c ON c.id = u."companyId"
         JOIN "Role" r ON r.id = u."roleId"
         WHERE r.name = $${params.length} AND ${clause} ${searchClause}
         ORDER BY u."lastName" ASC, u."firstName" ASC`,
        params
      );
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch teachers', details: error.message });
    }
  });

  // ---- Create ---------------------------------------------------------------
  router.post('/', async (req, res) => {
    try {
      if (!(await ensureActive())) return res.status(409).json({ error: 'Teachers module is not active.' });
      await ensureColumns();
      const auth = await authStaff(req, res);
      if (!auth) return;

      const firstName = String(req.body?.firstName || '').trim();
      const lastName = String(req.body?.lastName || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const companyId = String(req.body?.companyId || '').trim() || auth.scope.primaryCompanyId || '';
      if (!firstName || !lastName) return res.status(400).json({ error: 'firstName and lastName are required.' });
      if (!email) return res.status(400).json({ error: 'email is required.' });
      if (!password) return res.status(400).json({ error: 'password is required.' });
      if (!companyId) return res.status(400).json({ error: 'companyId (sede) is required.' });
      if (!(await assertSede(auth, companyId, res))) return;

      const profesorRoleId = await getProfesorRoleId();
      const id = crypto.randomUUID();
      const name = `${firstName} ${lastName}`.trim();
      await pool.query(
        `INSERT INTO "User" (id, email, name, "firstName", "lastName", password, role, "roleId", "companyId", phone, document, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
        [
          id, email, name, firstName, lastName, password, NATACION_ROLES.PROFESOR, profesorRoleId, companyId,
          String(req.body?.phone || '').trim() || null,
          String(req.body?.document || '').trim() || null
        ]
      );
      res.status(201).json(await loadTeacher(id));
    } catch (error: any) {
      if (String(error?.code) === '23505') return res.status(409).json({ error: 'A user with that email already exists.' });
      res.status(500).json({ error: 'Failed to create teacher', details: error.message });
    }
  });

  // ---- Update ---------------------------------------------------------------
  router.put('/:id', async (req, res) => {
    try {
      if (!(await ensureActive())) return res.status(409).json({ error: 'Teachers module is not active.' });
      await ensureColumns();
      const auth = await authStaff(req, res);
      if (!auth) return;

      const target = await findInScope(auth, req.params.id);
      if (!target) return res.status(404).json({ error: 'Teacher not found.' });

      const firstName = req.body?.firstName !== undefined ? (String(req.body.firstName).trim() || target.firstName) : target.firstName;
      const lastName = req.body?.lastName !== undefined ? (String(req.body.lastName).trim() || target.lastName) : target.lastName;
      const email = req.body?.email !== undefined ? (String(req.body.email).trim().toLowerCase() || target.email) : target.email;
      let companyId = target.companyId;
      if (req.body?.companyId !== undefined && String(req.body.companyId).trim() && String(req.body.companyId).trim() !== target.companyId) {
        companyId = String(req.body.companyId).trim();
        if (!(await assertSede(auth, companyId, res))) return;
      }
      const name = `${firstName} ${lastName}`.trim();
      const phone = req.body?.phone !== undefined ? (String(req.body.phone).trim() || null) : target.phone;
      const document = req.body?.document !== undefined ? (String(req.body.document).trim() || null) : target.document;
      const password = String(req.body?.password || '');

      await pool.query(
        `UPDATE "User" SET email=$1, name=$2, "firstName"=$3, "lastName"=$4, "companyId"=$5, phone=$6, document=$7, "updatedAt"=NOW()${password ? ', password=$9' : ''} WHERE id=$8`,
        password
          ? [email, name, firstName, lastName, companyId, phone, document, req.params.id, password]
          : [email, name, firstName, lastName, companyId, phone, document, req.params.id]
      );
      res.json(await loadTeacher(req.params.id));
    } catch (error: any) {
      if (String(error?.code) === '23505') return res.status(409).json({ error: 'A user with that email already exists.' });
      res.status(500).json({ error: 'Failed to update teacher', details: error.message });
    }
  });

  // ---- Delete (baja) --------------------------------------------------------
  router.delete('/:id', async (req, res) => {
    try {
      if (!(await ensureActive())) return res.status(409).json({ error: 'Teachers module is not active.' });
      const auth = await authStaff(req, res);
      if (!auth) return;

      const target = await findInScope(auth, req.params.id);
      if (!target) return res.status(404).json({ error: 'Teacher not found.' });

      if (await tableExists('ClassTeacher')) {
        await pool.query('DELETE FROM "ClassTeacher" WHERE "teacherId" = $1', [req.params.id]);
      }
      await pool.query('DELETE FROM "User" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete teacher', details: error.message });
    }
  });

  app.use('/api/teachers', router);
  return { basePath: '/api/teachers' };
}
