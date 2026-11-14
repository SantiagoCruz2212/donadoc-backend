import { ColumnaTabla, EsquemaFormato, SeccionFormato } from '../esquema';
import { col, seccion, tabla, txt } from './constructores';
import { LISTAS_BANCOS } from './listas-bancos';

/**
 * Informes estadísticos mensuales de los bancos de tejido y lista de espera de receptores (INS, formato versión 00).
 * Fuentes: los Excel «Formato Tejido Ocular / Piel / Cardiovascular / Oseo Donante Cadaverico / Oseo con Donante Vivo»,
 * «Formato Membrana Amniotica» y «Formato Lista Espera Tejido» (docs/formatos-ins). Las opciones de las listas salen de la
 * hoja oculta «LISTAS DESPLEGABLES» de cada archivo (listas-bancos.ts). Cada hoja del Excel es una sección con una tabla:
 *   A detección de donantes (12 meses × columnas numéricas, con columnas calculadas y totales) · B obtención ·
 *   C procesamiento · D distribución · E tejidos devueltos.
 * Cambios respecto del Excel: se corrigieron las numeraciones erradas de los encabezados (p. ej. «11.3.1 HTLV» → 11.1.3) y,
 * como el mes y el año son el periodo del informe, no son campos. Los totales y las columnas 10 y 13 se calculan.
 */
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SI_NO = ['Sí', 'No'];
const TIPO_MUERTE = ['Muerte encefálica', 'Parada cardiaca'];
const MECANISMO = ['Consentimiento familiar', 'Presunción legal de la donación'];
const LUGAR = ['IPS', 'INMLCF', 'Otra'];
const ID_DONANTE = ['Registro civil', 'Tarjeta de identidad', 'Cédula de ciudadanía', 'Pasaporte', 'Cédula de extranjería', 'No. de protocolo INMLCF', 'Otro'];
const ID_RECEPTOR = ['Registro civil', 'Tarjeta de identidad', 'Cédula de ciudadanía', 'Pasaporte', 'Cédula de extranjería', 'Número único de identificación personal', 'Otro'];

type Lista = string[];
const lista = (formato: string, columna: string): Lista => LISTAS_BANCOS[formato]?.[columna]?.valores ?? [];

/** Pares [clave, etiqueta] → columnas numéricas con la clave con prefijo. */
const nums = (pref: string, items: [string, string][]): ColumnaTabla[] => items.map(([k, e]) => col.num(`${pref}${k}`, e));

// ---------- Hoja A: detección (columnas comunes) ----------
const INFECCIONES: [string, string][] = [
  ['vih', 'VIH'], ['sifilis', 'Sífilis'], ['htlv', 'HTLV 1-2'], ['hepB', 'Hepatitis B'], ['hepC', 'Hepatitis C'],
  ['cmv', 'Citomegalovirus'], ['chagas', 'Chagas'], ['toxoplasmosis', 'Toxoplasmosis'], ['otras', 'Otras'],
];
const DIAGNOSTICOS: [string, string][] = [
  ['neoplasias', 'Neoplasias'], ['autoinmunes', 'Enf. autoinmunes'], ['oseas', 'Enf. óseas'], ['renales', 'Enf. renales'], ['otros', 'Otros'],
];
const FUENTES: [string, string][] = [
  ['sinInfo', 'No hubo información'], ['conocidos', 'Entrevista con conocido(s)'], ['familia', 'Entrevista con familia'],
  ['historia', 'Historia clínica'], ['otra', 'Otra'],
];

interface PlanA {
  detectados: [string, string][];
  salidas: [string, string][];
  /** Etiquetas de los grupos de contraindicación por razón médica. */
  razones: [string, string][];
  /** Prefijos de numeración del Excel (para que las etiquetas coincidan con el formato impreso). */
  num: { det: string; sal: string; inf: string; dia: string; raz: string; fue: string; pot: string; total: string };
  /** Claves de columnas «otras» que piden descripción («¿cuál?»). */
  otras: string[];
}

const SALIDAS_CADAVER: [string, string][] = [
  ['judiciales', 'Oposición de entidades judiciales'], ['custodia', 'Cadena de custodia'], ['medicoLegal', 'Causas médico legales (absolutas)'],
  ['docencia', 'Cadáver destinado a docencia'], ['edad', 'Edad'], ['oposicionIps', 'Oposición de la IPS'], ['trasladoInml', 'Tiempo de traslado del cuerpo al INMLCF'],
  ['perito', 'Disponibilidad del perito'], ['estanciaUci', 'Tiempo de estancia en UCI'], ['otra', 'Otra'],
];
const RAZONES_CADAVER: [string, string][] = [
  ['medicoQuirurgico', 'Antecedente médico-quirúrgico'], ['social', 'Antecedente social'], ['toxicos', 'Antecedente tóxicos'],
  ['farmacologico', 'Antecedente farmacológico'], ['negativaFamiliar', 'Negativa familiar'], ['otros', 'Otros'],
];

const PLAN_CADAVER: PlanA = {
  detectados: [['glasgow', 'Glasgow menor a 5 o muerte encefálica – IPS'], ['parada', 'Parada cardiaca – IPS'], ['inmlcf', 'INMLCF'], ['otros', 'Otros']],
  salidas: SALIDAS_CADAVER,
  razones: RAZONES_CADAVER,
  num: { det: '8', sal: '9', inf: '11.1', dia: '11.2', raz: '11.3', fue: '12', pot: '10', total: '13' },
  otras: ['det_otros', 'sal_otra', 'inf_otras', 'dia_otros', 'raz_otros', 'fue_otra'],
};

const PLAN_VIVO: PlanA = {
  detectados: [['rodilla', 'Artroplastia de rodilla'], ['cadera', 'Artroplastia de cadera'], ['otra', 'Otra']],
  salidas: [['cancelacion', 'Cancelación de la cirugía'], ['autoinjerto', 'Autoinjerto'], ['personal', 'Disponibilidad del personal'], ['otras', 'Otras'], ['otros1', 'Otros 1']],
  razones: [
    ['medicoQuirurgico', 'Antecedente médico-quirúrgico'], ['social', 'Antecedente social'], ['toxicos', 'Antecedente tóxicos'],
    ['farmacologico', 'Antecedente farmacológico'], ['negativaDonante', 'Negativa del donante'], ['otros', 'Otros'],
  ],
  num: { det: '8', sal: '9', inf: '11.1', dia: '11.2', raz: '11.3', fue: '12', pot: '10', total: '13' },
  otras: ['det_otra', 'sal_otros1', 'inf_otras', 'dia_otros', 'raz_otros', 'fue_otra'],
};

/** Columnas de la tabla de detección (hoja A) para donantes cadavéricos y para donante vivo. */
function columnasDeteccion(p: PlanA): ColumnaTabla[] {
  const det = p.detectados.map(([k, e], i) => col.num(`det_${k}`, `${p.num.det}.${i + 1} ${e}`));
  const sal = p.salidas.map(([k, e], i) => col.num(`sal_${k}`, `${p.num.sal}.${i + 1} ${e}`));
  const inf = INFECCIONES.map(([k, e], i) => col.num(`inf_${k}`, `${p.num.inf}.${i + 1} ${e}`));
  const dia = DIAGNOSTICOS.map(([k, e], i) => col.num(`dia_${k}`, `${p.num.dia}.${i + 1} ${e}`));
  const raz = p.razones.map(([k, e], i) => col.num(`raz_${k}`, `${p.num.raz}.${i + 1} ${e}`));
  const fue = FUENTES.map(([k, e], i) => col.num(`fue_${k}`, `${p.num.fue}.${i + 1} ${e}`));
  const contra = [...inf, ...dia, ...raz].map((c) => c.clave);
  return [
    col.txt('bancoCat', '6. Nombre del banco o centro de almacenamiento temporal (CAT)'),
    ...det, ...sal,
    col.calc('potenciales', `${p.num.pot}. Potenciales donantes para valoración (calculada: ${p.num.det}.x menos ${p.num.sal}.x)`, det.map((c) => c.clave), sal.map((c) => c.clave)),
    ...inf, ...dia, ...raz, ...fue,
    col.calc('totalObtenidos', `${p.num.total}. Total donantes obtenidos (calculada: ${p.num.pot} menos contraindicados)`, ['potenciales'], contra),
  ];
}

const camposOtras = (p: PlanA, columnas: ColumnaTabla[]) =>
  p.otras.map((clave) => {
    const c = columnas.find((x) => x.clave === clave);
    return txt(`cual_${clave}`, `${c?.etiqueta ?? clave}: ¿cuál?`);
  });

// ---------- Secciones comunes ----------
const datosReporte = (): SeccionFormato =>
  seccion('Datos del reporte (el mes y el año son el periodo del informe)', [
    txt('coordinacionRegional', '3. Coordinación regional (nombre y número)'),
    txt('ciudad', '4. Ciudad'),
    txt('nombreBanco', '5. Nombre del banco', { req: true }),
  ]);

const seccionDeteccion = (p: PlanA, titulo = 'A. Detección del donante'): SeccionFormato => {
  const columnas = columnasDeteccion(p);
  return seccion(titulo, [
    tabla('deteccion', 'Detección mensual por banco o CAT (una fila por mes)', columnas, { filasFijas: MESES, totales: true }),
    ...camposOtras(p, columnas),
  ]);
};

interface PlanB {
  numeracion: number; // número de la primera columna (14 en los de tejidos, 12 en membrana)
  conMuerteYLugar: boolean;
  mecanismo: Lista;
  tipoId: Lista;
  tejido: Lista;
  tituloTejido: string;
}

function seccionObtencion(p: PlanB, titulo = 'B. Obtención de tejido'): SeccionFormato {
  let n = p.numeracion;
  const m = (e: string): string => `${n++}. ${e}`;
  const columnas: ColumnaTabla[] = [
    col.txt('bancoCat', m('Nombre del banco o CAT que capta')),
    col.fecha('fechaObtencion', m('Fecha de obtención del donante')),
    ...(p.conMuerteYLugar ? [col.sel('tipoMuerte', m('Tipo de muerte'), TIPO_MUERTE)] : []),
    col.sel('mecanismo', m('Mecanismo de donación'), p.mecanismo),
    ...(p.conMuerteYLugar ? [col.sel('lugar', m('Lugar de ubicación del donante'), LUGAR)] : []),
    col.txt('ciudad', m('Ciudad de obtención')),
    col.txt('ipsGeneradora', m('Nombre IPS generadora (cuando aplique)')),
    col.sel('tipoId', m('Tipo de identificación del donante'), p.tipoId),
    col.txt('numeroId', m('Número de identificación del donante')),
    col.sel('tipoTejido', m(p.tituloTejido), p.tejido),
    col.txt('codigoTejido', m('Código del tejido')),
  ];
  const resumenes = [
    ...(p.conMuerteYLugar ? [{ columna: 'lugar', titulo: 'Donantes por lugar de ubicación' }] : []),
    { columna: 'mecanismo', titulo: 'Donantes por mecanismo de donación' },
    { columna: 'tipoTejido', titulo: 'Total de tejidos obtenidos por tipo' },
  ];
  return seccion(titulo, [
    tabla('obtencion', 'Donantes y tejidos obtenidos en el mes de reporte (una fila por tejido)', columnas, { maxFilas: 300, resumenes }),
    ...(p.conMuerteYLugar ? [txt('cual_lugar', 'Lugar de ubicación (otra): ¿cuál?')] : []),
    txt('cual_tipoId', 'Tipo de identificación (otro): ¿cuál?'),
  ]);
}

interface PlanC {
  numeracion: number;
  obtenido: Lista;
  procesado: Lista;
  destino: Lista;
  rechazo: Lista;
}

function seccionProcesamiento(p: PlanC, titulo: string): SeccionFormato {
  let n = p.numeracion;
  const m = (e: string): string => `${n++}. ${e}`;
  const columnas: ColumnaTabla[] = [
    col.sel('tejidoObtenido', m('Tejido obtenido'), p.obtenido),
    col.txt('codigoTejido', m('Código del tejido')),
    col.sel('tejidoProcesado', m('Tejido procesado (todos los injertos provenientes de cada tejido obtenido y liberados en el mes)'), p.procesado),
    col.txt('codigoProcesado', m('Código del tejido procesado')),
    col.sel('destino', m('Destino del tejido'), p.destino),
    col.sel('causaRechazo', m('Causas de rechazo (si se descartó el tejido)'), p.rechazo),
    col.fecha('fechaLiberacion', m('Fecha de liberación del tejido')),
  ];
  return seccion(titulo, [
    tabla('procesamiento', 'Tejidos procesados en el mes de reporte', columnas, {
      maxFilas: 300,
      resumenes: [{ columna: 'destino', titulo: 'Tejidos por destino' }, { columna: 'causaRechazo', titulo: 'Rechazos por causa' }],
    }),
  ]);
}

interface PlanD {
  numeracion: number;
  injertos: Lista;
  indicaciones: Lista;
  tiposUso: Lista;
  conCentimetros: boolean;
}

function seccionDistribucion(p: PlanD, titulo: string): SeccionFormato {
  let n = p.numeracion;
  const m = (e: string): string => `${n++}. ${e}`;
  const columnas: ColumnaTabla[] = [
    col.txt('bancoCat', m('Nombre del banco o CAT que distribuye')),
    col.fecha('fechaDistribucion', m('Fecha de distribución')),
    col.num('latencia', m('Tiempo de latencia (días)')),
    col.sel('injerto', m('Nombre del injerto'), p.injertos),
    col.txt('codigoTejido', m('Código del tejido')),
    ...(p.conCentimetros ? [col.num('centimetros', m('N.º de cm² distribuidos por lámina'))] : []),
    col.txt('nombreReceptor', m('Nombre del receptor')),
    col.sel('tipoId', m('Tipo de identificación'), ID_RECEPTOR),
    col.txt('numeroId', m('N.º de identificación')),
    col.num('edad', m('Edad')),
    col.txt('ipsReceptor', m('IPS del receptor')),
    col.txt('ciudadDestino', m('Ciudad a la que se distribuye')),
    col.txt('nacionalidad', m('Nacionalidad del receptor')),
    col.sel('residente', m('Residente en Colombia'), SI_NO),
    col.txt('cirujano', m('Nombre del cirujano')),
    col.sel('indicacion', m('Posible indicación según solicitud'), p.indicaciones),
    col.sel('tipoCirugia', m('Tipo de cirugía'), p.tiposUso),
  ];
  return seccion(titulo, [
    tabla('distribucion', 'Distribución de tejidos en el mes de reporte (una fila por injerto)', columnas, {
      maxFilas: 300,
      resumenes: [{ columna: 'injerto', titulo: 'Injertos distribuidos por tipo' }, { columna: 'residente', titulo: 'Receptores residentes en Colombia' }],
    }),
  ]);
}

function seccionDevueltos(numeracion: number, injertos: Lista, titulo: string): SeccionFormato {
  const n = numeracion;
  const causas: [string, string, number][] = [
    ['adm', 'Administrativa', 3], ['med', 'Médica', 3], ['cal', 'Calidad', 3],
  ];
  const columnas: ColumnaTabla[] = [];
  causas.forEach(([k, e, cuantas], gi) => {
    for (let i = 1; i <= cuantas; i++) columnas.push(col.num(`${k}${i}`, `${n}.${gi + 1}.${i} Devolución causa ${e} ${i}`));
  });
  columnas.push(col.num('bacteria', `${n}.4.1 Devolución por contaminación: bacteria`), col.num('hongo', `${n}.4.2 Devolución por contaminación: hongo`), col.num('virus', `${n}.4.3 Devolución por contaminación: virus`));
  for (let i = 1; i <= 3; i++) columnas.push(col.num(`otra${i}`, `${n}.5.${i} Devolución otra causa ${i}`));
  columnas.push(col.calc('total', `${n + 1}. Total de injertos devueltos por tipo de tejido (calculada)`, columnas.map((c) => c.clave)));
  const cuales = ['adm', 'med', 'cal', 'otra'].flatMap((k) =>
    [1, 2, 3].map((i) => txt(`cual_${k}${i}`, `Causa de devolución ${k === 'adm' ? 'administrativa' : k === 'med' ? 'médica' : k === 'cal' ? 'de calidad' : 'otra'} ${i}: ¿cuál?`)),
  );
  return seccion(titulo, [
    tabla('devueltos', 'Injertos devueltos en el mes de reporte, por tipo de injerto y causa (número de injertos)', columnas, { filasFijas: injertos, totales: true }),
    ...cuales,
  ]);
}

const informe = (periodicidad: 'MENSUAL' | 'SEMANAL', secciones: SeccionFormato[]): EsquemaFormato => ({ ambito: 'INFORME', periodicidad, secciones });

// ---------- Ocular ----------
const PLAN_OCULAR_B = (f: string, tejido: Lista, tituloTejido = 'Tipo de tejido obtenido (indique todos los tejidos obtenidos por donante)'): PlanB => ({
  numeracion: 14, conMuerteYLugar: true, mecanismo: MECANISMO, tipoId: ID_DONANTE, tejido, tituloTejido,
});

export const INFORME_BANCO_OCULAR = informe('MENSUAL', [
  datosReporte(),
  seccionDeteccion(PLAN_CADAVER),
  seccionObtencion(PLAN_OCULAR_B('ocular', lista('ocular', 'E'))),
  seccionProcesamiento({ numeracion: 25, obtenido: lista('ocular', 'E'), procesado: lista('ocular', 'H'), destino: lista('ocular', 'F'), rechazo: lista('ocular', 'G') }, 'C. Procesamiento de tejidos'),
  seccionDistribucion({ numeracion: 32, injertos: lista('ocular', 'I'), indicaciones: lista('ocular', 'M'), tiposUso: lista('ocular', 'L'), conCentimetros: false }, 'D. Distribución de tejido'),
  seccionDevueltos(48, lista('ocular', 'H'), 'E. Tejidos devueltos'),
]);

// ---------- Piel ----------
export const INFORME_BANCO_PIEL = informe('MENSUAL', [
  datosReporte(),
  seccionDeteccion(PLAN_CADAVER),
  seccionObtencion(PLAN_OCULAR_B('piel', lista('piel', 'E'))),
  seccionProcesamiento({ numeracion: 25, obtenido: lista('piel', 'E'), procesado: lista('piel', 'F'), destino: lista('piel', 'G'), rechazo: lista('piel', 'H') }, 'C. Procesamiento de piel'),
  seccionDistribucion({ numeracion: 32, injertos: lista('piel', 'L'), indicaciones: lista('piel', 'I'), tiposUso: lista('piel', 'M'), conCentimetros: true }, 'D. Distribución de tejido'),
  seccionDevueltos(49, ['Lámina de piel'], 'E. Tejidos devueltos'),
]);

// ---------- Cardiovascular ----------
export const INFORME_BANCO_CARDIOVASCULAR = informe('MENSUAL', [
  datosReporte(),
  seccionDeteccion(PLAN_CADAVER),
  seccionObtencion(PLAN_OCULAR_B('cardio', lista('cardio', 'E'), 'Componente o tejido obtenido (indique todos los obtenidos por donante)')),
  seccionProcesamiento({ numeracion: 25, obtenido: lista('cardio', 'E'), procesado: lista('cardio', 'F'), destino: lista('cardio', 'G'), rechazo: lista('cardio', 'H') }, 'C. Procesamiento de válvulas, vasos y pericardio'),
  seccionDistribucion({ numeracion: 32, injertos: lista('cardio', 'F'), indicaciones: lista('cardio', 'L'), tiposUso: lista('cardio', 'J'), conCentimetros: false }, 'D. Distribución de válvulas, vasos y pericardio'),
  seccionDevueltos(48, lista('cardio', 'F'), 'E. Tejidos devueltos'),
]);

// ---------- Membrana amniótica ----------

function columnasMembrana(): ColumnaTabla[] {
  const inf = INFECCIONES.map(([k, e], i) => col.num(`inf_${k}`, `9.1.${i + 1} ${e}`));
  const dia: [string, string][] = [
    ['previas', 'Afecciones maternas previas al embarazo'], ['embarazo', 'Afecciones maternas debidas al embarazo'], ['feto', 'Afecciones del feto'],
    ['rupturaMembranas', 'Ruptura prematura de membranas'], ['otros', 'Otros'],
  ];
  const diaC = dia.map(([k, e], i) => col.num(`dia_${k}`, `9.2.${i + 1} ${e}`));
  const raz: [string, string][] = [
    ['medicoQuirurgico', 'Antecedente médico-quirúrgico'], ['social', 'Antecedente social'], ['toxicos', 'Antecedente tóxicos'],
    ['farmacologico', 'Antecedente farmacológico'], ['negativaDonante', 'Negativa de la donante'], ['otros', 'Otros'],
  ];
  const razC = raz.map(([k, e], i) => col.num(`raz_${k}`, `9.3.${i + 1} ${e}`));
  const fue: [string, string][] = [
    ['sinInfo', 'No hubo información'], ['donante', 'Entrevista con la donante'], ['familia', 'Entrevista con familia'], ['historia', 'Historia clínica'], ['otra', 'Otra'],
  ];
  const fueC = fue.map(([k, e], i) => col.num(`fue_${k}`, `10.${i + 1} ${e}`));
  return [
    col.txt('bancoCat', '6. Nombre del banco o centro de almacenamiento temporal (CAT)'),
    col.num('potencialesMaternas', '8. Número total de potenciales maternas como donantes'),
    ...inf, ...diaC, ...razC, ...fueC,
    col.calc('totalObtenidos', '11. Total donantes obtenidos (calculada: 8 menos contraindicados)', ['potencialesMaternas'], [...inf, ...diaC, ...razC].map((c) => c.clave)),
  ];
}

export const INFORME_BANCO_MEMBRANA = informe('MENSUAL', [
  datosReporte(),
  seccion('A. Detección de la donante', [
    tabla('deteccion', 'Detección mensual por banco o CAT (una fila por mes)', columnasMembrana(), { filasFijas: MESES, totales: true }),
    txt('cual_det', '8.3 Otra: ¿cuál?'), txt('cual_inf', '9.1.9 Otra infecciosa: ¿cuál?'), txt('cual_dia', '9.2.5 Otro diagnóstico: ¿cuál?'),
    txt('cual_raz', '9.3.6 Otra razón médica: ¿cuál?'), txt('cual_fue', '10.5 Otra fuente de información: ¿cuál?'),
  ]),
  seccionObtencion({ numeracion: 12, conMuerteYLugar: false, mecanismo: lista('membrana', 'A'), tipoId: lista('membrana', 'B'), tejido: lista('membrana', 'C'), tituloTejido: 'Tipo de tejido obtenido' }),
  seccionProcesamiento({ numeracion: 21, obtenido: lista('membrana', 'C'), procesado: lista('membrana', 'J'), destino: lista('membrana', 'D'), rechazo: lista('membrana', 'E') }, 'C. Procesamiento'),
  seccionDistribucion({ numeracion: 28, injertos: lista('membrana', 'J'), indicaciones: lista('membrana', 'L'), tiposUso: lista('membrana', 'K'), conCentimetros: false }, 'F. Distribución de membrana amniótica'),
  seccionDevueltos(44, [...lista('membrana', 'J'), 'Otro'], 'G. Tejidos devueltos'),
]);

// ---------- Óseos: procesamiento = descarte en cuarentena y en proceso ----------
function seccionDescartesOseo(vivo: boolean, tejidosCuarentena: Lista, injertos: Lista): SeccionFormato {
  const b = vivo ? 23 : 25; // primera numeración de la hoja
  const infC = INFECCIONES.map(([k, e], i) => col.num(`cuaInf_${k}`, `${b + 1}.${i + 1} Descarte en cuarentena por infecciosa: ${e}`));
  const diaC: [string, string][] = [
    ['neoplasias', 'Neoplasias'], ['autoinmunes', 'Enf. autoinmunes'], ['oseas', 'Enf. óseas'], ['renales', 'Enf. renales'],
    ['medicoQuirurgico', 'Antecedentes médico-quirúrgicos'], ['social', 'Antecedente social'], ['toxicos', 'Tóxicos'], ['farmacologicos', 'Farmacológicos'], ['otros', 'Otros'],
  ];
  const histC = diaC.map(([k, e], i) => col.num(`cuaHist_${k}`, `${b + 2}.${i + 1} Descarte en cuarentena por historia clínica: ${e}`));
  const otrasCua = vivo ? ['Otra 1', 'Otra 2'] : ['Necropsia', 'Otra 1', 'Otra 2', 'Otra 3'];
  const cuarentena: ColumnaTabla[] = [
    ...infC, ...histC,
    col.num('cuaMicrobiologicas', `${b + 3}. Descarte en cuarentena por microbiológicas (número)`),
    ...otrasCua.map((e, i) => col.num(`cuaOtra${i + 1}`, `${b + 4}.${i + 1} Descarte en cuarentena por otras causas: ${e}`)),
    col.calc('cuaTotal', 'Total de descartes en cuarentena (calculada)', [...infC, ...histC].map((c) => c.clave).concat(['cuaMicrobiologicas'], otrasCua.map((_, i) => `cuaOtra${i + 1}`))),
  ];
  const nb = b + 5; // numeración del bloque «en proceso»
  const proceso: ColumnaTabla[] = [
    col.num('proMicrobiologicas', `${nb + 1}. Descarte en proceso por microbiológicas (número)`),
    col.num('proCalidad1', `${nb + 2}.1 Descarte en proceso por control de calidad 1`), col.num('proCalidad2', `${nb + 2}.2 Descarte en proceso por control de calidad 2`),
    col.num('proOtra1', `${nb + 3}.1 Descarte en proceso por otras causas 1`), col.num('proOtra2', `${nb + 3}.2 Descarte en proceso por otras causas 2`),
    col.calc('proTotal', 'Total de descartes en proceso (calculada)', ['proMicrobiologicas', 'proCalidad1', 'proCalidad2', 'proOtra1', 'proOtra2']),
  ];
  return seccion('C. Procesamiento de hueso: descartes', [
    tabla('descarteCuarentena', `${b}. Descarte en cuarentena en el mes de reporte, por tipo de tejido (número de tejidos)`, cuarentena, { filasFijas: tejidosCuarentena, totales: true }),
    tabla('descarteProceso', `${nb}. Descarte en proceso en el mes de reporte, por tipo de injerto (número de injertos)`, proceso, { filasFijas: injertos, totales: true }),
    txt('cual_cuarentenaOtras', 'Descarte en cuarentena por otras causas: ¿cuáles?'), txt('cual_procesoOtras', 'Descarte en proceso por otras causas: ¿cuáles?'),
  ]);
}

export const INFORME_BANCO_OSEO_CADAVERICO = informe('MENSUAL', [
  datosReporte(),
  seccionDeteccion(PLAN_CADAVER),
  seccionObtencion(PLAN_OCULAR_B('oseoCad', lista('oseoCad', 'F'))),
  seccionDescartesOseo(false, lista('oseoCad', 'F'), lista('oseoCad', 'G')),
  seccionDistribucion({ numeracion: 34, injertos: lista('oseoCad', 'J'), indicaciones: lista('oseoCad', 'I'), tiposUso: lista('oseoCad', 'K'), conCentimetros: false }, 'D. Distribución de tejido'),
  seccionDevueltos(50, lista('oseoCad', 'G'), 'E. Tejidos devueltos'),
]);

export const INFORME_BANCO_OSEO_VIVO = informe('MENSUAL', [
  datosReporte(),
  seccionDeteccion(PLAN_VIVO),
  seccionObtencion({ numeracion: 14, conMuerteYLugar: false, mecanismo: lista('oseoVivo', 'B'), tipoId: lista('oseoVivo', 'D'), tejido: lista('oseoVivo', 'A'), tituloTejido: 'Tipo de tejido obtenido (indique todos los tejidos obtenidos por donante)' }),
  seccionDescartesOseo(true, ['Rodilla', 'Cadera', 'Otro 1 (¿cuál?)', 'Otro 2 (¿cuál?)', 'Otro 3 (¿cuál?)'], ['Osteocondrales', 'Corticoesponjoso', 'Matriz ósea desmineralizada', 'Otros 1 (¿cuál?)', 'Otros 2 (¿cuál?)']),
  seccionDistribucion({ numeracion: 32, injertos: lista('oseoVivo', 'E'), indicaciones: lista('oseoVivo', 'I'), tiposUso: lista('oseoVivo', 'H'), conCentimetros: false }, 'D. Distribución de tejido'),
  seccionDevueltos(48, ['Osteocondrales', 'Corticoesponjoso', 'Matriz ósea desmineralizada', 'Otros 1 (¿cuál?)', 'Otros 2 (¿cuál?)'], 'F. Tejidos devueltos'),
]);

// ---------- Lista de espera de receptores (semanal) ----------
export const LISTA_ESPERA_TEJIDO = informe('SEMANAL', [
  seccion('Datos del reporte (la semana reportada es el periodo del informe)', [
    txt('regional', 'Regional', { req: true }),
    txt('nombreBanco', 'Nombre del banco', { req: true }),
  ]),
  seccion('Lista de espera de receptores para trasplante de tejido', [
    tabla('receptores', 'Receptores en lista de espera (una fila por receptor)', [
      col.fecha('fechaSolicitud', 'Fecha de solicitud del tejido'), col.fecha('fechaCirugia', 'Fecha de cirugía'), col.txt('tejido', 'Tejido'),
      col.txt('nombre', 'Nombre'), col.txt('cedula', 'Cédula'), col.num('edad', 'Edad'), col.txt('nacionalidad', 'Nacionalidad'),
      col.sel('residente', 'Residente (Sí/No)', SI_NO), col.txt('bancoTejido', 'Banco de tejido'), col.txt('ipsTrasplantadora', 'IPS trasplantadora'),
      col.txt('diagnostico', 'Diagnóstico'), col.txt('observaciones', 'Observaciones'),
    ], { maxFilas: 200, resumenes: [{ columna: 'residente', titulo: 'Receptores residentes en Colombia' }] }),
  ]),
]);
