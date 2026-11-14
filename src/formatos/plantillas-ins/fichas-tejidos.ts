import { EsquemaFormato } from '../esquema';
import { area, bool, cierreFicha, MUESTRAS_BASICAS, muestrasYPruebas, num, sel, seccion, sino, txt } from './constructores';

/**
 * Fichas técnicas de componente anatómico para trasplante (tejidos): oculares, osteomusculares, cardiovasculares y piel.
 * Fuente: «Formato Gestión de Donación de componentes anatómicos.docx». «Marque X o especifique las piezas» se modela
 * con una casilla por pieza (o su lateralidad, en los osteomusculares).
 */
const LATERALIDAD_OSEA = ['Derecha', 'Izquierda', 'Ambas', 'Sin lateralidad'];

const OSTEOMUSCULARES: [string, string][] = [
  ['costilla', 'Tórax: costilla'], ['cartilagoCostal', 'Tórax: cartílago costal'],
  ['rodillaLargaOsteocondral', 'Miembro inferior: rodilla larga osteocondral'], ['rodillaCortaOsteocondral', 'Miembro inferior: rodilla corta osteocondral'],
  ['rodilla', 'Miembro inferior: rodilla'], ['femurProximal', 'Miembro inferior: fémur proximal'], ['femurDistal', 'Miembro inferior: fémur distal'],
  ['tibiaProximal', 'Miembro inferior: tibia proximal'], ['tibiaDistal', 'Miembro inferior: tibia distal'],
  ['peroneCompletoProximal', 'Miembro inferior: peroné completo / proximal'], ['fasciaLata', 'Miembro inferior: fascia lata'],
  ['tendonTibialAnterior', 'Miembro inferior: tendón tibial anterior'], ['tendonTibialPosterior', 'Miembro inferior: tendón tibial posterior'],
  ['tendonAquiles', 'Miembro inferior: tendón de Aquiles'], ['tendonPeroneroLargo', 'Miembro inferior: tendón peronero largo'],
  ['tendonExtensorComun', 'Miembro inferior: tendón extensor común'], ['astragalo', 'Miembro inferior: astrágalo'],
  ['septumNasal', 'Septum nasal'], ['calcaneo', 'Calcáneo'],
  ['humeroOsteocondral', 'Miembro superior: húmero osteocondral'], ['codo', 'Miembro superior: codo'], ['cubito', 'Miembro superior: cúbito'],
  ['radioOsteocondral', 'Miembro superior: radio osteocondral'],
  ['hemipelvis', 'Pelvis: hemipelvis'], ['iliaco', 'Pelvis: iliaco'],
];
const PIEL: [string, string][] = [
  ['brazoIzquierdo', 'Brazo izquierdo'], ['brazoDerecho', 'Brazo derecho'], ['piernaIzquierda', 'Pierna izquierda'], ['piernaDerecha', 'Pierna derecha'],
  ['musloIzquierdoAnterior', 'Muslo izquierdo anterior'], ['musloIzquierdoPosterior', 'Muslo izquierdo posterior'],
  ['musloDerechoAnterior', 'Muslo derecho anterior'], ['musloDerechoPosterior', 'Muslo derecho posterior'],
  ['gluteoDerecho', 'Glúteo derecho'], ['gluteoIzquierdo', 'Glúteo izquierdo'], ['espalda', 'Espalda'],
];

const fotos = (p: string) => [
  sino(`${p}FotoAntes`, 'Toma de fotografía antes del procedimiento'),
  sino(`${p}FotoDespues`, 'Toma de fotografía después del procedimiento'),
];
const descripcion = (p: string) => [
  area(`${p}Tecnica`, 'Técnica quirúrgica'), area(`${p}HallazgosExamen`, 'Hallazgos durante el examen físico del donante'),
  area(`${p}HallazgosIntra`, 'Hallazgos intraoperatorios'),
];

export const FICHAS_TEJIDOS: EsquemaFormato = {
  secciones: [
    seccion('Ficha técnica: tejidos oculares', [
      bool('ocGloboDerecho', 'Piezas extraídas: globo ocular derecho'), bool('ocGloboIzquierdo', 'Piezas extraídas: globo ocular izquierdo'),
      bool('ocBotonDerecho', 'Piezas extraídas: botón corneo-escleral derecho'), bool('ocBotonIzquierdo', 'Piezas extraídas: botón corneo-escleral izquierdo'),
      ...muestrasYPruebas('oc', MUESTRAS_BASICAS),
      sino('ocHumorVitreoCustodia', 'Se conserva el humor vítreo en custodia médico legal'),
      ...fotos('oc'), ...descripcion('oc'), ...cierreFicha('oc', 'extractor', false),
    ]),
    seccion('Ficha técnica: tejidos osteomusculares', [
      ...OSTEOMUSCULARES.map(([c, e]) => sel(`os_${c}`, `Pieza extraída, lateralidad: ${e}`, LATERALIDAD_OSEA)),
      txt('osOtros', 'Otras piezas extraídas'), num('osTotalTejidos', 'Total de tejidos extraídos'),
      ...muestrasYPruebas('os', [...MUESTRAS_BASICAS, ['ganglio', 'Ganglio']]),
      ...fotos('os'), ...descripcion('os'), ...cierreFicha('os', 'extractor', false),
    ]),
    seccion('Ficha técnica: tejidos cardiovasculares', [
      txt('cvComponenteCardiaco', 'Componente cardiaco'), txt('cvSegmentosVasculares', 'Segmentos vasculares (especificar cuáles)'),
      txt('cvValvulasCardiacas', 'Válvulas cardiacas (especificar cuáles)'), txt('cvPericardio', 'Pericardio'),
      ...muestrasYPruebas('cv', MUESTRAS_BASICAS),
      ...fotos('cv'), ...descripcion('cv'), ...cierreFicha('cv', 'extractor', false),
    ]),
    seccion('Ficha técnica: piel', [
      ...PIEL.map(([c, e]) => bool(`pi_${c}`, `Zona extraída: ${e}`)),
      txt('piOtro', 'Otra zona extraída'),
      ...muestrasYPruebas('pi', MUESTRAS_BASICAS),
      ...fotos('pi'), ...descripcion('pi'), ...cierreFicha('pi', 'extractor', false),
    ]),
  ],
};
