import express from 'express';
import type { Pool } from 'pg';

export function registerModuleAdminRoutes(router: express.Router, _prisma: unknown, pool: Pool) {
  // GET /api/admin/messaging/threads?companyId=&search=
  router.get('/messaging/threads', async (req, res) => {
    try {
      const params: any[] = [];
      const conditions: string[] = [];

      const companyId = String(req.query.companyId || '').trim();
      if (companyId) {
        params.push(companyId);
        conditions.push(`s."companyId" = $${params.length}`);
      }

      const search = String(req.query.search || '').trim();
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        const n = params.length;
        conditions.push(`(
          LOWER(s."firstName" || ' ' || s."lastName") LIKE $${n}
          OR LOWER(COALESCE(conv.subject, '')) LIKE $${n}
          OR LOWER(c.name) LIKE $${n}
        )`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const r = await pool.query(
        `SELECT conv.id, conv."studentId", conv.subject, conv.status, conv."createdAt", conv."updatedAt",
                s."firstName" AS "studentFirstName", s."lastName" AS "studentLastName",
                c.id AS "companyId", c.name AS "companyName",
                (SELECT COUNT(*)::int FROM "Message" m WHERE m."conversationId" = conv.id) AS "messageCount",
                last_msg.body AS "lastMessageBody",
                last_msg."createdAt" AS "lastMessageAt",
                (
                  SELECT json_agg(json_build_object(
                    'userId', cp."userId",
                    'name', COALESCE(u."firstName" || ' ' || u."lastName", u.name, u.email)
                  ))
                  FROM "ConversationParticipant" cp
                  JOIN "User" u ON u.id = cp."userId"
                  WHERE cp."conversationId" = conv.id AND cp.active
                ) AS participants
         FROM "Conversation" conv
         JOIN "Student" s ON s.id = conv."studentId"
         JOIN "Company" c ON c.id = s."companyId"
         LEFT JOIN LATERAL (
           SELECT body, "createdAt"
           FROM "Message"
           WHERE "conversationId" = conv.id
           ORDER BY "createdAt" DESC
           LIMIT 1
         ) last_msg ON true
         ${where}
         ORDER BY COALESCE(last_msg."createdAt", conv."createdAt") DESC
         LIMIT 300`,
        params
      );

      res.json(r.rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Error cargando conversaciones.', details: err.message });
    }
  });

  // GET /api/admin/messaging/threads/:threadId/messages
  router.get('/messaging/threads/:threadId/messages', async (req, res) => {
    try {
      const convRow = await pool.query(
        `SELECT conv.*, s."firstName" AS "studentFirstName", s."lastName" AS "studentLastName",
                c.name AS "companyName"
         FROM "Conversation" conv
         JOIN "Student" s ON s.id = conv."studentId"
         JOIN "Company" c ON c.id = s."companyId"
         WHERE conv.id = $1 LIMIT 1`,
        [req.params.threadId]
      );
      if (!convRow.rows[0]) return res.status(404).json({ error: 'Conversación no encontrada.' });

      const r = await pool.query(
        `SELECT m.id, m."conversationId", m."senderId", m.body, m."createdAt",
                u."firstName", u."lastName", COALESCE(u."firstName" || ' ' || u."lastName", u.name, u.email) AS "senderName",
                u."imageUrl" AS "senderImageUrl"
         FROM "Message" m
         LEFT JOIN "User" u ON u.id = m."senderId"
         WHERE m."conversationId" = $1
         ORDER BY m."createdAt" ASC`,
        [req.params.threadId]
      );

      res.json({ thread: convRow.rows[0], messages: r.rows });
    } catch (err: any) {
      res.status(500).json({ error: 'Error cargando mensajes.', details: err.message });
    }
  });
}
