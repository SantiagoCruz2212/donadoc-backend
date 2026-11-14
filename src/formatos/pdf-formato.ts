import PDFDocument from 'pdfkit';
import { CampoFormato, DatosFormato, EsquemaFormato, FilaTabla, ValorCampo } from './esquema';
import { calcularTabla, TablaCalculada } from './tablas';

export interface MetaPdf {
  nombreFormato: string;
  version: number;
  institucion: string;
  generadoEn: string;
}

const formatear = (tipo: string, v: ValorCampo | undefined): string => {
  if (v === undefined) return '—';
  if (Array.isArray(v)) return `${v.length} filas`;
  if (tipo === 'booleano') return v ? 'Sí' : 'No';
  if (tipo === 'fecha' && typeof v === 'string') return v.split('-').reverse().join('/');
  return String(v);
};

const celda = (tipo: string, v: unknown): string => {
  if (v === undefined || v === null || v === '') return '';
  if (tipo === 'fecha' && typeof v === 'string') return v.split('-').reverse().join('/');
  return String(v);
};

/**
 * Dibuja una tabla de un informe. Las tablas anchas (decenas de columnas) se parten en bloques de columnas que repiten el
 * rótulo de la fila, para que ninguna columna quede ilegible.
 */
function dibujarTabla(doc: PDFKit.PDFDocument, campo: CampoFormato, calc: TablaCalculada): void {
  const columnas = campo.columnas ?? [];
  const izquierda = doc.page.margins.left;
  const ancho = doc.page.width - izquierda - doc.page.margins.right;
  const anchoRotulo = 92;
  const anchoCol = 64;
  const porBloque = Math.max(1, Math.floor((ancho - anchoRotulo) / anchoCol));
  const fuente = 6.5;
  const rotulo = (i: number): string => (campo.filasFijas ? campo.filasFijas[i] : String(i + 1));
  const filas: { r: string; f: FilaTabla }[] = calc.filas
    .map((f, i) => ({ r: rotulo(i), f }))
    // En tablas libres se omiten las filas vacías; en las de filas fijas se muestran todas (el rótulo es parte del formato).
    .filter((x) => campo.filasFijas || Object.keys(x.f).length > 0);

  for (let ini = 0; ini < columnas.length; ini += porBloque) {
    const bloque = columnas.slice(ini, ini + porBloque);
    const dibujarFila = (celdas: string[], negrita: boolean, relleno?: string): void => {
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(fuente);
      const ancho1 = [anchoRotulo, ...bloque.map(() => anchoCol)];
      const alto = Math.max(14, ...celdas.map((t, i) => doc.heightOfString(t, { width: ancho1[i] - 6 }) + 6));
      if (doc.y + alto > doc.page.height - doc.page.margins.bottom - 20) doc.addPage();
      const y = doc.y;
      let x = izquierda;
      celdas.forEach((t, i) => {
        if (relleno) doc.rect(x, y, ancho1[i], alto).fillColor(relleno).fill();
        doc.rect(x, y, ancho1[i], alto).strokeColor('#c9d6d9').lineWidth(0.5).stroke();
        doc.fillColor('#222222').text(t, x + 3, y + 3, { width: ancho1[i] - 6, lineBreak: true });
        x += ancho1[i];
      });
      doc.y = y + alto;
      doc.x = izquierda;
    };
    if (columnas.length > porBloque) {
      doc.font('Helvetica-Oblique').fontSize(7).fillColor('#777777').text(`Columnas ${ini + 1} a ${ini + bloque.length} de ${columnas.length}`);
    }
    dibujarFila([campo.filasFijas ? 'Periodo' : 'N.º', ...bloque.map((c) => c.etiqueta + (c.formula ? ' (calculada)' : ''))], true, '#e7f0f2');
    for (const { r, f } of filas) dibujarFila([r, ...bloque.map((c) => celda(c.tipo, f[c.clave]))], false);
    if (calc.totales) dibujarFila(['TOTAL', ...bloque.map((c) => (c.clave in (calc.totales ?? {}) ? String(calc.totales?.[c.clave]) : ''))], true, '#f3f7f8');
    doc.moveDown(0.6);
  }
  for (const r of calc.resumenes) {
    const partes = Object.entries(r.conteos).filter(([, n]) => n > 0).map(([o, n]) => `${o}: ${n}`);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#222222').text(`${r.titulo}: `, { continued: true });
    doc.font('Helvetica').text(partes.length ? partes.join(' · ') : 'sin datos');
  }
}

/** Genera el PDF del formato diligenciado: encabezado, secciones con «etiqueta: valor» y pie con la versión. */
export function generarPdf(esquema: EsquemaFormato, datos: DatosFormato, meta: MetaPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const informe = esquema.ambito === 'INFORME';
    // Los informes llevan tablas anchas: se imprimen en horizontal.
    const doc = new PDFDocument({ size: 'A4', layout: informe ? 'landscape' : 'portrait', margin: informe ? 40 : 56, info: { Title: meta.nombreFormato, Author: 'DonaDoc' } });
    const trozos: Buffer[] = [];
    doc.on('data', (t: Buffer) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    doc.fontSize(10).fillColor('#555555').text(meta.institucion, { align: 'right' });
    doc.moveDown(0.5).fontSize(18).fillColor('#0b5c6b').text(meta.nombreFormato);
    doc.fontSize(9).fillColor('#555555').text(`Versión ${meta.version} · Generado el ${meta.generadoEn}`);
    doc.moveDown(1);

    for (const seccion of esquema.secciones) {
      doc.fontSize(12).fillColor('#0b5c6b').text(seccion.titulo);
      doc.moveTo(doc.x, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2).strokeColor('#c9d6d9').stroke();
      doc.moveDown(0.6);
      for (const c of seccion.campos) {
        if (c.tipo === 'tabla') {
          doc.fontSize(10).fillColor('#222222').font('Helvetica-Bold').text(c.etiqueta);
          doc.moveDown(0.3);
          const v = datos[c.clave];
          dibujarTabla(doc, c, calcularTabla(c, Array.isArray(v) ? (v as FilaTabla[]) : undefined));
          doc.moveDown(0.4);
          continue;
        }
        doc.fontSize(10).fillColor('#222222').font('Helvetica-Bold').text(`${c.etiqueta}: `, { continued: true });
        doc.font('Helvetica').text(formatear(c.tipo, datos[c.clave]));
        doc.moveDown(0.2);
      }
      doc.moveDown(0.8);
    }

    doc.fontSize(8).fillColor('#777777').text('Documento generado por DonaDoc. Cualquier modificación posterior genera una nueva versión y queda registrada en la auditoría.', doc.page.margins.left, doc.page.height - 56, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
    doc.end();
  });
}
