import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './softDelete';
import { parentProtectionExtension } from './parentProtection';
import { tenancyExtension } from './tenancy';
import config from '../config';
import logger from '../utils/logger';

const connectionString = config.prisma.url || '';

// Pool por proceso. PM2 cluster levanta N procesos, cada uno con su propio
// pool. Total = N × DB_POOL_MAX. Postgres acepta `max_connections=100` por
// default; con 14 workers y max=5 tenemos 70 conexiones en uso, debajo del
// límite con margen para psql/migraciones.
//
// Configurable vía env var DB_POOL_MAX (default 5). En setups con menos
// workers o un Postgres tuneado a más conexiones se puede subir.
const poolMax = Number(process.env.DB_POOL_MAX ?? 5);
const pool = new Pool({
    connectionString: connectionString.replace('prisma+postgres://', 'postgres://'),
    max: poolMax,
});
const adapter = new PrismaPg(pool);

const baseClient = new PrismaClient({ adapter } as any);

const prisma = baseClient
    .$extends(softDeleteExtension)
    .$extends(parentProtectionExtension)
    .$extends(tenancyExtension);

export default prisma;

// Graceful shutdown
process.on('SIGINT', async () => {
    await baseClient.$disconnect();
    await pool.end();
    logger.info('Prisma disconnected and pool closed');
    process.exit(0);
});
