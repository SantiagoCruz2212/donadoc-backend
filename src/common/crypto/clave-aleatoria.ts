import { randomInt } from 'crypto';

/** Costo de bcrypt (10 = mínimo recomendado por OWASP). Los hashes antiguos de costo 12 siguen siendo válidos. */
export const BCRYPT_COSTO = 10;

// Sin caracteres ambiguos (0/O, 1/l/I) para que se pueda leer y copiar del correo sin errores.
const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUS = 'abcdefghijkmnopqrstuvwxyz';
const DIGITOS = '23456789';
const SIMBOLOS = '#$%&*+-=?@';

/** Clave aleatoria con aleatoriedad criptográfica: al menos una mayúscula, una minúscula, un dígito y un símbolo. */
export function generarClaveAleatoria(largo = 14): string {
  const todos = MAYUS + MINUS + DIGITOS + SIMBOLOS;
  const pick = (alfabeto: string) => alfabeto[randomInt(alfabeto.length)];
  const caracteres = [pick(MAYUS), pick(MINUS), pick(DIGITOS), pick(SIMBOLOS)];
  while (caracteres.length < largo) caracteres.push(pick(todos));
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}
