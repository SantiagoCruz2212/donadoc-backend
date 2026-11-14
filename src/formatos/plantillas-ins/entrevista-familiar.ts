import { EsquemaFormato } from '../esquema';
import { area, fecha, hora, sel, seccion, sino, SI_NO_NA, txt } from './constructores';

/**
 * Consentimiento informado familiar, registro de entrevista familiar y evaluación de las condiciones de la entrevista
 * (partes del «Formato Gestión de Donación de componentes anatómicos», INS). El consentimiento escrito aplica solo a
 * colombianos menores de 18 años y extranjeros no residentes en Colombia, como indica el propio formato.
 */
const PREPARACION: [string, string][] = [
  ['eval01', 'El equipo médico tratante brindó a la familia información adecuada, completa y pertinente acerca de la evolución durante todo el proceso asistencial y sobre el diagnóstico de muerte encefálica'],
  ['eval02', 'El equipo tratante brindó al equipo de donación información oportuna, adecuada, completa y pertinente acerca del estado del donante'],
  ['eval03', 'Se contó con un espacio adecuado para realizar la entrevista familiar'],
  ['eval04', 'La institución facilitó el acceso y acompañamiento de la familia a su familiar fallecido, durante todo el proceso asistencial'],
];
const DESARROLLO: [string, string][] = [
  ['eval05', 'Existió alguna comunicación sobre donación con la familia antes de la llegada del equipo de gestión operativa de donación'],
  ['eval06', 'Se requirió que el entrevistador aclarara el concepto de muerte encefálica u otros aspectos relacionados con diagnóstico y tratamiento'],
  ['eval07', 'La familia entendió oportunamente que su ser querido está muerto'],
  ['eval08', 'La familia tuvo oportunidad de expresar sus sentimientos ante la pérdida'],
  ['eval09', 'Los familiares presentes manifestaron preocupación por la reacción de algún miembro de la familia ante la pérdida'],
  ['eval10', 'La familia entendió oportunamente que su ser querido es o podría ser donante de órganos o tejidos'],
  ['eval11', 'La familia tuvo oportunidad de expresar sus sentimientos ante la donación'],
  ['eval12', 'Se aclararon las dudas planteadas por la familia acerca de los procesos de donación y trasplantes'],
  ['eval13', 'Los familiares presentes manifestaron preocupación por la reacción de algún miembro ante el proceso de extracción'],
  ['eval14', 'Se identificó algún caso de ideación suicida en la familia que conllevó una acción específica del equipo'],
  ['eval15', 'Se identificaron o la familia reportó antecedentes de enfermedad mental diagnosticada en el entorno familiar'],
  ['eval16', 'La familia colaboró suministrando información de antecedentes del donante'],
  ['eval17', 'La familia solicitó información detallada de los componentes a extraer y manifestó rechazo ante algún órgano o tejido específico'],
  ['eval18', 'Uno o varios miembros de la familia se mostraron explícitamente opuestos a la extracción de órganos'],
  ['eval19', 'Uno o varios miembros de la familia se mostraron explícitamente opuestos a la extracción de tejidos'],
  ['eval20', 'La familia manifestó inconformidad o presentó una queja explícita relacionada con el proceso asistencial'],
  ['eval21', 'La familia agradeció el proceso de entrevista realizado'],
];

const persona = (prefijo: string, rotulo: string) => [
  txt(`${prefijo}Nombres`, `${rotulo}: nombres y apellidos`),
  txt(`${prefijo}Documento`, `${rotulo}: documento de identidad`),
  txt(`${prefijo}Parentesco`, `${rotulo}: parentesco`),
];

export const ENTREVISTA_FAMILIAR: EsquemaFormato = {
  secciones: [
    seccion('Consentimiento informado familiar (solo menores de 18 años y extranjeros no residentes)', [
      fecha('consFecha', 'Fecha'), hora('consHora', 'Hora'), txt('consCiudad', 'Ciudad'),
      ...persona('consRep1', 'Representante legal 1'),
      ...persona('consRep2', 'Representante legal o testigo 2'),
      txt('donanteNombre', 'Nombre del donante fallecido', { origen: 'donante.nombreCompleto' }),
      txt('donanteTipoDocumento', 'Tipo de documento del donante', { origen: 'donante.tipoDocumento' }),
      txt('donanteNumeroDocumento', 'Número de documento del donante', { origen: 'donante.numeroDocumento' }),
      txt('donanteLugarExpedicion', 'Lugar de expedición del documento'),
      sino('autorizaTrasplante', 'Autoriza la extracción con fines de trasplante'),
      txt('restriccionTrasplante', 'Trasplante: observaciones o restricciones'),
      sino('autorizaInvestigacion', 'Autoriza la extracción con fines de investigación'),
      txt('restriccionInvestigacion', 'Investigación: observaciones o restricciones'),
      sino('autorizaDocencia', 'Autoriza la extracción con fines de docencia'),
      txt('restriccionDocencia', 'Docencia: observaciones o restricciones'),
      txt('entrevistadorPrincipalConsentimiento', 'Entrevistador principal autorizado por el INS (nombre y registro médico)'),
      txt('segundoEntrevistador', 'Segundo entrevistador, opcional (nombre y cédula)'),
    ]),
    seccion('Registro de entrevista familiar', [
      fecha('entrevistaFecha', 'Fecha de la entrevista', { req: true }), txt('entrevistaLugar', 'Lugar'),
      hora('entrevistaInicio', 'Hora de inicio'), hora('entrevistaFin', 'Hora de finalización'),
      txt('correosAutorizados', 'Correos electrónicos autorizados por la familia para mantener contacto'),
      txt('telefonosAutorizados', 'Teléfonos autorizados por la familia para mantener contacto'),
      txt('entrevistadorNombre', 'Entrevistador principal: nombre', { req: true }),
      txt('entrevistadorCedula', 'Entrevistador principal: cédula de ciudadanía'),
      txt('entrevistadorInstitucion', 'Institución que representa'),
      sino('oposicionEnVida', 'Registro Nacional de Donantes: existe registro de oposición en vida', { req: true }),
      txt('centroReguladorConsulta', 'Centro Regulador de Trasplantes que envió el certificado de consulta'),
      txt('certificadoVia', 'Vía por la que se recibió el certificado'),
      txt('certificadoFechaHora', 'Fecha y hora de recepción del certificado (AAAA-MM-DD HH:MM)'),
      ...[1, 2, 3, 4].flatMap((n) => persona(`familiar${n}`, `Familiar o allegado ${n}`)),
    ]),
    seccion('Riesgos constatados en la entrevista', [
      sino('riesgoFamiliaDuelo', 'Población en riesgo: familia en duelo'), txt('riesgoFamiliaDueloDescripcion', 'Familia en duelo: descripción'),
      sino('riesgoReceptores', 'Población en riesgo: receptores'), txt('riesgoReceptoresDescripcion', 'Receptores: descripción'),
      sino('riesgoEquipoTratante', 'Población en riesgo: equipo tratante'), txt('riesgoEquipoTratanteDescripcion', 'Equipo tratante: descripción'),
      sino('riesgoEquipoRed', 'Población en riesgo: equipo de la Red de Donación y Trasplantes'), txt('riesgoEquipoRedDescripcion', 'Equipo de la Red: descripción'),
      area('resultadosObservaciones', 'Resultados y observaciones'),
      sino('contraindicaExtraccion', 'Está contraindicada la extracción de algún componente anatómico', { req: true }),
      area('componentesContraindicados', 'Componentes anatómicos contraindicados'),
      sino('negativaFamiliar', 'Debe registrarse como negativa familiar', { req: true }),
    ]),
    seccion('Evaluación de las condiciones de la entrevista familiar: preparación previa', PREPARACION.map(([c, e]) => sel(c, e, SI_NO_NA))),
    seccion('Evaluación de las condiciones de la entrevista familiar: desarrollo de la entrevista', DESARROLLO.map(([c, e]) => sel(c, e, SI_NO_NA))),
  ],
};
