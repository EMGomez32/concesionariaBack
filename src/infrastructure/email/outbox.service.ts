import { rawPrisma } from '../database/prisma';
import { logger } from '../logging/logger';
import { SmtpTransport } from './SmtpTransport';
import { ConsoleTransport } from './ConsoleTransport';
import type { IEmailTransport, EmailMessage } from './IEmailTransport';

/**
 * Outbox pattern para emails.
 *
 * Antes: `getEmailTransport().send()` mandaba SMTP síncrono. Si SMTP estaba
 * caído, la request HTTP se colgaba minutos y el email se perdía si fallaba.
 *
 * Ahora: persistimos el email en `email_outbox` (op rápida, ~5ms) y un worker
 * lo drainea async con backoff exponencial (1m, 5m, 15m, 1h, 4h, 24h, hasta
 * MAX_ATTEMPTS). El caller HTTP nunca se cuelga por SMTP.
 *
 * Ventajas:
 *   - Idempotencia: un retry no duplica el email (la fila tiene sent_at).
 *   - Resiliencia: SMTP puede estar caído horas, los emails se acumulan.
 *   - Observabilidad: tabla con last_error para troubleshooting.
 *   - Performance: HTTP no bloquea por SMTP lento.
 */

const MAX_ATTEMPTS = 6;

// Backoff exponencial en minutos: 1, 5, 15, 60, 240, 1440 (24h).
const BACKOFF_MINUTES = [1, 5, 15, 60, 240, 1440];

/** Persiste el email en outbox para envío async. */
export const enqueueEmail = async (msg: EmailMessage): Promise<void> => {
    await rawPrisma.emailOutbox.create({
        data: {
            toAddress: msg.to,
            subject: msg.subject,
            bodyText: msg.text,
            bodyHtml: msg.html,
            // nextAttemptAt = ahora → el worker lo agarra en la próxima pasada.
            nextAttemptAt: new Date(),
        },
    });
};

/** Lee transporte real (no el outbox) para hacer el envío SMTP. */
let realTransport: IEmailTransport | null = null;
const getRealTransport = (): IEmailTransport => {
    if (realTransport) return realTransport;
    if (process.env.SMTP_HOST) {
        realTransport = new SmtpTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            user: process.env.SMTP_USER ?? '',
            pass: process.env.SMTP_PASS ?? '',
            from: process.env.SMTP_FROM ?? 'no-reply@autenza.local',
        });
    } else {
        realTransport = new ConsoleTransport();
    }
    return realTransport;
};

/**
 * Procesa un batch de outbox: hasta `limit` emails pendientes y "ready"
 * (next_attempt_at <= now). Devuelve cantidad procesada.
 */
export const processOutboxBatch = async (limit = 25): Promise<number> => {
    const pending = await rawPrisma.emailOutbox.findMany({
        where: {
            sentAt: null,
            attempts: { lt: MAX_ATTEMPTS },
            OR: [
                { nextAttemptAt: null },
                { nextAttemptAt: { lte: new Date() } },
            ],
        },
        orderBy: { id: 'asc' },
        take: limit,
    });

    if (pending.length === 0) return 0;

    const transport = getRealTransport();
    let processed = 0;

    for (const item of pending) {
        try {
            await transport.send({
                to: item.toAddress,
                subject: item.subject,
                text: item.bodyText,
                html: item.bodyHtml,
            });
            await rawPrisma.emailOutbox.update({
                where: { id: item.id },
                data: {
                    sentAt: new Date(),
                    attempts: item.attempts + 1,
                    lastError: null,
                    nextAttemptAt: null,
                },
            });
            processed++;
        } catch (err) {
            const newAttempts = item.attempts + 1;
            const idx = Math.min(newAttempts - 1, BACKOFF_MINUTES.length - 1);
            const nextAttemptMs = BACKOFF_MINUTES[idx] * 60 * 1000;
            const nextAttemptAt = new Date(Date.now() + nextAttemptMs);

            await rawPrisma.emailOutbox.update({
                where: { id: item.id },
                data: {
                    attempts: newAttempts,
                    lastError: (err as Error).message?.slice(0, 500),
                    nextAttemptAt,
                },
            });
            logger.warn(
                `[email-outbox] fallo email id=${item.id} attempt=${newAttempts}/${MAX_ATTEMPTS}, ` +
                `next=${nextAttemptAt.toISOString()}, err=${(err as Error).message}`
            );
        }
    }

    return processed;
};

/**
 * Inicia un worker que cada `intervalMs` corre `processOutboxBatch`.
 * Solo arranca en el worker 0 de PM2 cluster (NODE_APP_INSTANCE='0') para
 * evitar que múltiples workers procesen los mismos rows. Si no hay PM2
 * (single process), siempre arranca.
 */
export const startOutboxWorker = (intervalMs = 30_000): NodeJS.Timeout | null => {
    const instance = process.env.NODE_APP_INSTANCE;
    if (instance !== undefined && instance !== '0') {
        logger.info(`[email-outbox] worker NO arrancado (PM2 instance=${instance}, solo 0 corre)`);
        return null;
    }

    logger.info(`[email-outbox] worker activo (interval=${intervalMs}ms)`);
    const interval = setInterval(async () => {
        try {
            const processed = await processOutboxBatch();
            if (processed > 0) {
                logger.info(`[email-outbox] procesados ${processed} emails`);
            }
        } catch (err) {
            logger.error(`[email-outbox] error en batch: ${(err as Error).message}`);
        }
    }, intervalMs);
    interval.unref();
    return interval;
};
