import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caso } from '@casos/entities/caso.entity';
import { ComponenteCaso } from '@casos/entities/componente-caso.entity';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { RedController } from './red.controller';
import { RedService } from './red.service';

// Registra solo Caso, ComponenteCaso y Organizacion: a propósito NO registra Donante.
@Module({
  imports: [TypeOrmModule.forFeature([Caso, ComponenteCaso, Organizacion])],
  controllers: [RedController],
  providers: [RedService],
})
export class RedModule {}
