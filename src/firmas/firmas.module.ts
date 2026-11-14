import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@audit/audit.module';
import { CasosModule } from '@casos/casos.module';
import { DocumentosModule } from '@documentos/documentos.module';
import { Documento } from '@documentos/entities/documento.entity';
import { OtpModule } from '@otp/otp.module';
import { Firma } from './entities/firma.entity';
import { FirmasController } from './firmas.controller';
import { FirmasService } from './firmas.service';
import { OtpCorreoProveedor } from './otp-correo.proveedor';
import { ProveedorFirma } from './proveedor-firma';

@Module({
  imports: [TypeOrmModule.forFeature([Firma, Documento]), AuditModule, CasosModule, DocumentosModule, OtpModule],
  controllers: [FirmasController],
  providers: [FirmasService, { provide: ProveedorFirma, useClass: OtpCorreoProveedor }],
})
export class FirmasModule {}
