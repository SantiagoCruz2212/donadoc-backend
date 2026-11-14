import { ExtraccionIa } from './entities/extraccion-ia.entity';
import { SugerenciaIa } from './entities/sugerencia-ia.entity';

export class SugerenciaVista {
  id: string;
  campo: string;
  valorSugerido: string | null;
  confianza: number | null;
  decision: string;
  valorFinal: string | null;
}

export class ExtraccionVista {
  id: string;
  casoId: string;
  documentoOrigenId: string;
  estado: string;
  proveedor: string;
  modelo: string | null;
  intentos: number;
  solicitadoEn: Date;
  respondidoEn: Date | null;
  sugerencias: SugerenciaVista[];
}

export function toSugerenciaVista(s: SugerenciaIa): SugerenciaVista {
  return { id: s.id, campo: s.campo, valorSugerido: s.valorSugerido, confianza: s.confianza, decision: s.decision, valorFinal: s.valorFinal };
}

export function toExtraccionVista(e: ExtraccionIa, sugerencias: SugerenciaIa[] = e.sugerencias ?? []): ExtraccionVista {
  return {
    id: e.id, casoId: e.casoId, documentoOrigenId: e.documentoOrigenId, estado: e.estado, proveedor: e.proveedor, modelo: e.modelo,
    intentos: e.intentos, solicitadoEn: e.solicitadoEn, respondidoEn: e.respondidoEn, sugerencias: sugerencias.map(toSugerenciaVista),
  };
}
