import { Documento } from '@documentos/entities/documento.entity';
import { Firma } from './entities/firma.entity';

/**
 * Puerto del proveedor de verificación de firma. El servicio de firmas no sabe cómo se comprueba la identidad:
 * hoy hay un adaptador gratuito (código de un solo uso al correo del firmante); un proveedor externo gratuito de
 * código abierto (p. ej. Documenso o DocuSeal autoalojados) se agrega como otro adaptador sin cambiar el servicio.
 */
export abstract class ProveedorFirma {
  /** Identificador que queda guardado en la firma (para saber cómo se verificó). */
  abstract readonly nombre: string;
  /** Inicia la verificación (por ejemplo, envía el código). false si no se pudo iniciar o hay que esperar. */
  abstract iniciar(firma: Firma, documento: Documento): Promise<boolean>;
  /** Comprueba la respuesta del firmante. */
  abstract verificar(firma: Firma, respuesta: string): Promise<boolean>;
}
