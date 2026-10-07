import { PAGE_HEIGHT, PAGE_WIDTH, type ClassroomChart } from './classroomChart';

/** Draw the standalone page, rather than screenshotting the live application.
 * Native SVG text shaping retains Hebrew/Arabic glyphs. 3.125x = 300 dpi A4. */
export async function chartCanvas(chart: ClassroomChart): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const image = new Image();
  const url = URL.createObjectURL(new Blob([chart.svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Chart image could not be rendered'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE_WIDTH * 3.125);
    canvas.height = Math.round(PAGE_HEIGHT * 3.125);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}

function filename(chart: ClassroomChart, extension: string): string {
  const title = Array.from(chart.title).filter(char => char.charCodeAt(0) >= 32).join('').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60);
  return `seating-chart-${title}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export async function downloadChartPdf(chart: ClassroomChart): Promise<void> {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), chartCanvas(chart)]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: chart.title, subject: 'Classroom seating chart', creator: 'SeatAI' });
  pdf.addImage(canvas, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
  pdf.save(filename(chart, 'pdf'));
}

export async function downloadChartPng(chart: ClassroomChart): Promise<void> {
  const canvas = await chartCanvas(chart);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename(chart, 'png');
  document.body.append(anchor); anchor.click(); anchor.remove();
  // Leave the blob available while mobile browsers open their download sheet.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
