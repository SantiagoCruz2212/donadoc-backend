import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(Usuario) private readonly repo: Repository<Usuario>) {}

  /** Usuario activo y no borrado de una organización, buscado por correo sin distinguir mayúsculas. */
  findActiveByEmail(organizacionId: string, correo: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .where('u.organizacionId = :organizacionId AND LOWER(u.correo) = LOWER(:correo)', { organizacionId, correo })
      .andWhere('u.eliminadoEn IS NULL AND u.estado = :estado', { estado: 'ACTIVO' })
      .getOne();
  }

  findActiveById(id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id, estado: 'ACTIVO' } }).then((u) => (u && !u.eliminadoEn ? u : null));
  }

  async actualizarClave(id: string, hashClave: string): Promise<void> {
    await this.repo.update({ id }, { hashClave });
  }

  /** Accesos de una organización (sin los borrados), los más recientes primero. */
  listarDeOrganizacion(organizacionId: string): Promise<Usuario[]> {
    return this.repo.createQueryBuilder('u').where('u.organizacionId = :organizacionId AND u.eliminadoEn IS NULL', { organizacionId }).orderBy('u.creadoEn', 'DESC').getMany();
  }

  buscarEnOrganizacion(organizacionId: string, id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id, organizacionId } }).then((u) => (u && !u.eliminadoEn ? u : null));
  }

  /** Borrado físico: solo para deshacer un acceso recién creado cuyo correo no se pudo enviar. */
  async borrar(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  existe(organizacionId: string, correo: string): Promise<boolean> {
    return this.repo.exists({ where: { organizacionId, correo: correo.toLowerCase() } });
  }

  crear(datos: Pick<Usuario, 'organizacionId' | 'correo' | 'nombre' | 'rol' | 'perfil' | 'hashClave'>): Promise<Usuario> {
    return this.repo.save(this.repo.create({ ...datos, correo: datos.correo.toLowerCase(), estado: 'ACTIVO', eliminadoEn: null }));
  }
}
