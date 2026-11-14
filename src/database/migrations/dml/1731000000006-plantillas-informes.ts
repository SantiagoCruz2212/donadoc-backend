import { MigrationInterface, QueryRunner } from 'typeorm';
import { PLANTILLAS_INS } from '../../../formatos/plantillas-ins';

const CODIGOS = ['INS-INFORME-BANCO-OCULAR', 'INS-INFORME-BANCO-PIEL', 'INS-INFORME-BANCO-CARDIOVASCULAR', 'INS-INFORME-BANCO-OSEO-CADAVERICO', 'INS-INFORME-BANCO-OSEO-VIVO', 'INS-INFORME-BANCO-MEMBRANA', 'INS-LISTA-ESPERA-TEJIDO'];
const PLANTILLAS = PLANTILLAS_INS.filter((p) => CODIGOS.includes(p.codigo));

/**
 * Informes periódicos de bancos de tejido y lista de espera (ámbito INFORME) transcritos de docs/formatos-ins. Requieren la tabla
 * informes (migración 1731000000005).
 */
export class PlantillasInformes1731000000006 implements MigrationInterface {
  name = 'PlantillasInformes1731000000006';

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
