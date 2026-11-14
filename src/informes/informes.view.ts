import { PlantillaVista } from '../formatos/formatos.view';
import { TablaCalculada } from '../formatos/tablas';

export class InformeVista {
  plantilla: PlantillaVista;
  /** «AAAA-MM» (mensual) o «AAAA-Sww» (semanal). */
  periodo: string;
  /** SIN_INICIAR, BORRADOR o COMPLETO. */
  estado: string;
  /** Versión del diligenciamiento (sube con cada guardado). */
  version: number;
  hashSha256: string | null;
  /** Lo ya guardado (null si aún no se guarda nada). */
  datos: Record<string, unknown> | null;
  /** Columnas calculadas, totales y resúmenes de cada tabla, por clave de campo. */
  calculados: Record<string, TablaCalculada>;
  actualizadoEn: Date | null;
}

export class InformeResumen {
  id: string;
  codigo: string;
  nombre: string;
  periodo: string;
  estado: string;
  version: number;
  actualizadoEn: Date;
}
