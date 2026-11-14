import { applyDecorators, Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/** Documenta en Swagger la forma envuelta { success, message, data, meta } de una respuesta. */
export function ApiEnvelope<T>(model: Type<T>, opciones: { created?: boolean; isArray?: boolean; description?: string } = {}) {
  const data = opciones.isArray ? { type: 'array', items: { $ref: getSchemaPath(model) } } : { $ref: getSchemaPath(model) };
  const schema = {
    type: 'object',
    properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data, meta: { type: 'object', additionalProperties: true } },
  };
  const respuesta = opciones.created ? ApiCreatedResponse : ApiOkResponse;
  return applyDecorators(ApiExtraModels(model), respuesta({ description: opciones.description, schema }));
}
