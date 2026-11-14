import { Logger } from '@nestjs/common';
import { EnviadorCorreo } from './enviador-correo';

/** Solo para desarrollo: escribe el correo en el log (incluye códigos OTP), por eso se rechaza en staging y producción. */
export class ConsolaEnviador extends EnviadorCorreo {
  private readonly logger = new Logger('CorreoSimulado');
  /** Último correo «enviado»: permite a las pruebas automáticas leer el código sin un servidor de correo. */
  ultimo: { para: string; asunto: string; texto: string } | null = null;

  async enviar(para: string, asunto: string, texto: string): Promise<void> {
    this.ultimo = { para, asunto, texto };
    this.logger.warn(`Para: ${para} | Asunto: ${asunto}\n${texto}`);
  }
}
