-- DonaDoc · informes periódicos (bancos de tejido): se diligencian por organización y periodo, no por caso.
-- Agrega UNA tabla (el modelo pasa de 18 a 19). Las definiciones de los informes siguen siendo plantillas_formato (esquema.ambito = 'INFORME').

CREATE TABLE informes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL,
  plantilla_id UUID NOT NULL,
  periodo VARCHAR(8) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'COMPLETO')),
  version INTEGER NOT NULL DEFAULT 1,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ruta_archivo VARCHAR(300),
  hash_sha256 VARCHAR(64),
  creado_por UUID NOT NULL,
  actualizado_por UUID NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (organizacion_id, plantilla_id, periodo),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id),
  FOREIGN KEY (plantilla_id) REFERENCES plantillas_formato (id),
  FOREIGN KEY (creado_por) REFERENCES usuarios (id),
  FOREIGN KEY (actualizado_por) REFERENCES usuarios (id)
);

CREATE INDEX idx_informes_org_periodo ON informes (organizacion_id, periodo DESC);
