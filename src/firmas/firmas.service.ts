import { createHash } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '@audit/audit.service';
import { CasosService } from '@casos/casos.service';
import { AuthUser } from '@common/types/auth-user';
import { Documento } from '@documentos/entities/documento.entity';
import { Almacenamiento } from '@documentos/storage/almacenamiento';
import { CrearFirmaDto } from './dto/firma.dto';
import { Firma } from './entities/firma.entity';
import { FirmaVista, toFirmaVista, VerificacionFirmaVista } from './firmas.view';
import { ProveedorFirma } from './proveedor-firma';

/** Sello de una firma: liga el documento exacto, la firma, el firmante, el instante y el método de verificación. */
export function selloFirma(documentoHash: string, firmaId: string, correo: string, firmadoEn: Date, proveedor: string): string {
  return createHash('sha256').update([documentoHash, firmaId, correo.toLowerCase(), firmadoEn.toISOString(), proveedor].join('|')).digest('hex');
}

@Injectable()
export class FirmasService {
  constructor(
    @InjectRepository(Firma) private readonly firmas: Repository<Firma>,
    @InjectRepository(Documento) private readonly docs: Repository<Documento>,
    private readonly casos: CasosService,
    private readonly proveedor: ProveedorFirma,
    private readonly almacenamiento: Almacenamiento,
    private readonly audit: AuditService,
  ) {}

  /** Documento y firma de la organización del actor; lo ajeno es «no encontrado». */
  private async cargar(user: AuthUser, firmaId: string): Promise<{ firma: Firma; doc: Documento }> {
    const firma = await this.firmas.findOne({ where: { id: firmaId } });
    const doc = firma ? await this.docs.findOne({ where: { id: firma.documentoId } }) : null;
    if (!firma || !doc || doc.eliminadoEn) throw new NotFoundException('Firma no encontrada');
    await this.casos.obtenerEntidad(user, doc.casoId);
    return { firma, doc };
  }

  private async documentoDeCaso(user: AuthUser, casoId: string, documentoId: string): Promise<Documento> {
    await this.casos.obtenerEntidad(user, casoId);
    const doc = await this.docs.findOne({ where: { id: documentoId, casoId } });
    if (!doc || doc.eliminadoEn) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async crear(user: AuthUser, casoId: string, documentoId: string, dto: CrearFirmaDto): Promise<FirmaVista> {
    const doc = await this.documentoDeCaso(user, casoId, documentoId);
    if (doc.estado === 'FIRMADO') throw new ConflictException('El documento ya está firmado: no admite más firmantes');
    if (doc.estado !== 'COMPLETO' || !doc.hashSha256) throw new UnprocessableEntityException('Solo se pueden firmar documentos completos (con PDF generado)');
    const existentes = await this.firmas.count({ where: { documentoId } });
    const firma = await this.firmas.save(
      this.firmas.create({
        documentoId, firmanteNombre: dto.firmanteNombre.trim(), firmanteRol: dto.firmanteRol, firmanteCorreo: dto.firmanteCorreo.toLowerCase(),
        orden: existentes + 1, estado: 'PENDIENTE', firmadoEn: null, proveedor: null, documentoHash: null, hashFirma: null, verificadaIp: null,
      }),
    );
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'firma', entidadId: firma.id, accion: 'CREAR', valorNuevo: { documentoId, rol: firma.firmanteRol, orden: firma.orden } });
    return toFirmaVista(firma);
  }

  async listar(user: AuthUser, casoId: string, documentoId: string): Promise<FirmaVista[]> {
    await this.documentoDeCaso(user, casoId, documentoId);
    return (await this.firmas.find({ where: { documentoId }, order: { orden: 'ASC' } })).map(toFirmaVista);
  }

  /** Envía el código de verificación al firmante. Si hay una espera de reenvío activa, lo dice (es personal autenticado, no un anónimo). */
  async enviarCodigo(user: AuthUser, firmaId: string): Promise<void> {
    const { firma, doc } = await this.cargar(user, firmaId);
    if (firma.estado === 'FIRMADA') throw new ConflictException('Esta firma ya fue realizada');
    const enviado = await this.proveedor.iniciar(firma, doc);
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'firma', entidadId: firma.id, accion: 'FIRMA_CODIGO', valorNuevo: { enviado, proveedor: this.proveedor.nombre } });
    if (!enviado) throw new ConflictException('No se pudo enviar el código: espere un minuto antes de reenviarlo o revise el correo del firmante');
  }

  /** Verifica el código y, si es correcto, sella la firma vinculándola al hash del PDF. El documento queda FIRMADO al no haber firmas pendientes. */
  async verificar(user: AuthUser, firmaId: string, codigo: string, ip?: string): Promise<FirmaVista> {
    const { firma, doc } = await this.cargar(user, firmaId);
    if (firma.estado === 'FIRMADA') throw new ConflictException('Esta firma ya fue realizada');
    if (!doc.hashSha256) throw new UnprocessableEntityException('El documento no tiene PDF para firmar');
    if (!(await this.proveedor.verificar(firma, codigo))) {
      await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'firma', entidadId: firma.id, accion: 'FIRMA_FALLIDA', ip });
      throw new BadRequestException('Código inválido o vencido');
    }
    const ahora = new Date();
    firma.estado = 'FIRMADA';
    firma.firmadoEn = ahora;
    firma.proveedor = this.proveedor.nombre;
    firma.documentoHash = doc.hashSha256;
    firma.verificadaIp = ip ?? null;
    firma.hashFirma = selloFirma(doc.hashSha256, firma.id, firma.firmanteCorreo ?? '', ahora, firma.proveedor);
    await this.firmas.save(firma);

    const pendientes = await this.firmas.count({ where: { documentoId: doc.id, estado: 'PENDIENTE' } });
    if (pendientes === 0) await this.docs.update({ id: doc.id }, { estado: 'FIRMADO' });
    await this.audit.log({
      organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'firma', entidadId: firma.id, accion: 'FIRMAR', ip,
      valorNuevo: { documentoId: doc.id, proveedor: firma.proveedor, hashFirma: firma.hashFirma, documentoFirmado: pendientes === 0 },
    });
    return toFirmaVista(firma);
  }

  /** Comprueba que el documento no cambió desde la firma y que el sello coincide (integridad y no repudio básico). */
  async verificarIntegridad(user: AuthUser, firmaId: string): Promise<VerificacionFirmaVista> {
    const { firma, doc } = await this.cargar(user, firmaId);
    const motivos: string[] = [];
    if (firma.estado !== 'FIRMADA' || !firma.documentoHash || !firma.hashFirma || !firma.firmadoEn) {
      motivos.push('La firma aún no se ha realizado');
    } else {
      if (doc.hashSha256 !== firma.documentoHash) motivos.push('El documento cambió después de la firma');
      if (doc.rutaArchivo) {
        const actual = createHash('sha256').update(await this.almacenamiento.get(doc.rutaArchivo)).digest('hex');
        if (actual !== firma.documentoHash) motivos.push('El archivo almacenado no coincide con el que se firmó');
      } else {
        motivos.push('El documento no tiene archivo');
      }
      const esperado = selloFirma(firma.documentoHash, firma.id, firma.firmanteCorreo ?? '', firma.firmadoEn, firma.proveedor ?? '');
      if (esperado !== firma.hashFirma) motivos.push('El sello de la firma no coincide');
    }
    return { valida: motivos.length === 0, motivos, firmanteNombre: firma.firmanteNombre, firmanteRol: firma.firmanteRol, firmadoEn: firma.firmadoEn, proveedor: firma.proveedor };
  }
}
