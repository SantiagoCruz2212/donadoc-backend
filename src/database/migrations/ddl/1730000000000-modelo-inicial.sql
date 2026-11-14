-- DonaDoc · modelo de datos inicial (PostgreSQL 13 o superior: gen_random_uuid() es nativo)
-- Generado a partir del mismo esquema que el diagrama entidad-relación del informe.
-- Las tablas de negocio llevan organizacion_id (multi-organización). Borrado lógico con eliminado_en.

CREATE TABLE organizaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  nit VARCHAR(20) UNIQUE,
  clave_publica VARCHAR(60) NOT NULL UNIQUE,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'SUSPENDIDA')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID,
  correo VARCHAR(180) NOT NULL,
  hash_clave VARCHAR(100) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('SUPER_ADMIN', 'ADMIN_ORG', 'OPERADOR')),
  perfil VARCHAR(20) CHECK (perfil IN ('COORDINADOR', 'AUXILIAR', 'CIRUJANO', 'REGIONAL', 'CONSULTA')),
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_en TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (organizacion_id, correo),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id)
);

CREATE TABLE invitaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL,
  correo VARCHAR(180) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  perfil VARCHAR(20),
  hash_token VARCHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  usada_en TIMESTAMPTZ,
  creado_por UUID,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id),
  FOREIGN KEY (creado_por) REFERENCES usuarios (id)
);

CREATE TABLE auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID,
  usuario_id UUID,
  entidad VARCHAR(60) NOT NULL,
  entidad_id UUID,
  accion VARCHAR(30) NOT NULL,
  valor_anterior JSONB,
  valor_nuevo JSONB,
  ip VARCHAR(45),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);

CREATE TABLE claves_temporales (
  clave_hash VARCHAR(64) NOT NULL,
  valor JSONB NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (clave_hash)
);

CREATE TABLE instituciones (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('IPS_GENERADORA', 'IPS_RECEPTORA', 'MEDICINA_LEGAL', 'OTRA')),
  ciudad VARCHAR(80),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id)
);

CREATE TABLE donantes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL,
  tipo_documento VARCHAR(5) NOT NULL,
  numero_documento VARCHAR(20) NOT NULL,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  sexo VARCHAR(10),
  etnia VARCHAR(40),
  fecha_nacimiento DATE,
  eliminado_en TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (organizacion_id, tipo_documento, numero_documento),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id)
);

CREATE TABLE casos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL,
  donante_id UUID NOT NULL,
  ips_generadora_id UUID,
  creado_por UUID NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'EN_CURSO', 'FIRMADO', 'CERRADO', 'CONTRAINDICADO')),
  tipo_donante VARCHAR(20) CHECK (tipo_donante IN ('TOTIPOTENCIAL', 'ORGANOS', 'TEJIDOS')),
  muerte_violenta BOOLEAN NOT NULL DEFAULT false,
  inicio_rescate_programado TIMESTAMPTZ,
  hora_clampeo TIMESTAMPTZ,
  causa_muerte VARCHAR(200),
  causa_contraindicacion TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_en TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id),
  FOREIGN KEY (donante_id) REFERENCES donantes (id),
  FOREIGN KEY (ips_generadora_id) REFERENCES instituciones (id),
  FOREIGN KEY (creado_por) REFERENCES usuarios (id)
);

CREATE TABLE responsables (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  registro_medico VARCHAR(30),
  rol VARCHAR(30) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones (id)
);

CREATE TABLE componentes_caso (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL,
  tipo_componente VARCHAR(30) NOT NULL,
  rescatado BOOLEAN NOT NULL DEFAULT false,
  causa_no_rescate TEXT,
  institucion_destino_id UUID,
  responsable_id UUID,
  solucion_preservacion VARCHAR(100),
  cantidad_ml INTEGER,
  hora_registro TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (caso_id) REFERENCES casos (id),
  FOREIGN KEY (institucion_destino_id) REFERENCES instituciones (id),
  FOREIGN KEY (responsable_id) REFERENCES responsables (id)
);

CREATE TABLE plantillas_formato (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  codigo VARCHAR(40) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  version VARCHAR(10) NOT NULL,
  esquema JSONB NOT NULL,
  vigente BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (codigo, version)
);

CREATE TABLE descripciones_quirurgicas (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  componente_id UUID NOT NULL,
  plantilla_id UUID NOT NULL,
  opciones JSONB NOT NULL,
  observaciones TEXT,
  creado_por UUID,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (componente_id) REFERENCES componentes_caso (id),
  FOREIGN KEY (plantilla_id) REFERENCES plantillas_formato (id),
  FOREIGN KEY (creado_por) REFERENCES usuarios (id)
);

CREATE TABLE documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL,
  plantilla_id UUID,
  tipo VARCHAR(30) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'COMPLETO', 'FIRMADO', 'ANULADO')),
  version INTEGER NOT NULL DEFAULT 1,
  anonimizado BOOLEAN NOT NULL DEFAULT false,
  ruta_archivo VARCHAR(300),
  hash_sha256 VARCHAR(64),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_en TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (caso_id) REFERENCES casos (id),
  FOREIGN KEY (plantilla_id) REFERENCES plantillas_formato (id)
);

CREATE TABLE firmas (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL,
  firmante_nombre VARCHAR(150) NOT NULL,
  firmante_rol VARCHAR(40) NOT NULL,
  orden INTEGER NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'FIRMADA', 'RECHAZADA')),
  firmado_en TIMESTAMPTZ,
  ruta_imagen VARCHAR(300),
  hash_firma VARCHAR(64),
  PRIMARY KEY (id),
  UNIQUE (documento_id, orden),
  FOREIGN KEY (documento_id) REFERENCES documentos (id)
);

CREATE TABLE paquetes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL,
  institucion_id UUID NOT NULL,
  ruta_archivo VARCHAR(300),
  generado_por UUID,
  generado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (caso_id) REFERENCES casos (id),
  FOREIGN KEY (institucion_id) REFERENCES instituciones (id),
  FOREIGN KEY (generado_por) REFERENCES usuarios (id)
);

CREATE TABLE paquete_documentos (
  paquete_id UUID NOT NULL,
  documento_id UUID NOT NULL,
  PRIMARY KEY (paquete_id, documento_id),
  FOREIGN KEY (paquete_id) REFERENCES paquetes (id),
  FOREIGN KEY (documento_id) REFERENCES documentos (id)
);

CREATE TABLE extracciones_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL,
  documento_origen_id UUID NOT NULL,
  proveedor VARCHAR(30) NOT NULL,
  modelo VARCHAR(60),
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PROCESADA', 'ERROR', 'TIMEOUT', 'ABSTENCION')),
  intentos INTEGER NOT NULL DEFAULT 0,
  solicitado_por UUID,
  solicitado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondido_en TIMESTAMPTZ,
  respuesta_json JSONB,
  PRIMARY KEY (id),
  FOREIGN KEY (caso_id) REFERENCES casos (id),
  FOREIGN KEY (documento_origen_id) REFERENCES documentos (id),
  FOREIGN KEY (solicitado_por) REFERENCES usuarios (id)
);

CREATE TABLE sugerencias_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  extraccion_id UUID NOT NULL,
  campo VARCHAR(80) NOT NULL,
  valor_sugerido TEXT,
  confianza NUMERIC(4,3),
  decision VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (decision IN ('PENDIENTE', 'ACEPTADA', 'MODIFICADA', 'RECHAZADA')),
  valor_final TEXT,
  decidido_por UUID,
  decidido_en TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (extraccion_id) REFERENCES extracciones_ia (id),
  FOREIGN KEY (decidido_por) REFERENCES usuarios (id)
);

-- Índices de consulta frecuentes
CREATE INDEX idx_casos_organizacion ON casos (organizacion_id, estado);
CREATE INDEX idx_documentos_caso ON documentos (caso_id);
CREATE INDEX idx_auditoria_entidad ON auditoria (organizacion_id, entidad, entidad_id);
CREATE INDEX idx_claves_expira ON claves_temporales (expira_en);
