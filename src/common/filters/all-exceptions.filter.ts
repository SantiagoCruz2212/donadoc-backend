import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Convierte cualquier error en el formato único de respuesta, sin filtrar detalles internos
 * (rutas de archivos, trazas, errores del controlador de base de datos).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let error: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const b = body as { message?: unknown; error?: unknown };
        if (Array.isArray(b.error)) {
          message = typeof b.message === 'string' ? b.message : 'Datos inválidos';
          error = b.error;
        } else if (typeof b.message === 'string') {
          message = b.message;
        } else if (Array.isArray(b.message)) {
          message = 'Datos inválidos';
        }
      }
    } else if (esErrorHttpDelCliente(exception)) {
      // Errores del analizador de cuerpos de Express (cuerpo demasiado grande, JSON mal formado): son del cliente, no del servidor.
      status = exception.status ?? exception.statusCode ?? HttpStatus.BAD_REQUEST;
      message = status === HttpStatus.PAYLOAD_TOO_LARGE ? 'La solicitud es demasiado grande' : 'Solicitud mal formada';
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({ success: false, message, ...(error ? { error } : {}) });
  }
}

interface ErrorHttp { status?: number; statusCode?: number }

/** Error con estado HTTP 4xx lanzado por middleware de Express (http-errors); no es una HttpException de Nest. */
function esErrorHttpDelCliente(e: unknown): e is ErrorHttp {
  if (!e || typeof e !== 'object') return false;
  const { status, statusCode } = e as ErrorHttp;
  const codigo = typeof status === 'number' ? status : statusCode;
  return typeof codigo === 'number' && codigo >= 400 && codigo < 500;
}
