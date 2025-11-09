import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Генерация PDF для формы КС-2
 */
export const generateKS2PDF = (data) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Настройка шрифта (поддержка кириллицы)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let yPos = 15;

  // Шапка
  doc.setFontSize(8);
  doc.text('Унифицированная форма № КС-2', 15, yPos);
  doc.text('Код', 170, yPos);
  yPos += 4;
  doc.text('Утверждена постановлением Госкомстата России', 15, yPos);
  doc.rect(170, yPos - 3, 25, 4);
  yPos += 4;
  doc.text('от 11.11.99 № 100', 15, yPos);
  doc.text('Форма по ОКУД', 145, yPos);
  doc.text('0322005', 175, yPos);
  doc.rect(170, yPos - 3, 25, 4);
  yPos += 8;

  // Реквизиты
  doc.setFontSize(9);
  doc.text(`Инвестор: ${data.investor?.name || '___________'}`, 15, yPos);
  yPos += 6;
  doc.text(`Заказчик (Генподрядчик): ${data.customer?.name || '___________'}`, 15, yPos);
  yPos += 6;
  doc.text(`Подрядчик (Субподрядчик): ${data.contractor?.name || '___________'}`, 15, yPos);
  yPos += 6;
  doc.text(`Стройка: ${data.constructionSite?.name || '___________'}`, 15, yPos);
  yPos += 6;
  doc.text(`Объект: ${data.constructionObject?.name || '___________'}`, 15, yPos);
  yPos += 8;

  // Номер документа и дата
  doc.text(`Номер документа: ${data.actNumber || '___'}`, 15, yPos);
  doc.text(`Дата: ${data.actDate ? new Date(data.actDate).toLocaleDateString('ru-RU') : '___'}`, 80, yPos);
  yPos += 8;

  // Заголовок
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('АКТ', 105, yPos, { align: 'center' });
  yPos += 6;
  doc.text('О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ', 105, yPos, { align: 'center' });
  yPos += 10;

  // Таблица работ
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const tableData = (data.works || []).map((work, index) => [
    index + 1,
    work.position || work.code || '',
    work.name || '',
    work.unitPriceCode || '',
    work.unit || '',
    (work.actualQuantity || 0).toFixed(2),
    (work.price || 0).toFixed(2),
    (work.totalPrice || 0).toFixed(2)
  ]);

  // Добавляем итоговую строку
  const totalAmount = data.totals?.amount || 0;
  tableData.push(['', '', '', '', 'Итого', 'X', 'X', totalAmount.toFixed(2)]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      '№',
      'Поз. по смете',
      'Наименование работ',
      '№ расценки',
      'Ед. изм.',
      'Количество',
      'Цена, руб.',
      'Стоимость, руб.'
    ]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 15 },
      2: { cellWidth: 60 },
      3: { cellWidth: 15 },
      4: { cellWidth: 15 },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Подписи
  doc.setFontSize(9);
  doc.text('Сдал:', 15, yPos);
  yPos += 6;
  doc.text(`(должность) ${data.contractorSignatory?.position || '___________'}`, 15, yPos);
  doc.text(`(подпись) ___________`, 80, yPos);
  doc.text(`(расшифровка) ${data.contractorSignatory?.fullName || '___________'}`, 130, yPos);
  yPos += 10;

  doc.text('Принял:', 15, yPos);
  yPos += 6;
  doc.text(`(должность) ${data.customerSignatory?.position || '___________'}`, 15, yPos);
  doc.text(`(подпись) ___________`, 80, yPos);
  doc.text(`(расшифровка) ${data.customerSignatory?.fullName || '___________'}`, 130, yPos);

  // Сохранение
  doc.save(`КС-2_${data.actNumber || 'без_номера'}.pdf`);
};

/**
 * Генерация PDF для формы КС-3
 */
export const generateKS3PDF = (data) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let yPos = 15;

  // Шапка
  doc.setFontSize(8);
  doc.text('Унифицированная форма № КС-3', 15, yPos);
  doc.text('Код', 260, yPos);
  yPos += 4;
  doc.text('Утверждена постановлением Госкомстата России', 15, yPos);
  yPos += 4;
  doc.text('от 11.11.99 № 100', 15, yPos);
  doc.text('Форма по ОКУД', 235, yPos);
  doc.text('0322001', 265, yPos);
  yPos += 8;

  // Реквизиты
  doc.setFontSize(9);
  doc.text(`Заказчик: ${data.customer?.name || '___________'}`, 15, yPos);
  yPos += 6;
  doc.text(`Подрядчик: ${data.contractor?.name || '___________'}`, 15, yPos);
  yPos += 6;
  doc.text(`Стройка: ${data.constructionSite?.name || '___________'}`, 15, yPos);
  yPos += 8;

  // Заголовок
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('СПРАВКА', 148, yPos, { align: 'center' });
  yPos += 6;
  doc.text('О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ', 148, yPos, { align: 'center' });
  yPos += 10;

  // Таблица
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const tableData = (data.works || []).map((work, index) => [
    index + 1,
    work.name || '',
    work.code || '',
    (work.totalPriceFromStart || 0).toFixed(2),
    (work.totalPriceFromYear || 0).toFixed(2),
    (work.totalPrice || work.totalPriceCurrent || 0).toFixed(2)
  ]);

  const totalFromStart = data.totals?.amountYTD || 0;
  const totalFromYear = data.totals?.amountFromYear || 0;
  const totalCurrent = data.totals?.amountCurrent || 0;

  tableData.push(['', 'Итого', '', totalFromStart.toFixed(2), totalFromYear.toFixed(2), totalCurrent.toFixed(2)]);
  tableData.push(['', 'Сумма НДС', '', (data.vat?.fromStart || 0).toFixed(2), (data.vat?.fromYear || 0).toFixed(2), (data.vat?.current || 0).toFixed(2)]);
  tableData.push(['', 'Всего с учетом НДС', '', (totalFromStart + (data.vat?.fromStart || 0)).toFixed(2), (totalFromYear + (data.vat?.fromYear || 0)).toFixed(2), (totalCurrent + (data.vat?.current || 0)).toFixed(2)]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      '№',
      'Наименование работ',
      'Код',
      'С начала работ',
      'С начала года',
      'За отчетный период'
    ]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 100 },
      2: { cellWidth: 20 },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 40, halign: 'right' },
      5: { cellWidth: 40, halign: 'right', fillColor: [232, 245, 233] }
    },
    margin: { left: 15, right: 15 }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Подписи
  doc.setFontSize(9);
  doc.text('Заказчик (Генподрядчик):', 15, yPos);
  yPos += 6;
  doc.text(`(должность) ${data.customerSignatory?.position || '___________'}`, 15, yPos);
  doc.text(`(подпись) ___________`, 100, yPos);
  doc.text(`(расшифровка) ${data.customerSignatory?.fullName || '___________'}`, 150, yPos);
  yPos += 10;

  doc.text('Подрядчик (Субподрядчик):', 15, yPos);
  yPos += 6;
  doc.text(`(должность) ${data.contractorSignatory?.position || '___________'}`, 15, yPos);
  doc.text(`(подпись) ___________`, 100, yPos);
  doc.text(`(расшифровка) ${data.contractorSignatory?.fullName || '___________'}`, 150, yPos);

  doc.save(`КС-3_${data.actNumber || 'без_номера'}.pdf`);
};

/**
 * Генерация Excel для формы КС-2
 */
export const generateKS2Excel = (data) => {
  const workbook = XLSX.utils.book_new();
  
  // Подготовка данных
  const worksheetData = [
    ['Унифицированная форма № КС-2', '', '', '', '', '', '', 'Код'],
    ['Утверждена постановлением Госкомстата России от 11.11.99 № 100', '', '', '', '', '', '', 'Форма по ОКУД: 0322005'],
    [],
    ['Инвестор:', data.investor?.name || ''],
    ['Заказчик (Генподрядчик):', data.customer?.name || ''],
    ['Подрядчик (Субподрядчик):', data.contractor?.name || ''],
    ['Стройка:', data.constructionSite?.name || ''],
    ['Объект:', data.constructionObject?.name || ''],
    [],
    ['Номер документа:', data.actNumber || '', 'Дата:', data.actDate || ''],
    [],
    ['АКТ О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ'],
    [],
    ['№', 'Поз. по смете', 'Наименование работ', '№ расценки', 'Ед. изм.', 'Количество', 'Цена, руб.', 'Стоимость, руб.']
  ];

  // Добавляем работы
  (data.works || []).forEach((work, index) => {
    worksheetData.push([
      index + 1,
      work.position || work.code || '',
      work.name || '',
      work.unitPriceCode || '',
      work.unit || '',
      work.actualQuantity || 0,
      work.price || 0,
      work.totalPrice || 0
    ]);
  });

  // Итого
  worksheetData.push([
    '', '', '', '', 'Итого', 'X', 'X', data.totals?.amount || 0
  ]);

  worksheetData.push([]);
  worksheetData.push(['Сдал:', data.contractorSignatory?.position || '', '', data.contractorSignatory?.fullName || '']);
  worksheetData.push(['Принял:', data.customerSignatory?.position || '', '', data.customerSignatory?.fullName || '']);

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Добавление границ ко всем ячейкам
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { t: 's', v: '' };
      }
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {};
      }
      worksheet[cellAddress].s.border = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };
    }
  }
  
  // Установка ширины колонок
  worksheet['!cols'] = [
    { wch: 5 },   // №
    { wch: 15 },  // Поз
    { wch: 40 },  // Наименование
    { wch: 12 },  // Расценка
    { wch: 10 },  // Ед
    { wch: 12 },  // Количество
    { wch: 15 },  // Цена
    { wch: 15 }   // Стоимость
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'КС-2');
  XLSX.writeFile(workbook, `КС-2_${data.actNumber || 'без_номера'}.xlsx`, { cellStyles: true });
};

/**
 * Генерация Excel для формы КС-3
 */
export const generateKS3Excel = (data) => {
  const workbook = XLSX.utils.book_new();
  
  const worksheetData = [
    ['Унифицированная форма № КС-3', '', '', '', '', 'Код'],
    ['Утверждена постановлением Госкомстата России от 11.11.99 № 100', '', '', '', '', 'Форма по ОКУД: 0322001'],
    [],
    ['Заказчик (Генподрядчик):', data.customer?.name || ''],
    ['Подрядчик (Субподрядчик):', data.contractor?.name || ''],
    ['Стройка:', data.constructionSite?.name || ''],
    [],
    ['СПРАВКА О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ'],
    [],
    ['№', 'Наименование работ', 'Код', 'С начала работ, руб.', 'С начала года, руб.', 'За отчетный период, руб.']
  ];

  // Строка "Всего работ и затрат"
  worksheetData.push([
    '',
    'Всего работ и затрат, включаемых в стоимость работ',
    '',
    data.totals?.amountYTD || 0,
    data.totals?.amountFromYear || 0,
    data.totals?.amountCurrent || 0
  ]);

  worksheetData.push(['', 'в том числе:', '', '', '', '']);

  // Работы
  (data.works || []).forEach((work, index) => {
    worksheetData.push([
      index + 1,
      work.name || '',
      work.code || '',
      work.totalPriceFromStart || 0,
      work.totalPriceFromYear || 0,
      work.totalPrice || work.totalPriceCurrent || 0
    ]);
  });

  // Итоги
  const totalFromStart = data.totals?.amountYTD || 0;
  const totalFromYear = data.totals?.amountFromYear || 0;
  const totalCurrent = data.totals?.amountCurrent || 0;

  worksheetData.push([
    '', 'Итого', '', totalFromStart, totalFromYear, totalCurrent
  ]);
  worksheetData.push([
    '', 'Сумма НДС', '', data.vat?.fromStart || 0, data.vat?.fromYear || 0, data.vat?.current || 0
  ]);
  worksheetData.push([
    '', 'Всего с учетом НДС', '', 
    totalFromStart + (data.vat?.fromStart || 0),
    totalFromYear + (data.vat?.fromYear || 0),
    totalCurrent + (data.vat?.current || 0)
  ]);

  worksheetData.push([]);
  worksheetData.push(['Заказчик:', data.customerSignatory?.position || '', '', data.customerSignatory?.fullName || '']);
  worksheetData.push(['Подрядчик:', data.contractorSignatory?.position || '', '', data.contractorSignatory?.fullName || '']);

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Добавление границ ко всем ячейкам
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { t: 's', v: '' };
      }
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {};
      }
      worksheet[cellAddress].s.border = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };
    }
  }
  
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 50 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'КС-3');
  XLSX.writeFile(workbook, `КС-3_${data.actNumber || 'без_номера'}.xlsx`, { cellStyles: true });
};
