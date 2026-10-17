import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { createReportHtml, fetchReportDataset, ReportArea } from './reports';

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export async function generateAndShareReport(input: {
  area: ReportArea;
  from: string;
  to: string;
  createdBy: string;
}): Promise<void> {
  if (!isValidDate(input.from) || !isValidDate(input.to) || input.from > input.to) {
    throw new Error('Elige un periodo válido en formato AAAA-MM-DD.');
  }

  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('El navegador bloqueó la ventana del reporte. Permite las ventanas emergentes e inténtalo de nuevo.');
    }

    printWindow.document.title = 'Preparando reporte PDF';
    printWindow.document.body.textContent = 'Preparando el reporte con los datos actuales...';
    try {
      const dataset = await fetchReportDataset();
      const html = createReportHtml(dataset, input.area, input.from, input.to, input.createdBy);
      if (printWindow.closed) {
        throw new Error('Se cerró la ventana del reporte antes de terminar.');
      }
      printWindow.document.open();
      printWindow.document.write(html.replace(
        '</body>',
        '<script>window.addEventListener("load", function () { window.setTimeout(function () { window.print(); }, 250); });</script></body>',
      ));
      printWindow.document.close();
      printWindow.focus();
    } catch (error) {
      printWindow.close();
      throw error;
    }
    return;
  }

  const dataset = await fetchReportDataset();
  const html = createReportHtml(dataset, input.area, input.from, input.to, input.createdBy);
  const file = await Print.printToFileAsync({ html, width: 842, height: 595 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir archivos no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Guardar o compartir reporte PDF',
    UTI: 'com.adobe.pdf',
  });
}
