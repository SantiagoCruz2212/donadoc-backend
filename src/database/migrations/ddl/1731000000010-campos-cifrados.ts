import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

/** La causa de muerte pasa a TEXT para alojar el dato cifrado (SQL junto a este archivo). */
export class CamposCifrados1731000000010 implements MigrationInterface {
  name = 'CamposCifrados1731000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readFileSync(join(__dirname, '1731000000010-campos-cifrados.sql'), 'utf8'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Solo es posible si ningún valor supera los 200 caracteres (los datos cifrados sí los superan: descifrar antes).
    await queryRunner.query('ALTER TABLE casos ALTER COLUMN causa_muerte TYPE VARCHAR(200)');
  }
}
