import { EsquemaFormato } from '../esquema';
import { area, bool, fecha, hora, sel, seccion, txt } from './constructores';

/**
 * Ficha de reporte de eventos adversos / incidentes graves en trasplante de tejidos y células (Sistema Nacional de
 * Biovigilancia, INS, junio 2020, versión 0.0). Fuente: «formulario-trasplantes-tejidos-ins.pdf». «Seleccione todas las
 * opciones» (3, 47 y 48) se modela con una casilla por opción.
 */
const EVENTOS: [string, string][] = [
  ['a', 'Infección primaria posiblemente transferida desde el donante al receptor (virus, bacterias, hongos, priones)'],
  ['b', 'Infección posiblemente transmitida por contaminación del componente o de los materiales de su procesamiento o uso, desde la obtención hasta la aplicación clínica'],
  ['c', 'Reacciones de hipersensibilidad, incluyendo alergias, reacciones anafilactoides o anafilaxis'],
  ['d', 'Enfermedad neoplásica posiblemente transferida por el componente anatómico o asociada al procesamiento'],
  ['e', 'Falla inesperada, no adaptación o pérdida del injerto (incluye falla estructural y utilización inadecuada del tejido)'],
  ['f', 'Efectos tóxicos de los materiales o substancias involucradas en el procesamiento del tejido o las células'],
  ['g', 'Reacciones inmunológicas inesperadas debidas a incompatibilidad del componente anatómico'],
  ['h', 'Cancelación del procedimiento generando exposición innecesaria a un riesgo cuando el procedimiento quirúrgico ya ha iniciado'],
  ['i', 'Sospecha de transmisión de enfermedad genética'],
  ['j', 'Sospecha de transmisión de otra enfermedad no infecciosa'],
  ['k', 'Enfermedad o daño neurológico relacionado con el trasplante del componente anatómico (no derivado de infección)'],
  ['l', 'Cualquier reacción originada en un donante por una intervención relacionada con el proceso de donación'],
  ['m', 'Otra'],
];
const INCIDENTES: [string, string][] = [
  ['a', 'Se distribuyó el componente anatómico equivocado para uso clínico, aun si no ha sido usado'],
  ['b', 'Caracterización inapropiada del riesgo de un donante'],
  ['c', 'Desviaciones en la cadena de frío y transporte del componente anatómico'],
  ['d', 'Desviaciones durante el procesamiento del tejido'],
  ['e', 'Desviaciones durante la conservación o el almacenamiento'],
  ['f', 'Desviaciones de la trazabilidad (p. ej., pérdida del rastreo que lleva a mezcla o confusión de tejidos o productos celulares)'],
  ['g', 'Expiración (p. ej., distribución de tejido o producto celular expirado)'],
  ['h', 'Transmisión inapropiada de la información relacionada con el tamizaje del donante para Hepatitis C, Hepatitis B, VIH o grupo ABO'],
  ['i', 'El incidente resultó en una mezcla de componentes anatómicos'],
  ['j', 'Infección o prueba positiva para enfermedad transmisible en un donante cuando al menos un componente anatómico ya ha sido trasplantado'],
  ['k', 'Identificación de cualquier condición transmisible en el donante cuando al menos un componente anatómico ya ha sido trasplantado'],
  ['l', 'Pérdida de componentes anatómicos autólogos irremplazables o altamente compatibles'],
  ['m', 'Pérdida de una cantidad significativa de un componente anatómico alogénico no emparentado'],
  ['n', 'Pérdida de un componente anatómico alogénico emparentado'],
  ['o', 'Otro'],
];

export const BIOVIGILANCIA_TEJIDOS: EsquemaFormato = {
  secciones: [
    seccion('Datos generales del reporte', [
      fecha('fechaReporte', '1. Fecha de reporte', { req: true }),
      sel('queReporta', '2. ¿Qué va a reportar?', ['Evento adverso', 'Incidente grave'], { req: true }),
      bool('reportePrimeraVez', '3a. Reporte por primera vez'), bool('reporteSeguimiento', '3b. Seguimiento a un reporte previamente abierto'),
      sel('afectado', '4. Si es un evento, ¿quién fue el afectado?', ['Donante vivo', 'Receptor']),
    ]),
    seccion('I. Información del reportante', [
      txt('reportanteNombre', '5. Nombres y apellidos del reportante', { req: true }),
      txt('reportanteInstitucion', '6. Nombre de la institución que realiza el reporte', { req: true }),
      txt('reportanteCargo', '7. Cargo asignado por la institución o profesión'),
      txt('reportanteUnidad', '8. Oficina, unidad o grupo de la institución para el que trabaja'),
      sel('tipoInstitucion', '9. Tipo de institución en la que trabaja', ['IPS', 'Banco de tejidos', 'Banco de células', 'Prestador o profesional no vinculado a una IPS (independiente)', 'Otro']),
      txt('tipoInstitucionOtro', '9e. Otro tipo de institución (¿cuál?)'),
      txt('reportanteCiudad', '10. Ciudad en la que se realiza el reporte'), txt('reportanteCelular', '11. Celular de contacto'),
      txt('reportanteCorreo', '12. Correo electrónico de contacto'), txt('reportanteDireccion', '13. Dirección de contacto'),
    ]),
    seccion('II. Datos del componente anatómico (tejido o célula)', [
      sel('tipoComponente', '14. Tipo de componente anatómico implicado', ['Tejido', 'Célula', 'Producto que contiene o se origina en un componente anatómico', 'Otro'], { req: true }),
      txt('componenteCual', '14. Componente implicado (¿cuál?)'),
      txt('numeroIdComponente', '15. Número de identificación del componente anatómico dado por el banco'),
      txt('bancoProcesamiento', '16. Nombre del banco o institución encargada del procesamiento/distribución'),
      fecha('fechaObtencion', '17. Fecha del procedimiento de obtención del componente'),
      fecha('fechaVencimiento', '18. Fecha de vencimiento (si aplica)'),
      fecha('fechaSalidaBanco', '19. Fecha de salida del componente del banco o institución de procesamiento'),
      txt('numeroCrtDonante', '20. Número CRT de identificación del donante'),
      txt('institucionObtencion', '21. Nombre de la institución en la que se obtuvo la donación'),
      sel('estatusDonante', '22. Estatus del donante', ['Donante vivo', 'Donante en parada cardíaca', 'Donante en muerte cerebral']),
      sel('donanteSexo', '23. Sexo del donante', ['Hombre', 'Mujer', 'Otro']), txt('donanteTipoId', '24. Tipo de ID del donante'),
      txt('donanteNumeroId', '25. Número de ID del donante'), txt('donanteCausaMuerte', '26. Causa de muerte del donante'), txt('donanteCie', '27. CIE 10/11'),
    ]),
    seccion('III. Datos del evento adverso / incidente grave', [
      txt('receptorNombres', '28. Nombres del receptor'), txt('receptorApellidos', '29. Apellidos'),
      txt('receptorTipoId', '30. Tipo de ID del receptor'), txt('receptorNumeroId', '31. Número de ID del receptor'),
      fecha('receptorFechaNacimiento', '32. Fecha de nacimiento del receptor'), sel('receptorSexo', '33. Sexo del receptor', ['Hombre', 'Mujer', 'Otro']),
      fecha('fechaTrasplante', '34. Fecha del trasplante'), hora('horaTrasplante', '35. Hora'),
      txt('medicoTrasplante', '36. Nombre del médico que realizó el trasplante'),
      txt('diagnosticoTrasplante', '37. Diagnóstico que llevó al paciente al trasplante'), txt('cieTrasplante', '38. CIE 10/11'),
      txt('ipsTrasplante', '39. IPS en la que se realizó el trasplante'), txt('ciudadTrasplante', '40. Ciudad'),
      sel('momentoEvento', '41. ¿En qué momento del uso del componente ocurrió el evento?', ['Donación', 'Trasplante', 'Post-trasplante inmediato (hasta 15 días)', 'Post-trasplante tardío (después de 15 días)']),
      fecha('fechaSintomas', '42. Fecha de inicio de los síntomas o de ocurrencia del incidente'),
      fecha('fechaDeteccion', '43. Fecha de identificación/detección por el servicio de salud o por el banco'),
      hora('horaSintomas', '44. Hora de inicio de los síntomas o de ocurrencia del incidente'),
      txt('ciudadEvento', '45. Ciudad en la que ocurrió el evento adverso o el incidente'), txt('direccionEvento', '46. Dirección en la que ocurrió'),
    ]),
    seccion('47. Tipo de evento adverso (solo si lo reportado es un evento)', [
      ...EVENTOS.map(([l, e]) => bool(`evento_${l}`, `${l}. ${e}`)),
      txt('eventoOtro', '47m. Otro evento adverso (¿cuál?)'),
    ]),
    seccion('48. Tipo de incidente grave (solo si lo reportado es un incidente grave)', [
      ...INCIDENTES.map(([l, e]) => bool(`incidente_${l}`, `${l}. ${e}`)),
      txt('incidenteOtro', '48o. Otro incidente (¿cuál?)'),
    ]),
    seccion('Descripción y clasificación', [
      txt('diagnosticoEvento', '49. Diagnóstico del evento adverso'), txt('cieEvento', '50. Código CIE 10/11'),
      area('descripcionEvento', '51. Descripción completa y breve del evento adverso o del incidente'),
      area('resultadosRelevantes', '52. Resultados de laboratorios clínicos e imágenes diagnósticas relevantes'),
      area('otrosDatosClinicos', '53. Otros datos clínicos relevantes'),
      sel('severidad', '54. Clasificación de severidad del evento adverso', ['No grave', 'Grave', 'Potencialmente mortal', 'Muerte']),
      sel('impacto', '55. Clasificación del impacto del evento', ['Zona verde', 'Zona amarilla', 'Zona roja']),
      sel('asociacionCausal', '56. Asociación causal', [
        'Existe una asociación causal del evento consistente con el trasplante del componente anatómico', 'Asociación causal indeterminada',
        'Asociación causal inconsistente con el trasplante del componente anatómico', 'Asociación causal con condiciones inherentes del receptor', 'No clasificable',
      ]),
      area('resumenInvestigacion', '57. Resumen de resultados de la investigación, análisis del caso y medidas tomadas'),
    ]),
  ],
};
