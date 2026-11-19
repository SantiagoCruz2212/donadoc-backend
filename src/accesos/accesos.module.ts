import { Module } from '@nestjs/common';
import { AuditModule } from '@audit/audit.module';
import { CorreoModule } from '@correo/correo.module';
import { UsersModule } from '@users/users.module';
import { AccesosController } from './accesos.controller';
import { AccesosService } from './accesos.service';

@Module({
  imports: [UsersModule, AuditModule, CorreoModule],
  controllers: [AccesosController],
  providers: [AccesosService],
})
export class AccesosModule {}
