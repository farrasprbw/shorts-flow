import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { query } from '../../db/index.js';

interface AdminUserBody {
  id?: string;
  name: string;
  email: string;
  roles?: string[];
  isActive?: boolean;
}

interface AdminUserParams {
  id: string;
}

interface AdminRoleBody {
  id?: string;
  name?: string;
  label: string;
  level: number;
  isActive?: boolean;
}

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/admin/users
  fastify.get('/users', async () => {
    const res = await query(`
      SELECT u.id, u.name, u.email, u.is_active, u.avatar_url, u.telegram_user_id, u.created_at,
             COALESCE(
                json_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
                '[]'::json
             ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.created_at ASC;
    `);

    return {
      success: true,
      data: res.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.is_active,
        avatarUrl: u.avatar_url,
        telegramUsername: u.telegram_user_id ? `@user_${u.telegram_user_id}` : undefined,
        roles: u.roles,
        createdAt: u.created_at
      }))
    };
  });

  // POST /api/admin/users - Create or update user
  fastify.post('/users', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id, name, email, roles, isActive = true } = (request.body as AdminUserBody) || {};

    if (!name || !email) {
      return reply.status(400).send({ success: false, message: 'Nama dan email wajib diisi.' });
    }

    if (id) {
      // Update existing user
      await query(
        `UPDATE users SET name = $1, email = $2, is_active = $3, updated_at = NOW() WHERE id = $4;`,
        [name, email, isActive, id]
      );

      // Re-assign roles if provided
      if (Array.isArray(roles)) {
        await query(`DELETE FROM user_roles WHERE user_id = $1;`, [id]);
        for (const roleName of roles) {
          await query(
            `INSERT INTO user_roles (user_id, role_id)
             SELECT $1, r.id FROM roles r WHERE r.name = $2;`,
            [id, roleName]
          );
        }
      }

      return { success: true, message: 'User berhasil diperbarui.' };
    } else {
      // Create new user (default password password123)
      const insertRes = await query(
        `INSERT INTO users (name, email, password_hash, is_active)
         VALUES ($1, $2, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKWA2W2y', $3)
         RETURNING id;`,
        [name, email, isActive]
      );

      const newUserId = insertRes.rows[0].id;

      if (Array.isArray(roles)) {
        for (const roleName of roles) {
          await query(
            `INSERT INTO user_roles (user_id, role_id)
             SELECT $1, r.id FROM roles r WHERE r.name = $2;`,
            [newUserId, roleName]
          );
        }
      }

      return reply.status(201).send({ success: true, message: 'User baru berhasil dibuat.' });
    }
  });

  // PATCH /api/admin/users/:id/status
  fastify.patch('/users/:id/status', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const { id } = request.params as AdminUserParams;
    await query(`UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1;`, [id]);
    return { success: true, message: 'Status user berhasil diubah.' };
  });

  // GET /api/admin/roles
  fastify.get('/roles', async () => {
    const res = await query(`SELECT * FROM roles ORDER BY level ASC;`);
    return {
      success: true,
      data: res.rows.map(r => ({
        id: r.id,
        name: r.name,
        label: r.label,
        level: r.level,
        canFinalApprove: r.can_final_approve,
        isActive: r.is_active
      }))
    };
  });

  // POST /api/admin/roles - Create or update role
  fastify.post('/roles', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const { id, name, label, level, isActive = true } = (request.body as AdminRoleBody) || {};

    if (id) {
      await query(
        `UPDATE roles SET label = $1, level = $2, is_active = $3 WHERE id = $4;`,
        [label, level, isActive, id]
      );
      return { success: true, message: 'Role berhasil diperbarui.' };
    } else {
      await query(
        `INSERT INTO roles (name, label, level, is_active)
         VALUES ($1, $2, $3, $4);`,
        [name || `role_${Date.now()}`, label, level, isActive]
      );
      return { success: true, message: 'Role baru berhasil ditambahkan.' };
    }
  });
};
