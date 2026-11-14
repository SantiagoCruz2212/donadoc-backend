import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Tabla de informes periódicos por organización (SQL junto a este archivo). */
export class InformesPeriodicos1731000000005 implements MigrationInterface {
  name = 'InformesPeriodicos1731000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readFileSync(join(__dirname, '1731000000005-informes-periodicos.sql'), 'utf8'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS informes');
  }
}
