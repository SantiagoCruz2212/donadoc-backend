import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ExtraerDto {
  @IsUUID() documentoOrigenId: string;
}

export class DecidirSugerenciaDto {
  @IsIn(['ACEPTADA', 'MODIFICADA', 'RECHAZADA']) decision: string;
  @IsOptional() @IsString() @MaxLength(500) valorFinal?: string;
}
