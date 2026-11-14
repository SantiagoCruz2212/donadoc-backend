import { EsquemaFormato } from './esquema';
import { PlantillaFormato } from './entities/plantilla-formato.entity';

export class PlantillaVista {
  codigo: string;
  nombre: string;
  version: string;
  /** Secciones y campos que debe pedir el formulario. */
  esquema: EsquemaFormato;
}

export function toPlantillaVista(p: PlantillaFormato): PlantillaVista {
  return { codigo: p.codigo, nombre: p.nombre, version: p.version, esquema: p.esquema };
}

export class FormularioVista {
  plantilla: PlantillaVista;
  /** SIN_INICIAR, BORRADOR, COMPLETO o FIRMADO. */
  estado: string;
  /** Versión del diligenciamiento (sube con cada guardado). */
  version: number;
  documentoId: string | null;
  hashSha256: string | null;
  /** Lo ya guardado (null si aún no se guarda nada). */
  datos: Record<string, unknown> | null;
  /** Valores sugeridos desde el donante, el caso y las sugerencias de IA aceptadas, para los campos aún vacíos. */
  precarga: Record<string, unknown>;
}
