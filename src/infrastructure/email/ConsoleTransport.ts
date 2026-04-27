import { IEmailTransport, EmailMessage } from './IEmailTransport';

/**
 * Transport que imprime el email a stdout en lugar de enviarlo.
 * Pensado para dev / staging sin SMTP configurado.
 * En prod, reemplazar por SmtpTransport (nodemailer) o un servicio
 * transaccional (Resend, SendGrid).
 *
 * Usa console.log (no winston) porque el logger tiene nivel "warn"
 * en producción y filtra los info. Acá necesitamos garantizar que
 * el link salga al log para que un humano lo pueda copiar.
 */
export class ConsoleTransport implements IEmailTransport {
    async send(msg: EmailMessage): Promise<void> {
        const lines = [
            '═══════════════════════ EMAIL OUT ═══════════════════════',
            `  → To:      ${msg.to}`,
            `  → Subject: ${msg.subject}`,
            '  ─── Texto plano ───',
            ...msg.text.split('\n').map(l => `  ${l}`),
            '═════════════════════════════════════════════════════════',
        ];
        console.log(lines.join('\n'));
    }
}
