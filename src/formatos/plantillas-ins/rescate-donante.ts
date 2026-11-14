import { EsquemaFormato } from '../esquema';
import { area, fecha, hora, num, seccion, txt } from './constructores';

/**
 * Rescate: órganos y tejidos aceptados, tiempos, equipo quirúrgico, soluciones de preservación y responsables de tejidos.
 * Fuente: «Formato Gestión de Donación de componentes anatómicos.docx» (bloques posteriores a la entrevista familiar).
 */
const COMPONENTES: [string, string][] = [
  ['corazon', 'Corazón'], ['rinon', 'Riñón'], ['higado', 'Hígado'], ['pancreas', 'Páncreas'], ['intestino', 'Intestino'], ['pulmon', 'Pulmón'],
  ['tejidosOculares', 'Tejidos oculares'], ['tejidosOsteomusculares', 'Tejidos osteomusculares'], ['tejidosCardiovasculares', 'Tejidos cardiovasculares'],
  ['piel', 'Piel'], ['otros', 'Otros'],
];
const TIEMPOS: [string, string][] = [
  ['programadoInicio', 'Fecha y hora programada de inicio del rescate'], ['realInicio', 'Fecha y hora real de inicio del rescate'],
  ['clampeo', 'Fecha y hora de clampeo (si aplica)'], ['realFin', 'Fecha y hora real de finalización del rescate'],
  ['entregaCuerpo', 'Fecha y hora de entrega del cuerpo restituido al personal de la IPS'],
];
const PROCEDIMIENTOS_ORGANOS: [string, string][] = [
  ['cardiectomia', 'Cardiectomía'], ['neumonectomia', 'Neumonectomía'], ['hepatectomia', 'Hepatectomía'], ['nefrectomia', 'Nefrectomía'], ['pancreatectomia', 'Pancreatectomía'],
];
const PROCEDIMIENTOS_TEJIDOS: [string, string][] = [
  ['oculares', 'Obtención de tejidos oculares'], ['osteomusculares', 'Obtención de tejidos osteomusculares'], ['valvulas', 'Obtención de válvulas cardíacas'],
  ['vasos', 'Obtención de vasos sanguíneos'], ['piel', 'Obtención de piel'],
];
const BANCOS: [string, string][] = [
  ['Higado', 'Banco hígado'], ['Rinon', 'Banco riñón'], ['Pancreas', 'Banco páncreas'], ['Corazon', 'Banco corazón'], ['Pulmon', 'Banco pulmón'],
  ['Intestino', 'Banco intestino'], ['Otro', 'Banco otro órgano'],
];

export const RESCATE_DONANTE: EsquemaFormato = {
  secciones: [
    seccion('Órganos y tejidos aceptados para rescate', COMPONENTES.flatMap(([c, e]) => [
      txt(`aceptado_${c}Institucion`, `${e}: institución responsable del rescate`),
      txt(`aceptado_${c}CausaNoObtencion`, `${e}: causa de no obtención (si aplica)`),
    ])),
    seccion('Tiempos del rescate', [
      ...TIEMPOS.flatMap(([c, e]) => [fecha(`${c}Fecha`, `${e}: fecha`), hora(`${c}Hora`, `${e}: hora`)]),
      area('rescateObservaciones', 'Observaciones'),
    ]),
    seccion('Listado de profesionales responsables: órganos', [
      ...PROCEDIMIENTOS_ORGANOS.flatMap(([c, e]) => [
        txt(`org_${c}Cirujano1`, `${e}: cirujano 1`), txt(`org_${c}Cirujano2`, `${e}: cirujano 2`),
        txt(`org_${c}Ayudante`, `${e}: ayudante`), txt(`org_${c}Instrumentacion`, `${e}: instrumentación`),
      ]),
      txt('resecionBazoGanglios', 'Resección de bazo y ganglios para estudios de inmunogenética: responsable'),
      txt('anestesiologos', 'Anestesiólogos'),
    ]),
    ...[1, 2, 3].map((n) =>
      seccion(`Registro de soluciones de preservación: solución ${n}`, [
        txt(`solucion${n}Nombre`, `Solución ${n}: nombre`),
        num(`solucion${n}PerfusionAorta`, `Solución ${n}: uso en perfusión por aorta (cc)`),
        num(`solucion${n}PerfusionPorta`, `Solución ${n}: uso en perfusión por porta (cc)`),
        num(`solucion${n}PerfusionTotal`, `Solución ${n}: total en perfusión (cc)`),
        ...BANCOS.map(([c, e]) => num(`solucion${n}Banco${c}`, `Solución ${n}: uso en ${e.toLowerCase()} (cc)`)),
        num(`solucion${n}BancoTotal`, `Solución ${n}: total en banco (cc)`),
      ]),
    ),
    seccion('Listado de profesionales, tecnólogos o técnicos responsables: tejidos', [
      ...PROCEDIMIENTOS_TEJIDOS.flatMap(([c, e]) => [
        txt(`tej_${c}Profesional`, `${e}: profesional`), txt(`tej_${c}Tecnologo`, `${e}: tecnólogo`),
        txt(`tej_${c}Tecnico1`, `${e}: técnico 1`), txt(`tej_${c}Tecnico2`, `${e}: técnico 2`),
      ]),
      area('otrosProcedimientos', 'Otros procedimientos efectuados'),
    ]),
  ],
};
