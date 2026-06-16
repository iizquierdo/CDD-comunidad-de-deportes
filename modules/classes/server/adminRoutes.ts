import type express from 'express';
import type pg from 'pg';
import type multer from 'multer';
import crypto from 'crypto';

type PrismaLike = any;

/**
 * Global (super-admin) ABM of classes across all organizations.
 * Mounted under /api/admin (so routes are /api/admin/classes...).
 */
export const registerModuleAdminRoutes = async (
  router: express.Router,
  _prisma: PrismaLike,
  pool: pg.Pool,
  _uploadMemory: multer.Multer
) => {
  const tableExists = async (name: string) => {
    const r = await pool.query('SELECT to_regclass($1) AS t', [`public."${name}"`]);
    return Boolean(r.rows[0]?.t);
  };

  const classesReady = async () => tableExists('Class');

  const loadOne = async (id: string) => {
    const hasDisciplines = await tableExists('Discipline');
    const r = await pool.query(
      `SELECT cl.*, c.name AS "companyName", c."organizationId", o.name AS "organizationName",
              ${hasDisciplines ? `(SELECT d.name FROM "Discipline" d WHERE d.id = cl."disciplineId")` : 'NULL'} AS "disciplineName"
       FROM "Class" cl
       JOIN "Company" c ON c.id = cl."companyId"
       JOIN "Organization" o ON o.id = c."organizationId"
       WHERE cl.id = $1 LIMIT 1`,
      [id]
    );
    return r.rows[0] || null;
  };

  router.get('/classes', async (_req, res) => {
    try {
      if (!(await classesReady())) return res.json([]);
      const hasDisciplines = await tableExists('Discipline');
      const r = await pool.query(
        `SELECT cl.id, cl.code, cl.name, cl."disciplineId", cl."companyId", cl.capacity, cl.status,
                c.name AS "companyName", c."organizationId", o.name AS "organizationName",
                ${hasDisciplines ? `(SELECT d.name FROM "Discipline" d WHERE d.id = cl."disciplineId")` : 'NULL'} AS "disciplineName",
                (SELECT COUNT(*)::int FROM "ClassTeacher" ct WHERE ct."classId" = cl.id AND ct.active) AS "teacherCount",
                (SELECT COUNT(*)::int FROM "ClassStudent" cst WHERE cst."classId" = cl.id AND cst.status = 'ACTIVE') AS "studentCount"
         FROM "Class" cl
         JOIN "Company" c ON c.id = cl."companyId"
         JOIN "Organization" o ON o.id = c."organizationId"
         ORDER BY o.name ASC, c.name ASC, cl.name ASC`
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list classes', details: e?.message || String(e) });
    }
  });

  // Sedes (companies) across all organizations, for the create/edit selector.
  router.get('/classes/companies', async (_req, res) => {
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

  // Disciplines for the create/edit selector (empty if module not installed).
  router.get('/classes/disciplines', async (_req, res) => {
    try {
      if (!(await tableExists('Discipline'))) return res.json([]);
      const r = await pool.query('SELECT id, name FROM "Discipline" WHERE active = true ORDER BY name ASC');
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list disciplines', details: e?.message || String(e) });
    }
  });

  router.post('/classes', async (req, res) => {
    try {
      if (!(await classesReady())) return res.status(409).json({ error: 'Classes module is not installed.' });
      const name = String(req.body?.name || '').trim();
      const disciplineId = String(req.body?.disciplineId || '').trim();
      const companyId = String(req.body?.companyId || '').trim();
      if (!name) return res.status(400).json({ error: 'name is required.' });
      if (!disciplineId) return res.status(400).json({ error: 'disciplineId is required.' });
      if (!companyId) return res.status(400).json({ error: 'companyId (sede) is required.' });

      const cc = await pool.query('SELECT 1 FROM "Company" WHERE id = $1 LIMIT 1', [companyId]);
      if (!cc.rows[0]) return res.status(400).json({ error: 'Company not found.' });
      if (await tableExists('Discipline')) {
        const d = await pool.query('SELECT 1 FROM "Discipline" WHERE id = $1 LIMIT 1', [disciplineId]);
        if (!d.rows[0]) return res.status(400).json({ error: 'Discipline not found.' });
      }

      // Admin actions are not tied to a tenant user; attribute to any platform user.
      const anyUser = await pool.query('SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1');
      const userId = anyUser.rows[0]?.id;
      if (!userId) return res.status(400).json({ error: 'No users exist to attribute this class to.' });

      const capacity = Number.isFinite(Number(req.body?.capacity)) && Number(req.body?.capacity) > 0 ? Math.floor(Number(req.body.capacity)) : null;
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO "Class" (id, code, name, description, "disciplineId", "companyId", capacity, status, "createdById", "updatedById", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,NOW(),NOW())`,
        [
          id, null, name,
          String(req.body?.description || '').trim() || null,
          disciplineId, companyId, capacity,
          String(req.body?.status || 'ACTIVE').trim() || 'ACTIVE',
          userId
        ]
      );
      res.status(201).json(await loadOne(id));
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to create class', details: e?.message || String(e) });
    }
  });

  router.put('/classes/:id', async (req, res) => {
    try {
      if (!(await classesReady())) return res.status(409).json({ error: 'Classes module is not installed.' });
      const existing = await pool.query('SELECT * FROM "Class" WHERE id = $1 LIMIT 1', [req.params.id]);
      const target = existing.rows[0];
      if (!target) return res.status(404).json({ error: 'Class not found' });

      let companyId = target.companyId;
      if (req.body?.companyId !== undefined && String(req.body.companyId).trim()) {
        const next = String(req.body.companyId).trim();
        const cc = await pool.query('SELECT 1 FROM "Company" WHERE id = $1 LIMIT 1', [next]);
        if (!cc.rows[0]) return res.status(400).json({ error: 'Company not found.' });
        companyId = next;
      }
      let disciplineId = target.disciplineId;
      if (req.body?.disciplineId !== undefined && String(req.body.disciplineId).trim()) {
        const next = String(req.body.disciplineId).trim();
        if (await tableExists('Discipline')) {
          const d = await pool.query('SELECT 1 FROM "Discipline" WHERE id = $1 LIMIT 1', [next]);
          if (!d.rows[0]) return res.status(400).json({ error: 'Discipline not found.' });
        }
        disciplineId = next;
      }
      const capacity =
        req.body?.capacity !== undefined
          ? (Number.isFinite(Number(req.body.capacity)) && Number(req.body.capacity) > 0 ? Math.floor(Number(req.body.capacity)) : null)
          : target.capacity;

      await pool.query(
        `UPDATE "Class" SET name=$1, description=$2, "disciplineId"=$3, "companyId"=$4, capacity=$5, status=$6, "updatedAt"=NOW() WHERE id=$7`,
        [
          String(req.body?.name ?? target.name).trim() || target.name,
          req.body?.description !== undefined ? (String(req.body.description).trim() || null) : target.description,
          disciplineId, companyId, capacity,
          String(req.body?.status ?? target.status).trim() || target.status,
          req.params.id
        ]
      );
      res.json(await loadOne(req.params.id));
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update class', details: e?.message || String(e) });
    }
  });

  router.delete('/classes/:id', async (req, res) => {
    try {
      if (!(await classesReady())) return res.status(409).json({ error: 'Classes module is not installed.' });
      const existing = await pool.query('SELECT id FROM "Class" WHERE id = $1 LIMIT 1', [req.params.id]);
      if (!existing.rows[0]) return res.status(404).json({ error: 'Class not found' });
      await pool.query('DELETE FROM "Class" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete class', details: e?.message || String(e) });
    }
  });
};
