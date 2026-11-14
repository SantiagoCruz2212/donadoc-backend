-- Datos clínicos sensibles cifrados con AES-256-GCM desde la aplicación (ver src/common/crypto/campo-cifrado.ts).
-- El valor cifrado es más largo que el original (IV, etiqueta y base64): la causa de muerte deja de limitarse a 200 caracteres.
-- Las demás columnas cifradas ya eran TEXT o JSONB. Los datos antiguos en claro se siguen leyendo y se cifran al guardarse de nuevo.
ALTER TABLE casos ALTER COLUMN causa_muerte TYPE TEXT;
