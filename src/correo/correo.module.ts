import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsolaEnviador } from './consola.enviador';
import { EnviadorCorreo } from './enviador-correo';
import { SmtpEnviador } from './smtp.enviador';

export function crearEnviador(cfg: ConfigService): EnviadorCorreo {
  const proveedor = cfg.get<string>('MAIL_PROVIDER') ?? 'consola';
  if (proveedor === 'smtp') {
    const host = cfg.get<string>('SMTP_HOST') ?? '';
    if (!host) throw new Error('MAIL_PROVIDER=smtp requiere SMTP_HOST');
    return new SmtpEnviador({
      host,
      port: cfg.get<number>('SMTP_PORT') ?? 587,
      secure: cfg.get<boolean>('SMTP_SECURE') ?? false,
      user: cfg.get<string>('SMTP_USER') ?? '',
      password: cfg.get<string>('SMTP_PASSWORD') ?? '',
      from: cfg.get<string>('MAIL_FROM') ?? 'DonaDoc <no-responder@donadoc.local>',
    });
  }
  if (['staging', 'prod'].includes(cfg.get<string>('ENVIRONMENT') as string)) {
    throw new Error('MAIL_PROVIDER=consola no se permite en staging ni producción: configure SMTP');
  }
  return new ConsolaEnviador();
}

@Module({
  providers: [{ provide: EnviadorCorreo, inject: [ConfigService], useFactory: crearEnviador }],
  exports: [EnviadorCorreo],
})
export class CorreoModule {}
