# DonaDoc Backend

[![CI](https://github.com/SantiagoCruz2212/donadoc-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/SantiagoCruz2212/donadoc-backend/actions/workflows/ci.yml)

API de **DonaDoc**, una plataforma web para **diligenciar una sola vez** los formatos del INS de donación y trasplante de órganos y tejidos, en lugar de transcribir a mano unos 23 formatos con datos repetidos.
Proyecto integrador del *Diplomado en Ingeniería de Software Asistida por IA*. Autor: Santiago Andrés Castro Cruz.

Este repositorio es el **backend**. La interfaz está en [donadoc-frontend](https://github.com/SantiagoCruz2212/donadoc-frontend).

## Qué problema resuelve y para quién

Quien coordina un programa de trasplantes (caso real de una coordinadora de trasplantes) debe llenar a mano decenas de formatos con los mismos datos del donante. DonaDoc carga la historia clínica una vez, sugiere los datos con IA y la persona **acepta, modifica o rechaza** cada sugerencia, diligencia los formatos, genera el PDF y lo hace firmar con un código enviado al correo del paciente o familiar.

- **Usuarios:** coordinador/a de trasplantes (usa la aplicación), administrador de la organización y el paciente o familiar (solo confirma su firma).
- **Flujo:** iniciar sesión → crear un caso → cargar una historia clínica (`.pdf`, `.txt` o texto pegado) → extraer datos con IA → diligenciar un formato → PDF → firma con código de un solo uso → documento firmado e inmodificable.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/requisitos.md](docs/requisitos.md) | Historias de usuario, criterios de aceptación y requisitos no funcionales |
| [docs/arquitectura.md](docs/arquitectura.md) | Diagramas C4 (contexto y contenedores) en Mermaid |
| [docs/adr/](docs/adr) | Decisiones de arquitectura (stack y base de datos) |

El avance de la semana se sigue en el [tablero del proyecto](https://github.com/users/SantiagoCruz2212/projects/1) y en los [issues](https://github.com/SantiagoCruz2212/donadoc-backend/issues).

## Stack

NestJS 11 · TypeScript · PostgreSQL 16 (TypeORM, migraciones versionadas) · JWT RS256 · Swagger · Jest.
La IA va detrás de un puerto (`ExtractorIa`) con tres adaptadores: **Gemini** (capa gratuita), **Ollama** (local) y **mock** (simulador sin IA, para pruebas).

## Estructura

```
src/
  auth/ users/ tenants/    Sesión (JWT), usuarios y organizaciones (clave pública X-Tenant-Key)
  casos/ documentos/       Casos y carga de historias clínicas
  ia/                      Extracción con IA: puerto, adaptadores (gemini, ollama, mock) y prompt
  formatos/ informes/      Formatos oficiales como esquemas JSON, formularios y PDF
  firmas/ otp/ correo/     Firma con código de un solo uso y envío de correo (consola o SMTP)
  red/ audit/              Trasplantes vigentes sin datos personales y auditoría de solo inserción
  database/                Migraciones (ddl y dml) y datos de demostración
  common/ health/          Filtros, interceptores, sobre de respuesta y sondas de salud
test/                      Pruebas de integración contra PostgreSQL real
docs/                      Requisitos, arquitectura, ADR y ejemplo sintético
```

Cada módulo sigue la misma forma: controlador → servicio → entidades → dto → vista.

## Cómo ejecutarlo

Requisitos: Node 22 y PostgreSQL 13 o superior con una base vacía.

```bash
cp .env.example .env     # todas las variables vienen en blanco: complete las suyas (ver abajo)
npm ci
npm run build
npm start                # con ENVIRONMENT=local aplica las migraciones al arrancar
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs` (solo con `ENVIRONMENT=local` o `dev`)
- Salud: `/health` y `/health/ready`
- Desarrollo con recarga: `npm run start:dev`
- En un despliegue las migraciones se ejecutan **una vez**: `npm run migration:run`

### Variables de entorno

`.env.example` lista todas **en blanco a propósito**; nada de lo que sigue se publica en este repositorio. `.env` está en `.gitignore`.

| Grupo | Variables | Notas |
|---|---|---|
| General | `ENVIRONMENT`, `PORT`, `APP_TIMEZONE`, `FRONTEND_URL`, `CORS_EXTRA_ORIGINS` | `ENVIRONMENT=local` migra al arrancar y habilita Swagger; use `dev`, `staging` o `prod` en despliegues |
| Base de datos | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` | PostgreSQL |
| Sesión | `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_EXPIRES_IN` | Vacías generan un par efímero (solo desarrollo); en producción son obligatorias |
| IA | `EXTRACTOR_IA_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `OLLAMA_URL`, `OLLAMA_MODEL`, `IA_TIMEOUT_MS`, `IA_MAX_INTENTOS`, `IA_UMBRAL_CONFIANZA` | Proveedor: `gemini`, `ollama` o `mock` |
| Correo y OTP | `MAIL_PROVIDER`, `SMTP_*`, `MAIL_FROM`, `OTP_PEPPER`, `OTP_TTL_MIN`, `OTP_MAX_INTENTOS`, `OTP_REENVIO_SEG` | `consola` solo en local; `OTP_PEPPER` es obligatorio en producción |
| Cifrado | `DATA_ENCRYPTION_KEY` | 64 caracteres hexadecimales (`openssl rand -hex 32`); obligatoria en producción. En local, si está vacía, se usa una llave de desarrollo. **Si se pierde, los datos cifrados no se recuperan** |
| Archivos | `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Si `MAX_UPLOAD_MB` no es válido se usan 5 MB |
| Demostración | `SEED_ENABLED`, `SEED_TENANT_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Crea una organización y un usuario la primera vez (solo local) |

Nunca escriba claves, contraseñas ni tokens en el repositorio.

### IA gratuita

- **Gemini:** cree una clave gratuita en <https://aistudio.google.com/apikey> y póngala solo en su `.env` (`GEMINI_API_KEY`). Use datos sintéticos; los identificadores se enmascaran antes de enviar el texto.
- **Ollama:** instale [Ollama](https://ollama.com), ejecute `ollama pull llama3.1:8b` y use `EXTRACTOR_IA_PROVIDER=ollama`. Los datos no salen del equipo.
- **mock:** simula una extracción sin IA; sirve para probar el flujo sin red ni cuota. La interfaz muestra siempre el proveedor usado.

Si el proveedor falla o se agota el tiempo, el documento no se pierde y la extracción queda pendiente. En la revisión del módulo 4, con `llama3.1:8b` y un conjunto pequeño de historias sintéticas, la extracción obtuvo F1 de 0,968; es una tendencia, no precisión clínica. La confianza la declara el modelo, por eso la revisión humana es obligatoria.

## Pruebas

```bash
npm test                                                  # unitarias
npm run test:cov                                          # con cobertura
npm run build                                             # compilación
npx jest --config test/jest-integration.json --runInBand  # integración, necesita PostgreSQL real
```

Las pruebas de integración leen estas variables opcionales: `INT_DB_HOST`, `INT_DB_PORT` (por defecto 54331), `INT_DB_USER`, `INT_DB_PASSWORD` y `INT_DB_NAME`. Lo más simple es levantar un contenedor `postgres:16-alpine` con la base `donadoc_int`.

El CI de GitHub Actions ([ci.yml](.github/workflows/ci.yml)) ejecuta las unitarias, la compilación, las de integración con PostgreSQL real y construye la imagen Docker (sin publicarla) en cada push a `main` y en cada pull request.

## Imagen Docker

```bash
docker build -t donadoc-backend .
```

Imagen de varias etapas, con usuario sin privilegios. La base de datos y las variables se proporcionan al ejecutarla.

## Seguridad

- JWT RS256 de acceso corto en todas las rutas salvo login, restablecer clave y sondas de salud.
- Contraseñas con bcrypt (costo 12) y respuesta de tiempo constante ante correos inexistentes.
- Alcance por organización: lo que pertenece a otra organización responde 404.
- Auditoría de solo inserción, protegida por un trigger de PostgreSQL.
- Cifrado AES-256-GCM (IV aleatorio y etiqueta de autenticación) de los datos clínicos en la base de datos: datos diligenciados de los formatos, sugerencias de la IA (valor sugerido y final), respuesta cruda del proveedor de IA, causa de muerte, causa de contraindicación y causa de no rescate. La llave vive solo en `DATA_ENCRYPTION_KEY`. Detalle en `src/common/crypto/campo-cifrado.ts`.
- Solo se aceptan `.pdf` (con firma `%PDF-`) y `.txt` de hasta 5 MB.
- Sin secretos en el repositorio.

## Límites conocidos

- **Cifrado parcial:** siguen en claro en la base de datos el nombre, apellidos, número de documento y fecha de nacimiento del donante, el nombre del firmante y los informes periódicos. Cifrarlos exige un índice ciego (el documento tiene búsqueda y restricción de unicidad) y queda como mejora. Tampoco están cifrados los archivos de historias clínicas guardados en disco (`UPLOAD_DIR`).
- Los datos guardados antes del cifrado se siguen leyendo, pero se cifran solo cuando se vuelven a guardar; no hay aún un script que cifre los existentes.
- No hay rotación de llaves automática (el formato `enc:v1` deja el espacio para hacerla).
- El inicio de sesión no cumple todavía el objetivo de responder en menos de 500 ms por el costo de bcrypt.
- La firma es una **firma electrónica simple**; su validez legal debe confirmarla el área jurídica.
- El adaptador SMTP no se ha probado contra un proveedor real, y Gemini no se ha probado con una clave real.
- Aún no hay URL pública desplegada.
- Están cargados 8 formatos oficiales del INS; faltan otros.
