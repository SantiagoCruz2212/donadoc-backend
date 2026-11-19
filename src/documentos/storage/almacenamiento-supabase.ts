import { Injectable } from '@nestjs/common';
import { Almacenamiento } from './almacenamiento';

/**
 * Adaptador de Supabase Storage (REST). Los archivos van a un bucket PRIVADO: nunca se exponen por URL pública, solo los lee el backend.
 * La llave de servicio (SUPABASE_SERVICE_KEY) vive solo en las variables de entorno del servidor.
 */
@Injectable()
export class AlmacenamientoSupabase extends Almacenamiento {
  private readonly url: string;

  constructor(
    baseUrl: string,
    private readonly llaveServicio: string,
    private readonly bucket: string,
  ) {
    super();
    this.url = baseUrl.replace(/\/$/, '');
  }

  private ruta(key: string, autenticada = false): string {
    if (key.split('/').some((p) => p === '..' || p === '')) throw new Error('Clave de almacenamiento inválida');
    const clave = key.split('/').map(encodeURIComponent).join('/');
    return `${this.url}/storage/v1/object/${autenticada ? 'authenticated/' : ''}${encodeURIComponent(this.bucket)}/${clave}`;
  }

  /** La llave `service_role` clásica es un JWT y va también como Bearer; las llaves nuevas (`sb_secret_…`) solo van en `apikey`. */
  private get cabeceras(): Record<string, string> {
    const h: Record<string, string> = { apikey: this.llaveServicio };
    if (this.llaveServicio.startsWith('eyJ')) h.authorization = `Bearer ${this.llaveServicio}`;
    return h;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const res = await fetch(this.ruta(key), {
      method: 'POST',
      headers: { ...this.cabeceras, 'content-type': 'application/octet-stream', 'x-upsert': 'true' },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`No se pudo guardar el archivo en Supabase Storage (HTTP ${res.status})`);
  }

  async get(key: string): Promise<Buffer> {
    const res = await fetch(this.ruta(key, true), { headers: this.cabeceras });
    if (!res.ok) throw new Error(`No se pudo leer el archivo de Supabase Storage (HTTP ${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
}
