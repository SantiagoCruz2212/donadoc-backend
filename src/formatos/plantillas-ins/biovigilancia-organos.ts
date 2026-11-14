import { EsquemaFormato } from '../esquema';
import { area, bool, fecha, hora, sel, seccion, txt } from './constructores';

/**
 * Ficha de reporte de eventos adversos / incidentes graves en trasplante de órganos (Sistema Nacional de Biovigilancia,
 * INS, junio 2020, versión 0.0). Fuente: «formulario-trasplantes-organos-ins.pdf». Las preguntas de «seleccione todas
 * las opciones» (3, 42 y 43) se modelan como una casilla por opción.
 */
const EVENTOS: [string, string][] = [
  ['a', 'Infección inesperada en un receptor que pudiera haber sido transmitida por el donante'],
  ['b', 'Infección inesperada en receptor por contaminación del órgano o de los materiales de preservación, desde el rescate al trasplante'],
  ['c', 'Reacción inmunológica que supera el riesgo conocido del trasplante (p. ej., incompatibilidad ABO)'],
  ['d', 'Tumor maligno en un receptor que pudiera haber sido transmitido por un donante o implique riesgo para otros receptores'],
  ['e', 'Efecto tóxico de las sustancias o materiales con los que ha estado en contacto el órgano'],
  ['f', 'Pérdida del injerto en los primeros seis meses y rechazos hiperagudos (donante vivo y cadavérico)'],
  ['g', 'Cualquier enfermedad inesperada en un receptor derivada de un donante, del órgano o del procedimiento'],
  ['h', 'Pérdida de un órgano rescatado de un donante vivo antes de realizar el trasplante'],
  ['i', 'Enfermedad o complicación inesperada en el donante vivo asociada a la extracción del órgano'],
  ['j', 'Muerte de receptor en el primer año postrasplante'],
  ['k', 'Complicación inesperada o desconocida (de riesgo desconocido)'],
  ['l', 'Signo, síntoma, hallazgo anormal, enfermedad o condición no clasificada, atribuida a desviaciones desde la donación al trasplante'],
  ['m', 'Otra'],
];
const INCIDENTES: [string, string][] = [
  ['a', 'Desviación o problema técnico tras iniciar el rescate y antes del trasplante que conlleve pérdida del órgano, afecte su calidad o genere riesgo al receptor'],
  ['b', 'Caracterización inapropiada del riesgo del donante o del órgano'],
  ['c', 'Infección o prueba positiva para enfermedad transmisible identificada en un donante cuando ya se trasplantó al menos un componente'],
  ['d', 'Identificación de cualquier condición transmisible en un donante cuando ya se trasplantó al menos un componente'],
  ['e', 'Transmisión inapropiada de información o error en el tamizaje del donante (Hepatitis C, B, VIH, infecciosas o grupo ABO)'],
  ['f', 'Cualquier evento distinto a condiciones logísticas que prolongue los tiempos de isquemia'],
  ['g', 'Contaminación del órgano del donante en cualquier momento previo al trasplante'],
  ['h', 'Desviaciones en la cadena de frío y transporte del órgano'],
  ['i', 'Distribución del órgano equivocado para trasplante, aunque no se hubiere usado'],
  ['j', 'Infección o prueba positiva para enfermedad transmisible en un donante cuando ya se trasplantó al menos un componente (reporte adicional)'],
  ['k', 'Tumor maligno descubierto en un donante cuando ya se trasplantó al menos un órgano'],
  ['l', 'Desviación con implicaciones para otros pacientes o donantes por prácticas, servicios, suministros o donantes compartidos'],
  ['m', 'Otro'],
];

export const BIOVIGILANCIA_ORGANOS: EsquemaFormato = {
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
    seccion('II. Datos del componente anatómico (órgano)', [
      sel('organo', '14. Órgano implicado en el evento o incidente', ['Riñón derecho', 'Riñón izquierdo', 'Corazón', 'Hígado', 'Intestino', 'Pulmón derecho', 'Pulmón izquierdo', 'Páncreas', 'Otro'], { req: true }),
      txt('organoOtro', '14i. Otro órgano (¿cuál?)'),
      txt('tipoTrasplante', '15. Tipo de trasplante realizado (nombre del procedimiento)'),
      txt('numeroCrtDonante', '16. Número CRT de identificación del donante'),
      txt('ipsGeneradora', '17. Nombre de la IPS generadora'),
      fecha('fechaRescate', '18. Fecha del procedimiento de rescate del órgano'), hora('horaRescate', '19. Hora de inicio del procedimiento de rescate'),
      sel('estatusDonante', '20. Estatus del donante', ['Donante vivo', 'Donante en parada cardíaca', 'Donante en muerte cerebral']),
      area('otrosComponentes', '21. Información disponible sobre otros componentes anatómicos del mismo donante'),
    ]),
    seccion('III. Datos del evento adverso / incidente grave', [
      txt('receptorNombres', '22. Nombres del receptor'), txt('receptorApellidos', '23. Apellidos'),
      txt('receptorTipoId', '24. Tipo de ID del receptor'), txt('receptorNumeroId', '25. Número de ID del receptor'),
      fecha('receptorFechaNacimiento', '26. Fecha de nacimiento del receptor'), sel('receptorSexo', '27. Sexo del receptor', ['Hombre', 'Mujer', 'Otro']),
      fecha('fechaTrasplante', '28. Fecha del trasplante'), hora('horaInicioTrasplante', '29. Hora de inicio del trasplante'), hora('horaFinTrasplante', '30. Hora de fin del trasplante'),
      txt('medicoTrasplante', '31. Nombre del médico que realizó el trasplante'),
      txt('diagnosticoTrasplante', '32. Diagnóstico que llevó al paciente al trasplante'), txt('cieTrasplante', '33. CIE 10/11'),
      txt('ipsTrasplante', '34. IPS en la que se realizó el trasplante'), txt('ciudadTrasplante', '35. Ciudad'),
      sel('momentoEvento', '36. ¿En qué momento del uso del órgano ocurrió el evento?', ['Donación', 'Trasplante', 'Post-trasplante inmediato (hasta 15 días)', 'Post-trasplante tardío (después de 15 días)']),
      fecha('fechaSintomas', '37. Fecha de inicio de los síntomas o de ocurrencia del incidente'),
      fecha('fechaDeteccion', '38. Fecha de identificación/detección del evento o incidente por el servicio de salud'),
      hora('horaSintomas', '39. Hora de inicio de los síntomas o de ocurrencia del incidente'),
      txt('ciudadEvento', '40. Ciudad en la que ocurrió el evento adverso o el incidente'), txt('direccionEvento', '41. Dirección en la que ocurrió'),
    ]),
    seccion('42. Tipo de evento adverso (solo si lo reportado es un evento)', [
      ...EVENTOS.map(([l, e]) => bool(`evento_${l}`, `${l}. ${e}`)),
      txt('eventoOtro', '42m. Otro evento adverso (¿cuál?)'),
    ]),
    seccion('43. Tipo de incidente grave (solo si lo reportado es un incidente grave)', [
      ...INCIDENTES.map(([l, e]) => bool(`incidente_${l}`, `${l}. ${e}`)),
      txt('incidenteOtro', '43m. Otro incidente (¿cuál?)'),
    ]),
    seccion('Descripción y clasificación', [
      txt('diagnosticoEvento', '44. Diagnóstico del evento adverso'), txt('cieEvento', '45. Código CIE 10/11'),
      area('descripcionEvento', '46. Descripción completa y breve del evento adverso o del incidente'),
      area('resultadosRelevantes', '47. Resultados de laboratorios clínicos e imágenes diagnósticas relevantes'),
      area('otrosDatosClinicos', '48. Otros datos clínicos relevantes'),
      sel('severidad', '49. Clasificación de severidad del evento adverso', ['No grave', 'Grave', 'Potencialmente mortal', 'Muerte']),
      sel('impacto', '50. Clasificación del impacto del evento', ['Zona verde', 'Zona amarilla', 'Zona roja']),
      sel('asociacionCausal', '51. Asociación causal', [
        'Existe una asociación causal del evento consistente con el trasplante del órgano', 'Asociación causal indeterminada',
        'Asociación causal inconsistente con el trasplante del componente anatómico', 'Asociación causal con condiciones inherentes del receptor', 'No clasificable',
      ]),
      area('resumenInvestigacion', '52. Resumen de resultados de la investigación, análisis y acciones tomadas'),
    ]),
  ],
};
