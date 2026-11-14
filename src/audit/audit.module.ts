import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '@users/entities/usuario.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditoriaLecturasInterceptor } from './auditoria-lecturas.interceptor';
import { Auditoria } from './entities/auditoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auditoria, Usuario])],
  controllers: [AuditController],
  providers: [AuditService, { provide: APP_INTERCEPTOR, useClass: AuditoriaLecturasInterceptor }],
  exports: [AuditService],
})
export class AuditModule {}
