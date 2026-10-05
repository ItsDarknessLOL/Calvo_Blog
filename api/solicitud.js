const MAX_LENGTH = 4000;

function clean(value, limit = MAX_LENGTH) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido' });

  const { nombre, email, tema, mensaje, website } = request.body ?? {};
  if (clean(website) || !clean(tema, 180) || !clean(mensaje)) return response.status(400).json({ error: 'Solicitud inválida' });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !from || !to) return response.status(503).json({ error: 'Formulario no configurado' });

  const text = `Nueva solicitud de Calvo Blog\n\nTema: ${clean(tema, 180)}\nNombre: ${clean(nombre, 180) || 'No indicado'}\nCorreo: ${clean(email, 254) || 'No indicado'}\n\nMensaje:\n${clean(mensaje)}`;
  const mail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `Nueva propuesta: ${clean(tema, 180)}`, text, reply_to: clean(email, 254) || undefined }),
  });

  if (!mail.ok) return response.status(502).json({ error: 'No fue posible entregar el mensaje' });
  return response.status(200).json({ ok: true });
}
