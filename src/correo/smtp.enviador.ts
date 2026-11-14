import { Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { EnviadorCorreo } from './enviador-correo';

export interface ConfigSmtp {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export class SmtpEnviador extends EnviadorCorreo {
  private readonly logger = new Logger(SmtpEnviador.name);
  private readonly transporte: Transporter;

  constructor(private readonly cfg: ConfigSmtp) {
    super();
    this.transporte = createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.password } : undefined,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  async enviar(para: string, asunto: string, texto: string): Promise<void> {
    try {
      await this.transporte.sendMail({ from: this.cfg.from, to: para, subject: asunto, text: texto });
    } catch (e) {
      // El detalle puede incluir el destinatario o credenciales del proveedor: solo se registra el tipo de fallo.
      this.logger.error(`Fallo al enviar correo por SMTP: ${e instanceof Error ? e.name : 'error'}`);
      throw e;
    }
  }
}
