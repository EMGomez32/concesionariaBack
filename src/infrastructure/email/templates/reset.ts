interface ResetParams {
    nombre: string;
    resetUrl: string;
    expiresInMinutes: number;
    appName?: string;
}

export function renderResetEmail(p: ResetParams): { subject: string; html: string; text: string } {
    const appName = p.appName ?? 'AUTENZA / Concesionaria';
    const subject = `Restablecé tu contraseña en ${appName}`;

    const text = `Hola ${p.nombre},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${appName}.

Para crear una nueva contraseña, ingresá al siguiente link:

${p.resetUrl}

El link es válido por ${p.expiresInMinutes} minutos.

Si vos no solicitaste este cambio, ignorá este mensaje y tu contraseña actual seguirá funcionando.

— ${appName}`;

    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f6f8;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:22px;color:#0e7490">${appName}</h1>
    <p style="margin:0 0 8px;font-size:16px">Hola <strong>${escape(p.nombre)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta. Para crear una nueva, hacé clic en el botón:
    </p>
    <p style="margin:24px 0;text-align:center">
      <a href="${p.resetUrl}" style="display:inline-block;padding:12px 24px;background:#0e7490;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
        Restablecer contraseña
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280">
      Si el botón no funciona, copiá y pegá esta URL en tu navegador:
    </p>
    <p style="margin:0 0 16px;font-size:12px;word-break:break-all;color:#374151">
      <a href="${p.resetUrl}" style="color:#0e7490">${p.resetUrl}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#9ca3af">
      El link es válido por <strong>${p.expiresInMinutes} minutos</strong>.
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">
      Si vos no solicitaste este cambio, ignorá este mensaje y tu contraseña actual seguirá funcionando.
    </p>
  </div>
  <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#9ca3af">© ${new Date().getFullYear()} ${appName}</p>
</div>
</body></html>`;

    return { subject, html, text };
}

function escape(s: string): string {
    return s.replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch] as string));
}
