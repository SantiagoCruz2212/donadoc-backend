import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '@audit/audit.service';
import { CasosService } from '@casos/casos.service';
import { AuthUser } from '@common/types/auth-user';
import { DocumentosService } from '@documentos/documentos.service';
import { ExtraccionIa } from './entities/extraccion-ia.entity';
import { SugerenciaIa } from './entities/sugerencia-ia.entity';
import { ExtraccionVista, toExtraccionVista } from './ia.view';
import {
  CAMPOS_HISTORIA, ExtractorIa, ExtractorIaError, ResultadoExtraccion, TipoErrorIa,
} from './ports/extractor-ia.port';

const MENSAJES: Record<string, string> = {
  PROCESADA: 'Extracción procesada; las sugerencias requieren revisión',
  ABSTENCION: 'Confianza insuficiente; capture los datos manualmente',
  PENDIENTE: 'El proveedor de IA no respondió; el documento quedó guardado y la extracción pendiente',
  ERROR: 'La respuesta del proveedor no fue válida; capture los datos manualmente',
};

export interface ResultadoCasoDeUso {
  mensaje: string;
  extraccion: ExtraccionVista;
}

/**
 * CASO DE USO: extraer datos de una historia clínica externa con IA.
 * Regla de oro del diseño: PERSISTIR PRIMERO. El documento y la extracción (PENDIENTE) quedan guardados
 * antes de llamar al proveedor; si la IA falla, nada se pierde y se puede reintentar o capturar a mano.
 * Solo conoce el puerto ExtractorIa, nunca un proveedor concreto.
 */
@Injectable()
export class ExtraerConIaService {
  constructor(
    @InjectRepository(ExtraccionIa) private readonly extracciones: Repository<ExtraccionIa>,
    @InjectRepository(SugerenciaIa) private readonly sugerencias: Repository<SugerenciaIa>,
    private readonly documentos: DocumentosService,
    private readonly casos: CasosService,
    private readonly extractor: ExtractorIa,
    private readonly cfg: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async ejecutar(user: AuthUser, casoId: string, documentoId: string): Promise<ResultadoCasoDeUso> {
    const doc = await this.documentos.obtenerDeCaso(user, casoId, documentoId); // 404 si no es de la organización

    // 1) Persistir primero.
    const ext = await this.extracciones.save(
      this.extracciones.create({
        casoId, documentoOrigenId: doc.id, proveedor: this.extractor.nombre, modelo: null, estado: 'PENDIENTE', intentos: 0,
        solicitadoPor: user.userId, respondidoEn: null, respuestaJson: null,
      }),
    );
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'extraccion_ia', entidadId: ext.id, accion: 'CREAR', valorNuevo: { proveedor: ext.proveedor, estado: 'PENDIENTE' } });

    // 2) Intentar con timeout y reintentos acotados.
    let texto: string;
    try {
      texto = await this.documentos.leerTexto(doc);
    } catch {
      // El archivo ya no está en el almacenamiento o no se puede leer (p. ej. un PDF dañado): la extracción termina en ERROR
      // con un mensaje claro, en lugar de quedar PENDIENTE para siempre con un HTTP 500.
      return this.resolverLecturaFallida(user, ext);
    }
    const maxIntentos = Number(this.cfg.get('IA_MAX_INTENTOS') ?? 2);
    const timeoutMs = Number(this.cfg.get('IA_TIMEOUT_MS') ?? 120000);
    const backoff = Number(this.cfg.get('IA_BACKOFF_MS') ?? 400);
    let resultado: ResultadoExtraccion | null = null;
    let fallo: ExtractorIaError | null = null;

    for (let n = 1; n <= maxIntentos; n++) {
      ext.intentos = n;
      await this.extracciones.update(ext.id, { intentos: n });
      try {
        resultado = await this.conTimeout((signal) => this.extractor.extraer({ texto, campos: CAMPOS_HISTORIA }, signal), timeoutMs);
        fallo = null;
        break;
      } catch (e) {
        fallo = e instanceof ExtractorIaError ? e : new ExtractorIaError('PROVEEDOR', 'Error inesperado del proveedor de IA');
        const reintentable: TipoErrorIa[] = ['TIMEOUT', 'PROVEEDOR'];
        if (!reintentable.includes(fallo.tipo) || n === maxIntentos) break;
        await new Promise((r) => setTimeout(r, backoff * n));
      }
    }

    // 3) Resolver el resultado.
    if (resultado) return this.resolverExito(user, ext, resultado);
    return this.resolverFallo(user, ext, fallo as ExtractorIaError);
  }

  private async resolverExito(user: AuthUser, ext: ExtraccionIa, r: ResultadoExtraccion): Promise<ResultadoCasoDeUso> {
    const umbral = Number(this.cfg.get('IA_UMBRAL_CONFIANZA') ?? 0.7);
    const validas = r.sugerencias.filter((s) => s.valor && s.confianza >= umbral); // umbral de abstención
    ext.modelo = r.modelo;
    ext.respondidoEn = new Date();
    ext.respuestaJson = { recibidas: r.sugerencias.length, aceptadasPorUmbral: validas.length, umbral };
    ext.estado = validas.length > 0 ? 'PROCESADA' : 'ABSTENCION';
    await this.extracciones.save(ext);
    const guardadas = validas.length
      ? await this.sugerencias.save(
          validas.map((s) =>
            this.sugerencias.create({ extraccionId: ext.id, campo: s.campo, valorSugerido: s.valor, confianza: s.confianza, decision: 'PENDIENTE', valorFinal: null, decididoPor: null, decididoEn: null }),
          ),
        )
      : [];
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'extraccion_ia', entidadId: ext.id, accion: 'IA_RESPUESTA', valorNuevo: { estado: ext.estado, sugerencias: guardadas.length } });
    return { mensaje: MENSAJES[ext.estado], extraccion: toExtraccionVista(ext, guardadas) };
  }

  private async resolverLecturaFallida(user: AuthUser, ext: ExtraccionIa): Promise<ResultadoCasoDeUso> {
    ext.estado = 'ERROR';
    ext.respondidoEn = new Date();
    ext.respuestaJson = { incidente: 'LECTURA_DOCUMENTO' };
    await this.extracciones.save(ext);
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'extraccion_ia', entidadId: ext.id, accion: 'IA_FALLO', valorNuevo: { tipo: 'LECTURA_DOCUMENTO', estado: ext.estado } });
    return { mensaje: 'No se pudo leer el documento; vuelva a cargarlo o capture los datos manualmente', extraccion: toExtraccionVista(ext, []) };
  }

  private async resolverFallo(user: AuthUser, ext: ExtraccionIa, f: ExtractorIaError): Promise<ResultadoCasoDeUso> {
    ext.estado = f.tipo === 'RESPUESTA_INVALIDA' ? 'ERROR' : 'PENDIENTE'; // la falla de la IA no detiene el trabajo
    ext.respondidoEn = new Date();
    ext.respuestaJson = { incidente: f.tipo };
    await this.extracciones.save(ext);
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.userId, entidad: 'extraccion_ia', entidadId: ext.id, accion: 'IA_FALLO', valorNuevo: { tipo: f.tipo, intentos: ext.intentos, estado: ext.estado } });
    const mensaje = f.tipo === 'CONFIGURACION'
      ? 'El proveedor de IA no está configurado; el documento quedó guardado y la extracción pendiente'
      : f.tipo === 'CUOTA'
        ? 'Se alcanzó el límite de uso del proveedor de IA; el documento quedó guardado y la extracción pendiente'
        : MENSAJES[ext.estado];
    return { mensaje, extraccion: toExtraccionVista(ext, []) };
  }

  private async conTimeout<T>(fn: (s: AbortSignal) => Promise<T>, ms: number): Promise<T> {
    const ctrl = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, rej) => {
      timer = setTimeout(() => { ctrl.abort(); rej(new ExtractorIaError('TIMEOUT', 'Tiempo de espera agotado')); }, ms);
    });
    try {
      return await Promise.race([fn(ctrl.signal), limite]);
    } finally {
      clearTimeout(timer);
    }
  }

  async consultar(user: AuthUser, id: string): Promise<ExtraccionVista> {
    const ext = await this.extracciones.findOne({ where: { id }, relations: ['sugerencias'] });
    if (!ext) throw new NotFoundException('Extracción no encontrada');
    await this.casos.obtenerEntidad(user, ext.casoId); // alcance por organización
    return toExtraccionVista(ext);
  }

  async listarDeCaso(user: AuthUser, casoId: string): Promise<ExtraccionVista[]> {
    await this.casos.obtenerEntidad(user, casoId);
    const lista = await this.extracciones.find({ where: { casoId }, relations: ['sugerencias'], order: { solicitadoEn: 'DESC' } });
    return lista.map((e) => toExtraccionVista(e));
  }
}
