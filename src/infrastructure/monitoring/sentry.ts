import * as Sentry from '@sentry/node';

/**
 * Sentry inicializado solo si SENTRY_DSN está seteado.
 * Esto permite tener el SDK instalado pero "off" hasta que el usuario decida
 * activarlo (ej: cuando cree su proyecto en Sentry).
 *
 * Para activar:
 *   1. Crear proyecto en https://sentry.io (free tier: 5k errors/mes).
 *   2. Setear `SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/yyy` en Coolify/Portainer.
 *   3. Redeploy.
 */
export const initSentry = () => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return false;

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        // Trace sampling: 10% para no saturar. Subir si necesitás más detalle.
        tracesSampleRate: 0.1,
        // Ignorar errores comunes/expected del 4xx user-fault.
        ignoreErrors: [
            'UnauthorizedException',
            'ForbiddenException',
            'NotFoundException',
            'ValidationError',
        ],
    });

    return true;
};

export { Sentry };
