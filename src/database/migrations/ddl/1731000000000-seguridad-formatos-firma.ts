import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Auditoría inmutable con contexto HTTP, datos de formatos en documentos y verificación de firmas (SQL junto a este archivo). */
export class SeguridadFormatosFirma1731000000000 implements MigrationInterface {
  name = 'SeguridadFormatosFirma1731000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readFileSync(join(__dirname, '1731000000000-seguridad-formatos-firma.sql'), 'utf8'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE firmas DROP COLUMN verificada_ip, DROP COLUMN documento_hash, DROP COLUMN proveedor, DROP COLUMN firmante_correo');
    await queryRunner.query('DROP INDEX IF EXISTS uq_documentos_caso_plantilla');
    await queryRunner.query('ALTER TABLE documentos DROP COLUMN datos');
    await queryRunner.query('DROP TRIGGER IF EXISTS tr_auditoria_inmutable ON auditoria');
    await queryRunner.query('DROP FUNCTION IF EXISTS auditoria_inmutable()');
    await queryRunner.query('DROP INDEX IF EXISTS idx_auditoria_fecha');
    await queryRunner.query('DROP INDEX IF EXISTS idx_auditoria_usuario');
    await queryRunner.query('ALTER TABLE auditoria DROP COLUMN estado_http, DROP COLUMN ruta, DROP COLUMN metodo');
  }
}
