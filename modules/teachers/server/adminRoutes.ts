import type express from 'express';
import type pg from 'pg';
import type multer from 'multer';
import crypto from 'crypto';
import { ensureRole, NATACION_ROLES } from '@sinapsis/module-sdk-server';

type PrismaLike = any;

/**
 * Global (super-admin) ABM of "Profesores" = Users with the Profesor role, across all
 * organizations. Mounted under /api/admin (so routes are /api/admin/teachers...).
 */
export const registerModuleAdminRoutes = async (
  router: express.Router,
  _prisma: PrismaLike,
  pool: pg.Pool,
  _uploadMemory: multer.Multer
) => {
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

  const loadOne = async (id: string) => {
    const r = await pool.query(
      `SELECT u.id, u.email, u.name, u."firstName", u."lastName", u.phone, u.document, u."companyId",
              c.name AS "companyName", c."organizationId", o.name AS "organizationName", u."createdAt"
       FROM "User" u
       JOIN "Company" c ON c.id = u."companyId"
       JOIN "Organization" o ON o.id = c."organizationId"
       WHERE u.id = $1 LIMIT 1`,
      [id]
    );
    return r.rows[0] || null;
  };

  // List all profesor users (across organizations).
  router.get('/teachers', async (_req, res) => {
    try {
      await ensureColumns();
      const r = await pool.query(
        `SELECT u.id, u.email, u.name, u."firstName", u."lastName", u.phone, u.document, u."companyId",
                c.name AS "companyName", c."organizationId", o.name AS "organizationName", u."createdAt"
         FROM "User" u
         JOIN "Company" c ON c.id = u."companyId"
         JOIN "Organization" o ON o.id = c."organizationId"
         JOIN "Role" r ON r.id = u."roleId"
         WHERE r.name = $1
         ORDER BY o.name ASC, u."lastName" ASC, u."firstName" ASC`,
        [NATACION_ROLES.PROFESOR]
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list teachers', details: e?.message || String(e) });
    }
  });

  // Sedes (companies) across all organizations, for the create/edit selector.
  router.get('/teachers/companies', async (_req, res) => {
    try {
      const r = await pool.query(
        `SELECT c.id, c.name, c."organizationId", o.name AS "organizationName"
         FROM "Company" c
         JOIN "Organization" o ON o.id = c."organizationId"
         WHERE c.status = 'Active'
         ORDER BY o.name ASC, c.name ASC`
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list companies', details: e?.message || String(e) });
    }
  });

  // Get a single teacher by ID.
  router.get('/teachers/:id', async (req, res) => {
    try {
      await ensureColumns();
      const teacher = await loadOne(req.params.id);
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      res.json(teacher);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to load teacher', details: e?.message || String(e) });
    }
  });

  // Get classes assigned to a teacher.
  router.get('/teachers/:id/classes', async (req, res) => {
    try {
      if (!(await tableExists('ClassTeacher'))) return res.json([]);
      const hasDisciplines = await tableExists('Discipline');
      const r = await pool.query(
        `SELECT cl.id, cl.name, cl."companyId", cl.status, c.name AS "companyName",
                ${hasDisciplines ? `(SELECT d.name FROM "Discipline" d WHERE d.id = cl."disciplineId")` : 'NULL'} AS "disciplineName"
         FROM "ClassTeacher" ct
         JOIN "Class" cl ON cl.id = ct."classId"
         JOIN "Company" c ON c.id = cl."companyId"
         WHERE ct."teacherId" = $1 AND ct.active = true
         ORDER BY cl.name ASC`,
        [req.params.id]
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to load teacher classes', details: e?.message || String(e) });
    }
  });

  router.post('/teachers', async (req, res) => {
    try {
      await ensureColumns();
      const firstName = String(req.body?.firstName || '').trim();
      const lastName = String(req.body?.lastName || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const companyId = String(req.body?.companyId || '').trim();
      if (!firstName || !lastName) return res.status(400).json({ error: 'firstName and lastName are required.' });
      if (!email) return res.status(400).json({ error: 'email is required.' });
      if (!password) return res.status(400).json({ error: 'password is required.' });
      if (!companyId) return res.status(400).json({ error: 'companyId (sede) is required.' });
      const cc = await pool.query('SELECT 1 FROM "Company" WHERE id = $1 LIMIT 1', [companyId]);
      if (!cc.rows[0]) return res.status(400).json({ error: 'Company not found.' });

      const profesorRoleId = await ensureRole(pool, NATACION_ROLES.PROFESOR, 'Profesor / staff técnico');
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
      res.status(201).json(await loadOne(id));
    } catch (e: any) {
      if (String(e?.code) === '23505') return res.status(409).json({ error: 'A user with that email already exists.' });
      res.status(500).json({ error: 'Failed to create teacher', details: e?.message || String(e) });
    }
  });

  router.put('/teachers/:id', async (req, res) => {
    try {
      await ensureColumns();
      const existing = await pool.query(
        `SELECT u.* FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE u.id = $1 AND r.name = $2 LIMIT 1`,
        [req.params.id, NATACION_ROLES.PROFESOR]
      );
      const target = existing.rows[0];
      if (!target) return res.status(404).json({ error: 'Teacher not found' });

      const firstName = req.body?.firstName !== undefined ? (String(req.body.firstName).trim() || target.firstName) : target.firstName;
      const lastName = req.body?.lastName !== undefined ? (String(req.body.lastName).trim() || target.lastName) : target.lastName;
      const email = req.body?.email !== undefined ? (String(req.body.email).trim().toLowerCase() || target.email) : target.email;
      let companyId = target.companyId;
      if (req.body?.companyId !== undefined && String(req.body.companyId).trim()) {
        const next = String(req.body.companyId).trim();
        const cc = await pool.query('SELECT 1 FROM "Company" WHERE id = $1 LIMIT 1', [next]);
        if (!cc.rows[0]) return res.status(400).json({ error: 'Company not found.' });
        companyId = next;
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
      res.json(await loadOne(req.params.id));
    } catch (e: any) {
      if (String(e?.code) === '23505') return res.status(409).json({ error: 'A user with that email already exists.' });
      res.status(500).json({ error: 'Failed to update teacher', details: e?.message || String(e) });
    }
  });

  router.delete('/teachers/:id', async (req, res) => {
    try {
      const existing = await pool.query(
        `SELECT u.id FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE u.id = $1 AND r.name = $2 LIMIT 1`,
        [req.params.id, NATACION_ROLES.PROFESOR]
      );
      if (!existing.rows[0]) return res.status(404).json({ error: 'Teacher not found' });

      if (await tableExists('ClassTeacher')) {
        await pool.query('DELETE FROM "ClassTeacher" WHERE "teacherId" = $1', [req.params.id]);
      }
      await pool.query('DELETE FROM "User" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete teacher', details: e?.message || String(e) });
    }
  });
};
