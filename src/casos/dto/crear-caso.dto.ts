import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsDefined, IsIn, IsNotEmpty, IsObject, IsOptional, Matches, MaxLength, ValidateNested } from 'class-validator';

export class DonanteDto {
  @IsIn(['CC', 'TI', 'CE', 'PA', 'RC']) tipoDocumento: string;
  @Matches(/^[0-9A-Za-z-]{4,20}$/, { message: 'numeroDocumento debe tener de 4 a 20 caracteres alfanuméricos' }) numeroDocumento: string;
  @IsNotEmpty() @MaxLength(120) nombres: string;
  @IsNotEmpty() @MaxLength(120) apellidos: string;
  @IsOptional() @IsIn(['M', 'F', 'O']) sexo?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
}

export class CrearCasoDto {
  // @IsDefined + @IsObject: sin ellos un cuerpo vacío pasaba la validación y el servicio fallaba con un TypeError (HTTP 500).
  @IsDefined() @IsObject() @ValidateNested() @Type(() => DonanteDto) donante: DonanteDto;
  @IsOptional() @IsIn(['TOTIPOTENCIAL', 'ORGANOS', 'TEJIDOS']) tipoDonante?: string;
  @IsOptional() @IsBoolean() muerteViolenta?: boolean;
}
