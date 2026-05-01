/**
 * Email service con outbox pattern.
 *
 * El service.send() NO manda SMTP directo — persiste el mensaje en la tabla
 * `email_outbox` y un worker async lo drainea con retries (ver outbox.service).
 *
 * Esto desacopla el HTTP request del SMTP:
 *   - Antes: alta de usuario tarda 5-30s si SMTP está lento, falla si SMTP cae.
 *   - Ahora: alta tarda ~5ms, el email sale en background con retries.
 *
 * En tests (NODE_ENV=test) usamos ConsoleTransport directo para que los
 * tests no dependan de la tabla outbox ni del worker.
 */
import { IEmailTransport } from './IEmailTransport';
import { ConsoleTransport } from './ConsoleTransport';
import { enqueueEmail } from './outbox.service';
import { logger } from '../logging/logger';

let transport: IEmailTransport | null = null;

class OutboxTransport implements IEmailTransport {
    async send(msg: { to: string; subject: string; html: string; text: string }): Promise<void> {
        await enqueueEmail(msg);
    }
}

export function getEmailTransport(): IEmailTransport {
    if (transport) return transport;

    // En tests, no usamos outbox (no hay worker corriendo).
    if (process.env.NODE_ENV === 'test') {
        transport = new ConsoleTransport();
        return transport;
    }

    // En cualquier otro entorno (dev/prod) usamos outbox. El worker decide
    // el transport real (SMTP o Console) según SMTP_HOST.
    transport = new OutboxTransport();
    logger.info('[email] OutboxTransport activo (persiste a email_outbox, worker drainea async)');
    return transport;
}

/** Solo para testing — permite inyectar un mock. */
export function setEmailTransport(t: IEmailTransport): void {
    transport = t;
}
