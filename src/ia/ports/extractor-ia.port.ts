/**
 * PUERTO ExtractorIA: contrato estable entre el caso de uso y cualquier proveedor de IA.
 * El caso de uso depende de esta interfaz, nunca de Gemini ni de Ollama (inversión de dependencias).
 * Cada proveedor es un adaptador que la implementa; se elige por configuración (EXTRACTOR_IA_PROVIDER).
 */
export interface CampoExtraccion {
  clave: string;
  descripcion: string;
}

export interface SolicitudExtraccion {
  texto: string;
  campos: CampoExtraccion[];
}

export interface SugerenciaExtraida {
  campo: string;
  valor: string;
  confianza: number; // 0..1
}

export interface ResultadoExtraccion {
  proveedor: string;
  modelo: string;
  sugerencias: SugerenciaExtraida[];
}

export type TipoErrorIa = 'TIMEOUT' | 'CUOTA' | 'CONFIGURACION' | 'PROVEEDOR' | 'RESPUESTA_INVALIDA';

/** Error controlado de un proveedor: el caso de uso decide qué hacer según el tipo. */
export class ExtractorIaError extends Error {
  constructor(readonly tipo: TipoErrorIa, mensaje: string) {
    super(mensaje);
    this.name = 'ExtractorIaError';
  }
}

export abstract class ExtractorIa {
  /** true si los datos salen de la institución (se enmascaran identificadores antes de enviarlos). */
  abstract readonly externo: boolean;
  abstract readonly nombre: string;
  abstract extraer(solicitud: SolicitudExtraccion, signal?: AbortSignal): Promise<ResultadoExtraccion>;
}

/** Campos que DonaDoc intenta extraer de una historia clínica externa. */
export const CAMPOS_HISTORIA: CampoExtraccion[] = [
  { clave: 'diagnosticoPrincipal', descripcion: 'Diagnóstico principal del paciente' },
  { clave: 'causaMuerte', descripcion: 'Causa de la muerte (p. ej. muerte encefálica y su origen)' },
  { clave: 'antecedentesRelevantes', descripcion: 'Antecedentes médicos relevantes' },
  { clave: 'fechaIngreso', descripcion: 'Fecha de ingreso a la institución en formato AAAA-MM-DD' },
  { clave: 'grupoSanguineo', descripcion: 'Grupo sanguíneo y factor Rh (p. ej. O+)' },
];
