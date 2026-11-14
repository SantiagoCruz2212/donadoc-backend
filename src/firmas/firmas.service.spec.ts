import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import { FirmasService, selloFirma } from './firmas.service';
import { enmascararCorreo } from './firmas.view';

const HASH = 'a'.repeat(64);
const user = { userId: 'u1', organizacionId: 'o1', rol: 'OPERADOR' };

describe('selloFirma', () => {
  it('es determinista y cambia si cambia cualquiera de sus partes', () => {
    const t = new Date('2026-11-08T15:00:00Z');
    const base = selloFirma(HASH, 'f1', 'Ana@X.com', t, 'OTP_CORREO');
    expect(base).toBe(selloFirma(HASH, 'f1', 'ana@x.com', t, 'OTP_CORREO')); // el correo no distingue mayúsculas
    expect(selloFirma('b'.repeat(64), 'f1', 'ana@x.com', t, 'OTP_CORREO')).not.toBe(base);
    expect(selloFirma(HASH, 'f1', 'ana@x.com', new Date('2026-11-08T15:00:01Z'), 'OTP_CORREO')).not.toBe(base);
  });
});

describe('enmascararCorreo', () => {
  it('oculta el usuario del correo', () => {
    expect(enmascararCorreo('maria.perez@correo.com')).toBe('m***@correo.com');
    expect(enmascararCorreo(null)).toBeNull();
  });
});

describe('FirmasService', () => {
  function crear(doc: Record<string, unknown>, firma: Record<string, unknown>, opciones: { verificar?: boolean; pendientes?: number; archivo?: Buffer } = {}) {
    const firmas = { findOne: jest.fn(async () => firma), save: jest.fn(async (f) => f), count: jest.fn(async () => opciones.pendientes ?? 0) };
    const docs = { findOne: jest.fn(async () => doc), update: jest.fn(async () => undefined) };
    const casos = { obtenerEntidad: jest.fn(async () => ({})) };
    const proveedor = { nombre: 'OTP_CORREO', iniciar: jest.fn(async () => true), verificar: jest.fn(async () => opciones.verificar ?? true) };
    const almacenamiento = { get: jest.fn(async () => opciones.archivo ?? Buffer.from('')) };
    const audit = { log: jest.fn(async () => undefined) };
    const svc = new FirmasService(firmas as never, docs as never, casos as never, proveedor as never, almacenamiento as never, audit as never);
    return { svc, firmas, docs, proveedor, audit };
  }

  it('al verificar un código correcto sella la firma sobre el hash del PDF y firma el documento si no quedan pendientes', async () => {
    const firma = { id: 'f1', documentoId: 'd1', estado: 'PENDIENTE', firmanteCorreo: 'ana@x.com' };
    const { svc, docs, audit } = crear({ id: 'd1', casoId: 'c1', hashSha256: HASH, rutaArchivo: 'k' }, firma);
    const v = await svc.verificar(user, 'f1', '123456', '10.0.0.1');
    expect(v.estado).toBe('FIRMADA');
    expect(firma).toMatchObject({ documentoHash: HASH, proveedor: 'OTP_CORREO', verificadaIp: '10.0.0.1' });
    expect(docs.update).toHaveBeenCalledWith({ id: 'd1' }, { estado: 'FIRMADO' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'FIRMAR' }));
  });

  it('con firmas pendientes el documento sigue sin firmarse', async () => {
    const { svc, docs } = crear({ id: 'd1', casoId: 'c1', hashSha256: HASH }, { id: 'f1', documentoId: 'd1', estado: 'PENDIENTE', firmanteCorreo: 'a@x.com' }, { pendientes: 1 });
    await svc.verificar(user, 'f1', '123456');
    expect(docs.update).not.toHaveBeenCalled();
  });

  it('un código incorrecto no firma y deja constancia del intento', async () => {
    const firma = { id: 'f1', documentoId: 'd1', estado: 'PENDIENTE', firmanteCorreo: 'a@x.com' };
    const { svc, audit } = crear({ id: 'd1', casoId: 'c1', hashSha256: HASH }, firma, { verificar: false });
    await expect(svc.verificar(user, 'f1', '000000')).rejects.toThrow('Código inválido o vencido');
    expect(firma.estado).toBe('PENDIENTE');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'FIRMA_FALLIDA' }));
  });

  it('no se firma dos veces', async () => {
    const { svc } = crear({ id: 'd1', casoId: 'c1', hashSha256: HASH }, { id: 'f1', documentoId: 'd1', estado: 'FIRMADA' });
    await expect(svc.verificar(user, 'f1', '123456')).rejects.toBeInstanceOf(ConflictException);
  });

  it('solo admite firmantes en documentos completos y aún sin firmar', async () => {
    const dto = { firmanteNombre: 'Ana', firmanteRol: 'FAMILIAR', firmanteCorreo: 'a@x.com' };
    await expect(crear({ id: 'd1', casoId: 'c1', estado: 'BORRADOR' }, {}).svc.crear(user, 'c1', 'd1', dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(crear({ id: 'd1', casoId: 'c1', estado: 'FIRMADO', hashSha256: HASH }, {}).svc.crear(user, 'c1', 'd1', dto)).rejects.toBeInstanceOf(ConflictException);
  });

  describe('verificarIntegridad', () => {
    const pdf = Buffer.from('contenido del pdf');
    const hashPdf = createHash('sha256').update(pdf).digest('hex');
    const firmadoEn = new Date('2026-11-08T15:00:00Z');
    const firmaValida = () => ({
      id: 'f1', documentoId: 'd1', estado: 'FIRMADA', firmanteCorreo: 'a@x.com', firmadoEn, proveedor: 'OTP_CORREO', documentoHash: hashPdf,
      hashFirma: selloFirma(hashPdf, 'f1', 'a@x.com', firmadoEn, 'OTP_CORREO'), firmanteNombre: 'Ana', firmanteRol: 'FAMILIAR',
    });

    it('es válida cuando el documento y el sello no cambiaron', async () => {
      const { svc } = crear({ id: 'd1', casoId: 'c1', hashSha256: hashPdf, rutaArchivo: 'k' }, firmaValida(), { archivo: pdf });
      expect(await svc.verificarIntegridad(user, 'f1')).toMatchObject({ valida: true, motivos: [] });
    });

    it('detecta que el archivo almacenado fue alterado después de la firma', async () => {
      const { svc } = crear({ id: 'd1', casoId: 'c1', hashSha256: hashPdf, rutaArchivo: 'k' }, firmaValida(), { archivo: Buffer.from('alterado') });
      const r = await svc.verificarIntegridad(user, 'f1');
      expect(r.valida).toBe(false);
      expect(r.motivos).toContain('El archivo almacenado no coincide con el que se firmó');
    });

    it('detecta un sello manipulado en la base de datos', async () => {
      const f = { ...firmaValida(), hashFirma: 'f'.repeat(64) };
      const { svc } = crear({ id: 'd1', casoId: 'c1', hashSha256: hashPdf, rutaArchivo: 'k' }, f, { archivo: pdf });
      expect((await svc.verificarIntegridad(user, 'f1')).motivos).toContain('El sello de la firma no coincide');
    });
  });
});
