import { MigrationInterface, QueryRunner } from 'typeorm';
import { PLANTILLAS_INS } from '../../../formatos/plantillas-ins';

const CODIGOS = ['INS-RESCATE-DONANTE', 'INS-FICHAS-ORGANOS', 'INS-FICHAS-TEJIDOS'];
const PLANTILLAS = PLANTILLAS_INS.filter((p) => CODIGOS.includes(p.codigo));

/**
 * Rescate y fichas técnicas por componente (órganos y tejidos) del formato de Gestión de Donación del INS, transcritos de
 * docs/formatos-ins. Complementa la migración 1731000000002.
 */
export class PlantillasInsComponentes1731000000003 implements MigrationInterface {
  name = 'PlantillasInsComponentes1731000000003';

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
