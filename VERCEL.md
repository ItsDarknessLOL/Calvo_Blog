# Configuración en Vercel

El sitio se compila con `npm run build` y publica la carpeta `dist`.

## Formulario de solicitudes

La ruta `/api/solicitud` usa [Resend](https://resend.com) para entregar las propuestas por correo. En **Vercel → Settings → Environment Variables**, añade estas variables para Production, Preview y Development:

| Variable | Valor |
| --- | --- |
| `RESEND_API_KEY` | Clave API creada en Resend. |
| `CONTACT_FROM_EMAIL` | Remitente verificado, por ejemplo `Calvo Blog <hola@tudominio.com>`. |
| `CONTACT_TO_EMAIL` | Dirección que recibirá las solicitudes. |

Verifica el dominio remitente en Resend antes de usar una dirección de tu dominio. Las claves se guardan solo en Vercel: nunca se incluyen en el código ni se envían al navegador.

## Enlaces externos en las tarjetas

Para mostrar un botón adicional en cualquier tarjeta, agrega estas propiedades al encabezado del Markdown:

```yaml
sourceUrl: "https://ejemplo.com/recurso"
sourceLabel: "Ver fuente"
```

La tarjeta conserva su botón principal (`Ver noticia`, `Ver guía`, etc.) que abre el contenido del blog, y muestra un segundo botón para abrir el enlace externo.
