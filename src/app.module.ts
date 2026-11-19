import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AccesosModule } from './accesos/accesos.module';
import { AuditModule } from '@audit/audit.module';
import { AuthModule } from '@auth/auth.module';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { CasosModule } from '@casos/casos.module';
import { envSchema } from '@common/config/env.validation';
import { fijarClaveCifrado } from '@common/crypto/campo-cifrado';
import { ZonedDatesInterceptor } from '@common/interceptors/zoned-dates.interceptor';
import { DatabaseModule } from '@database/database.module';
import { MIGRACIONES } from '@database/migrate';
import { DocumentosModule } from '@documentos/documentos.module';
import { FirmasModule } from '@firmas/firmas.module';
import { FormatosModule } from '@formatos/formatos.module';
import { InformesModule } from './informes/informes.module';
import { HealthModule } from '@health/health.module';
import { IaModule } from '@ia/ia.module';
import { RedModule } from '@red/red.module';
import { TenantsModule } from '@tenants/tenants.module';
import { UsersModule } from '@users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema, validationOptions: { abortEarly: false } }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        fijarClaveCifrado(cfg.get<string>('DATA_ENCRYPTION_KEY')); // los transformadores de las entidades la usan
        return {
          type: 'postgres' as const,
          host: cfg.get<string>('DB_HOST'),
          port: cfg.get<number>('DB_PORT'),
          username: cfg.get<string>('DB_USER'),
          password: cfg.get<string>('DB_PASSWORD'),
          database: cfg.get<string>('DB_NAME'),
          ssl: cfg.get<boolean>('DB_SSL') ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true, // cada módulo registra sus entidades con forFeature
          namingStrategy: new SnakeNamingStrategy(),
          synchronize: false, // el esquema lo crean las migraciones, nunca la aplicación
          migrations: MIGRACIONES,
          migrationsTableName: 'schema_migrations',
          migrationsTransactionMode: 'each' as const,
          // Solo en local las migraciones corren al arrancar; en despliegues, una vez en el paso de despliegue (npm run migration:run).
          migrationsRun: cfg.get<string>('ENVIRONMENT') === 'local',
          extra: { max: cfg.get<number>('DB_POOL_MAX') },
          retryAttempts: 10,
          retryDelay: 2000,
        };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]), // 60 solicitudes por minuto por IP
    AuditModule,
    TenantsModule,
    UsersModule,
    AuthModule,
    AccesosModule,
    DatabaseModule,
    CasosModule,
    DocumentosModule,
    IaModule,
    FormatosModule,
    InformesModule,
    FirmasModule,
    RedModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ZonedDatesInterceptor },
  ],
})
export class AppModule {}
