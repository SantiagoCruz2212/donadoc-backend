import { Usuario } from '@users/entities/usuario.entity';
import { Auditoria } from './entities/auditoria.entity';

/** Un evento de la traza de auditoría: quién, qué, sobre qué, cuándo y desde dónde. */
export class AuditoriaVista {
  id: string;
  fecha: Date;
  usuarioId: string | null;
  usuarioNombre: string | null;
  entidad: string;
  entidadId: string | null;
  accion: string;
  metodo: string | null;
  ruta: string | null;
  estadoHttp: number | null;
  ip: string | null;
  valorAnterior: unknown;
  valorNuevo: unknown;
}

export function toAuditoriaVista(a: Auditoria & { usuario?: Usuario | null }): AuditoriaVista {
  return {
    id: a.id,
    fecha: a.creadoEn,
    usuarioId: a.usuarioId,
    usuarioNombre: a.usuario?.nombre ?? null,
    entidad: a.entidad,
    entidadId: a.entidadId,
    accion: a.accion,
    metodo: a.metodo,
    ruta: a.ruta,
    estadoHttp: a.estadoHttp,
    ip: a.ip,
    valorAnterior: a.valorAnterior ?? null,
    valorNuevo: a.valorNuevo ?? null,
  };
}
