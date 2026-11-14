import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

/**
 * Cifrado de campos sensibles en la base de datos (AES-256-GCM).
 *
 * - Cada valor se cifra con un IV aleatorio de 12 bytes y lleva una etiqueta de autenticación (detecta alteraciones).
 * - Formato guardado: `enc:v1:` + base64(iv | etiqueta | cifrado). La versión permite rotar la llave en el futuro.
 * - Texto: se guarda la cadena cifrada. JSON: se guarda `{ "$enc": "enc:v1:..." }`, que sigue siendo JSON válido (sin cambiar el esquema).
 * - Los valores antiguos guardados en claro se siguen leyendo; se cifran la próxima vez que se guardan.
 * - La llave (DATA_ENCRYPTION_KEY, 32 bytes en hexadecimal) vive solo en la configuración; nunca en el repositorio.
 * - Limitación: un campo cifrado con IV aleatorio no se puede buscar ni usar en un índice único.
 */
const PREFIJO = 'enc:v1:';
const LARGO_IV = 12;
const LARGO_ETIQUETA = 16;

let clave: Buffer | null = null;

/** Fija la llave de cifrado (64 caracteres hexadecimales = 32 bytes). Se llama al arrancar, con la configuración validada. */
export function fijarClaveCifrado(hex: string | undefined): void {
  if (!hex) {
    clave = null;
    return;
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('DATA_ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (32 bytes)');
  clave = Buffer.from(hex, 'hex');
}

function claveActual(): Buffer {
  if (!clave) throw new Error('Falta la llave de cifrado (DATA_ENCRYPTION_KEY): no se pueden leer ni guardar datos sensibles');
  return clave;
}

export function cifrarTexto(plano: string): string {
  const iv = randomBytes(LARGO_IV);
  const cifrador = createCipheriv('aes-256-gcm', claveActual(), iv);
  const cifrado = Buffer.concat([cifrador.update(plano, 'utf8'), cifrador.final()]);
  return PREFIJO + Buffer.concat([iv, cifrador.getAuthTag(), cifrado]).toString('base64');
}

export function estaCifrado(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.startsWith(PREFIJO);
}

export function descifrarTexto(valor: string): string {
  const bytes = Buffer.from(valor.slice(PREFIJO.length), 'base64');
  if (bytes.length < LARGO_IV + LARGO_ETIQUETA) throw new Error('Dato cifrado con formato inválido');
  const descifrador = createDecipheriv('aes-256-gcm', claveActual(), bytes.subarray(0, LARGO_IV));
  descifrador.setAuthTag(bytes.subarray(LARGO_IV, LARGO_IV + LARGO_ETIQUETA));
  return Buffer.concat([descifrador.update(bytes.subarray(LARGO_IV + LARGO_ETIQUETA)), descifrador.final()]).toString('utf8');
}

/** Columna de texto (varchar o text) cifrada. null e indefinido pasan sin cambios. */
export const textoCifrado: ValueTransformer = {
  to: (valor: string | null | undefined) => (valor === null || valor === undefined ? valor : cifrarTexto(valor)),
  from: (valor: string | null | undefined) => (estaCifrado(valor) ? descifrarTexto(valor) : valor),
};

/** Columna jsonb cifrada: guarda `{ "$enc": "..." }`. Un JSON antiguo en claro se lee tal cual. */
export const jsonCifrado: ValueTransformer = {
  to: (valor: unknown) => (valor === null || valor === undefined ? valor : { $enc: cifrarTexto(JSON.stringify(valor)) }),
  from: (valor: unknown) => {
    if (valor && typeof valor === 'object' && estaCifrado((valor as { $enc?: unknown }).$enc)) {
      return JSON.parse(descifrarTexto((valor as { $enc: string }).$enc));
    }
    return valor;
  },
};
