import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { TextoDto } from './dto/texto.dto';
import { DocumentoVista } from './documentos.view';
import { DocumentosService } from './documentos.service';

// Límite de tamaño del archivo en memoria (variable MAX_UPLOAD_MB, 5 MB por defecto).
const LIMITE_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024;

@ApiTags('documentos')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller('casos/:casoId/documentos')
export class DocumentosController {
  constructor(private readonly docs: DocumentosService) {}

  @Post()
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: LIMITE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { archivo: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Cargar una historia clínica externa (.pdf o .txt)' })
  @ApiEnvelope(DocumentoVista, { created: true })
  async subir(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string, @UploadedFile() archivo?: Express.Multer.File) {
    return createResponse('Documento cargado', await this.docs.subirArchivo(user, casoId, archivo));
  }

  @Post('texto')
  @ApiOperation({ summary: 'Registrar una historia clínica externa pegando su texto' })
  @ApiEnvelope(DocumentoVista, { created: true })
  async subirTexto(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string, @Body() dto: TextoDto) {
    return createResponse('Documento registrado', await this.docs.subirTexto(user, casoId, dto.texto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar los documentos de un caso' })
  @ApiEnvelope(DocumentoVista, { isArray: true })
  async listar(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string) {
    return createResponse('Documentos consultados', await this.docs.listar(user, casoId));
  }
}
