import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@audit/audit.module';
import { CasosController } from './casos.controller';
import { CasosService } from './casos.service';
import { Caso } from './entities/caso.entity';
import { ComponenteCaso } from './entities/componente-caso.entity';
import { Donante } from './entities/donante.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Caso, Donante, ComponenteCaso]), AuditModule],
  controllers: [CasosController],
  providers: [CasosService],
  exports: [CasosService],
})
export class CasosModule {}
