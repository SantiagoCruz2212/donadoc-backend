import { envSchema } from './env.validation';

const minimo = { DB_HOST: 'localhost', DB_USER: 'donadoc', DB_PASSWORD: 'clave', DB_NAME: 'donadoc' };
const validar = (env: Record<string, unknown>) => envSchema.validate(env, { abortEarly: false });

describe('Validación de variables de entorno (la aplicación no arranca si falta una obligatoria)', () => {
  it('con solo las variables obligatorias es válida y aplica los valores por defecto', () => {
    const { error, value } = validar(minimo);
    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      ENVIRONMENT: 'local', PORT: 3000, DB_PORT: 5432, JWT_EXPIRES_IN: '15m', MAX_UPLOAD_MB: 5, EXTRACTOR_IA_PROVIDER: 'gemini',
      IA_MAX_INTENTOS: 2, IA_UMBRAL_CONFIANZA: 0.7, SEED_ENABLED: false, APP_TIMEZONE: 'America/Bogota',
    });
  });

  it('faltan DB_HOST, DB_USER, DB_PASSWORD y DB_NAME: informa todas a la vez', () => {
    const { error } = validar({});
    const mensaje = error?.message ?? '';
    for (const v of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) expect(mensaje).toContain(v);
  });

  it('permite una contraseña de base de datos vacía (desarrollo local)', () => {
    expect(validar({ ...minimo, DB_PASSWORD: '' }).error).toBeUndefined();
  });

  it('rechaza un ENVIRONMENT desconocido', () => {
    expect(validar({ ...minimo, ENVIRONMENT: 'produccion' }).error).toBeDefined();
  });

  it('rechaza un proveedor de IA desconocido', () => {
    expect(validar({ ...minimo, EXTRACTOR_IA_PROVIDER: 'openai' }).error).toBeDefined();
  });

  it.each(['gemini', 'ollama', 'mock'])('acepta el proveedor de IA «%s»', (p) => {
    expect(validar({ ...minimo, EXTRACTOR_IA_PROVIDER: p }).error).toBeUndefined();
  });

  it('rechaza un umbral de confianza fuera de 0 a 1', () => {
    expect(validar({ ...minimo, IA_UMBRAL_CONFIANZA: 1.5 }).error).toBeDefined();
    expect(validar({ ...minimo, IA_UMBRAL_CONFIANZA: -0.1 }).error).toBeDefined();
  });

  it('limita los reintentos de IA a un máximo de 5', () => {
    expect(validar({ ...minimo, IA_MAX_INTENTOS: 6 }).error).toBeDefined();
    expect(validar({ ...minimo, IA_MAX_INTENTOS: 0 }).error).toBeDefined();
    expect(validar({ ...minimo, IA_MAX_INTENTOS: 3 }).error).toBeUndefined();
  });

  it('convierte los textos numéricos y booleanos del entorno', () => {
    const { value } = validar({ ...minimo, PORT: '4000', SEED_ENABLED: 'true', DB_SSL: 'false' });
    expect(value).toMatchObject({ PORT: 4000, SEED_ENABLED: true, DB_SSL: false });
  });

  it('ignora variables desconocidas del sistema', () => {
    expect(validar({ ...minimo, PATH: '/usr/bin', NO_CONOCIDA: 'x' }).error).toBeUndefined();
  });
});
