// Arma el archivo .env.vercel (LOCAL, Git lo ignora) con TODAS las variables del backend para pegarlas de una vez en Vercel
// (Project > Settings > Environment Variables > "Import .env" / pegar). Combina:
//   - .env.secretos  (secretos generados por scripts/generar-secretos.mjs)
//   - .env           (conexión a la base de Supabase, creada por scripts/preparar-migracion.mjs; solo se toman host, usuario, contraseña y base)
//   - lo que escriba aquí: URL del proyecto de Supabase, llave secreta de Supabase y llave de Groq.
// Uso:  node scripts/armar-variables-vercel.mjs <url-del-proyecto-supabase> [url-del-frontend]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const [urlSupabase, urlFrontend = ''] = process.argv.slice(2);
if (!urlSupabase?.startsWith('https://')) {
  console.error('Uso: node scripts/armar-variables-vercel.mjs https://<referencia>.supabase.co [https://<frontend>.vercel.app]');
  process.exit(1);
}
for (const f of ['.env.secretos', '.env']) {
  if (!existsSync(f)) {
    console.error(`Falta ${f}. Ejecute antes scripts/generar-secretos.mjs y scripts/preparar-migracion.mjs.`);
    process.exit(1);
  }
}
if (existsSync('.env.vercel')) {
  console.error('Ya existe .env.vercel: bórrelo antes de continuar.');
  process.exit(1);
}

const leer = (archivo) =>
  Object.fromEntries(
    readFileSync(archivo, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
  );
const secretos = leer('.env.secretos');
const base = leer('.env');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const llaveSupabase = (await rl.question('Llave SECRETA de Supabase (Settings > API keys; service_role o sb_secret_...): ')).trim();
const llaveGroq = (await rl.question('Llave de Groq (console.groq.com/keys): ')).trim();
rl.close();
if (!llaveSupabase || !llaveGroq) {
  console.error('Ambas llaves son obligatorias.');
  process.exit(1);
}

const vars = {
  ENVIRONMENT: 'dev',
  DB_HOST: base.DB_HOST,
  DB_PORT: '6543', // transaction pooler (serverless)
  DB_USER: base.DB_USER,
  DB_PASSWORD: base.DB_PASSWORD,
  DB_NAME: base.DB_NAME,
  DB_SSL: 'true',
  DB_POOL_MAX: '3',
  JWT_PRIVATE_KEY: secretos.JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY: secretos.JWT_PUBLIC_KEY,
  DATA_ENCRYPTION_KEY: secretos.DATA_ENCRYPTION_KEY,
  OTP_PEPPER: secretos.OTP_PEPPER,
  STORAGE_PROVIDER: 'supabase',
  SUPABASE_URL: urlSupabase.replace(/\/$/, ''),
  SUPABASE_SERVICE_KEY: llaveSupabase,
  SUPABASE_BUCKET: 'documentos',
  EXTRACTOR_IA_PROVIDER: 'groq',
  GROQ_API_KEY: llaveGroq,
  MAX_UPLOAD_MB: '4',
  MAIL_PROVIDER: 'consola',
  FRONTEND_URL: urlFrontend || 'https://configurar-despues.vercel.app',
};
const faltan = Object.entries(vars).filter(([, v]) => !v).map(([k]) => k);
if (faltan.length) {
  console.error(`Faltan valores para: ${faltan.join(', ')}`);
  process.exit(1);
}
writeFileSync('.env.vercel', Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
console.log(`Listo: .env.vercel creado con ${Object.keys(vars).length} variables. Ábralo, copie todo y péguelo en Vercel > Settings > Environment Variables.`);
console.log('Cuando termine el despliegue, borre .env, .env.secretos y .env.vercel (guarde antes una copia segura de DATA_ENCRYPTION_KEY).');
