import { EsquemaFormato } from '../esquema';
import {
  area, ayudasDiagnosticas, evento, fecha, hora, inmunologiaHla, laboratorioClinico, medicamentos, num, perfilInfeccioso, sel, seccion,
  sino, txt,
} from './constructores';

/** Formato de Oferta Nacional de Órganos y Tejidos (INS). Fuente: «Formato Oferta Nacional Organos y Tejidos.docx». */
const antecedentes: [string, string][] = [
  ['patologicos', 'Patológicos'], ['familiares', 'Familiares'], ['quirurgicos', 'Quirúrgicos'], ['toxicoAlergicos', 'Tóxico-alérgicos'],
  ['farmacologicos', 'Farmacológicos'], ['inmunologicos', 'Inmunológicos'], ['traumaticos', 'Traumáticos'], ['hospitalarios', 'Hospitalarios'],
];

export const OFERTA_NACIONAL: EsquemaFormato = {
  secciones: [
    seccion('Encabezado de la oferta', [
      txt('consecutivo', 'Consecutivo', { req: true }), txt('codigoCrt', 'Código CRT', { req: true }),
      txt('fechaHoraReporte', 'Fecha y hora del reporte (AAAA-MM-DD HH:MM)', { req: true }),
      txt('medicoCoordinador', 'Médico coordinador a cargo', { req: true }),
      txt('telefonosOferta', 'Teléfonos disponibles para coordinar la oferta'),
    ]),
    seccion('Datos del donante', [
      sel('mecanismoDonacion', 'Mecanismo de donación', ['CF', 'PL']),
      num('edad', 'Edad'), sel('sexo', 'Sexo', ['M', 'F'], { origen: 'donante.sexo' }),
      txt('raza', 'Raza'), txt('nacionalidad', 'Nacionalidad'),
      txt('regionalGeneradora', 'Regional generadora'), txt('ipsGeneradora', 'IPS generadora', { req: true }),
      fecha('fechaIngreso', 'Fecha de ingreso a la IPS', { origen: 'ia.fechaIngreso' }), hora('horaIngreso', 'Hora de ingreso a la IPS'),
      sel('servicio', 'Servicio', ['Urgencias', 'UCI', 'Otro']), txt('servicioOtro', 'Servicio (otro, ¿cuál?)'),
      sel('grupoSanguineo', 'GS (grupo sanguíneo)', ['O', 'A', 'B', 'AB']), sel('rh', 'Rh', ['+', '-']),
    ]),
    seccion('Datos de la muerte', [
      fecha('fechaMuerte', 'Fecha de la muerte', { req: true }), hora('horaMuerte', 'Hora de la muerte', { req: true }),
      area('muerteObservaciones', 'Observaciones'),
      sel('causaMuerte', 'Causa de muerte', ['TCE', 'ECV', 'EHI', 'Tumor', 'Otra'], { req: true }),
      sel('ecvTipo', 'ECV: tipo', ['Hemorrágico', 'Isquémico']),
      txt('causaDetalle', 'Causa (detalle) / tipo de tumor', { origen: 'ia.diagnosticoPrincipal' }),
      sino('tac', 'TAC'), txt('tacResultado', 'Resultado del TAC'),
      area('pruebasCerteza', 'Pruebas de certeza'),
    ]),
    seccion('Antecedentes', [
      ...antecedentes.flatMap(([c, e]) => [sino(`ant_${c}`, `${e}: ¿hay?`), txt(`ant_${c}Cuales`, `${e}: ¿cuáles?`)]),
      num('tatuajesNumero', 'Tatuajes y/o piercing: número'), txt('tatuajesReciente', 'Tatuajes y/o piercing: mes y año del más reciente'),
      area('antecedentesOtros', 'Otros / observaciones', { origen: 'ia.antecedentesRelevantes' }),
      sino('ventilacion', 'Tiempo de ventilación mecánica'), num('ventilacionHoras', 'Ventilación mecánica (horas)'),
      sino('nutricionEnteral', 'Suministro de nutrición enteral'), num('nutricionEnteralDias', 'Nutrición enteral (número de días)'),
      ...evento('fiebre', 'Fiebre', 'manejo'), ...evento('hipotension', 'Hipotensión', 'manejo'),
      ...evento('rcp', 'RCP', 'manejo'), ...evento('infeccion', 'Infección', 'manejo'),
      ...evento('intervencionesQx', 'Intervenciones quirúrgicas', 'cuáles'),
    ]),
    seccion('Examen físico', [
      num('pesoKg', 'Peso (kg)'), num('tallaCm', 'Talla (cm)'), num('perimetroAbdominalCm', 'Perímetro abdominal (cm)'), num('perimetroToracicoCm', 'Perímetro torácico (cm)'),
      area('lesiones', 'Lesiones'), area('examenOtros', 'Otros / observaciones'),
    ]),
    seccion('Mantenimiento del donante', [
      txt('tensionArterial', 'TA'), num('tensionMedia', 'Media'), num('frecuenciaCardiaca', 'FC'), num('frecuenciaRespiratoria', 'FR'),
      num('temperaturaC', 'T° (°C)'), num('sao2', 'SaO2 (%)'), num('diuresisCcH', 'Diuresis (cc/h)'), txt('mantenimientoOtros', 'Otros'),
      area('liquidosEndovenosos', 'Líquidos endovenosos (tipo, cantidad)'),
      sino('transfusiones', 'Transfusiones'), txt('transfusionTipo', 'Transfusión: tipo'), num('transfusionUnidades', 'Transfusión: número de unidades'),
      txt('transfusionUltimaFechaHora', 'Fecha y hora de la última unidad'), area('mantenimientoObservaciones', 'Observaciones'),
    ]),
    ayudasDiagnosticas(),
    medicamentos(5),
    laboratorioClinico(),
    perfilInfeccioso(),
    inmunologiaHla(),
    seccion('Firmas', [
      txt('firmaMedicoCoordinador', 'Firma y nombre del médico coordinador'),
      txt('profesionalCrt', 'Nombre del profesional responsable en el CRT'),
    ]),
  ],
};
