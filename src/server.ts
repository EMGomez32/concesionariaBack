import app from './app';
import config from './config';
import logger from './utils/logger';
import { rawPrisma } from './infrastructure/database/prisma';

const server = app.listen(config.port, () => {
    logger.info(`--------------------------------------------------`);
    logger.info(`🚀 Concesionaria SaaS API running on port ${config.port}`);
    logger.info(`🌍 Environment: ${config.env}`);
    logger.info(`--------------------------------------------------`);
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────
// Coolify, Portainer, Docker `stop` y K8s mandan SIGTERM con un timeout
// (30s default) antes de tirar SIGKILL. Hay que:
//   1. Dejar de aceptar conexiones nuevas (server.close).
//   2. Esperar que las requests in-flight terminen.
//   3. Cerrar la conexión de Prisma para liberar el pool.
//   4. exit(0) limpio.
//
// Si no respondemos a SIGTERM, Docker espera 30s y mata abruptamente —
// requests en curso ven 502, transacciones se truncan a la mitad.
//
// Hard timeout de 25s (5s de margen vs el 30s del orquestador).
const SHUTDOWN_TIMEOUT_MS = 25_000;
let shuttingDown = false;

const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[shutdown] señal recibida: ${signal}, drenando conexiones...`);

    const hardTimeout = setTimeout(() => {
        logger.error('[shutdown] timeout al drenar — forzando exit(1)');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    hardTimeout.unref();

    server.close(async (err) => {
        if (err) {
            logger.error('[shutdown] error cerrando server HTTP', err);
        }
        try {
            await rawPrisma.$disconnect();
            logger.info('[shutdown] prisma desconectado, exit(0)');
        } catch (e) {
            logger.error('[shutdown] error desconectando prisma', e);
        }
        clearTimeout(hardTimeout);
        process.exit(err ? 1 : 0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Manejo de errores que no son atrapados por Express
process.on('unhandledRejection', (err: any) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err);
    shutdown('unhandledRejection');
});

process.on('uncaughtException', (err: any) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    logger.error(err);
    // En uncaughtException el proceso queda en estado indefinido,
    // intentamos cerrar pero forzamos exit(1) si tarda.
    shutdown('uncaughtException');
});
