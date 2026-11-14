import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '@audit/audit.service';
import { AuthUser } from '@common/types/auth-user';
import { metaDePagina, offsetDe } from '@common/pagination/pagination';
import { CasoVista, ComponenteVista, toCasoVista, toComponenteVista } from './casos.view';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CrearComponenteDto } from './dto/componente.dto';
import { CrearCasoDto } from './dto/crear-caso.dto';
import { ListarCasosQuery } from './dto/listar-casos.query';
import { Caso } from './entities/caso.entity';
import { ComponenteCaso } from './entities/componente-caso.entity';
import { Donante } from './entities/donante.entity';

/** Estados siguientes permitidos desde cada estado del caso. */
export const TRANSICIONES: Record<string, string[]> = {
  BORRADOR: ['EN_CURSO', 'CONTRAINDICADO'],
  EN_CURSO: ['FIRMADO', 'CONTRAINDICADO'],
  FIRMADO: ['CERRADO'],
  CERRADO: [],
  CONTRAINDICADO: [],
};

@Injectable()
export class CasosService {
  constructor(
    @InjectRepository(Caso) private readonly casos: Repository<Caso>,
    @InjectRepository(ComponenteCaso) private readonly componentes: Repository<ComponenteCaso>,
    private readonly ds: DataSource,
    private readonly audit: AuditService,
  ) {}

  /** Crea el donante (o reutiliza el existente de la organización) y el caso en una sola transacción. */
  async crear(user: AuthUser, dto: CrearCasoDto): Promise<CasoVista> {
    const orgId = user.organizacionId as string;
    const caso = await this.ds.transaction(async (m) => {
      let donante = await m.findOne(Donante, {
        where: { organizacionId: orgId, tipoDocumento: dto.donante.tipoDocumento, numeroDocumento: dto.donante.numeroDocumento },
      });
      if (!donante) {
        donante = await m.save(
          m.create(Donante, {
            organizacionId: orgId,
            tipoDocumento: dto.donante.tipoDocumento,
            numeroDocumento: dto.donante.numeroDocumento,
            nombres: dto.donante.nombres,
            apellidos: dto.donante.apellidos,
            sexo: dto.donante.sexo ?? null,
            fechaNacimiento: dto.donante.fechaNacimiento ?? null,
            eliminadoEn: null,
          }),
        );
      }
      const nuevo = await m.save(
        m.create(Caso, {
          organizacionId: orgId, donanteId: donante.id, creadoPor: user.userId, estado: 'BORRADOR',
          tipoDonante: dto.tipoDonante ?? null, muerteViolenta: dto.muerteViolenta ?? false, causaMuerte: null, eliminadoEn: null,
        }),
      );
      nuevo.donante = donante;
      return nuevo;
    });
    await this.audit.log({ organizacionId: orgId, usuarioId: user.userId, entidad: 'caso', entidadId: caso.id, accion: 'CREAR', valorNuevo: { estado: caso.estado } });
    return toCasoVista(caso);
  }

  async listar(user: AuthUser, q: ListarCasosQuery): Promise<{ items: CasoVista[]; meta: Record<string, number> }> {
    // Con skip/take TypeORM exige nombres de propiedad (no de columna) en where y orderBy.
    const qb = this.casos
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.donante', 'd')
      .where('c.organizacionId = :org AND c.eliminadoEn IS NULL', { org: user.organizacionId })
      .orderBy('c.creadoEn', 'DESC')
      .skip(offsetDe(q))
      .take(q.pageSize);
    if (q.estado) qb.andWhere('c.estado = :estado', { estado: q.estado });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(toCasoVista), meta: metaDePagina(q, total) };
  }

  /** Único punto donde se aplica el alcance por organización: un caso ajeno es simplemente "no encontrado". */
  async obtenerEntidad(user: AuthUser, id: string): Promise<Caso> {
    const caso = await this.casos.findOne({ where: { id, organizacionId: user.organizacionId as string }, relations: ['donante'] });
    if (!caso || caso.eliminadoEn) throw new NotFoundException('Caso no encontrado');
    return caso;
  }

  async obtener(user: AuthUser, id: string): Promise<CasoVista> {
    return toCasoVista(await this.obtenerEntidad(user, id));
  }

  /** Cambia el estado del caso siguiendo las transiciones permitidas; deja el estado anterior y el nuevo en la auditoría. */
  async cambiarEstado(user: AuthUser, id: string, dto: CambiarEstadoDto): Promise<CasoVista> {
    const caso = await this.obtenerEntidad(user, id);
    if (!(TRANSICIONES[caso.estado] ?? []).includes(dto.estado)) {
      throw new ConflictException(`No se puede pasar de ${caso.estado} a ${dto.estado}`);
    }
    if (dto.estado === 'CONTRAINDICADO' && !dto.causaContraindicacion?.trim()) {
      throw new BadRequestException('Indique la causa de la contraindicación');
    }
    const anterior = caso.estado;
    caso.estado = dto.estado;
    if (dto.estado === 'CONTRAINDICADO') caso.causaContraindicacion = dto.causaContraindicacion?.trim() ?? null;
    await this.casos.save(caso);
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'caso', entidadId: id, accion: 'EDITAR', valorAnterior: { estado: anterior }, valorNuevo: { estado: caso.estado } });
    return toCasoVista(caso);
  }

  async agregarComponente(user: AuthUser, casoId: string, dto: CrearComponenteDto): Promise<ComponenteVista> {
    await this.obtenerEntidad(user, casoId);
    if (!dto.rescatado && !dto.causaNoRescate?.trim()) throw new BadRequestException('Indique la causa por la que no se rescató');
    const c = await this.componentes.save(
      this.componentes.create({
        casoId, tipoComponente: dto.tipoComponente, rescatado: dto.rescatado, causaNoRescate: dto.rescatado ? null : (dto.causaNoRescate?.trim() ?? null),
        solucionPreservacion: dto.solucionPreservacion ?? null, cantidadMl: dto.cantidadMl ?? null, horaRegistro: new Date(),
      }),
    );
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'componente', entidadId: c.id, accion: 'CREAR', valorNuevo: { casoId, tipo: c.tipoComponente, rescatado: c.rescatado } });
    return toComponenteVista(c);
  }

  async listarComponentes(user: AuthUser, casoId: string): Promise<ComponenteVista[]> {
    await this.obtenerEntidad(user, casoId);
    return (await this.componentes.find({ where: { casoId }, order: { horaRegistro: 'ASC' } })).map(toComponenteVista);
  }

  /** Borrado lógico: el caso deja de listarse pero queda en la base y en la auditoría. Solo borradores o contraindicados. */
  async eliminar(user: AuthUser, id: string): Promise<void> {
    const caso = await this.obtenerEntidad(user, id);
    if (!['BORRADOR', 'CONTRAINDICADO'].includes(caso.estado)) {
      throw new ConflictException('Solo se pueden eliminar casos en borrador o contraindicados');
    }
    await this.casos.update({ id }, { eliminadoEn: new Date() });
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'caso', entidadId: id, accion: 'ELIMINAR', valorAnterior: { estado: caso.estado } });
  }
}
