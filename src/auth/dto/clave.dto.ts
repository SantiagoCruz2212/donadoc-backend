import { IsEmail, IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';

/** Política de contraseña: mínimo 10 caracteres con al menos una letra y un número. */
const POLITICA = /^(?=.*[A-Za-z])(?=.*\d).+$/;
const MENSAJE_POLITICA = 'La contraseña debe tener al menos 10 caracteres, con letras y números';

export class OlvideClaveDto {
  /** Correo con el que se registró en la organización. */
  @IsEmail() @MaxLength(180) correo: string;
}

export class RestablecerClaveDto {
  @IsEmail() @MaxLength(180) correo: string;
  /** Código de 6 dígitos recibido por correo. */
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' }) codigo: string;
  @MinLength(10) @MaxLength(100) @Matches(POLITICA, { message: MENSAJE_POLITICA }) nuevaClave: string;
}

export class CambiarClaveDto {
  @IsNotEmpty() @MaxLength(100) claveActual: string;
  @MinLength(10) @MaxLength(100) @Matches(POLITICA, { message: MENSAJE_POLITICA }) nuevaClave: string;
}
