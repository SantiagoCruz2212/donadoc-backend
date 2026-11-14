import { Caso } from './entities/caso.entity';
import { ComponenteCaso } from './entities/componente-caso.entity';

export class DonanteVista {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
}

/** Respuesta pública de un caso: nunca se devuelve la entidad cruda. */
export class CasoVista {
  id: string;
  estado: string;
  tipoDonante: string | null;
  muerteViolenta: boolean;
  creadoEn: Date;
  donante?: DonanteVista;
}

export class ComponenteVista {
  id: string;
  tipoComponente: string;
  rescatado: boolean;
  causaNoRescate: string | null;
  solucionPreservacion: string | null;
  cantidadMl: number | null;
}

export function toComponenteVista(c: ComponenteCaso): ComponenteVista {
  return { id: c.id, tipoComponente: c.tipoComponente, rescatado: c.rescatado, causaNoRescate: c.causaNoRescate, solucionPreservacion: c.solucionPreservacion, cantidadMl: c.cantidadMl };
}

export function toCasoVista(c: Caso): CasoVista {
  return {
    id: c.id,
    estado: c.estado,
    tipoDonante: c.tipoDonante,
    muerteViolenta: c.muerteViolenta,
    creadoEn: c.creadoEn,
    donante: c.donante
      ? { id: c.donante.id, tipoDocumento: c.donante.tipoDocumento, numeroDocumento: c.donante.numeroDocumento, nombres: c.donante.nombres, apellidos: c.donante.apellidos }
      : undefined,
  };
}
