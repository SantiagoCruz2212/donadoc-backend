// Entorno de las pruebas de integración: se ejecuta ANTES de cargar la aplicación (la configuración se valida al importar AppModule).
// Requiere un PostgreSQL real. Variables opcionales: INT_DB_HOST, INT_DB_PORT, INT_DB_USER, INT_DB_PASSWORD, INT_DB_NAME.
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const env = process.env;
env.ENVIRONMENT = 'local'; // en local las migraciones corren al arrancar la aplicación
env.DB_HOST = env.INT_DB_HOST ?? 'localhost';
env.DB_PORT = env.INT_DB_PORT ?? '54331';
env.DB_USER = env.INT_DB_USER ?? 'donadoc';
env.DB_PASSWORD = env.INT_DB_PASSWORD ?? 'prueba_local';
env.DB_NAME = env.INT_DB_NAME ?? 'donadoc_int';
env.EXTRACTOR_IA_PROVIDER = 'mock'; // simulador determinista: sin red ni claves
env.IA_BACKOFF_MS = '0';
env.IA_TIMEOUT_MS = '2000';
env.IA_MAX_INTENTOS = '2';
env.SEED_ENABLED = 'false';
env.MAX_UPLOAD_MB = '5';
env.FRONTEND_URL = 'http://localhost:8080';
env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'donadoc-int-'));
env.NODE_ENV = 'test';
