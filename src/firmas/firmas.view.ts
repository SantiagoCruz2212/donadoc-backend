import { Firma } from './entities/firma.entity';

/** a***@dominio.com: la pantalla no necesita el correo completo del firmante. */
export function enmascararCorreo(correo: string | null): string | null {
  if (!correo) return null;
  const [usuario, dominio] = correo.split('@');
  return `${usuario.slice(0, 1)}***@${dominio}`;
}

export class FirmaVista {
  id: string;
  documentoId: string;
  firmanteNombre: string;
  firmanteRol: string;
  firmanteCorreo: string | null;
  orden: number;
  /** PENDIENTE o FIRMADA. */
  estado: string;
  firmadoEn: Date | null;
  /** Cómo se verificó la identidad (OTP_CORREO). */
  proveedor: string | null;
  hashFirma: string | null;
}

export function toFirmaVista(f: Firma): FirmaVista {
  return {
    id: f.id, documentoId: f.documentoId, firmanteNombre: f.firmanteNombre, firmanteRol: f.firmanteRol,
    firmanteCorreo: enmascararCorreo(f.firmanteCorreo), orden: f.orden, estado: f.estado, firmadoEn: f.firmadoEn,
    proveedor: f.proveedor, hashFirma: f.hashFirma,
  };
}

export class VerificacionFirmaVista {
  /** true solo si el documento no cambió y el sello de la firma coincide. */
  valida: boolean;
  /** Motivos cuando no es válida. */
  motivos: string[];
  firmanteNombre: string;
  firmanteRol: string;
  firmadoEn: Date | null;
  proveedor: string | null;
}
