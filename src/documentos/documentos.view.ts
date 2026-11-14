import { Documento } from './entities/documento.entity';

/** Vista pública: nunca expone la ruta interna del archivo. */
export class DocumentoVista {
  id: string;
  casoId: string;
  tipo: string;
  estado: string;
  nombreArchivo: string | null;
  hashSha256: string | null;
  creadoEn: Date;
}

export function toDocumentoVista(d: Documento): DocumentoVista {
  const nombre = d.rutaArchivo ? (d.rutaArchivo.split('/').pop() ?? '').replace(/^[0-9a-f-]{36}-/, '') : null;
  return { id: d.id, casoId: d.casoId, tipo: d.tipo, estado: d.estado, nombreArchivo: nombre, hashSha256: d.hashSha256, creadoEn: d.creadoEn };
}
