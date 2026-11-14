import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnviadorCorreo } from '@correo/enviador-correo';
import { ClaveTemporal } from './clave-temporal.entity';

/**
 * Códigos de un solo uso enviados por correo (restablecer clave, firma del paciente).
 * Garantías: código de 6 dígitos aleatorio criptográfico, vigencia corta, máximo de intentos (el contador sube de forma
 * atómica en SQL, así que las pruebas en paralelo no lo evaden), uso único, espera entre reenvíos y solo se guarda un HMAC.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(ClaveTemporal) private readonly repo: Repository<ClaveTemporal>,
    private readonly correo: EnviadorCorreo,
    private readonly cfg: ConfigService,
  ) {}

  private get pepper(): string {
    return this.cfg.get<string>('OTP_PEPPER') as string;
  }

  private clave(proposito: string, sujeto: string): string {
    return createHmac('sha256', this.pepper).update(`${proposito}|${sujeto.toLowerCase()}`).digest('hex');
  }

  private hashCodigo(clave: string, codigo: string): string {
    return createHmac('sha256', this.pepper).update(`${clave}|${codigo}`).digest('hex');
  }

  /**
   * Genera un código para (propósito, sujeto) y lo envía por correo. Devuelve false si no se envió (espera de reenvío activa
   * o fallo del proveedor): quien llama no debe revelar eso a un solicitante anónimo.
   */
  async enviar(proposito: string, sujeto: string, correoDestino: string, asunto: string, cuerpo: (codigo: string, minutos: number) => string): Promise<boolean> {
    const ttlMin = this.cfg.get<number>('OTP_TTL_MIN') ?? 10;
    const esperaSeg = this.cfg.get<number>('OTP_REENVIO_SEG') ?? 60;
    const clave = this.clave(proposito, sujeto);
    await this.repo.createQueryBuilder().delete().where('expira_en < now()').execute(); // limpieza perezosa

    const previo = await this.repo.findOne({ where: { claveHash: clave } });
    if (previo && Date.now() - previo.valor.creadoEn < esperaSeg * 1000) return false;

    const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.repo.save({
      claveHash: clave,
      valor: { codigoHash: this.hashCodigo(clave, codigo), intentos: 0, creadoEn: Date.now() },
      expiraEn: new Date(Date.now() + ttlMin * 60_000),
    });
    try {
      await this.correo.enviar(correoDestino, asunto, cuerpo(codigo, ttlMin));
      return true;
    } catch {
      await this.repo.delete({ claveHash: clave }); // sin correo no hay código utilizable
      this.logger.error(`No se pudo enviar el código (${proposito})`);
      return false;
    }
  }

  /** Verifica y consume el código. Cualquier fallo (inexistente, vencido, agotado, incorrecto) devuelve false sin distinguir. */
  async verificar(proposito: string, sujeto: string, codigo: string): Promise<boolean> {
    const max = this.cfg.get<number>('OTP_MAX_INTENTOS') ?? 5;
    const clave = this.clave(proposito, sujeto);
    // Incremento atómico del contador: cada intento cuenta aunque lleguen en paralelo.
    type Fila = { valor: ClaveTemporal['valor'] };
    const resultado: Fila[] | [Fila[], number] = await this.repo.query(
      `UPDATE claves_temporales
          SET valor = jsonb_set(valor, '{intentos}', to_jsonb((valor->>'intentos')::int + 1))
        WHERE clave_hash = $1 AND expira_en > now() AND (valor->>'intentos')::int < $2
        RETURNING valor`,
      [clave, max],
    );
    // TypeORM devuelve [filas, cantidad] en UPDATE ... RETURNING de PostgreSQL.
    const filas = (Array.isArray(resultado[0]) ? resultado[0] : resultado) as Fila[];
    const fila = filas[0];
    if (!fila) return false;
    const esperado = Buffer.from(fila.valor.codigoHash, 'hex');
    const recibido = Buffer.from(this.hashCodigo(clave, codigo), 'hex');
    const ok = esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
    if (ok) await this.repo.delete({ claveHash: clave }); // uso único
    return ok;
  }
}
