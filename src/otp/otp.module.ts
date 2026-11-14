import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreoModule } from '@correo/correo.module';
import { ClaveTemporal } from './clave-temporal.entity';
import { OtpService } from './otp.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClaveTemporal]), CorreoModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
