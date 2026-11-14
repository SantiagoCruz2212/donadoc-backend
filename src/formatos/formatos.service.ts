import { createHash } from 'crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuditService } from '@audit/audit.service';
import { CasosService } from '@casos/casos.service';
import { Donante } from '@casos/entities/donante.entity';
import { AuthUser } from '@common/types/auth-user';
import { aZonaDeNegocio } from '@common/interceptors/zoned-dates.interceptor';
import { Documento } from '@documentos/entities/documento.entity';
import { Almacenamiento } from '@documentos/storage/almacenamiento';
import { SugerenciaIa } from '@ia/entities/sugerencia-ia.entity';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { PlantillaFormato } from './entities/plantilla-formato.entity';
import { DatosFormato, FuentesPrecarga, normalizarDatos, precargar, validarDatos } from './esquema';
import { FormularioVista, PlantillaVista, toPlantillaVista } from './formatos.view';
import { generarPdf } from './pdf-formato';
import { GuardarFormularioDto } from './dto/guardar-formulario.dto';

@Injectable()
export class FormatosService {
  constructor(
    @InjectRepository(PlantillaFormato) private readonly plantillas: Repository<PlantillaFormato>,
    @InjectRepository(Documento) private readonly docs: Repository<Documento>,
    @InjectRepository(SugerenciaIa) private readonly sugerencias: Repository<SugerenciaIa>,
    @InjectRepository(Organizacion) private readonly orgs: Repository<Organizacion>,
    private readonly casos: CasosService,
    private readonly almacenamiento: Almacenamiento,
    private readonly audit: AuditService,
    private readonly cfg: ConfigService,
  ) {}

  /** Plantillas vigentes (la versión más reciente de cada código). */
  async listar(): Promise<PlantillaVista[]> {
    const todas = await this.plantillas.find({ where: { vigente: true }, order: { codigo: 'ASC', creadoEn: 'DESC' } });
    const vistos = new Set<string>();
    return todas
      .filter((p) => p.esquema.ambito !== 'INFORME') // los informes periódicos se consultan en /informes
      .filter((p) => (vistos.has(p.codigo) ? false : vistos.add(p.codigo)))
      .map(toPlantillaVista);
  }

  private async plantillaVigente(codigo: string): Promise<PlantillaFormato> {
    const p = await this.plantillas.findOne({ where: { codigo, vigente: true }, order: { creadoEn: 'DESC' } });
    if (!p || p.esquema.ambito === 'INFORME') throw new NotFoundException('Formato no encontrado');
    return p;
  }

  private documentoDe(casoId: string, plantillaId: string): Promise<Documento | null> {
    return this.docs.findOne({ where: { casoId, plantillaId, eliminadoEn: IsNull() } });
  }

  /** Fuentes para precargar: donante, caso y la última decisión humana aceptada/modificada por campo de IA. */
  private async fuentes(casoId: string, donante: Donante, tipoDonante: string | null, causaMuerte: string | null): Promise<FuentesPrecarga> {
    const f: FuentesPrecarga = {
      'donante.nombres': donante.nombres,
      'donante.apellidos': donante.apellidos,
      'donante.nombreCompleto': `${donante.nombres} ${donante.apellidos}`,
      'donante.tipoDocumento': donante.tipoDocumento,
      'donante.numeroDocumento': donante.numeroDocumento,
      'donante.sexo': donante.sexo,
      'donante.fechaNacimiento': donante.fechaNacimiento,
      'caso.tipoDonante': tipoDonante,
      'caso.causaMuerte': causaMuerte,
    };
    const decididas = await this.sugerencias
      .createQueryBuilder('s')
      .innerJoin('s.extraccion', 'e')
      .where('e.casoId = :casoId AND s.decision IN (:...d) AND s.valorFinal IS NOT NULL', { casoId, d: ['ACEPTADA', 'MODIFICADA'] })
      .orderBy('s.decididoEn', 'DESC')
      .getMany();
    for (const s of decididas) if (!(`ia.${s.campo}` in f)) f[`ia.${s.campo}`] = s.valorFinal;
    return f;
  }

  async obtener(user: AuthUser, casoId: string, codigo: string): Promise<FormularioVista> {
    const plantilla = await this.plantillaVigente(codigo);
    const caso = await this.casos.obtenerEntidad(user, casoId);
    const doc = await this.documentoDe(casoId, plantilla.id);
    const fuentes = await this.fuentes(casoId, caso.donante, caso.tipoDonante, caso.causaMuerte);
    return {
      plantilla: toPlantillaVista(plantilla),
      estado: doc?.estado === 'BORRADOR' || doc?.estado === 'COMPLETO' || doc?.estado === 'FIRMADO' ? doc.estado : 'SIN_INICIAR',
      version: doc?.version ?? 0,
      documentoId: doc?.id ?? null,
      hashSha256: doc?.hashSha256 ?? null,
      datos: doc?.datos ?? null,
      precarga: precargar(plantilla.esquema, fuentes),
    };
  }

  async guardar(user: AuthUser, casoId: string, codigo: string, dto: GuardarFormularioDto): Promise<FormularioVista> {
    const plantilla = await this.plantillaVigente(codigo);
    await this.casos.obtenerEntidad(user, casoId);
    const completo = dto.completo === true;
    const datos = normalizarDatos(dto.datos) as DatosFormato;
    const errores = validarDatos(plantilla.esquema, datos, completo);
    if (Object.keys(errores).length) {
      throw new UnprocessableEntityException({
        message: 'Datos inválidos',
        error: Object.entries(errores).map(([property, mensaje]) => ({ property, constraints: { formato: mensaje } })),
      });
    }

    let doc = await this.documentoDe(casoId, plantilla.id);
    if (doc?.estado === 'FIRMADO') throw new ConflictException('El formato ya fue firmado y no se puede modificar');
    const anterior = (doc?.datos ?? {}) as Record<string, unknown>;
    const version = (doc?.version ?? 0) + 1;

    let rutaArchivo: string | null = null;
    let hash: string | null = null;
    if (completo) {
      const org = await this.orgs.findOne({ where: { id: user.organizacionId as string } });
      const pdf = await generarPdf(plantilla.esquema, datos, {
        nombreFormato: plantilla.nombre,
        version,
        institucion: org?.nombre ?? '',
        generadoEn: aZonaDeNegocio(new Date(), this.cfg.get<string>('APP_TIMEZONE') ?? 'America/Bogota').slice(0, 16).replace('T', ' '),
      });
      rutaArchivo = `${casoId}/formatos/${codigo}-v${version}.pdf`;
      await this.almacenamiento.put(rutaArchivo, pdf);
      hash = createHash('sha256').update(pdf).digest('hex');
    }

    doc = await this.docs.save(
      this.docs.create({
        ...(doc ?? {}),
        casoId, plantillaId: plantilla.id, tipo: 'FORMATO', estado: completo ? 'COMPLETO' : 'BORRADOR', version,
        anonimizado: false, datos, rutaArchivo, hashSha256: hash, eliminadoEn: null,
      }),
    );

    // La auditoría guarda QUÉ campos cambiaron y una huella de los datos, no los valores (pueden ser datos personales).
    const cambiados = Object.keys({ ...anterior, ...datos }).filter((k) => JSON.stringify(anterior[k]) !== JSON.stringify(datos[k]));
    await this.audit.log({
      organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'formato', entidadId: doc.id, accion: 'EDITAR',
      valorAnterior: { version: version - 1 },
      valorNuevo: { codigo, version, estado: doc.estado, camposCambiados: cambiados, hashDatos: createHash('sha256').update(JSON.stringify(datos)).digest('hex') },
    });
    return this.obtener(user, casoId, codigo);
  }

  async descargarPdf(user: AuthUser, casoId: string, codigo: string): Promise<{ nombre: string; contenido: Buffer }> {
    const plantilla = await this.plantillaVigente(codigo);
    await this.casos.obtenerEntidad(user, casoId);
    const doc = await this.documentoDe(casoId, plantilla.id);
    if (!doc?.rutaArchivo) throw new NotFoundException('El formato aún no está completo: no hay PDF para descargar');
    return { nombre: `${codigo}-v${doc.version}.pdf`, contenido: await this.almacenamiento.get(doc.rutaArchivo) };
  }
}
