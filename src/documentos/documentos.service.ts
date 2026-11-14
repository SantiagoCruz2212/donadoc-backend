import { createHash, randomUUID } from 'crypto';
import * as path from 'path';
import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import pdfParse from 'pdf-parse';
import { Repository } from 'typeorm';
import { AuditService } from '@audit/audit.service';
import { CasosService } from '@casos/casos.service';
import { AuthUser } from '@common/types/auth-user';
import { DocumentoVista, toDocumentoVista } from './documentos.view';
import { Documento } from './entities/documento.entity';
import { Almacenamiento } from './storage/almacenamiento';

const PERMITIDOS: Record<string, string[]> = { '.pdf': ['application/pdf'], '.txt': ['text/plain'] };
/** Límite de texto enviado a la IA: reduce tokens y contexto (uso responsable de tokens). */
export const MAX_CARACTERES_IA = 12000;

@Injectable()
export class DocumentosService {
  constructor(
    @InjectRepository(Documento) private readonly docs: Repository<Documento>,
    private readonly casos: CasosService,
    private readonly almacenamiento: Almacenamiento,
    private readonly audit: AuditService,
  ) {}

  async subirArchivo(user: AuthUser, casoId: string, file: Express.Multer.File | undefined): Promise<DocumentoVista> {
    if (!file) throw new BadRequestException('Falta el archivo (campo "archivo")');
    const ext = path.extname(file.originalname).toLowerCase();
    if (!PERMITIDOS[ext] || !PERMITIDOS[ext].includes(file.mimetype)) {
      throw new UnprocessableEntityException('Solo se aceptan archivos .pdf o .txt');
    }
    return this.guardar(user, casoId, file.originalname, file.buffer);
  }

  async subirTexto(user: AuthUser, casoId: string, texto: string): Promise<DocumentoVista> {
    return this.guardar(user, casoId, 'historia-pegada.txt', Buffer.from(texto, 'utf8'));
  }

  private async guardar(user: AuthUser, casoId: string, nombre: string, data: Buffer): Promise<DocumentoVista> {
    await this.casos.obtenerEntidad(user, casoId); // 404 si el caso no es de la organización
    const seguro = nombre.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
    const key = `${casoId}/${randomUUID()}-${seguro}`;
    await this.almacenamiento.put(key, data);
    const doc = await this.docs.save(
      this.docs.create({
        casoId, tipo: 'HISTORIA_EXTERNA', estado: 'COMPLETO', version: 1, anonimizado: false,
        rutaArchivo: key, hashSha256: createHash('sha256').update(data).digest('hex'), eliminadoEn: null,
      }),
    );
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'documento', entidadId: doc.id, accion: 'CREAR', valorNuevo: { tipo: doc.tipo, hash: doc.hashSha256 } });
    return toDocumentoVista(doc);
  }

  async listar(user: AuthUser, casoId: string): Promise<DocumentoVista[]> {
    await this.casos.obtenerEntidad(user, casoId);
    const lista = await this.docs.find({ where: { casoId }, order: { creadoEn: 'DESC' } });
    return lista.filter((d) => !d.eliminadoEn).map(toDocumentoVista);
  }

  async obtenerDeCaso(user: AuthUser, casoId: string, documentoId: string): Promise<Documento> {
    await this.casos.obtenerEntidad(user, casoId);
    const doc = await this.docs.findOne({ where: { id: documentoId, casoId } });
    if (!doc || doc.eliminadoEn) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  /** Lee el archivo del almacenamiento y devuelve su texto (PDF o texto plano), recortado a MAX_CARACTERES_IA. */
  async leerTexto(doc: Documento): Promise<string> {
    if (!doc.rutaArchivo) throw new NotFoundException('El documento no tiene archivo');
    const buf = await this.almacenamiento.get(doc.rutaArchivo);
    const texto = doc.rutaArchivo.toLowerCase().endsWith('.pdf') ? (await pdfParse(buf)).text : buf.toString('utf8');
    return texto.replace(/\s+\n/g, '\n').trim().slice(0, MAX_CARACTERES_IA);
  }
}
