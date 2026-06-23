import type express from 'express';
import type pg from 'pg';

type PrismaLike = any;

export const registerModuleAdminRoutes = async (
  router: express.Router,
  _prisma: PrismaLike,
  pool: pg.Pool
) => {
  router.get('/discipline-resources', async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT r.*,
               d.name AS "disciplineName",
               d."imageUrl" AS "disciplineImageUrl",
               u.name AS "createdByName"
        FROM "DisciplineResource" r
        JOIN "Discipline" d ON d.id = r."disciplineId"
        LEFT JOIN "User" u ON u.id = r."createdById"
        WHERE r.active = true
        ORDER BY d.name ASC, r.title ASC
      `);
      return res.json(result.rows);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch discipline resources', details: error?.message || String(error) });
    }
  });
};
