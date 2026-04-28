import nodemailer, { Transporter } from 'nodemailer';
import { IEmailTransport, EmailMessage } from './IEmailTransport';
import { logger } from '../logging/logger';

interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
}

export class SmtpTransport implements IEmailTransport {
    private readonly transporter: Transporter;
    private readonly from: string;

    constructor(cfg: SmtpConfig) {
        this.from = cfg.from;
        this.transporter = nodemailer.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: cfg.port === 465,
            auth: { user: cfg.user, pass: cfg.pass },
        });
    }

    async send(msg: EmailMessage): Promise<void> {
        try {
            const info = await this.transporter.sendMail({
                from: this.from,
                to: msg.to,
                subject: msg.subject,
                text: msg.text,
                html: msg.html,
            });
            logger.info(`[email] sent to=${msg.to} messageId=${info.messageId}`);
        } catch (err) {
            logger.error(`[email] failed to=${msg.to}: ${(err as Error).message}`);
            throw err;
        }
    }
}
