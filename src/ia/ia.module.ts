import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@audit/audit.module';
import { CasosModule } from '@casos/casos.module';
import { DocumentosModule } from '@documentos/documentos.module';
import { GeminiExtractor } from './adapters/gemini.extractor';
import { GroqExtractor } from './adapters/groq.extractor';
import { MockExtractor } from './adapters/mock.extractor';
import { OllamaExtractor } from './adapters/ollama.extractor';
import { ExtraccionIa } from './entities/extraccion-ia.entity';
import { SugerenciaIa } from './entities/sugerencia-ia.entity';
import { ExtraccionesIaController } from './extracciones-ia.controller';
import { ExtraerConIaService } from './extraer-con-ia.service';
import { ExtractorIa } from './ports/extractor-ia.port';
import { SugerenciasIaController } from './sugerencias-ia.controller';
import { SugerenciasService } from './sugerencias.service';

/** El proveedor se elige por configuración (EXTRACTOR_IA_PROVIDER): sustituirlo no toca el caso de uso. */
export function crearExtractor(cfg: ConfigService): ExtractorIa {
  switch (cfg.get<string>('EXTRACTOR_IA_PROVIDER')) {
    case 'ollama':
      return new OllamaExtractor(cfg.get<string>('OLLAMA_URL') as string, cfg.get<string>('OLLAMA_MODEL') as string);
    case 'groq':
      return new GroqExtractor(cfg.get<string>('GROQ_API_KEY') ?? '', cfg.get<string>('GROQ_MODEL') as string);
    case 'mock':
      return new MockExtractor();
    default:
      return new GeminiExtractor(cfg.get<string>('GEMINI_API_KEY') ?? '', cfg.get<string>('GEMINI_MODEL') as string);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ExtraccionIa, SugerenciaIa]), CasosModule, DocumentosModule, AuditModule],
  controllers: [ExtraccionesIaController, SugerenciasIaController],
  providers: [
    ExtraerConIaService,
    SugerenciasService,
    { provide: ExtractorIa, inject: [ConfigService], useFactory: crearExtractor },
  ],
})
export class IaModule {}
