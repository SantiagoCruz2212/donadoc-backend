/**
 * Puerto de almacenamiento: el resto del código nunca toca el disco ni S3 directamente.
 * Hoy hay un adaptador local; en el MVP en producción se reemplaza por uno S3/R2 sin cambiar los servicios.
 */
export abstract class Almacenamiento {
  abstract put(key: string, data: Buffer): Promise<void>;
  abstract get(key: string): Promise<Buffer>;
}
