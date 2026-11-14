import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@audit/audit.module';
import { CasosModule } from '@casos/casos.module';
import { DocumentosModule } from '@documentos/documentos.module';
import { Documento } from '@documentos/entities/documento.entity';
import { ExtraccionIa } from '@ia/entities/extraccion-ia.entity';
import { SugerenciaIa } from '@ia/entities/sugerencia-ia.entity';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { PlantillaFormato } from './entities/plantilla-formato.entity';
import { FormatosController } from './formatos.controller';
import { FormatosService } from './formatos.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlantillaFormato, Documento, SugerenciaIa, ExtraccionIa, Organizacion]), AuditModule, CasosModule, DocumentosModule],
  controllers: [FormatosController],
  providers: [FormatosService],
  exports: [FormatosService],
})
export class FormatosModule {}
