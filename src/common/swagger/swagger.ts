import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

const DESCRIPCION = `
API de **DonaDoc**: plataforma para diligenciar una sola vez la documentación de donación y trasplante de órganos y tejidos.

### Formato de respuesta
Toda respuesta usa el mismo sobre: \`{ "success": boolean, "message": string, "data"?: any, "error"?: any, "meta"?: object }\`.
Los listados traen \`meta\` con \`page\`, \`pageSize\`, \`total\` y \`totalPages\`. Los errores traen \`success: false\` y un \`message\` en español;
los de validación agregan \`error: [{ property, constraints }]\`. Los instantes viajan con el desfase de la zona horaria de negocio (America/Bogota, -05:00).

### Autenticación
1. \`POST /auth/login\` con la cabecera pública **X-Tenant-Key** (selecciona la institución; no es un secreto) devuelve un **JWT RS256** de vida corta.
2. Todas las demás rutas exigen \`Authorization: Bearer <token>\`. Solo son públicas: login, olvidé/restablecer contraseña y las sondas \`/health\`.
3. Un token vencido o inválido responde **401**; un rol insuficiente, **403**.
4. Contraseña: \`/auth/olvide-clave\` envía un código OTP de 6 dígitos al correo (vence en 10 min, 5 intentos, un solo uso) y \`/auth/restablecer-clave\` lo canjea. Con sesión, \`/auth/cambiar-clave\`.

### Aislamiento entre instituciones
Cada institución solo ve y modifica **sus** casos: un recurso de otra institución responde **404** (no 403, para no confirmar que existe).
La única vista entre instituciones es \`GET /red/trasplantes-vigentes\`, que nunca incluye datos personales del donante.

### Auditoría
Toda consulta (\`GET\`) con sesión y toda creación, modificación o eliminación quedan registradas con usuario, institución, fecha y hora, IP, método, ruta y estado HTTP.
Los administradores las consultan en \`GET /auditoria\`. El registro es de solo inserción (la base de datos rechaza modificarlo o borrarlo).

### Límites de uso
Por IP: 60 solicitudes por minuto en general, 10 en el login y 5 en las rutas de contraseña y envío de códigos. Al superarlo responde **429**.

### Roles
\`SUPER_ADMIN\`, \`ADMIN_ORG\` (administra su institución) y \`OPERADOR\` (diligencia casos). El rol exigido aparece en la respuesta 403 de cada operación.
`.trim();

const ETIQUETAS: [string, string][] = [
  ['auth', 'Inicio de sesión y gestión de contraseña (con código OTP por correo).'],
  ['casos', 'Casos de donación de la institución, sus componentes (órganos/tejidos) y su estado.'],
  ['documentos', 'Historias clínicas externas cargadas (PDF o texto) con huella SHA-256.'],
  ['ia', 'Extracción asistida por IA y revisión humana de cada sugerencia.'],
  ['formatos', 'Formatos configurables: campos que se solicitan, precarga desde el caso y PDF resultante.'],
  ['informes', 'Informes periódicos por organización y periodo (p. ej. los mensuales de bancos de tejido): tablas, totales calculados y PDF.'],
  ['firmas', 'Firma electrónica del paciente o familiar verificada por código de un solo uso al correo.'],
  ['red', 'Trasplantes vigentes de todas las instituciones, SIN datos personales.'],
  ['auditoria', 'Traza de quién consultó, creó, modificó o eliminó qué y cuándo (solo ADMIN_ORG).'],
  ['salud', 'Sondas para la infraestructura (liveness y readiness).'],
];

/** Esquema de error compartido por todas las operaciones. */
const ERROR_SCHEMA = {
  type: 'object',
  required: ['success', 'message'],
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: 'Caso no encontrado' },
    error: {
      type: 'array',
      description: 'Solo en errores de validación (400/422)',
      items: { type: 'object', properties: { property: { type: 'string', example: 'numeroDocumento' }, constraints: { type: 'object', additionalProperties: { type: 'string' } } } },
    },
  },
};

const RESPUESTAS_COMUNES: Record<string, string> = {
  '401': 'No autenticado: falta el token, es inválido o venció',
  '429': 'Demasiadas solicitudes: se superó el límite por minuto',
  '500': 'Error interno del servidor',
};

/** Agrega a cada operación las respuestas de error estándar que no se declaran una por una. */
export function completarDocumento(doc: OpenAPIObject): OpenAPIObject {
  doc.components = doc.components ?? {};
  doc.components.schemas = { ...(doc.components.schemas ?? {}), ErrorResponse: ERROR_SCHEMA };
  const error = (descripcion: string) => ({ description: descripcion, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } });
  for (const [ruta, metodos] of Object.entries(doc.paths)) {
    for (const [metodo, op] of Object.entries(metodos) as [string, { security?: unknown[]; responses?: Record<string, unknown>; requestBody?: unknown; parameters?: unknown[] }][]) {
      if (typeof op !== 'object' || !op.responses) continue;
      const privada = !!op.security?.length;
      const conEntrada = !!op.requestBody || !!op.parameters?.length;
      for (const [codigo, descripcion] of Object.entries(RESPUESTAS_COMUNES)) {
        if (codigo === '401' && !privada) continue; // las rutas públicas no responden 401
        op.responses[codigo] ??= error(descripcion);
      }
      if (conEntrada && metodo !== 'get') op.responses['400'] ??= error('Datos inválidos: el cuerpo o los parámetros no cumplen las reglas de validación');
      if (conEntrada && metodo === 'get' && ruta.includes('{')) op.responses['400'] ??= error('Identificador con formato inválido');
      if (privada && ruta.includes('{')) op.responses['404'] ??= error('No existe, o pertenece a otra institución (no se distingue a propósito)');
      for (const [codigo, r] of Object.entries(op.responses)) {
        // Las respuestas de error declaradas a mano (400, 403, 404, 409, 422…) también usan el esquema compartido.
        const resp = r as { description?: string; content?: unknown };
        if (Number(codigo) >= 400 && !resp.content) op.responses[codigo] = error(resp.description ?? 'Error');
      }
    }
  }
  return doc;
}

export function crearDocumento(app: INestApplication): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle('DonaDoc API')
    .setDescription(DESCRIPCION)
    .setVersion('0.3.0')
    .setContact('DonaDoc', '', '')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT RS256 obtenido en POST /auth/login' });
  for (const [nombre, descripcion] of ETIQUETAS) builder.addTag(nombre, descripcion);
  return completarDocumento(SwaggerModule.createDocument(app, builder.build()));
}

/** Swagger solo en local y desarrollo: en staging y producción no se expone el contrato. */
export function configurarSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, crearDocumento(app), {
    customSiteTitle: 'DonaDoc API',
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', docExpansion: 'list', displayRequestDuration: true },
  });
}
