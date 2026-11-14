import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Errores de PostgreSQL → códigos HTTP y mensajes estables, sin filtrar el error del controlador. */
@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger('BaseDeDatos');

  catch(exception: QueryFailedError & { driverError?: { code?: string } }, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const code = exception.driverError?.code;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    if (code === '23505') {
      status = HttpStatus.CONFLICT;
      message = 'El registro ya existe';
    } else if (code === '23503') {
      status = HttpStatus.CONFLICT;
      message = 'El registro referencia datos que no existen o está en uso';
    } else {
      this.logger.error(`Error de base de datos (${code ?? 'desconocido'})`);
    }
    res.status(status).json({ success: false, message });
  }
}
