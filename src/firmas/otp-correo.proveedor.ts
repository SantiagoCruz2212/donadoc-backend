import { Injectable } from '@nestjs/common';
import { Documento } from '@documentos/entities/documento.entity';
import { OtpService } from '@otp/otp.service';
import { Firma } from './entities/firma.entity';
import { ProveedorFirma } from './proveedor-firma';

const PROPOSITO = 'firma';

/**
 * Verificación gratuita: un código de un solo uso llega al correo que se registró para el firmante; quien lo conoce
 * demuestra controlar ese correo. Es una firma electrónica simple (identidad por posesión del correo + huella del
 * documento + traza), no una firma digital certificada: su validez para cada formato debe confirmarla el área jurídica.
 */
@Injectable()
export class OtpCorreoProveedor extends ProveedorFirma {
  readonly nombre = 'OTP_CORREO';

  constructor(private readonly otp: OtpService) {
    super();
  }

  iniciar(firma: Firma, documento: Documento): Promise<boolean> {
    if (!firma.firmanteCorreo) return Promise.resolve(false);
    const huella = (documento.hashSha256 ?? '').slice(0, 12);
    return this.otp.enviar(PROPOSITO, firma.id, firma.firmanteCorreo, 'Código para firmar un documento en DonaDoc', (codigo, min) =>
      `Hola ${firma.firmanteNombre}:\n\nSu código para firmar el documento (huella ${huella}) es ${codigo}.\nVence en ${min} minutos y solo sirve una vez.\nComparta este código únicamente con la persona que le está tomando la firma. Si usted no está firmando nada, ignore este mensaje.`,
    );
  }

  verificar(firma: Firma, respuesta: string): Promise<boolean> {
    return this.otp.verificar(PROPOSITO, firma.id, respuesta);
  }
}
