export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
}

export interface IEmailTransport {
    /**
     * Envía un email. Implementaciones:
     *  - ConsoleTransport (dev): imprime a stdout, no envía nada.
     *  - SmtpTransport (prod): usa nodemailer + SMTP_HOST/PORT/USER/PASS env.
     */
    send(msg: EmailMessage): Promise<void>;
}
