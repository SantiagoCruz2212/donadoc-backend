import { CampoFormato, ColumnaTabla, ResumenTabla, SeccionFormato, TipoCampo } from '../esquema';

/**
 * Constructores para describir los formatos oficiales del INS como datos. Cada formato se transcribe de su archivo
 * oficial (docs/formatos-ins); aquí solo se estructura. `req` marca obligatorio solo donde el propio formato lo exige
 * o donde sin el dato el documento no tiene sentido; el resto queda opcional para no bloquear a quien diligencia.
 */
interface Opc {
  req?: boolean;
  origen?: string;
}

const campo = (tipo: TipoCampo, clave: string, etiqueta: string, o: Opc & { opciones?: string[] } = {}): CampoFormato => ({
  clave,
  etiqueta,
  tipo,
  requerido: o.req ?? false,
  ...(o.opciones ? { opciones: o.opciones } : {}),
  ...(o.origen ? { origen: o.origen } : {}),
});

export const txt = (clave: string, etiqueta: string, o?: Opc): CampoFormato => campo('texto', clave, etiqueta, o);
export const area = (clave: string, etiqueta: string, o?: Opc): CampoFormato => campo('areaTexto', clave, etiqueta, o);
export const fecha = (clave: string, etiqueta: string, o?: Opc): CampoFormato => campo('fecha', clave, etiqueta, o);
export const num = (clave: string, etiqueta: string, o?: Opc): CampoFormato => campo('numero', clave, etiqueta, o);
export const bool = (clave: string, etiqueta: string, o?: Opc): CampoFormato => campo('booleano', clave, etiqueta, o);
export const sel = (clave: string, etiqueta: string, opciones: string[], o?: Opc): CampoFormato =>
  campo('seleccion', clave, etiqueta, { ...o, opciones });
/** Hora como texto HH:MM (el motor de formatos no tiene tipo «hora»). */
export const hora = (clave: string, etiqueta: string, o?: Opc): CampoFormato => txt(clave, `${etiqueta} (HH:MM)`, o);

export const SI_NO = ['Sí', 'No'];
export const SI_NO_NA = ['Sí', 'No', 'N/A'];
export const sino = (clave: string, etiqueta: string, o?: Opc): CampoFormato => sel(clave, etiqueta, SI_NO, o);
export const seccion = (titulo: string, campos: CampoFormato[]): SeccionFormato => ({ titulo, campos });

/** Un campo numérico por cada [clave, etiqueta] (resultados de laboratorio). */
export const numeros = (items: [string, string][]): CampoFormato[] => items.map(([c, e]) => num(c, e));

export const GRUPOS_SANGUINEOS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
export const RESULTADO_PRUEBA = ['Positivo', 'Negativo', 'No realizado'];

// ---- Bloques que comparten el formato de gestión del donante y la oferta nacional (mismo contenido clínico) ----

export const laboratorioClinico = (): SeccionFormato =>
  seccion('Resultados de laboratorio clínico', [
    txt('labFechaHora', 'Fecha y hora del reporte (AAAA-MM-DD HH:MM)'),
    txt('labReporta', 'Laboratorio que reporta'),
    ...numeros([
      ['hb', 'Hemoglobina (Hb)'], ['hto', 'Hematocrito (Hto %)'], ['leucocitos', 'Leucocitos'], ['linfocitos', 'Linfocitos'],
      ['neutrofilos', 'Neutrófilos'], ['basofilos', 'Basófilos'], ['monocitos', 'Monocitos'], ['cayados', 'Cayados'],
      ['eosinofilos', 'Eosinófilos'], ['plaquetas', 'Plaquetas'],
      ['sodio', 'Sodio'], ['potasio', 'Potasio'], ['cloro', 'Cloro'], ['calcio', 'Calcio'],
      ['creatinina', 'Creatinina'], ['bun', 'BUN (NU)'], ['alt', 'ALT / GPT'], ['ast', 'AST / GOT'],
      ['bilirrubinaTotal', 'Bilirrubina total'], ['bilirrubinaDirecta', 'Bilirrubina directa'], ['bilirrubinaIndirecta', 'Bilirrubina indirecta'],
      ['amilasa', 'Amilasa'], ['glicemia', 'Glicemia'], ['cpk', 'CPK'], ['cpkMb', 'CPK – MB'], ['ldh', 'LDH'], ['ggt', 'GGT'],
      ['fosfatasaAlcalina', 'Fosfatasa alcalina'], ['albumina', 'Albúmina'], ['troponina', 'Troponina'],
      ['ph', 'pH'], ['pco2', 'pCO2'], ['po2', 'pO2'], ['h2co3', 'H2CO3'], ['be', 'BE'],
      ['pt', 'PT'], ['ptt', 'PTT'], ['inr', 'INR'],
    ]),
    txt('otrosLaboratorios', 'Otros laboratorios'),
    txt('parcialOrina', 'Parcial de orina'),
    txt('cultivos', 'Cultivos'),
    area('labObservaciones', 'Observaciones de laboratorio'),
  ]);

export const perfilInfeccioso = (): SeccionFormato =>
  seccion('Resultados del perfil infeccioso', [
    txt('perfilFechaHora', 'Fecha y hora del reporte (AAAA-MM-DD HH:MM)'),
    txt('perfilLaboratorio', 'Laboratorio que reporta'),
    ...(
      [
        ['hvc', 'HVC / Ac Hepatitis C'], ['hbsag', 'HBs Ag / Antígeno de superficie Hepatitis B'],
        ['ausab', 'Ac Anti-antígeno de superficie HB (AUSAB)'], ['anticoreTotal', 'Ac Hepatitis Anti Core Total'],
        ['anticoreIgG', 'Ac anticore IgG HB'], ['anticoreIgM', 'Ac anticore IgM HB'],
        ['cmvIgG', 'Ac Citomegalovirus IgG'], ['cmvIgM', 'Ac Citomegalovirus IgM'],
        ['chagas', 'Chagas'], ['rpr', 'RPR / VDRL / Serología para sífilis'], ['vih', 'HIV / Ac VIH'],
        ['toxoIgG', 'Ac Toxoplasma IgG'], ['toxoIgM', 'Ac Toxoplasma IgM'],
        ['htlv1', 'HTLV 1 / Ac Virus linfotrópico de células T humanas'], ['htlv2', 'HTLV 2 / Ac Virus linfotrópico de células T humanas'],
        ['epsteinBarr', 'Ac Epstein Barr'],
      ] as [string, string][]
    ).map(([c, e]) => sel(c, e, RESULTADO_PRUEBA)),
    txt('perfilOtra', 'Otra prueba'),
    area('perfilObservaciones', 'Observaciones del perfil infeccioso'),
  ]);

export const inmunologiaHla = (): SeccionFormato =>
  seccion('Inmunología – HLA', [
    txt('hlaFechaHora', 'Fecha y hora del reporte (AAAA-MM-DD HH:MM)'),
    txt('hlaLaboratorio', 'Laboratorio de procesamiento'),
    txt('hlaA1', 'A1'), txt('hlaA2', 'A2'), txt('hlaB1', 'B1'), txt('hlaB2', 'B2'), txt('hlaDR1', 'DR1'), txt('hlaDR2', 'DR2'),
  ]);

/** Tabla «1. … N.» de medicamentos: cuatro columnas por fila. */
export const medicamentos = (filas: number): SeccionFormato =>
  seccion(
    'Medicamentos (vasopresores, antibióticos, etcétera)',
    Array.from({ length: filas }, (_, i) => i + 1).flatMap((n) => [
      txt(`medicamento${n}`, `${n}. Medicamento`),
      txt(`medicamento${n}Inicio`, `${n}. Inicio`),
      txt(`medicamento${n}Fin`, `${n}. Fin`),
      txt(`medicamento${n}DosisMaxima`, `${n}. Dosis máxima`),
    ]),
  );

export const ayudasDiagnosticas = (): SeccionFormato =>
  seccion('Ayudas diagnósticas', [
    txt('rxTorax', 'Rx de tórax'), txt('ecoAbdominal', 'Eco abdominal'), txt('ecg', 'ECG'),
    txt('ecocardiograma', 'Ecocardiograma'), txt('otrasAyudas', 'Otras ayudas diagnósticas'),
  ]);

/** Signos de «Hospitalización actual»: Sí/No y la descripción del manejo. */
export const evento = (clave: string, etiqueta: string, detalle: string): CampoFormato[] => [
  sino(clave, etiqueta),
  txt(`${clave}Detalle`, `${etiqueta}: ${detalle}`),
];

// ---- Bloques de las fichas técnicas por componente ----

/** Muestras recolectadas (Sí/No y número de tubos por color de tapa) y pruebas rápidas, como en las fichas de tejidos. */
export const muestrasYPruebas = (p: string, filas: [string, string][]): CampoFormato[] => [
  ...filas.flatMap(([c, e]) => [
    sino(`${p}Muestra_${c}`, `Muestra recolectada: ${e}`),
    num(`${p}Muestra_${c}TubosRojo`, `${e}: número de tubos tapa roja`),
    num(`${p}Muestra_${c}TubosLila`, `${e}: número de tubos tapa lila`),
    num(`${p}Muestra_${c}TubosAmarillo`, `${e}: número de tubos tapa amarilla`),
  ]),
  sino(`${p}PruebaRapidaVih`, 'Prueba rápida realizada: HIV'),
  sino(`${p}PruebaRapidaHepatitisB`, 'Prueba rápida realizada: hepatitis B'),
  sino(`${p}PruebaRapidaHepatitisC`, 'Prueba rápida realizada: hepatitis C'),
];

export const MUESTRAS_BASICAS: [string, string][] = [['sangreTotal', 'Sangre total'], ['suero', 'Suero'], ['plasma', 'Plasma']];

/** Cierre común de una ficha: hallazgos, observaciones y las dos firmas (responsable y quien recibe). */
export const cierreFicha = (p: string, responsable: string, conBanco: boolean): CampoFormato[] => [
  ...(conBanco ? [area(`${p}HallazgosBanco`, 'Hallazgos en banco')] : []),
  area(`${p}Observaciones`, 'Observaciones'),
  txt(`${p}Responsable`, `Nombre y firma del ${responsable}`),
  txt(`${p}Recibe`, 'Nombre y firma de la persona que recibe el componente anatómico'),
];

// ---- Tablas de los informes periódicos ----

export const col = {
  txt: (clave: string, etiqueta: string): ColumnaTabla => ({ clave, etiqueta, tipo: 'texto' }),
  fecha: (clave: string, etiqueta: string): ColumnaTabla => ({ clave, etiqueta, tipo: 'fecha' }),
  num: (clave: string, etiqueta: string): ColumnaTabla => ({ clave, etiqueta, tipo: 'numero' }),
  sel: (clave: string, etiqueta: string, opciones: string[]): ColumnaTabla => ({ clave, etiqueta, tipo: 'seleccion', opciones }),
  /** Columna calculada (solo lectura): suma de `mas` menos suma de `menos`. */
  calc: (clave: string, etiqueta: string, mas: string[], menos: string[] = []): ColumnaTabla => ({
    clave, etiqueta, tipo: 'numero', formula: { mas, ...(menos.length ? { menos } : {}) },
  }),
};

export const tabla = (
  clave: string,
  etiqueta: string,
  columnas: ColumnaTabla[],
  o: { filasFijas?: string[]; maxFilas?: number; totales?: boolean; resumenes?: ResumenTabla[] } = {},
): CampoFormato => ({ clave, etiqueta, tipo: 'tabla', requerido: false, columnas, ...o });
