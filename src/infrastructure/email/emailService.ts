/**
 * Singleton del transport de email. En arranque elige la implementación
 * según env vars: si hay SMTP_HOST configurado, usa SmtpTransport;
 * si no, usa ConsoleTransport (los emails van al log).
 */
import { IEmailTransport } from './IEmailTransport';
import { ConsoleTransport } from './ConsoleTransport';
import { SmtpTransport } from './SmtpTransport';
import { logger } from '../logging/logger';

let transport: IEmailTransport | null = null;

export function getEmailTransport(): IEmailTransport {
    if (transport) return transport;

    if (process.env.SMTP_HOST) {
        transport = new SmtpTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            user: process.env.SMTP_USER ?? '',
            pass: process.env.SMTP_PASS ?? '',
            from: process.env.SMTP_FROM ?? 'no-reply@autenza.local',
        });
        logger.info(`[email] SMTP transport activo (host=${process.env.SMTP_HOST})`);
        return transport;
    }

    transport = new ConsoleTransport();
    logger.warn('[email] SMTP_HOST no configurado — usando ConsoleTransport (los emails van al log)');
    return transport;
}

/** Solo para testing — permite inyectar un mock. */
export function setEmailTransport(t: IEmailTransport): void {
    transport = t;
}
