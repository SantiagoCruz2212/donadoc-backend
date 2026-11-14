import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

/** DDL inicial: las 18 tablas del modelo entidad-relación del módulo 2 (el SQL vive junto a este archivo). */
export class ModeloInicial1730000000000 implements MigrationInterface {
  name = 'ModeloInicial1730000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readFileSync(join(__dirname, '1730000000000-modelo-inicial.sql'), 'utf8'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablas = [
      'claves_temporales', 'auditoria', 'sugerencias_ia', 'extracciones_ia', 'paquete_documentos', 'paquetes', 'firmas', 'documentos',
      'descripciones_quirurgicas', 'plantillas_formato', 'componentes_caso', 'responsables', 'casos', 'donantes', 'instituciones',
      'invitaciones', 'usuarios', 'organizaciones',
    ];
    for (const t of tablas) await queryRunner.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
}
