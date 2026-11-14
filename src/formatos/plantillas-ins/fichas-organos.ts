import { EsquemaFormato } from '../esquema';
import { area, cierreFicha, num, sel, seccion, txt } from './constructores';

/**
 * Fichas técnicas de componente anatómico para trasplante (órganos): corazón, pulmón, hígado, riñones, páncreas y dos
 * fichas libres para otros componentes. Fuente: «Formato Gestión de Donación de componentes anatómicos.docx».
 */
const LATERALIDAD = ['Derecho', 'Izquierdo', 'No aplica'];

const rinon = (p: string, titulo: string) =>
  seccion(`Ficha técnica: ${titulo}`, [
    area(`${p}Tecnica`, 'Técnica quirúrgica'),
    num(`${p}Longitud`, 'Tamaño: longitud (cm)'), num(`${p}Anchura`, 'Tamaño: anchura (cm)'), num(`${p}Grosor`, 'Tamaño: grosor (cm)'),
    area(`${p}Parenquima`, 'Parénquima'), area(`${p}ArteriaRenal`, 'Arteria renal'), area(`${p}VenaRenal`, 'Vena renal'),
    area(`${p}Ureter`, 'Uréter'), area(`${p}Biopsia`, 'Biopsia'), area(`${p}OtrosHallazgos`, 'Otros hallazgos intraoperatorios'),
    ...cierreFicha(p, 'cirujano', false),
  ]);

const generica = (p: string, n: number) =>
  seccion(`Ficha técnica: otro componente ${n}`, [
    txt(`${p}Componente`, 'Componente'), sel(`${p}Lateralidad`, 'Lateralidad', LATERALIDAD),
    area(`${p}Tecnica`, 'Técnica quirúrgica'), area(`${p}HallazgosIntra`, 'Hallazgos intraoperatorios'),
    ...cierreFicha(p, 'cirujano/extractor', true),
  ]);

export const FICHAS_ORGANOS: EsquemaFormato = {
  secciones: [
    seccion('Ficha técnica: corazón', [
      area('corazonTecnica', 'Técnica quirúrgica'), area('corazonHallazgosIntra', 'Hallazgos intraoperatorios'),
      ...cierreFicha('corazon', 'cirujano', true),
    ]),
    seccion('Ficha técnica: pulmón', [
      sel('pulmonLateralidad', 'Lateralidad', ['Derecho', 'Izquierdo', 'Ambos']),
      area('pulmonTecnica', 'Técnica quirúrgica'), area('pulmonHallazgosIntra', 'Hallazgos intraoperatorios'),
      ...cierreFicha('pulmon', 'cirujano', true),
    ]),
    seccion('Ficha técnica: hígado', [
      area('higadoTecnica', 'Técnica quirúrgica'), area('higadoParenquima', 'Parénquima'), area('higadoArteriaHepatica', 'Arteria hepática'),
      area('higadoVenaPorta', 'Vena porta'), area('higadoVenaHepatica', 'Vena hepática'), area('higadoViaBiliar', 'Vía biliar'),
      area('higadoBiopsia', 'Biopsia'), area('higadoOtrosHallazgos', 'Otros hallazgos intraoperatorios'),
      ...cierreFicha('higado', 'cirujano', false),
    ]),
    rinon('rinonIzq', 'riñón izquierdo'),
    rinon('rinonDer', 'riñón derecho'),
    seccion('Ficha técnica: páncreas', [
      area('pancreasTecnica', 'Técnica quirúrgica'), area('pancreasParenquima', 'Parénquima'), area('pancreasHemorragias', 'Hemorragias'),
      area('pancreasEsteatonecrosis', 'Esteatonecrosis'), area('pancreasEdema', 'Edema'), area('pancreasTejidoGraso', 'Tejido graso'),
      area('pancreasOtrosHallazgos', 'Otros hallazgos intraoperatorios'), ...cierreFicha('pancreas', 'cirujano', false),
    ]),
    generica('otro1', 1),
    generica('otro2', 2),
  ],
};
