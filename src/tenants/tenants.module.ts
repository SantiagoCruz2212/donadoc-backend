import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organizacion } from './entities/organizacion.entity';
import { TenantKeyGuard } from './tenant-key.guard';
import { TenantsService } from './tenants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Organizacion])],
  providers: [TenantsService, TenantKeyGuard],
  exports: [TenantsService, TenantKeyGuard],
})
export class TenantsModule {}
