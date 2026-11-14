import { IsEmail, IsIn, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class CrearFirmaDto {
  /** Nombre completo de quien firma (paciente, familiar, testigo…). */
  @IsNotEmpty() @MaxLength(150) firmanteNombre: string;
  @IsIn(['PACIENTE', 'FAMILIAR', 'TESTIGO', 'MEDICO', 'COORDINADOR']) firmanteRol: string;
  /** Correo donde recibirá el código de verificación. */
  @IsEmail() @MaxLength(180) firmanteCorreo: string;
}

export class VerificarFirmaDto {
  /** Código de 6 dígitos que recibió el firmante por correo. */
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' }) codigo: string;
}
