import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Настройка поддержки кириллицы (базовый шрифт)
// Примечание: для полной поддержки русского языка требуется добавить шрифт с кириллицей
// Пока используем встроенный шрифт с базовой поддержкой

/**
 * Генерирует PDF документ формы КС-2
 * (Акт о приемке выполненных работ)
 * ОКУД 0322005
 * 
 * @param {Object} data - Данные формы КС-2
 * @param {string} filename - Имя файла для сохранения
 */
export function generateKS2PDF(data, filename = 'ks2.pdf') {
  // Создаем PDF документ формата A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = 15;

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
  doc.text(data.okud || '0322005', margin, currentY + 4);
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`от ${formatDate(data.actDate)}`, pageWidth - margin - 30, currentY + 4, { align: 'right' });
  
  currentY += 15;

  // 2. НАЗВАНИЕ ФОРМЫ
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(data.formType || 'АКТ О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 6;
  doc.setFontSize(11);
  doc.text(`№ ${data.actNumber || '—'}`, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 10;

  // 3. ДАННЫЕ КОНТРАГЕНТОВ
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Подрядчик (Исполнитель):', margin, currentY);
  currentY += 5;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  if (data.contractor) {
    doc.text(data.contractor.name || '—', margin, currentY);
    currentY += 4;
    doc.setFontSize(8);
    doc.text(`ИНН: ${data.contractor.inn || '—'}  КПП: ${data.contractor.kpp || '—'}`, margin, currentY);
    currentY += 3;
    doc.text(`ОГРН: ${data.contractor.ogrn || '—'}`, margin, currentY);
    currentY += 3;
    const addressLines = doc.splitTextToSize(data.contractor.address || '—', contentWidth);
    doc.text(addressLines, margin, currentY);
    currentY += addressLines.length * 3;
  }
  
  currentY += 5;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Заказчик:', margin, currentY);
  currentY += 5;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  if (data.customer) {
    doc.text(data.customer.name || '—', margin, currentY);
    currentY += 4;
    doc.setFontSize(8);
    doc.text(`ИНН: ${data.customer.inn || '—'}  КПП: ${data.customer.kpp || '—'}`, margin, currentY);
    currentY += 3;
    doc.text(`ОГРН: ${data.customer.ogrn || '—'}`, margin, currentY);
    currentY += 3;
    const addressLines = doc.splitTextToSize(data.customer.address || '—', contentWidth);
    doc.text(addressLines, margin, currentY);
    currentY += addressLines.length * 3;
  }
  
  currentY += 5;

  // 4. ДОГОВОР
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Договор:', margin, currentY);
  currentY += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(`№ ${data.contract?.number || '—'} от ${formatDate(data.contract?.date)}`, margin, currentY);
  currentY += 7;

  // 5. ОБЪЕКТ СТРОИТЕЛЬСТВА
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Объект строительства:', margin, currentY);
  currentY += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(data.constructionObject?.name || '—', margin, currentY);
  currentY += 10;

  // 6. ТАБЛИЦА РАБОТ
  const tableData = (data.works || []).map((work, index) => [
    (work.position || index + 1).toString(),
    work.code || '—',
    work.name || '',
    work.unit || '—',
    formatCurrency(work.plannedQuantity),
    formatCurrency(work.actualQuantity),
    formatCurrency(work.price),
    formatCurrency(work.totalPrice)
  ]);

  doc.autoTable({
    startY: currentY,
    head: [[
      '№',
      'Код работы',
      'Наименование работ',
      'Ед.\nизм.',
      'По\nсмете',
      'Выпол-\nнено',
      'Цена,\nруб.',
      'Сумма,\nруб.'
    ]],
    body: tableData,
    foot: [[
      { content: 'ИТОГО:', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(data.totals?.amount || 0), styles: { fontStyle: 'bold' } }
    ]],
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 7
    },
    footStyles: {
      fillColor: [240, 240, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 25 }
    },
    margin: { left: margin, right: margin },
    theme: 'grid'
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // 7. ИТОГОВАЯ СУММА
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Всего принято работ на сумму: `, margin, currentY);
  doc.setFont(undefined, 'bold');
  doc.text(`${formatCurrency(data.totals?.amount || 0)} руб.`, margin + 70, currentY);
  currentY += 4;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('(в том числе НДС, если применимо)', margin, currentY);
  currentY += 10;

  // 8. ПОДПИСАНТЫ
  if (data.signatories && data.signatories.length > 0) {
    // Проверка на новую страницу
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Подписи:', margin, currentY);
    currentY += 7;

    data.signatories.forEach((signatory, index) => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(getRoleLabel(signatory.role), margin, currentY);
      currentY += 4;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(signatory.fullName || '', margin, currentY);
      currentY += 4;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(signatory.position || '', margin, currentY);
      currentY += 4;
      
      if (signatory.signedAt) {
        doc.text(`Подписано: ${formatDate(signatory.signedAt)}`, margin, currentY);
        currentY += 4;
      }
      
      // Линия для подписи
      doc.line(margin, currentY, margin + 60, currentY);
      doc.setFontSize(7);
      doc.text('(подпись)', margin, currentY + 3);
      currentY += 10;
    });
  }

  // 9. ПРИМЕЧАНИЯ
  if (data.notes) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Примечания:', margin, currentY);
    currentY += 4;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const notesLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(notesLines, margin, currentY);
  }

  // 10. СОХРАНЕНИЕ ФАЙЛА
  doc.save(filename);
  
  console.log(`✅ КС-2 PDF сгенерирован: ${filename}`);
}

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

export default generateKS2PDF;
