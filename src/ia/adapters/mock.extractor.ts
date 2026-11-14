import { ExtractorIa, ResultadoExtraccion, SolicitudExtraccion, SugerenciaExtraida } from '../ports/extractor-ia.port';

const ETIQUETAS: Record<string, string[]> = {
  diagnosticoPrincipal: ['diagnóstico principal', 'diagnostico principal', 'diagnóstico', 'diagnostico'],
  causaMuerte: ['causa de muerte', 'causa de la muerte'],
  antecedentesRelevantes: ['antecedentes'],
  fechaIngreso: ['fecha de ingreso', 'ingreso'],
  grupoSanguineo: ['grupo sanguíneo', 'grupo sanguineo'],
};

/**
 * Simulador DETERMINISTA para pruebas y demostraciones sin red: NO es inteligencia artificial.
 * Busca líneas con el formato "Etiqueta: valor". Permite probar el flujo completo sin cuota ni claves.
 */
export class MockExtractor extends ExtractorIa {
  readonly externo = false;
  readonly nombre = 'MOCK';

  async extraer(s: SolicitudExtraccion): Promise<ResultadoExtraccion> {
    const sugerencias: SugerenciaExtraida[] = [];
    for (const campo of s.campos) {
      for (const etiqueta of ETIQUETAS[campo.clave] ?? []) {
        const m = new RegExp(`^\\s*${etiqueta}\\s*[:\\-]\\s*(.+)$`, 'im').exec(s.texto);
        if (m) {
          sugerencias.push({ campo: campo.clave, valor: m[1].trim(), confianza: 0.95 });
          break;
        }
      }
    }
    return { proveedor: this.nombre, modelo: 'determinista', sugerencias };
  }
}
