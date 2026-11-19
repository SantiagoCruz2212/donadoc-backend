// Genera los secretos propios de DonaDoc y los guarda en un archivo LOCAL (.env.secretos), que Git ignora.
// Nada se imprime en pantalla: abra el archivo y copie cada valor a Vercel (Settings > Environment Variables).
// Uso:  node scripts/generar-secretos.mjs
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const SALIDA = '.env.secretos';
if (existsSync(SALIDA)) {
  console.error(`Ya existe ${SALIDA}. Bórrelo solo si de verdad quiere generar secretos nuevos (los datos cifrados con la llave anterior NO se podrían leer).`);
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const enUnaLinea = (pem) => pem.trim().replace(/\n/g, '\\n'); // el backend espera los saltos de línea como \n

const lineas = [
  '# Secretos generados localmente. NO los suba a Git ni los comparta. Copie cada valor a las variables de entorno del servidor.',
  `JWT_PRIVATE_KEY=${enUnaLinea(privateKey)}`,
  `JWT_PUBLIC_KEY=${enUnaLinea(publicKey)}`,
  `DATA_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
  `OTP_PEPPER=${randomBytes(24).toString('hex')}`,
  `SEED_ADMIN_PASSWORD=${randomBytes(9).toString('base64url')}`,
];
writeFileSync(SALIDA, lineas.join('\n') + '\n', { mode: 0o600 });
console.log(`Listo: ${SALIDA} creado con 5 secretos (JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, DATA_ENCRYPTION_KEY, OTP_PEPPER, SEED_ADMIN_PASSWORD).`);
console.log('Guarde una copia segura de DATA_ENCRYPTION_KEY: si se pierde, los datos cifrados no se pueden recuperar.');
