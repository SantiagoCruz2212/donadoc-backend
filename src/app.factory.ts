import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { QueryFailedFilter } from '@common/filters/query-failed.filter';
import { sinCache } from '@common/http/no-store.middleware';
import { configurarSwagger } from '@common/swagger/swagger';

/** Aplana los errores anidados de class-validator a [{ property, constraints }]. */
function aplanar(errors: ValidationError[], prefijo = ''): { property: string; constraints: Record<string, string> }[] {
  return errors.flatMap((e) => {
    const prop = prefijo ? `${prefijo}.${e.property}` : e.property;
    const propios = e.constraints ? [{ property: prop, constraints: e.constraints }] : [];
    return [...propios, ...aplanar(e.children ?? [], prop)];
  });
}

/** Crea y configura la aplicación (sin escuchar en un puerto): la usan el servidor normal (main.ts) y la función serverless (serverless.ts). */
export async function crearApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const cfg = app.get(ConfigService);

  app.set('trust proxy', 1); // IP real detrás del proxy (límite de solicitudes y auditoría)
  app.use(helmet());
  app.use(compression());
  app.use('/api', sinCache); // datos personales: nada de /api se guarda en cachés ni CDN
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException({ message: 'Datos inválidos', error: aplanar(errors) }),
    }),
  );
  // El filtro específico (errores de PostgreSQL) se registra al final para que tenga prioridad sobre el general.
  app.useGlobalFilters(new AllExceptionsFilter(), new QueryFailedFilter());

  // CORS dinámico: lista fija (FRONTEND_URL + CORS_EXTRA_ORIGINS).
  const permitidos = [cfg.get<string>('FRONTEND_URL'), ...(cfg.get<string>('CORS_EXTRA_ORIGINS') ?? '').split(',')]
    .map((o) => o?.trim())
    .filter(Boolean) as string[];
  app.enableCors({ origin: permitidos, credentials: false });
  app.enableShutdownHooks(); // SIGTERM termina las peticiones en curso y cierra el pool

  if (['local', 'dev'].includes(cfg.get<string>('ENVIRONMENT') as string)) configurarSwagger(app); // solo en local y desarrollo
  return app;
}
