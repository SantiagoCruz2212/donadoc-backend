import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearAccesoDto {
  /** Correo del nuevo usuario: allí llegará la clave generada. */
  @IsEmail() @MaxLength(180) correo: string;
  @IsString() @MinLength(3) @MaxLength(150) nombre: string;
  /** El superadmin no se crea por la API. */
  @IsIn(['ADMIN_ORG', 'OPERADOR']) rol: string;
  @IsOptional() @IsIn(['COORDINADOR', 'AUXILIAR', 'CIRUJANO', 'REGIONAL', 'CONSULTA']) perfil?: string;
}
