import { promises as fs } from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Almacenamiento } from './almacenamiento';

/** Adaptador de almacenamiento en disco local (carpeta UPLOAD_DIR). */
@Injectable()
export class AlmacenamientoLocal extends Almacenamiento {
  private readonly base: string;

  constructor(cfg: ConfigService) {
    super();
    this.base = path.resolve(cfg.get<string>('UPLOAD_DIR') as string);
  }

  /** Evita salirse de la carpeta base (path traversal). */
  private resolve(key: string): string {
    const full = path.resolve(this.base, key);
    if (!full.startsWith(this.base + path.sep)) throw new Error('Clave de almacenamiento inválida');
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }
}
