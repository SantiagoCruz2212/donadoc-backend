import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@audit/audit.module';
import { CasosModule } from '@casos/casos.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { Documento } from './entities/documento.entity';
import { Almacenamiento } from './storage/almacenamiento';
import { AlmacenamientoLocal } from './storage/almacenamiento-local';
import { AlmacenamientoSupabase } from './storage/almacenamiento-supabase';

@Module({
  imports: [TypeOrmModule.forFeature([Documento]), CasosModule, AuditModule],
  controllers: [DocumentosController],
  providers: [DocumentosService, {
      provide: Almacenamiento,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): Almacenamiento =>
        cfg.get<string>('STORAGE_PROVIDER') === 'supabase'
          ? new AlmacenamientoSupabase(cfg.get<string>('SUPABASE_URL') as string, cfg.get<string>('SUPABASE_SERVICE_KEY') as string, cfg.get<string>('SUPABASE_BUCKET') as string)
          : new AlmacenamientoLocal(cfg),
    }],
  exports: [DocumentosService, Almacenamiento],
})
export class DocumentosModule {}
