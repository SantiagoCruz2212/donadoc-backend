import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@audit/audit.module';
import { DocumentosModule } from '@documentos/documentos.module';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { PlantillaFormato } from '../formatos/entities/plantilla-formato.entity';
import { Informe } from './entities/informe.entity';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlantillaFormato, Informe, Organizacion]), AuditModule, DocumentosModule],
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}
