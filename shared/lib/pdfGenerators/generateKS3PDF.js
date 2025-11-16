import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Генерирует PDF документ формы КС-3
 * (Справка о стоимости выполненных работ и затрат)
 * ОКУД 0322006
 * 
 * @param {Object} data - Данные формы КС-3
 * @param {string} filename - Имя файла для сохранения
 */
export function generateKS3PDF(data, filename = 'ks3.pdf') {
  // Создаем PDF документ формата A4 landscape для широкой таблицы
  const doc = new jsPDF({
    orientation: 'landscape', // Альбомная ориентация для КС-3
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = 10;

  // Вспомогательные функции
  const formatDate = (date) => {
    if (!date) return '—';
    return format(new Date(date), 'dd.MM.yyyy', { locale: ru });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // 1. ШАПКА ФОРМЫ
  doc.setFontSize(8);
  doc.text('Форма по ОКУД', margin, currentY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(data.okud || '0322006', margin, currentY + 4);
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`от ${formatDate(data.actDate)}`, pageWidth - margin - 30, currentY + 4, { align: 'right' });
  
  currentY += 12;

  // 2. НАЗВАНИЕ ФОРМЫ
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('СПРАВКА О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 6;
  doc.setFontSize(11);
  doc.text(`№ ${data.actNumber || '—'}`, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 8;

  // 3. КРАТКАЯ ИНФОРМАЦИЯ О КОНТРАГЕНТАХ
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Подрядчик:', margin, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(data.contractor?.name || '—', margin + 25, currentY);
  
  doc.setFont(undefined, 'bold');
  doc.text('ИНН:', margin + 100, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(data.contractor?.inn || '—', margin + 112, currentY);
  
  currentY += 5;
  
  doc.setFont(undefined, 'bold');
  doc.text('Заказчик:', margin, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(data.customer?.name || '—', margin + 25, currentY);
  
  doc.setFont(undefined, 'bold');
  doc.text('ИНН:', margin + 100, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(data.customer?.inn || '—', margin + 112, currentY);
  
  currentY += 5;

  // 4. ДОГОВОР И ОБЪЕКТ
  doc.setFont(undefined, 'bold');
  doc.text('Договор:', margin, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(`№ ${data.contract?.number || '—'} от ${formatDate(data.contract?.date)}`, margin + 20, currentY);
  
  currentY += 5;
  
  doc.setFont(undefined, 'bold');
  doc.text('Объект:', margin, currentY);
  doc.setFont(undefined, 'normal');
  const objectText = doc.splitTextToSize(data.constructionObject?.name || '—', contentWidth - 20);
  doc.text(objectText, margin + 20, currentY);
  currentY += objectText.length * 4 + 3;

  // 5. ТАБЛИЦА РАБОТ С НАКОПИТЕЛЬНЫМИ ИТОГАМИ
  const tableData = (data.works || []).map((work, index) => [
    (work.position || index + 1).toString(),
    work.code || '—',
    work.name || '',
    work.unit || '—',
    // Количество
    formatCurrency(work.quantityYTD || 0),
    formatCurrency(work.quantityPrevPeriod || 0),
    formatCurrency(work.quantityCurrent || 0),
    // Цена
    formatCurrency(work.price),
    // Стоимость
    formatCurrency(work.totalPriceYTD || 0),
    formatCurrency(work.totalPricePrevPeriod || 0),
    formatCurrency(work.totalPriceCurrent || 0)
  ]);

  doc.autoTable({
    startY: currentY,
    head: [
      [
        { content: '№', rowSpan: 2 },
        { content: 'Код', rowSpan: 2 },
        { content: 'Наименование работ', rowSpan: 2 },
        { content: 'Ед.\nизм.', rowSpan: 2 },
        { content: 'Количество', colSpan: 3 },
        { content: 'Цена,\nруб.', rowSpan: 2 },
        { content: 'Стоимость, руб.', colSpan: 3 }
      ],
      [
        { content: 'С нач.\nгода' },
        { content: 'До отч.\nпер.' },
        { content: 'За отч.\nпер.' },
        { content: 'С нач.\nгода' },
        { content: 'До отч.\nпер.' },
        { content: 'За отч.\nпер.' }
      ]
    ],
    body: tableData,
    foot: [[
      { content: 'ИТОГО:', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(data.totals?.amountYTD || 0), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(data.totals?.amountPrevPeriod || 0), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(data.totals?.amountCurrent || 0), styles: { fontStyle: 'bold', fillColor: [25, 118, 210], textColor: [255, 255, 255] } }
    ]],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      font: 'helvetica',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 6.5
    },
    footStyles: {
      fillColor: [227, 242, 253],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },   // №
      1: { halign: 'center', cellWidth: 15 },  // Код
      2: { cellWidth: 'auto' },                // Наименование
      3: { halign: 'center', cellWidth: 12 },  // Ед. изм.
      4: { halign: 'right', cellWidth: 18 },   // Кол-во YTD
      5: { halign: 'right', cellWidth: 18 },   // Кол-во Prev
      6: { halign: 'right', cellWidth: 18, fillColor: [255, 243, 224] }, // Кол-во Current (выделено)
      7: { halign: 'right', cellWidth: 18 },   // Цена
      8: { halign: 'right', cellWidth: 22 },   // Сумма YTD
      9: { halign: 'right', cellWidth: 22 },   // Сумма Prev
      10: { halign: 'right', cellWidth: 22, fillColor: [255, 243, 224] }  // Сумма Current (выделено)
    },
    margin: { left: margin, right: margin },
    theme: 'grid',
    didParseCell: function(data) {
      // Выделяем столбцы текущего периода
      if (data.column.index === 6 || data.column.index === 10) {
        if (data.section === 'body') {
          data.cell.styles.fillColor = [255, 243, 224]; // Светло-оранжевый
        }
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 6. НАКОПИТЕЛЬНЫЕ ИТОГИ (РЕЗЮМЕ)
  doc.setFillColor(227, 242, 253);
  doc.rect(margin, currentY, contentWidth, 25, 'F');
  
  currentY += 5;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Накопительные итоги:', margin + 5, currentY);
  currentY += 6;

  doc.setFontSize(8);
  const col1X = margin + 5;
  const col2X = margin + 90;
  const col3X = margin + 180;

  doc.setFont(undefined, 'normal');
  doc.text('Выполнено работ с начала года:', col1X, currentY);
  doc.setFont(undefined, 'bold');
  doc.text(`${formatCurrency(data.totals?.amountYTD || 0)} руб.`, col1X, currentY + 4);

  doc.setFont(undefined, 'normal');
  doc.text('В т.ч. до отчетного периода:', col2X, currentY);
  doc.setFont(undefined, 'bold');
  doc.text(`${formatCurrency(data.totals?.amountPrevPeriod || 0)} руб.`, col2X, currentY + 4);

  doc.setFont(undefined, 'normal');
  doc.text('За отчетный период (по КС-2):', col3X, currentY);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(25, 118, 210);
  doc.text(`${formatCurrency(data.totals?.amountCurrent || 0)} руб.`, col3X, currentY + 4);
  doc.setTextColor(0, 0, 0);

  currentY += 15;

  // 7. ОСНОВАНИЕ
  doc.setFillColor(227, 242, 253);
  doc.rect(margin, currentY, contentWidth, 12, 'F');
  
  currentY += 5;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('Основание для составления КС-3:', margin + 5, currentY);
  currentY += 4;
  doc.setFont(undefined, 'bold');
  doc.text(`Акт о приемке выполненных работ (КС-2) № ${data.actNumber || '—'} от ${formatDate(data.actDate)}`, margin + 5, currentY);
  
  currentY += 10;

  // 8. ПОДПИСАНТЫ
  if (data.signatories && data.signatories.length > 0) {
    // Проверка на новую страницу
    if (currentY > 180) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Подписи:', margin, currentY);
    currentY += 6;

    const signatoryWidth = (contentWidth - 10) / 2;
    let columnIndex = 0;

    data.signatories.forEach((signatory, index) => {
      const xPos = margin + (columnIndex * (signatoryWidth + 10));
      let yPos = currentY;

      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text(getRoleLabel(signatory.role), xPos, yPos);
      yPos += 3;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      const nameLines = doc.splitTextToSize(signatory.fullName || '', signatoryWidth - 5);
      doc.text(nameLines, xPos, yPos);
      yPos += nameLines.length * 3;
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      const posLines = doc.splitTextToSize(signatory.position || '', signatoryWidth - 5);
      doc.text(posLines, xPos, yPos);
      yPos += posLines.length * 3;
      
      // Линия для подписи
      doc.line(xPos, yPos + 2, xPos + 50, yPos + 2);
      doc.setFontSize(6);
      doc.text('(подпись)', xPos, yPos + 5);

      columnIndex++;
      if (columnIndex >= 2) {
        columnIndex = 0;
        currentY += 18;
        
        if (currentY > 180 && index < data.signatories.length - 1) {
          doc.addPage();
          currentY = 15;
        }
      }
    });
  }

  // 9. СОХРАНЕНИЕ ФАЙЛА
  doc.save(filename);}

// Вспомогательная функция для получения названия роли
function getRoleLabel(role) {
  const roleLabels = {
    contractor_chief: 'Руководитель подрядчика',
    contractor_accountant: 'Главный бухгалтер подрядчика',
    customer_chief: 'Руководитель заказчика',
    customer_inspector: 'Уполномоченный представитель заказчика',
    technical_supervisor: 'Технический надзор'
  };
  return roleLabels[role] || role;
}

export default generateKS3PDF;
