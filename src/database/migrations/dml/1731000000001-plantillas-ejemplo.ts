import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Plantillas de EJEMPLO para demostrar el motor de formatos. NO son los formatos oficiales del INS:
 * los campos reales los define quien conoce cada formato (coordinación de trasplantes) y se cargan como nuevas
 * plantillas (o versiones) con el mismo esquema, sin cambiar código. `origen` indica de dónde se precarga el campo.
 */
const PLANTILLAS = [
  {
    codigo: 'HC-DONANTE',
    nombre: 'Resumen de historia clínica del donante (ejemplo)',
    esquema: {
      secciones: [
        {
          titulo: 'Identificación del donante',
          campos: [
            { clave: 'nombres', etiqueta: 'Nombres', tipo: 'texto', requerido: true, origen: 'donante.nombres' },
            { clave: 'apellidos', etiqueta: 'Apellidos', tipo: 'texto', requerido: true, origen: 'donante.apellidos' },
            { clave: 'tipoDocumento', etiqueta: 'Tipo de documento', tipo: 'texto', requerido: true, origen: 'donante.tipoDocumento' },
            { clave: 'numeroDocumento', etiqueta: 'Número de documento', tipo: 'texto', requerido: true, origen: 'donante.numeroDocumento' },
            { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: false, origen: 'donante.fechaNacimiento' },
          ],
        },
        {
          titulo: 'Historia clínica',
          campos: [
            { clave: 'diagnosticoPrincipal', etiqueta: 'Diagnóstico principal', tipo: 'texto', requerido: true, origen: 'ia.diagnosticoPrincipal' },
            { clave: 'causaMuerte', etiqueta: 'Causa de muerte', tipo: 'texto', requerido: true, origen: 'ia.causaMuerte' },
            { clave: 'antecedentesRelevantes', etiqueta: 'Antecedentes relevantes', tipo: 'areaTexto', requerido: false, origen: 'ia.antecedentesRelevantes' },
            { clave: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', requerido: true, origen: 'ia.fechaIngreso' },
            { clave: 'grupoSanguineo', etiqueta: 'Grupo sanguíneo', tipo: 'seleccion', requerido: true, origen: 'ia.grupoSanguineo', opciones: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] },
          ],
        },
      ],
    },
  },
  {
    codigo: 'DESC-QX',
    nombre: 'Descripción quirúrgica del rescate (ejemplo)',
    esquema: {
      secciones: [
        {
          titulo: 'Rescate',
          campos: [
            { clave: 'fechaRescate', etiqueta: 'Fecha del rescate', tipo: 'fecha', requerido: true },
            { clave: 'horaClampeo', etiqueta: 'Hora de clampeo', tipo: 'texto', requerido: true },
            { clave: 'cirujano', etiqueta: 'Cirujano responsable', tipo: 'texto', requerido: true },
            { clave: 'solucionPreservacion', etiqueta: 'Solución de preservación', tipo: 'seleccion', requerido: true, opciones: ['Celsior', 'HTK', 'UW', 'Otra'] },
            { clave: 'complicaciones', etiqueta: '¿Hubo complicaciones?', tipo: 'booleano', requerido: true },
            { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'areaTexto', requerido: false },
          ],
        },
      ],
    },
  },
  {
    codigo: 'CONSENT-FAM',
    nombre: 'Consentimiento familiar para la donación (ejemplo)',
    esquema: {
      secciones: [
        {
          titulo: 'Donante',
          campos: [
            { clave: 'donante', etiqueta: 'Donante', tipo: 'texto', requerido: true, origen: 'donante.nombreCompleto' },
            { clave: 'documentoDonante', etiqueta: 'Documento del donante', tipo: 'texto', requerido: true, origen: 'donante.numeroDocumento' },
          ],
        },
        {
          titulo: 'Familiar que autoriza',
          campos: [
            { clave: 'familiarNombre', etiqueta: 'Nombre del familiar', tipo: 'texto', requerido: true },
            { clave: 'parentesco', etiqueta: 'Parentesco', tipo: 'seleccion', requerido: true, opciones: ['Cónyuge', 'Hijo(a)', 'Padre/Madre', 'Hermano(a)', 'Otro'] },
            { clave: 'familiarCorreo', etiqueta: 'Correo del familiar (para la firma)', tipo: 'texto', requerido: true },
            { clave: 'autoriza', etiqueta: 'Autoriza la donación', tipo: 'booleano', requerido: true },
          ],
        },
      ],
    },
  },
];

export class PlantillasEjemplo1731000000001 implements MigrationInterface {
  name = 'PlantillasEjemplo1731000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const p of PLANTILLAS) {
      await queryRunner.query(
        `INSERT INTO plantillas_formato (codigo, nombre, version, esquema, vigente) VALUES ($1, $2, '1', $3, true)
         ON CONFLICT (codigo, version) DO NOTHING`,
        [p.codigo, p.nombre, JSON.stringify(p.esquema)],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM plantillas_formato WHERE codigo = ANY($1)', [PLANTILLAS.map((p) => p.codigo)]);
  }
}
