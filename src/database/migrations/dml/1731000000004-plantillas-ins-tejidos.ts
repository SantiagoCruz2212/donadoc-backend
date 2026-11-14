import { MigrationInterface, QueryRunner } from 'typeorm';
import { PLANTILLAS_INS } from '../../../formatos/plantillas-ins';

const CODIGOS = ['INS-BIOVIG-TEJIDOS'];
const PLANTILLAS = PLANTILLAS_INS.filter((p) => CODIGOS.includes(p.codigo));

/**
 * Ficha de biovigilancia de tejidos y células (INS, junio 2020) transcrita de docs/formatos-ins. Complementa la 1731000000002.
 */
export class PlantillasInsTejidos1731000000004 implements MigrationInterface {
  name = 'PlantillasInsTejidos1731000000004';

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
