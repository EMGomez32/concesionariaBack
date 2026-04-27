interface ActivacionParams {
    nombre: string;
    rol: string;
    activacionUrl: string;
    expiresInHours: number;
    appName?: string;
}

export function renderActivacionEmail(p: ActivacionParams): { subject: string; html: string; text: string } {
    const appName = p.appName ?? 'AUTENZA / Concesionaria';
    const subject = `Activá tu cuenta en ${appName}`;

    const text = `Hola ${p.nombre},

Fuiste registrado en ${appName} con el rol "${p.rol}".

Para activar tu cuenta y crear tu contraseña, ingresá al siguiente link:

${p.activacionUrl}

Este link es válido por ${p.expiresInHours} horas. Si vence, podés pedirle a un administrador que te reenvíe la invitación.

Si vos no esperabas esta invitación, ignorá este mensaje.

— ${appName}`;

    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f6f8;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:22px;color:#0e7490">${appName}</h1>
    <p style="margin:0 0 8px;font-size:16px">Hola <strong>${escape(p.nombre)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151">
      Fuiste registrado en <strong>${appName}</strong> con el rol
      <strong>${escape(p.rol)}</strong>. Para activar tu cuenta y crear tu contraseña, hacé clic en el botón:
    </p>
    <p style="margin:24px 0;text-align:center">
      <a href="${p.activacionUrl}" style="display:inline-block;padding:12px 24px;background:#0e7490;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
        Activar mi cuenta
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280">
      Si el botón no funciona, copiá y pegá esta URL en tu navegador:
    </p>
    <p style="margin:0 0 16px;font-size:12px;word-break:break-all;color:#374151">
      <a href="${p.activacionUrl}" style="color:#0e7490">${p.activacionUrl}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#9ca3af">
      Este link vence en <strong>${p.expiresInHours} horas</strong>.
      Si venció, pedile a un administrador que te reenvíe la invitación.
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">
      Si vos no esperabas esta invitación, ignorá este mensaje.
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
