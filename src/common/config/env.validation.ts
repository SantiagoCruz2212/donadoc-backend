import * as Joi from 'joi';

// La aplicación no arranca si falta una variable obligatoria (regla de diseño de la arquitectura de referencia).
export const envSchema = Joi.object({
  ENVIRONMENT: Joi.string().valid('local', 'dev', 'staging', 'prod').default('local'),
  PORT: Joi.number().default(3000),
  APP_TIMEZONE: Joi.string().default('America/Bogota'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),

  JWT_PRIVATE_KEY: Joi.string().allow('').optional(),
  JWT_PUBLIC_KEY: Joi.string().allow('').optional(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  FRONTEND_URL: Joi.string().default('http://localhost:8080'),
  CORS_EXTRA_ORIGINS: Joi.string().allow('').default(''),

  UPLOAD_DIR: Joi.string().default('./uploads'),
  // Dónde se guardan los archivos: disco local (UPLOAD_DIR) o Supabase Storage (necesario en Vercel, que no tiene disco persistente).
  STORAGE_PROVIDER: Joi.string().valid('local', 'supabase').default('local'),
  SUPABASE_URL: Joi.string().uri().when('STORAGE_PROVIDER', { is: 'supabase', then: Joi.required(), otherwise: Joi.string().allow('').optional() }),
  SUPABASE_SERVICE_KEY: Joi.string().when('STORAGE_PROVIDER', { is: 'supabase', then: Joi.required(), otherwise: Joi.string().allow('').optional() }),
  SUPABASE_BUCKET: Joi.string().default('documentos'),
  DB_POOL_MAX: Joi.number().min(1).default(10), // en serverless use un valor bajo (p. ej. 3): cada instancia abre su propio pool
  MAX_UPLOAD_MB: Joi.number().default(5),

  EXTRACTOR_IA_PROVIDER: Joi.string().valid('gemini', 'ollama', 'groq', 'mock').default('gemini'),
  GEMINI_API_KEY: Joi.string().allow('').optional(),
  GEMINI_MODEL: Joi.string().default('gemini-2.5-flash'),
  GROQ_API_KEY: Joi.string().allow('').optional(),
  GROQ_MODEL: Joi.string().default('openai/gpt-oss-120b'),
  OLLAMA_URL: Joi.string().default('http://localhost:11434'),
  OLLAMA_MODEL: Joi.string().default('llama3.1:8b'),
  IA_TIMEOUT_MS: Joi.number().default(120000),
  IA_MAX_INTENTOS: Joi.number().min(1).max(5).default(2),
  IA_UMBRAL_CONFIANZA: Joi.number().min(0).max(1).default(0.7),
  IA_BACKOFF_MS: Joi.number().min(0).default(400),

  // Correo (códigos OTP): smtp con cualquier proveedor de capa gratuita, o consola solo en local/dev.
  MAIL_PROVIDER: Joi.string().valid('smtp', 'consola').default('consola'),
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default('DonaDoc <no-responder@donadoc.local>'),
  // Secreto que firma (HMAC) los códigos OTP guardados; obligatorio en producción.
  OTP_PEPPER: Joi.string().min(16).when('ENVIRONMENT', { is: 'prod', then: Joi.required(), otherwise: Joi.string().min(16).default('pepper-solo-para-desarrollo-local') }),
  // Llave (32 bytes en hexadecimal) con la que se cifran los datos clínicos sensibles en la base de datos; obligatoria en producción.
  // Genere una: openssl rand -hex 32. Si se pierde, los datos cifrados no se pueden recuperar.
  DATA_ENCRYPTION_KEY: Joi.string().empty('').pattern(/^[0-9a-fA-F]{64}$/)
    .messages({ 'string.pattern.base': 'DATA_ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (openssl rand -hex 32)' })
    .when('ENVIRONMENT', { is: 'prod', then: Joi.required(), otherwise: Joi.string().default('0'.repeat(63) + '1') }),
  OTP_TTL_MIN: Joi.number().min(1).max(60).default(10),
  OTP_MAX_INTENTOS: Joi.number().min(1).max(10).default(5),
  OTP_REENVIO_SEG: Joi.number().min(0).default(60),

  SEED_ENABLED: Joi.boolean().default(false),
  SEED_TENANT_KEY: Joi.string().default('pk_demo_clinica'),
  SEED_ADMIN_EMAIL: Joi.string().default('coordinador@demo.local'),
  SEED_ADMIN_PASSWORD: Joi.string().allow('').default(''),
}).unknown(true);
