-- DonaDoc · segunda migración: auditoría con contexto HTTP e inmutable, formatos dinámicos y firma verificada.
-- No agrega tablas: el modelo sigue siendo de 18 tablas.

-- 1. Auditoría: de dónde vino el evento y protección contra modificación o borrado.
ALTER TABLE auditoria
  ADD COLUMN metodo VARCHAR(10),
  ADD COLUMN ruta VARCHAR(200),
  ADD COLUMN estado_http INTEGER;

CREATE INDEX idx_auditoria_usuario ON auditoria (organizacion_id, usuario_id, creado_en DESC);
CREATE INDEX idx_auditoria_fecha ON auditoria (organizacion_id, creado_en DESC);

CREATE FUNCTION auditoria_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla auditoria es de solo inserción: no se permite % de registros', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auditoria_inmutable
  BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();

-- 2. Formatos: un documento es una instancia de una plantilla y guarda los datos diligenciados.
ALTER TABLE documentos ADD COLUMN datos JSONB;

-- Un caso tiene como máximo un documento vigente por plantilla (se actualiza, y cada versión queda en auditoría).
CREATE UNIQUE INDEX uq_documentos_caso_plantilla ON documentos (caso_id, plantilla_id)
  WHERE plantilla_id IS NOT NULL AND eliminado_en IS NULL;

-- 3. Firmas: quién firma, por qué medio se verificó y a qué versión exacta del documento se vinculó.
ALTER TABLE firmas
  ADD COLUMN firmante_correo VARCHAR(180),
  ADD COLUMN proveedor VARCHAR(30),
  ADD COLUMN documento_hash VARCHAR(64),
  ADD COLUMN verificada_ip VARCHAR(45);
