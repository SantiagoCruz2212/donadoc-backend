import { MigrationInterface, QueryRunner } from 'typeorm';
import { PLANTILLAS_INS } from '../../../formatos/plantillas-ins';

const CODIGOS = ['INS-GESTION-DONANTE', 'INS-ENTREVISTA-FAMILIAR', 'INS-OFERTA-NACIONAL', 'INS-BIOVIG-ORGANOS'];
const PLANTILLAS = PLANTILLAS_INS.filter((p) => CODIGOS.includes(p.codigo));

/**
 * Carga los formatos OFICIALES del INS (transcritos de docs/formatos-ins) como plantillas vigentes. Las plantillas de
 * ejemplo (HC-DONANTE, DESC-QX, CONSENT-FAM) siguen existiendo para demostraciones; en un despliegue real conviene
 * marcarlas como no vigentes con otra migración de datos.
 */
export class PlantillasIns1731000000002 implements MigrationInterface {
  name = 'PlantillasIns1731000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const p of PLANTILLAS) {
      await queryRunner.query(
        `INSERT INTO plantillas_formato (codigo, nombre, version, esquema, vigente) VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (codigo, version) DO NOTHING`,
        [p.codigo, p.nombre, p.version, JSON.stringify(p.esquema)],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM plantillas_formato WHERE codigo = ANY($1)', [CODIGOS]);
  }
}
