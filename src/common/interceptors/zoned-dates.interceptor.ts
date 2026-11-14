import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map, Observable } from 'rxjs';

/**
 * Convierte un instante a texto ISO en la zona horaria de negocio con su desfase (p. ej. -05:00).
 * Los instantes se guardan como TIMESTAMPTZ; las fechas de calendario ya viajan como YYYY-MM-DD planas.
 */
export function aZonaDeNegocio(fecha: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(fecha);
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  const ms = fecha.getUTCMilliseconds();
  const comoUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'), ms);
  const desfaseMin = Math.round((comoUtc - fecha.getTime()) / 60000);
  const signo = desfaseMin >= 0 ? '+' : '-';
  const abs = Math.abs(desfaseMin);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const local = new Date(comoUtc).toISOString().slice(0, 23); // YYYY-MM-DDTHH:mm:ss.sss
  return `${local}${signo}${p2(Math.floor(abs / 60))}:${p2(abs % 60)}`;
}

export function convertirFechas(valor: unknown, zona: string): unknown {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : aZonaDeNegocio(valor, zona);
  if (Array.isArray(valor)) return valor.map((v) => convertirFechas(v, zona));
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, convertirFechas(v, zona)]));
  }
  return valor;
}

@Injectable()
export class ZonedDatesInterceptor implements NestInterceptor {
  constructor(private readonly cfg: ConfigService) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const zona = this.cfg.get<string>('APP_TIMEZONE') ?? 'America/Bogota';
    return next.handle().pipe(map((cuerpo) => convertirFechas(cuerpo, zona)));
  }
}
