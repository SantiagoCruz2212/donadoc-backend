import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organizacion } from './entities/organizacion.entity';

@Injectable()
export class TenantsService {
  constructor(@InjectRepository(Organizacion) private readonly repo: Repository<Organizacion>) {}

  /** Resuelve la organización a partir de su clave pública (X-Tenant-Key). Solo organizaciones activas. */
  findActiveByKey(clavePublica: string): Promise<Organizacion | null> {
    return this.repo.findOne({ where: { clavePublica, estado: 'ACTIVA' } });
  }

  findByKey(clavePublica: string): Promise<Organizacion | null> {
    return this.repo.findOne({ where: { clavePublica } });
  }

  crear(datos: Pick<Organizacion, 'nombre' | 'clavePublica'>): Promise<Organizacion> {
    return this.repo.save(this.repo.create({ ...datos, nit: null, estado: 'ACTIVA' }));
  }
}
