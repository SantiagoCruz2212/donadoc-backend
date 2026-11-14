import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail() @MaxLength(180) correo: string;
  @IsNotEmpty() @MaxLength(100) clave: string;
}
