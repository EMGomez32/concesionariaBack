/* eslint-disable */
/**
 * Bootstrap inteligente de la DB que decide qué hacer según el estado:
 *
 *   1. ¿La DB tiene tabla `_prisma_migrations`?
 *      - NO: la DB se creó con `db push` (modo legacy actual).
 *      - SÍ: la DB ya está en modo migrations.
 *
 *   2. ¿Hay carpeta `prisma/migrations/` con archivos?
 *      - NO: el repo está en modo legacy → seguir con `db push`.
 *      - SÍ: el repo está en modo migrations.
 *
 *   3. Combinaciones:
 *      a) Repo legacy + DB legacy → `db push` (modo actual, todo OK).
 *      b) Repo migrations + DB legacy → BASELINE: marcar todas las
 *         migrations como `applied` (sin re-correrlas) + `db push` para
 *         garantizar sync. Esto migra de legacy a migrations sin downtime
 *         ni intervención manual.
 *      c) Repo migrations + DB migrations → `migrate deploy` normal.
 *      d) Repo legacy + DB migrations → no debería pasar (downgrade);
 *         caemos a `db push` con warning.
 *
 * Uso (reemplaza al `prisma db push` directo del Dockerfile):
 *   node prisma/db-bootstrap.js
 */
require('dotenv/config');
const { execSync } = require('child_process');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const log = (msg) => console.log(`[db-bootstrap] ${msg}`);

const dbHasMigrationsTable = async (connectionString) => {
    const pool = new Pool({
        connectionString: connectionString.replace('prisma+postgres://', 'postgres://'),
    });
    try {
        const { rows } = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
            ) AS exists
        `);
        return rows[0].exists;
    } finally {
        await pool.end();
    }
};

const repoHasMigrations = () => {
    const dir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(dir)) return false;
    const subdirs = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory());
    return subdirs.length > 0;
};

const runShell = (cmd) => {
    log(`exec: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
};

(async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('[db-bootstrap] FATAL: DATABASE_URL no está seteada');
        process.exit(1);
    }

    const dbHasMigrations = await dbHasMigrationsTable(url);
    const hasMigrations = repoHasMigrations();

    log(`DB has _prisma_migrations: ${dbHasMigrations}`);
    log(`Repo has prisma/migrations/: ${hasMigrations}`);

    if (!hasMigrations && !dbHasMigrations) {
        // Caso (a): legacy puro. Sigue con db push.
        log('modo legacy (sin migrations) → npx prisma db push');
        runShell('npx prisma db push');
        return;
    }

    if (hasMigrations && !dbHasMigrations) {
        // Caso (b): primera vez con migrations contra una DB legacy.
        // Marcamos todas las migrations existentes como applied (no se
        // re-corren), y aplicamos db push por las dudas para garantizar
        // que el schema esté 100% sincronizado.
        log('BASELINE: repo tiene migrations pero DB es legacy. Marcando como applied...');
        const dir = path.join(__dirname, 'migrations');
        const subdirs = fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort();
        for (const name of subdirs) {
            try {
                runShell(`npx prisma migrate resolve --applied "${name}"`);
            } catch (err) {
                log(`WARN: no pude marcar ${name} como applied — ${err.message}`);
            }
        }
        log('Aplicando db push de seguridad para sincronizar schema...');
        runShell('npx prisma db push');
        log('BASELINE completo. Próximos deploys usarán migrate deploy.');
        return;
    }

    if (hasMigrations && dbHasMigrations) {
        // Caso (c): operación normal.
        log('modo migrations → npx prisma migrate deploy');
        runShell('npx prisma migrate deploy');
        return;
    }

    // Caso (d): degradación (improbable). No re-aplicamos migrations al revés.
    log('WARN: DB tiene _prisma_migrations pero repo no — usando db push como fallback');
    runShell('npx prisma db push');
})().catch((err) => {
    console.error(`[db-bootstrap] ERROR: ${err.message}`);
    process.exit(1);
});
