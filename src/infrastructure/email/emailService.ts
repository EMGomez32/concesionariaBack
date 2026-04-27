/**
 * Singleton del transport de email. En arranque elige la implementación
 * según env vars: si hay SMTP_HOST configurado, usaría SmtpTransport;
 * si no, usa ConsoleTransport (los emails van al log).
 *
 * Hoy solo está implementado ConsoleTransport. Para producción, agregar
 * SmtpTransport con nodemailer y enchufarlo aquí.
 */
import { IEmailTransport } from './IEmailTransport';
import { ConsoleTransport } from './ConsoleTransport';

let transport: IEmailTransport | null = null;

export function getEmailTransport(): IEmailTransport {
    if (transport) return transport;

    // Punto de extensión: cuando se agregue SmtpTransport, descomentar:
    //
    //   if (process.env.SMTP_HOST) {
    //       transport = new SmtpTransport({
    //           host: process.env.SMTP_HOST!,
    //           port: Number(process.env.SMTP_PORT ?? 587),
    //           user: process.env.SMTP_USER!,
    //           pass: process.env.SMTP_PASS!,
    //           from: process.env.SMTP_FROM ?? 'no-reply@autenza.local',
    //       });
    //       return transport;
    //   }

    transport = new ConsoleTransport();
    return transport;
}

/** Solo para testing — permite inyectar un mock. */
export function setEmailTransport(t: IEmailTransport): void {
    transport = t;
}
