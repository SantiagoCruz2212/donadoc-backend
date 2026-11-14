import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@audit/audit.module';
import { CasosModule } from '@casos/casos.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { Documento } from './entities/documento.entity';
import { Almacenamiento } from './storage/almacenamiento';
import { AlmacenamientoLocal } from './storage/almacenamiento-local';

@Module({
  imports: [TypeOrmModule.forFeature([Documento]), CasosModule, AuditModule],
  controllers: [DocumentosController],
  providers: [DocumentosService, { provide: Almacenamiento, useClass: AlmacenamientoLocal }],
  exports: [DocumentosService, Almacenamiento],
})
export class DocumentosModule {}
