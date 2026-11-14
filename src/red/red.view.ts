/**
 * Lo único que una institución ve de los trasplantes de OTRAS instituciones. Está diseñado por exclusión:
 * no existe ningún campo del donante ni de la historia clínica (ni nombre, ni documento, ni edad, ni causa de muerte,
 * ni documentos), y el módulo ni siquiera importa la entidad Donante.
 */
export class ComponenteRedVista {
  tipoComponente: string;
  rescatado: boolean;
}

export class TrasplanteVigenteVista {
  /** Código público seudónimo y estable (TX-XXXXXXXX): sirve para coordinar sin revelar el caso interno. */
  codigo: string;
  /** Institución que gestiona el caso. */
  institucion: string;
  /** true si el caso es de la institución de quien consulta. */
  esPropio: boolean;
  /** Solo en los casos propios: permite abrir el detalle. En los ajenos es null. */
  casoId: string | null;
  tipoDonante: string | null;
  estado: string;
  /** Fecha (sin hora) en que se inició el caso, AAAA-MM-DD. */
  fechaInicio: string;
  componentes: ComponenteRedVista[];
}
