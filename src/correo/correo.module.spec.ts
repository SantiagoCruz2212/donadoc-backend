import { ConsolaEnviador } from './consola.enviador';
import { crearEnviador } from './correo.module';
import { SmtpEnviador } from './smtp.enviador';

const cfg = (v: Record<string, unknown>) => ({ get: (k: string) => v[k] }) as never;

describe('crearEnviador', () => {
  it('usa la consola en local y desarrollo', () => {
    expect(crearEnviador(cfg({ MAIL_PROVIDER: 'consola', ENVIRONMENT: 'local' }))).toBeInstanceOf(ConsolaEnviador);
  });

  it('rechaza la consola en staging y producción: allí el código OTP no puede quedar en un log', () => {
    expect(() => crearEnviador(cfg({ MAIL_PROVIDER: 'consola', ENVIRONMENT: 'prod' }))).toThrow(/no se permite/);
    expect(() => crearEnviador(cfg({ MAIL_PROVIDER: 'consola', ENVIRONMENT: 'staging' }))).toThrow(/no se permite/);
  });

  it('SMTP exige servidor y se construye con él', () => {
    expect(() => crearEnviador(cfg({ MAIL_PROVIDER: 'smtp', SMTP_HOST: '' }))).toThrow(/SMTP_HOST/);
    expect(crearEnviador(cfg({ MAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587 }))).toBeInstanceOf(SmtpEnviador);
  });
});
