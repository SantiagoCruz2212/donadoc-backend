import { createHash } from 'crypto';
import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '@audit/audit.service';
import { AuthUser } from '@common/types/auth-user';
import { aZonaDeNegocio } from '@common/interceptors/zoned-dates.interceptor';
import { metaDePagina, offsetDe } from '@common/pagination/pagination';
import { Almacenamiento } from '@documentos/storage/almacenamiento';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { PlantillaFormato } from '../formatos/entities/plantilla-formato.entity';
import { DatosFormato, normalizarDatos, validarDatos } from '../formatos/esquema';
import { PlantillaVista, toPlantillaVista } from '../formatos/formatos.view';
import { generarPdf } from '../formatos/pdf-formato';
import { calcularTablas } from '../formatos/tablas';
import { GuardarInformeDto } from './dto/guardar-informe.dto';
import { ListarInformesQuery } from './dto/listar-informes.query';
import { Informe } from './entities/informe.entity';
import { InformeResumen, InformeVista } from './informes.view';

const PERIODO: Record<'MENSUAL' | 'SEMANAL', RegExp> = {
  MENSUAL: /^\d{4}-(0[1-9]|1[0-2])$/,
  SEMANAL: /^\d{4}-S(0[1-9]|[1-4]\d|5[0-3])$/,
};

/**
 * Informes periódicos por organización (p. ej. el mensual de un banco de tejidos). Todo se acota a la organización del
 * usuario: el informe de otra organización es simplemente «no encontrado».
 */
@Injectable()
export class InformesService {
  constructor(
    @InjectRepository(PlantillaFormato) private readonly plantillas: Repository<PlantillaFormato>,
    @InjectRepository(Informe) private readonly informes: Repository<Informe>,
    @InjectRepository(Organizacion) private readonly orgs: Repository<Organizacion>,
    private readonly almacenamiento: Almacenamiento,
    private readonly audit: AuditService,
    private readonly cfg: ConfigService,
  ) {}

  private async vigentes(): Promise<PlantillaFormato[]> {
    const todas = await this.plantillas.find({ where: { vigente: true }, order: { codigo: 'ASC', creadoEn: 'DESC' } });
    const vistos = new Set<string>();
    return todas.filter((p) => p.esquema.ambito === 'INFORME').filter((p) => (vistos.has(p.codigo) ? false : vistos.add(p.codigo)));
  }

  /** Informes disponibles para diligenciar. */
  async listarPlantillas(): Promise<PlantillaVista[]> {
    return (await this.vigentes()).map(toPlantillaVista);
  }

  private async plantilla(codigo: string, periodo: string): Promise<PlantillaFormato> {
    const p = (await this.vigentes()).find((x) => x.codigo === codigo);
    if (!p) throw new NotFoundException('Informe no encontrado');
    const forma = p.esquema.periodicidad ?? 'MENSUAL';
    if (!PERIODO[forma].test(periodo)) {
      throw new BadRequestException(forma === 'MENSUAL' ? 'El periodo debe tener la forma AAAA-MM (p. ej. 2026-10)' : 'El periodo debe tener la forma AAAA-Sww (p. ej. 2026-S42)');
    }
    return p;
  }

  async listar(user: AuthUser, q: ListarInformesQuery): Promise<{ items: InformeResumen[]; meta: Record<string, number> }> {
    const plantillas = await this.vigentes();
    const porId = new Map(plantillas.map((p) => [p.id, p]));
    const ids = q.codigo ? plantillas.filter((p) => p.codigo === q.codigo).map((p) => p.id) : [...porId.keys()];
    if (!ids.length) return { items: [], meta: metaDePagina(q, 0) };
    const [items, total] = await this.informes.findAndCount({
      where: { organizacionId: user.organizacionId as string, plantillaId: In(ids) },
      order: { periodo: 'DESC', actualizadoEn: 'DESC' },
      skip: offsetDe(q),
      take: q.pageSize,
    });
    return {
      items: items.map((i) => ({
        id: i.id, codigo: porId.get(i.plantillaId)?.codigo ?? '', nombre: porId.get(i.plantillaId)?.nombre ?? '', periodo: i.periodo,
        estado: i.estado, version: i.version, actualizadoEn: i.actualizadoEn,
      })),
      meta: metaDePagina(q, total),
    };
  }

  private buscar(user: AuthUser, plantillaId: string, periodo: string): Promise<Informe | null> {
    return this.informes.findOne({ where: { organizacionId: user.organizacionId as string, plantillaId, periodo } });
  }

  async obtener(user: AuthUser, codigo: string, periodo: string): Promise<InformeVista> {
    const plantilla = await this.plantilla(codigo, periodo);
    const inf = await this.buscar(user, plantilla.id, periodo);
    return {
      plantilla: toPlantillaVista(plantilla),
      periodo,
      estado: inf?.estado === 'BORRADOR' || inf?.estado === 'COMPLETO' ? inf.estado : 'SIN_INICIAR',
      version: inf?.version ?? 0,
      hashSha256: inf?.hashSha256 ?? null,
      datos: inf?.datos ?? null,
      calculados: calcularTablas(plantilla.esquema, (inf?.datos ?? null) as DatosFormato | null),
      actualizadoEn: inf?.actualizadoEn ?? null,
    };
  }

  async guardar(user: AuthUser, codigo: string, periodo: string, dto: GuardarInformeDto): Promise<InformeVista> {
    const plantilla = await this.plantilla(codigo, periodo);
    const completo = dto.completo === true;
    const datos = normalizarDatos(dto.datos) as DatosFormato;
    const errores = validarDatos(plantilla.esquema, datos, completo);
    if (Object.keys(errores).length) {
      throw new UnprocessableEntityException({
        message: 'Datos inválidos',
        error: Object.entries(errores).map(([property, mensaje]) => ({ property, constraints: { informe: mensaje } })),
      });
    }

    let inf = await this.buscar(user, plantilla.id, periodo);
    const anterior = (inf?.datos ?? {}) as Record<string, unknown>;
    const version = (inf?.version ?? 0) + 1;

    let rutaArchivo: string | null = null;
    let hash: string | null = null;
    if (completo) {
      const org = await this.orgs.findOne({ where: { id: user.organizacionId as string } });
      const pdf = await generarPdf(plantilla.esquema, datos, {
        nombreFormato: `${plantilla.nombre} · ${periodo}`,
        version,
        institucion: org?.nombre ?? '',
        generadoEn: aZonaDeNegocio(new Date(), this.cfg.get<string>('APP_TIMEZONE') ?? 'America/Bogota').slice(0, 16).replace('T', ' '),
      });
      rutaArchivo = `informes/${user.organizacionId}/${codigo}-${periodo}-v${version}.pdf`;
      await this.almacenamiento.put(rutaArchivo, pdf);
      hash = createHash('sha256').update(pdf).digest('hex');
    }

    const nuevo = !inf;
    inf = await this.informes.save(
      this.informes.create({
        ...(inf ?? { creadoPor: user.userId }),
        organizacionId: user.organizacionId as string, plantillaId: plantilla.id, periodo,
        estado: completo ? 'COMPLETO' : 'BORRADOR', version, datos, rutaArchivo, hashSha256: hash, actualizadoPor: user.userId,
      }),
    );

    // La auditoría guarda QUÉ campos cambiaron y una huella de los datos, no los valores.
    const cambiados = Object.keys({ ...anterior, ...datos }).filter((k) => JSON.stringify(anterior[k]) !== JSON.stringify(datos[k]));
    await this.audit.log({
      organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'informe', entidadId: inf.id, accion: nuevo ? 'CREAR' : 'EDITAR',
      valorAnterior: { version: version - 1 },
      valorNuevo: { codigo, periodo, version, estado: inf.estado, camposCambiados: cambiados, hashDatos: createHash('sha256').update(JSON.stringify(datos)).digest('hex') },
    });
    return this.obtener(user, codigo, periodo);
  }

  async descargarPdf(user: AuthUser, codigo: string, periodo: string): Promise<{ nombre: string; contenido: Buffer }> {
    const plantilla = await this.plantilla(codigo, periodo);
    const inf = await this.buscar(user, plantilla.id, periodo);
    if (!inf?.rutaArchivo) throw new NotFoundException('El informe aún no está completo: no hay PDF para descargar');
    return { nombre: `${codigo}-${periodo}-v${inf.version}.pdf`, contenido: await this.almacenamiento.get(inf.rutaArchivo) };
  }
}
