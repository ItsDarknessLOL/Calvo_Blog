const MAX_LENGTH = 4000;

function clean(value, limit = MAX_LENGTH) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    const confirmation = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [senderEmail],
        subject: 'Gracias por tu propuesta | Calvo Blog',
        text: `Hola${name === 'No indicado' ? '' : ` ${name}`},\n\nGracias por tu correo y por compartir tu propuesta sobre "${topic}". La recibimos correctamente y la revisaremos para futuras publicaciones.\n\nSaludos,\nCalvo Blog`,
      }),
    });

    if (!confirmation.ok) {
      console.error('La solicitud fue entregada, pero no se pudo enviar la confirmación al usuario.');
    }
  }

  return response.status(200).json({ ok: true });
}
