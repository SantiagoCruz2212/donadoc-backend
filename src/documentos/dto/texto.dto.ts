import { IsNotEmpty, MaxLength } from 'class-validator';

export class TextoDto {
  @IsNotEmpty() @MaxLength(50000) texto: string;
}
