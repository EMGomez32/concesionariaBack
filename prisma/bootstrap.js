/**
 * bootstrap.js
 *
 * Inicialización mínima e IDEMPOTENTE que se corre en cada arranque del back:
 *   1. Crea los 6 roles del sistema (admin, vendedor, cobrador, postventa,
 *      lectura, super_admin) si no existen.
 *   2. Crea el Plan Free si no existe.
 *   3. Crea o actualiza el super_admin del SaaS leyendo credenciales de:
 *        BOOTSTRAP_SUPER_EMAIL    (default: soporteautenza@gmail.com)
 *        BOOTSTRAP_SUPER_PASSWORD (sin default — si no se setea, se saltea
 *                                   la creación del usuario sin error)
 *        BOOTSTRAP_SUPER_NAME     (default: 'Soporte AUTENZA')
 *
 * Si BOOTSTRAP_SUPER_PASSWORD no está, NO crea el usuario (loggea y sigue).
 * Eso permite ejecutar el bootstrap sin riesgo en cualquier deploy: si las
 * env vars están, el super_admin queda listo; si no, simplemente no lo
 * toca.
 *
 * Re-run safety:
 *   - Si el rol ya existe, no se duplica.
 *   - Si el plan Free ya existe, no se duplica.
 *   - Si el usuario ya existe, se ACTUALIZA su password con la del env var
 *     (útil para rotar) y se garantiza que tenga el rol super_admin.
 *   - Si no existe, se crea desde cero.
 *
 * Pure JavaScript — usa pg + bcrypt (ya en dependencies de prod), no
 * necesita ts-node ni @types/* en runtime.
 */
require('dotenv/config');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const ROLES = ['admin', 'vendedor', 'cobrador', 'postventa', 'lectura', 'super_admin'];

const SUPER_EMAIL = process.env.BOOTSTRAP_SUPER_EMAIL || 'soporteautenza@gmail.com';
const SUPER_PASSWORD = process.env.BOOTSTRAP_SUPER_PASSWORD;
const SUPER_NAME = process.env.BOOTSTRAP_SUPER_NAME || 'Soporte AUTENZA';

const connectionString = (process.env.DATABASE_URL || '').replace('prisma+postgres://', 'postgres://');

async function main() {
    const pool = new Pool({ connectionString });
    const client = await pool.connect();
    try {
        console.log('[bootstrap] starting…');

        // Bypass RLS para esta sesión (necesario para insertar en tablas tenant-scoped).
        await client.query(`SELECT set_config('app.is_super_admin', 'true', false)`);

        // ── 1. Roles del sistema ──────────────────────────────────────────
        for (const nombre of ROLES) {
            await client.query(
                `INSERT INTO roles (nombre, created_at, updated_at)
                 VALUES ($1, NOW(), NOW())
                 ON CONFLICT (nombre) DO NOTHING`,
                [nombre],
            );
        }
        const roleCount = await client.query(`SELECT count(*)::int AS c FROM roles`);
        console.log(`[bootstrap] roles: ${roleCount.rows[0].c}/6`);

        // ── 2. Plan Free ──────────────────────────────────────────────────
        await client.query(
            `INSERT INTO planes (nombre, precio, moneda, max_usuarios, max_sucursales, max_vehiculos, created_at, updated_at)
             VALUES ('Free', 0, 'ARS', 5, 1, 50, NOW(), NOW())
             ON CONFLICT (nombre) DO NOTHING`,
        );
        const planCount = await client.query(`SELECT count(*)::int AS c FROM planes`);
        console.log(`[bootstrap] planes: ${planCount.rows[0].c}`);

        // ── 3. Super Admin ────────────────────────────────────────────────
        if (!SUPER_PASSWORD) {
            console.log('[bootstrap] BOOTSTRAP_SUPER_PASSWORD no definido — se saltea super_admin');
            console.log('[bootstrap] done.');
            return;
        }

        const passwordHash = await bcrypt.hash(SUPER_PASSWORD, 10);

        const superRoleRes = await client.query(
            `SELECT id FROM roles WHERE nombre = 'super_admin'`,
        );
        const superRoleId = superRoleRes.rows[0]?.id;
        if (!superRoleId) throw new Error('rol super_admin no existe (esto no debería pasar)');

        // ¿Existe ya el usuario?
        const existing = await client.query(
            `SELECT id FROM usuarios WHERE email = $1 AND concesionaria_id IS NULL`,
            [SUPER_EMAIL],
        );

        let usuarioId;
        if (existing.rowCount > 0) {
            usuarioId = existing.rows[0].id;
            await client.query(
                `UPDATE usuarios
                    SET password_hash = $1,
                        email_verificado = true,
                        estado = 'activo',
                        activo = true,
                        nombre = $2,
                        updated_at = NOW()
                    WHERE id = $3`,
                [passwordHash, SUPER_NAME, usuarioId],
            );
            console.log(`[bootstrap] super_admin actualizado: ${SUPER_EMAIL} (id=${usuarioId})`);
        } else {
            const inserted = await client.query(
                `INSERT INTO usuarios
                    (nombre, email, password_hash, concesionaria_id, sucursal_id,
                     email_verificado, estado, activo, created_at, updated_at)
                 VALUES ($1, $2, $3, NULL, NULL, true, 'activo', true, NOW(), NOW())
                 RETURNING id`,
                [SUPER_NAME, SUPER_EMAIL, passwordHash],
            );
            usuarioId = inserted.rows[0].id;
            console.log(`[bootstrap] super_admin creado: ${SUPER_EMAIL} (id=${usuarioId})`);
        }

        // Asegurar que tenga el rol super_admin (si ya lo tenía, no duplica)
        await client.query(
            `INSERT INTO usuario_roles (usuario_id, rol_id, created_at, updated_at)
             VALUES ($1, $2, NOW(), NOW())
             ON CONFLICT (usuario_id, rol_id) DO NOTHING`,
            [usuarioId, superRoleId],
        );

        console.log('[bootstrap] done.');
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((e) => {
    console.error('[bootstrap] failed:', e);
    process.exit(1);
});
