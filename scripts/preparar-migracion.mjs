// Arma el archivo .env LOCAL (Git lo ignora) para crear las tablas y el usuario demo en Supabase, una sola vez.
// Pide en su terminal la contraseña de la base de datos (no se guarda en ningún otro lugar) y reutiliza los secretos de .env.secretos.
// Uso:  node scripts/preparar-migracion.mjs <referencia-del-proyecto> [host-del-pooler]
//   p. ej.  node scripts/preparar-migracion.mjs jmjgrzyhciolgjnqsbpi aws-0-us-east-2.pooler.supabase.com
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const [ref, host = 'aws-0-us-east-2.pooler.supabase.com'] = process.argv.slice(2);
if (!ref) {
  console.error('Falta la referencia del proyecto (la parte de la URL https://<referencia>.supabase.co).');
  process.exit(1);
}
if (!existsSync('.env.secretos')) {
  console.error('No existe .env.secretos: ejecute antes  node scripts/generar-secretos.mjs');
  process.exit(1);
}
if (existsSync('.env')) {
  console.error('Ya existe un .env: renómbrelo o bórrelo antes de continuar para no sobrescribirlo.');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const clave = (await rl.question('Contraseña de la base de datos de Supabase: ')).trim();
rl.close();
if (!clave) {
  console.error('La contraseña no puede estar vacía.');
  process.exit(1);
}

const lineas = [
  '# .env LOCAL para migrar Supabase (no se versiona). Modo local: aplica migraciones y crea el usuario demo al arrancar.',
  'ENVIRONMENT=local',
  'PORT=3000',
  `DB_HOST=${host}`,
  'DB_PORT=5432', // session pooler: apto para migraciones
  `DB_USER=postgres.${ref}`,
  `DB_PASSWORD=${clave}`,
  'DB_NAME=postgres',
  'DB_SSL=true',
  'SEED_ENABLED=true',
  'EXTRACTOR_IA_PROVIDER=mock',
  'FRONTEND_URL=http://localhost:8080',
  readFileSync('.env.secretos', 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).join('\n'),
];
writeFileSync('.env', lineas.join('\n') + '\n', { mode: 0o600 });
console.log('Listo: .env creado. Siguiente paso:  npm ci && npm run build && node dist/main.js   (Ctrl+C cuando diga que escucha)');
