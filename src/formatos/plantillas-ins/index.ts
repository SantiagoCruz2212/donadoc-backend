import { EsquemaFormato } from '../esquema';
import { BIOVIGILANCIA_ORGANOS } from './biovigilancia-organos';
import { BIOVIGILANCIA_TEJIDOS } from './biovigilancia-tejidos';
import {
  INFORME_BANCO_CARDIOVASCULAR, INFORME_BANCO_MEMBRANA, INFORME_BANCO_OCULAR, INFORME_BANCO_OSEO_CADAVERICO, INFORME_BANCO_OSEO_VIVO, INFORME_BANCO_PIEL,
  LISTA_ESPERA_TEJIDO,
} from './informes-bancos';
import { ENTREVISTA_FAMILIAR } from './entrevista-familiar';
import { FICHAS_ORGANOS } from './fichas-organos';
import { FICHAS_TEJIDOS } from './fichas-tejidos';
import { GESTION_DONANTE } from './gestion-donante';
import { OFERTA_NACIONAL } from './oferta-nacional';
import { RESCATE_DONANTE } from './rescate-donante';

export interface PlantillaOficial {
  codigo: string;
  nombre: string;
  /** Versión de la plantilla (máx. 10 caracteres): la fecha del documento del INS cuando la trae; si no, «1». */
  version: string;
  /** Archivo del INS del que se transcribió (en docs/formatos-ins). */
  fuente: string;
  esquema: EsquemaFormato;
}

/** Formatos oficiales del INS transcritos como datos. Para sumar otro: un archivo nuevo aquí y una migración de datos. */
export const PLANTILLAS_INS: PlantillaOficial[] = [
  { codigo: 'INS-GESTION-DONANTE', nombre: 'INS · Gestión de donación de componentes anatómicos (donante)', version: '1', fuente: 'Formato Gestión de Donación de componentes anatómicos.docx', esquema: GESTION_DONANTE },
  { codigo: 'INS-ENTREVISTA-FAMILIAR', nombre: 'INS · Consentimiento y entrevista familiar de donación', version: '1', fuente: 'Formato Gestión de Donación de componentes anatómicos.docx', esquema: ENTREVISTA_FAMILIAR },
  { codigo: 'INS-OFERTA-NACIONAL', nombre: 'INS · Oferta nacional de órganos y tejidos', version: '1', fuente: 'Formato Oferta Nacional Organos y Tejidos.docx', esquema: OFERTA_NACIONAL },
  { codigo: 'INS-BIOVIG-ORGANOS', nombre: 'INS · Biovigilancia: evento adverso o incidente grave en trasplante de órganos', version: '2020-06', fuente: 'formulario-trasplantes-organos-ins.pdf', esquema: BIOVIGILANCIA_ORGANOS },
  { codigo: 'INS-RESCATE-DONANTE', nombre: 'INS · Rescate: aceptados, tiempos, equipo y soluciones de preservación', version: '1', fuente: 'Formato Gestión de Donación de componentes anatómicos.docx', esquema: RESCATE_DONANTE },
  { codigo: 'INS-FICHAS-ORGANOS', nombre: 'INS · Fichas técnicas de componente anatómico: órganos', version: '1', fuente: 'Formato Gestión de Donación de componentes anatómicos.docx', esquema: FICHAS_ORGANOS },
  { codigo: 'INS-FICHAS-TEJIDOS', nombre: 'INS · Fichas técnicas de componente anatómico: tejidos', version: '1', fuente: 'Formato Gestión de Donación de componentes anatómicos.docx', esquema: FICHAS_TEJIDOS },
  { codigo: 'INS-BIOVIG-TEJIDOS', nombre: 'INS · Biovigilancia: evento adverso o incidente grave en trasplante de tejidos y células', version: '2020-06', fuente: 'formulario-trasplantes-tejidos-ins.pdf', esquema: BIOVIGILANCIA_TEJIDOS },
  // Informes periódicos (ámbito INFORME): se diligencian por periodo y organización; ver informes-bancos.ts.
  { codigo: 'INS-INFORME-BANCO-OCULAR', nombre: 'INS · Informe mensual de banco de tejido ocular', version: '00', fuente: 'Formato Tejido Ocular.xlsx', esquema: INFORME_BANCO_OCULAR },
  { codigo: 'INS-INFORME-BANCO-PIEL', nombre: 'INS · Informe mensual de banco de piel', version: '00', fuente: 'Formato Tejido Piel.xlsx', esquema: INFORME_BANCO_PIEL },
  { codigo: 'INS-INFORME-BANCO-CARDIOVASCULAR', nombre: 'INS · Informe mensual de banco de tejido cardiovascular', version: '00', fuente: 'Formato Tejido Cardiovascular.xlsx', esquema: INFORME_BANCO_CARDIOVASCULAR },
  { codigo: 'INS-INFORME-BANCO-OSEO-CADAVERICO', nombre: 'INS · Informe mensual de banco de tejido óseo (donante cadavérico)', version: '00', fuente: 'Formato Tejido Oseo Donante Cadaverico.xlsx', esquema: INFORME_BANCO_OSEO_CADAVERICO },
  { codigo: 'INS-INFORME-BANCO-OSEO-VIVO', nombre: 'INS · Informe mensual de banco de tejido óseo (donante vivo)', version: '00', fuente: 'Formato Tejido Oseo con Donante Vivo.xlsx', esquema: INFORME_BANCO_OSEO_VIVO },
  { codigo: 'INS-INFORME-BANCO-MEMBRANA', nombre: 'INS · Informe mensual de banco de membrana amniótica', version: '00', fuente: 'Formato Membrana Amniotica.xlsx', esquema: INFORME_BANCO_MEMBRANA },
  { codigo: 'INS-LISTA-ESPERA-TEJIDO', nombre: 'INS · Lista semanal de espera de receptores de tejido', version: '00', fuente: 'Formato Lista Espera Tejido.xlsx', esquema: LISTA_ESPERA_TEJIDO },
];
