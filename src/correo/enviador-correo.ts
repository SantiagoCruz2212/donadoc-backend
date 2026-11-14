/**
 * Puerto de envío de correo: el resto del código no conoce el proveedor.
 * Adaptadores: SMTP (cualquier proveedor con capa gratuita: Brevo, Gmail con clave de aplicación, Resend…) y consola (solo local/dev).
 */
export abstract class EnviadorCorreo {
  /** Envía un correo de texto plano. Lanza si el proveedor falla; quien llama decide si eso debe verse. */
  abstract enviar(para: string, asunto: string, texto: string): Promise<void>;
}
