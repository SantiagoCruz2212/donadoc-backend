import { EsquemaFormato } from '../esquema';
import {
  area, ayudasDiagnosticas, bool, evento, fecha, GRUPOS_SANGUINEOS, hora, inmunologiaHla, laboratorioClinico, medicamentos, num,
  perfilInfeccioso, sel, seccion, sino, txt,
} from './constructores';

/**
 * Formato de Gestión de Donación de componentes anatómicos (INS): datos del donante, muerte, antecedentes, examen,
 * mantenimiento, protocolo de muerte encefálica, estudios pretrasplante, laboratorios, perfil infeccioso y HLA.
 * Fuente: «Formato Gestión de Donación de componentes anatómicos.docx». La entrevista y el consentimiento familiar son
 * el formato INS-ENTREVISTA-FAMILIAR.
 */
const filasAntecedente: [string, string][] = [
  ['hta', 'Hipertensión arterial'], ['diabetes', 'Diabetes mellitus'], ['cancer', 'Cáncer'], ['dislipidemia', 'Dislipidemia'],
  ['otrosPatologicos', 'Otros patológicos'], ['tabaquismo', 'Tabaquismo'], ['drogadiccion', 'Drogadicción'], ['alcoholismo', 'Alcoholismo'],
  ['quirurgicos', 'Quirúrgicos'], ['traumaticos', 'Traumáticos'], ['familiares', 'Familiares'], ['hospitalarios', 'Hospitalarios'],
  ['ginecoobstetricos', 'Ginecoobstétricos'], ['farmacologicos', 'Farmacológicos'],
];

export const GESTION_DONANTE: EsquemaFormato = {
  secciones: [
    seccion('Coordinación', [
      txt('medicoCoordinador', 'Médico coordinador a cargo', { req: true }),
      txt('telefonosActivos', 'Teléfonos activos'),
    ]),
    seccion('Tipo de donante y componentes aptos', [
      sel('tipoDonante', 'Tipo de donante', ['Totipotencial', 'Multiorgánico', 'Multitejidos', 'Un órgano', 'Un tejido'], { req: true, origen: 'caso.tipoDonante' }),
      bool('aptoCorazon', 'Órganos aptos: corazón'), bool('aptoRinon', 'Órganos aptos: riñón'), bool('aptoHigado', 'Órganos aptos: hígado'),
      bool('aptoPancreas', 'Órganos aptos: páncreas'), bool('aptoIntestino', 'Órganos aptos: intestino'), bool('aptoPulmon', 'Órganos aptos: pulmón'),
      bool('aptoTejidosOculares', 'Tejidos aptos: oculares'), bool('aptoTejidosOsteomusculares', 'Tejidos aptos: osteomusculares'),
      bool('aptoTejidosCardiovasculares', 'Tejidos aptos: cardiovasculares'), bool('aptoPiel', 'Tejidos aptos: piel'),
      txt('aptoOtros', 'Otros órganos o tejidos aptos'),
    ]),
    seccion('Datos del donante', [
      fecha('fechaNacimiento', 'Fecha de nacimiento', { origen: 'donante.fechaNacimiento' }),
      sel('sexo', 'Sexo', ['M', 'F'], { origen: 'donante.sexo' }),
      txt('etnia', 'Etnia'), txt('nacionalidad', 'Nacionalidad'),
      txt('regionalGeneradora', 'Regional generadora'), txt('ipsGeneradora', 'IPS generadora', { req: true }),
      fecha('fechaIngreso', 'Fecha de ingreso a la IPS', { origen: 'ia.fechaIngreso' }),
      hora('horaIngreso', 'Hora de ingreso a la IPS'),
      sel('servicio', 'Servicio', ['Urgencias', 'UCI', 'Otro']), txt('servicioOtro', 'Servicio (otro, ¿cuál?)'),
      sel('grupoSanguineo', 'Grupo sanguíneo y Rh', GRUPOS_SANGUINEOS, { origen: 'ia.grupoSanguineo' }),
    ]),
    seccion('Datos de la muerte', [
      fecha('fechaMuerte', 'Fecha de la muerte', { req: true }), hora('horaMuerte', 'Hora de la muerte', { req: true }),
      sino('tacCraneo', 'TAC de cráneo'), txt('tacResultado', 'Resultado del TAC de cráneo'),
      sel('causaMuerte', 'Causa de muerte', ['TCE', 'ECV', 'EHI', 'Tumor', 'Otra'], { req: true }),
      txt('diagnosticoPrincipal', 'Diagnóstico principal', { origen: 'ia.diagnosticoPrincipal' }),
      txt('cie10', 'CIE-10'), area('otrosDiagnosticos', 'Otros diagnósticos'),
    ]),
    seccion('Antecedentes', [
      ...filasAntecedente.map(([c, e]) => area(`antecedente_${c}`, `Antecedentes: ${e}`)),
      area('antecedentesRelevantes', 'Resumen de antecedentes relevantes', { origen: 'ia.antecedentesRelevantes' }),
      num('tatuajesNumero', 'Tatuajes o piercing: número'), txt('tatuajesReciente', 'Tatuajes o piercing: mes y año del más reciente'),
      num('nutricionEnteralDias', 'Suministro de nutrición enteral (días)'), num('ventilacionDias', 'Tiempo de ventilación mecánica (días)'),
    ]),
    seccion('Hospitalización actual', [
      ...evento('fiebre', 'Fiebre', 'manejo'), ...evento('rcp', 'RCP', 'manejo'), ...evento('hipotension', 'Hipotensión', 'manejo'),
      ...evento('infeccion', 'Infección', 'antibióticos profilácticos o terapéuticos'),
      ...evento('intervencionesQx', 'Intervenciones quirúrgicas', 'cuáles'),
      ...evento('otrosHallazgos', 'Otros hallazgos', 'cuáles'),
    ]),
    seccion('Examen físico', [
      num('pesoKg', 'Peso (kg)'), num('tallaCm', 'Talla (cm)'), num('perimetroAbdominalCm', 'Perímetro abdominal (cm)'), num('perimetroToracicoCm', 'Perímetro torácico (cm)'),
      ...[1, 2, 3, 4, 5].flatMap((n) => [
        txt(`lesion${n}Parte`, `Lesión ${n}: parte del cuerpo`), txt(`lesion${n}Tipo`, `Lesión ${n}: tipo de lesión`), txt(`lesion${n}Descripcion`, `Lesión ${n}: descripción`),
      ]),
      area('examenObservaciones', 'Observaciones del examen físico'),
    ]),
    seccion('Mantenimiento del donante', [
      txt('tensionArterial', 'Tensión arterial'), num('tensionMedia', 'Tensión media'), num('frecuenciaCardiaca', 'Frecuencia cardiaca'),
      num('frecuenciaRespiratoria', 'Frecuencia respiratoria'), num('temperaturaC', 'Temperatura (°C)'), num('sao2', 'SaO2 (%)'), num('diuresisCcH', 'Diuresis (cc/h)'),
      ...[1, 2, 3, 4, 5].flatMap((n) => [txt(`liquido${n}Tipo`, `Líquido endovenoso ${n}: tipo`), txt(`liquido${n}Cantidad`, `Líquido endovenoso ${n}: cantidad`)]),
      num('greUnidades', 'Unidades transfundidas de GRE'), txt('greFechaHora', 'GRE: fecha y hora'),
      num('pfcUnidades', 'Unidades transfundidas de PFC'), txt('pfcFechaHora', 'PFC: fecha y hora'),
      num('plaquetasUnidades', 'Unidades de plaquetas transfundidas'), txt('plaquetasFechaHora', 'Plaquetas: fecha y hora'),
    ]),
    ayudasDiagnosticas(),
    medicamentos(7),
    seccion('Campos obligatorios en protocolo de muerte encefálica', [
      fecha('me1Fecha', 'Primer diagnóstico de muerte encefálica: fecha', { req: true }),
      hora('me1Hora', 'Primer diagnóstico: hora', { req: true }),
      txt('me1Medico', 'Primer diagnóstico: nombre y apellido del médico', { req: true }),
      txt('me1Especialidad', 'Primer diagnóstico: especialidad', { req: true }),
      fecha('me2Fecha', 'Segundo diagnóstico de muerte encefálica: fecha', { req: true }),
      hora('me2Hora', 'Segundo diagnóstico: hora', { req: true }),
      txt('me2Medico', 'Segundo diagnóstico: nombre y apellido del médico', { req: true }),
      txt('me2Especialidad', 'Segundo diagnóstico: especialidad', { req: true }),
      area('pruebasAuxiliares', 'Pruebas auxiliares'),
      txt('lugarNacimiento', 'Departamento y municipio de nacimiento', { req: true }),
      txt('lugarResidencia', 'Departamento y municipio de residencia', { req: true }),
      num('estrato', 'Estrato socioeconómico', { req: true }),
      txt('regimen', 'Régimen', { req: true }),
      txt('eps', 'EPS', { req: true }),
      txt('firmaMedicoCoordinador', 'Firma y nombre del médico coordinador'),
      txt('profesionalCrt', 'Profesional responsable en el CRT'),
    ]),
    seccion('Estudios pretrasplante del donante de órganos', [
      sel('traslado', 'Requerimientos de traslado de muestras', ['Aéreo a una ciudad', 'Aéreo a más de una ciudad', 'Solo traslado terrestre', 'Ningún traslado']),
      num('muestraMucosaYugal', 'Muestras enviadas: mucosa yugal (cantidad)'), num('muestraSangre', 'Muestras enviadas: sangre (cantidad)'),
      num('muestraBazo', 'Muestras enviadas: bazo (cantidad)'), num('muestraGanglios', 'Muestras enviadas: ganglios (cantidad)'),
      txt('muestraOtro', 'Muestras enviadas: otro (¿cuál?)'), num('muestraOtroCantidad', 'Muestras enviadas: otro (cantidad)'),
    ]),
    laboratorioClinico(),
    perfilInfeccioso(),
    inmunologiaHla(),
  ],
};
