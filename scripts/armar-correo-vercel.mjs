// Prepara las variables de correo (Gmail por SMTP) para pegarlas en Vercel y las copia al portapapeles.
// Pide su correo de Gmail y su contraseña de aplicación (esta se escribe OCULTA). Nada se guarda en archivos.
// Uso:  node scripts/armar-correo-vercel.mjs
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';

function preguntar(texto, oculto = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      rl._writeToOutput = (s) => {
        if (s.includes(texto)) process.stdout.write(s); // muestra la pregunta, no lo que se escribe
      };
    }
    rl.question(texto, (r) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolve(r.trim());
    });
  });
}

const correo = await preguntar('Su correo de Gmail: ');
const clave = (await preguntar('Contraseña de aplicación de 16 caracteres (no se verá al escribir): ', true)).replace(/\s+/g, '');
if (!/^[^@\s]+@gmail\.com$/i.test(correo)) {
  console.error('El correo debe ser de Gmail (termina en @gmail.com).');
  process.exit(1);
}
if (clave.length !== 16) {
  console.error(`La contraseña de aplicación debe tener 16 caracteres (tiene ${clave.length}).`);
  process.exit(1);
}

const variables = [
  'SMTP_HOST=smtp.gmail.com',
  'SMTP_PORT=587',
  'SMTP_SECURE=false',
  `SMTP_USER=${correo}`,
  `SMTP_PASSWORD=${clave}`,
  `MAIL_FROM=DonaDoc <${correo}>`,
].join('\n');

const r = spawnSync('clip', { input: variables, shell: true });
if (r.status !== 0) {
  console.error('No se pudo copiar al portapapeles.');
  process.exit(1);
}
console.log('Listo: 6 variables copiadas al portapapeles (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, MAIL_FROM).');
console.log('Péguelas en Vercel > donadoc-backend > Settings > Environment Variables con Ctrl+V. MAIL_PROVIDER=smtp lo cambio yo.');
