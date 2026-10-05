const MAX_LENGTH = 4000;

function clean(value, limit = MAX_LENGTH) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido' });

  const { nombre, email, tema, mensaje, website } = request.body ?? {};
  if (clean(website) || !clean(tema, 180) || !clean(mensaje)) return response.status(400).json({ error: 'Solicitud inválida' });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !from || !to) return response.status(503).json({ error: 'Formulario no configurado' });

  const senderEmail = clean(email, 254);
  const replyTo = isValidEmail(senderEmail) ? senderEmail : undefined;
  const topic = clean(tema, 180);
  const name = clean(nombre, 180) || 'No indicado';
  const text = `Nueva solicitud de Calvo Blog\n\nTema: ${topic}\nNombre: ${name}\nCorreo: ${senderEmail || 'No indicado'}\n\nMensaje:\n${clean(mensaje)}`;
  const mail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `Nueva propuesta: ${topic}`, text, reply_to: replyTo }),
  });

  if (!mail.ok) return response.status(502).json({ error: 'No fue posible entregar el mensaje' });

  if (senderEmail && isValidEmail(senderEmail)) {
    const siteUrl = process.env.CONTACT_SITE_URL || 'https://bycalvo.live';
    const safeName = escapeHtml(name === 'No indicado' ? '' : name);
    const safeTopic = escapeHtml(topic);
    const confirmation = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [senderEmail],
        subject: 'Gracias por tu propuesta | Bycalvo Services',
        text: `Hola${name === 'No indicado' ? '' : ` ${name}`},\n\nGracias por tu correo y por compartir tu propuesta sobre "${topic}". La recibimos correctamente y la revisaremos para futuras publicaciones.\n\nSaludos,\nCalvo Blog`,
        html: `
          <div style="margin:0;background:#08090a;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0">
            <div style="margin:0 auto;max-width:600px;overflow:hidden;border:1px solid #272a2f;border-radius:16px;background:#111315">
              <div style="padding:28px 32px;background:#08090a;border-bottom:1px solid #272a2f">
                <a href="${siteUrl}" style="color:#fff;text-decoration:none">
                  <img src="${siteUrl}/favicon.ico" width="32" height="32" alt="Bycalvo Services" style="margin-right:10px;vertical-align:middle;border-radius:8px">
                  <span style="vertical-align:middle;color:#fff;font-size:18px;font-weight:700;letter-spacing:2px">BYCALVO SERVICES</span>
                </a>
              </div>
              <div style="padding:36px 32px">
                <p style="margin:0 0 10px;color:#ffcc00;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Solicitud recibida</p>
                <h1 style="margin:0 0 20px;color:#fff;font-size:28px;line-height:1.2">¡Gracias por tu correo${safeName ? `, ${safeName}` : ''}!</h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7">Recibimos correctamente tu propuesta. La revisaremos para futuras publicaciones en Calvo Blog.</p>
                <div style="padding:18px 20px;border-left:3px solid #ffcc00;border-radius:8px;background:#191c20">
                  <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Tema enviado</p>
                  <p style="margin:0;color:#fff;font-size:16px;line-height:1.5">${safeTopic}</p>
                </div>
                <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#94a3b8">Gracias por ayudar a construir contenido útil para la comunidad.</p>
              </div>
              <div style="padding:20px 32px;border-top:1px solid #272a2f;color:#64748b;font-size:12px;line-height:1.5">
                <p style="margin:0">Calvo Blog · Aprende lógica digital, programación, hardware y software.</p>
                <a href="${siteUrl}" style="color:#ffcc00;text-decoration:none">${siteUrl.replace(/^https?:\/\//, '')}</a>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!confirmation.ok) {
      console.error('La solicitud fue entregada, pero no se pudo enviar la confirmación al usuario.');
    }
  }

  return response.status(200).json({ ok: true });
}
