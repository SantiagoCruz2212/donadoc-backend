import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '@audit/audit.service';
import { CasosService } from '@casos/casos.service';
import { AuthUser } from '@common/types/auth-user';
import { DecidirSugerenciaDto } from './dto/ia.dto';
import { ExtraccionIa } from './entities/extraccion-ia.entity';
import { SugerenciaIa } from './entities/sugerencia-ia.entity';
import { SugerenciaVista, toSugerenciaVista } from './ia.view';

/** Revisión humana: la IA propone, la persona decide. */
@Injectable()
export class SugerenciasService {
  constructor(
    @InjectRepository(SugerenciaIa) private readonly sugerencias: Repository<SugerenciaIa>,
    @InjectRepository(ExtraccionIa) private readonly extracciones: Repository<ExtraccionIa>,
    private readonly casos: CasosService,
    private readonly audit: AuditService,
  ) {}

  async decidir(user: AuthUser, id: string, dto: DecidirSugerenciaDto): Promise<SugerenciaVista> {
    const s = await this.sugerencias.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Sugerencia no encontrada');
    const ext = await this.extracciones.findOne({ where: { id: s.extraccionId } });
    if (!ext) throw new NotFoundException('Sugerencia no encontrada');
    await this.casos.obtenerEntidad(user, ext.casoId); // un caso de otra organización aparece como "no encontrado"
    if (s.decision !== 'PENDIENTE') throw new ConflictException('La sugerencia ya fue revisada');
    if (dto.decision === 'MODIFICADA' && !dto.valorFinal?.trim()) {
      throw new BadRequestException({
        message: 'Datos inválidos',
        error: [{ property: 'valorFinal', constraints: { required: 'valorFinal es obligatorio cuando la decisión es MODIFICADA' } }],
      });
    }
    const antes = { decision: s.decision, valorFinal: s.valorFinal };
    s.decision = dto.decision;
    s.valorFinal = dto.decision === 'ACEPTADA' ? s.valorSugerido : dto.decision === 'MODIFICADA' ? (dto.valorFinal as string).trim() : null;
    s.decididoPor = user.userId;
    s.decididoEn = new Date();
    await this.sugerencias.save(s);
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'sugerencia_ia', entidadId: s.id, accion: 'EDITAR', valorAnterior: antes, valorNuevo: { decision: s.decision, valorFinal: s.valorFinal } });
    return toSugerenciaVista(s);
  }
}
