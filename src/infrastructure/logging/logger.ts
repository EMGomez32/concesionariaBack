import winston from 'winston';
import { env } from '../../config/env';
import { context } from '../security/context';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    if (env.LOG_LEVEL && Object.prototype.hasOwnProperty.call(levels, env.LOG_LEVEL)) {
        return env.LOG_LEVEL;
    }
    return env.NODE_ENV === 'development' ? 'debug' : 'info';
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// ─── Redactor de secrets ────────────────────────────────────────────────────
// Evita que un `logger.info(req.body)` con un password termine en disco.
// Recursivo, redacta cualquier campo cuyo nombre matchee la regex.
const SENSITIVE_KEYS = /^(password|password_hash|passwordhash|token|refresh_token|refreshtoken|access_token|accesstoken|authorization|secret|api[_-]?key|cookie|bearer)$/i;

const redact = (value: unknown, depth = 0): unknown => {
    if (depth > 5 || value == null) return value;
    if (Array.isArray(value)) return value.map(v => redact(v, depth + 1));
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (SENSITIVE_KEYS.test(k)) {
                out[k] = '[REDACTED]';
            } else {
                out[k] = redact(v, depth + 1);
            }
        }
        return out;
    }
    return value;
};

// ─── Inyector de contexto request-scoped ────────────────────────────────────
// El contextMiddleware abre un AsyncLocalStorage por request con
// correlationId + tenantId + userId. Este formatter los agrega a CADA log
// emitido durante la request — sin que cada call site tenga que pasarlos.
const injectRequestContext = winston.format((info) => {
    const ctx = context.get();
    if (ctx?.correlationId) info.correlationId = ctx.correlationId;
    if (ctx?.user?.userId) info.userId = ctx.user.userId;
    if (ctx?.user?.concesionariaId) info.tenantId = ctx.user.concesionariaId;
    return info;
});

const redactSensitive = winston.format((info) => {
    return redact(info) as winston.Logform.TransformableInfo;
});

// ─── Formats por entorno ────────────────────────────────────────────────────
// Dev: legible con colores. Prod: JSON una línea por log para Loki/Datadog.
const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    redactSensitive(),
    injectRequestContext(),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
        const ctx = info.correlationId ? ` [${String(info.correlationId).slice(0, 8)}]` : '';
        return `${info.timestamp} ${info.level}${ctx}: ${info.message}`;
    }),
);

const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    redactSensitive(),
    injectRequestContext(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

// ─── Transports ─────────────────────────────────────────────────────────────
// Solo stdout/stderr — los archivos `logs/*.log` se perdían en cada restart
// del container (filesystem ephemeral) y competían con /app/uploads. El
// orquestador (Docker, Coolify, Portainer) ya pipea stdout a su sistema de
// logs. Si necesitás archivos, usá un sidecar como Promtail/Vector.
const transports: winston.transport[] = [
    new winston.transports.Console({ stderrLevels: ['error'] }),
];

export const logger = winston.createLogger({
    level: level(),
    levels,
    format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports,
});
