import ExcelJS from 'exceljs';
import { formatNumber, formatDate, numberToWords } from './excelFormatters.js';

/**
 * Генерация Excel файла КС-2 (Акт о приёмке выполненных работ)
 * Точное воспроизведение формы по ОКУД 0322005
 */

// Конфигурация ширины колонок (в символах Excel)
const COLUMN_WIDTHS = {
  A: 1.28515625,
  B: 6.28515625,
  C: 0.85546875,
  D: 8.43, // default
  E: 7.42578125,
  F: 5.0,
  G: 1.7109375,
  H: 8.43, // default
  I: 10.28515625,
  J: 1.85546875,
  K: 8.85546875,
  L: 8.28515625,
  M: 2.0,
  N: 2.28515625,
  O: 5.7109375,
  P: 7.140625,
  Q: 5.0,
  R: 5.0,
  S: 8.0,
  T: 2.5,
  U: 3.7109375,
  V: 2.0,
  W: 3.5703125,
  X: 4.42578125,
  Y: 2.42578125,
  Z: 3.140625,
  AA: 1.42578125,
  AB: 8.43, // default
  AC: 8.28515625,
  AD: 1.7109375,
  AE: 4.42578125,
  AF: 6.42578125,
  AG: 6.7109375
};

// Конфигурация высоты строк (в пунктах)
const ROW_HEIGHTS = {
  1: 12.0, 2: 12.0, 3: 12.0, 4: 15.75, 5: 12.75,
  6: 11.25, 7: 12.75, 8: 12.0, 9: 12.75, 10: 12.0,
  11: 12.75, 12: 12.0, 13: 12.75, 14: 12.0, 15: 12.75,
  16: 10.5, 17: 3.75, 18: 15.0, 19: 12.75, 20: 15.0,
  21: 6.75, 22: 12.0, 23: 12.75, 24: 15.0, // 24 changed to 15 from default
  25: 15.0, 26: 10.5, 27: 15.0, 28: 10.5, 29: 15.0,
  30: 45.0, 31: 15.0, 32: 15.0, 33: 15.0, 34: 15.0,
  35: 15.0, 36: 15.0, 37: 15.0, 38: 15.0, 39: 15.0, // 39 changed to 15 from default
  40: 15.0, 41: 15.0, // 40-41 changed to 15 from default
  42: 15.75, 43: 45.0, 44: 15.0, 45: 15.0, // 44-45 changed to 15 from default
  46: 15.0, 47: 15.0, // 46-47 changed to 15 from default
  48: 15.0, 49: 15.0, 50: 15.0, 51: 15.0, 52: 15.0,
  53: 15.0, 54: 15.0, 55: 15.0, 56: 15.0, 57: 15.0,
  58: 15.0, 59: 15.0, 60: 15.0, 61: 15.0, 62: 15.0, // 58-62 changed to 15 from default
  63: 10.5, 64: 11.25, 65: 15.75, 66: 11.25, 67: 15.0, // 67 changed to 15 from default
  68: 10.5, 69: 11.25, 70: 15.75
};

/**
 * Заполнение данных в шаблон КС-2
 * @param {ExcelJS.Worksheet} worksheet - Лист Excel
 * @param {Object} data - Данные акта из API
 * @param {Boolean} includeVat - Включить НДС 20%
 */
const fillKS2Data = (worksheet, data, includeVat = false) => {
  const font = { name: 'Times New Roman', size: 10 };
  
  // 1. НОМЕР И ДАТА ДОКУМЕНТА
  if (data.actNumber) {
    worksheet.getCell('N24').value = data.actNumber;
  }
  
  if (data.actDate) {
    worksheet.getCell('Q24').value = formatDate(data.actDate);
  }
  
  // 2. ЗАКАЗЧИК
  if (data.customer && data.customer.name) {
    worksheet.getCell('G9').value = data.customer.name;
  }
  
  // 3. ПОДРЯДЧИК
  if (data.contractor && data.contractor.name) {
    worksheet.getCell('H11').value = data.contractor.name;
  }
  
  // 4. СТРОЙКА (Адрес объекта)
  if (data.constructionObject && data.constructionObject.address) {
    worksheet.getCell('E13').value = data.constructionObject.address;
  }
  
  // 5. ОБЪЕКТ (Наименование объекта)
  if (data.constructionObject && data.constructionObject.name) {
    worksheet.getCell('C15').value = data.constructionObject.name;
  }
  
  // 6. ДОГОВОР ПОДРЯДА
  if (data.contract) {
    if (data.contract.number) {
      worksheet.getCell('AD18').value = data.contract.number;
    }
    if (data.contract.date) {
      worksheet.getCell('AD19').value = formatDate(data.contract.date);
    }
  }
  
  // 7. ПЕРИОД РАБОТ
  if (data.period) {
    if (data.period.from) {
      worksheet.getCell('W24').value = formatDate(data.period.from);
    }
    if (data.period.to) {
      worksheet.getCell('AA24').value = formatDate(data.period.to);
    }
  }
  
  // 8. СМЕТНАЯ СТОИМОСТЬ ПРОПИСЬЮ
  if (data.totals && data.totals.amount) {
    const amountInWords = numberToWords(data.totals.amount);
    worksheet.getCell('O27').value = amountInWords;
    worksheet.getCell('O27').font = { ...font, italic: true };
  }
  
  // 9. ТАБЛИЦА ВЫПОЛНЕННЫХ РАБОТ
  if (data.works && Array.isArray(data.works) && data.works.length > 0) {
    let rowIndex = 31; // Начинаем с строки 31 (первая строка данных)
    
    data.works.forEach((work, index) => {
      // Переход на вторую страницу после 8 строк
      if (rowIndex === 39) {
        rowIndex = 45; // Пропускаем строки 39-44 (итого первой страницы и заголовок второй)
      }
      
      // Номер по порядку (колонки A-B) - ячейки уже объединены в шаблоне
      worksheet.getCell(`A${rowIndex}`).value = index + 1;
      worksheet.getCell(`A${rowIndex}`).font = font;
      worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Позиция по смете / Код работы (колонки C-E) - ячейки уже объединены
      worksheet.getCell(`C${rowIndex}`).value = work.code || '';
      worksheet.getCell(`C${rowIndex}`).font = font;
      worksheet.getCell(`C${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Наименование работ (колонки F-N) - ячейки уже объединены
      worksheet.getCell(`F${rowIndex}`).value = work.name || '';
      worksheet.getCell(`F${rowIndex}`).font = font;
      worksheet.getCell(`F${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      // Автоподстройка высоты строки под текст
      // Улучшенный расчет: уменьшаем chars per line для более консервативной оценки
      const workNameLength = (work.name || '').length;
      const charsPerLine = 50; // Уменьшено с 70 до 50 для лучшего отображения
      const linesNeeded = Math.ceil(workNameLength / charsPerLine);
      const minHeight = 20; // Увеличена минимальная высота с 15 до 20
      const lineHeight = 15; // Увеличена высота строки с 12 до 15
      const calculatedHeight = Math.max(minHeight, linesNeeded * lineHeight + 5); // +5 для padding
      worksheet.getRow(rowIndex).height = calculatedHeight;
      
      // Номер единичной расценки (колонки O-P) - ячейки уже объединены
      worksheet.getCell(`O${rowIndex}`).font = font;
      
      // Единица измерения (колонки Q-T) - ячейки уже объединены
      worksheet.getCell(`Q${rowIndex}`).value = work.unit || '';
      worksheet.getCell(`Q${rowIndex}`).font = font;
      worksheet.getCell(`Q${rowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Количество (колонки U-X) - ячейки уже объединены
      worksheet.getCell(`U${rowIndex}`).value = formatNumber(work.actualQuantity, 2);
      worksheet.getCell(`U${rowIndex}`).font = font;
      worksheet.getCell(`U${rowIndex}`).alignment = { horizontal: 'right', vertical: 'middle' };
      
      // Цена за единицу (колонки Y-AC) - ячейки уже объединены
      worksheet.getCell(`Y${rowIndex}`).value = formatNumber(work.price, 2);
      worksheet.getCell(`Y${rowIndex}`).font = font;
      worksheet.getCell(`Y${rowIndex}`).alignment = { horizontal: 'right', vertical: 'middle' };
      
      // Стоимость (колонки AD-AG) - ячейки уже объединены
      worksheet.getCell(`AD${rowIndex}`).value = formatNumber(work.totalPrice, 2);
      worksheet.getCell(`AD${rowIndex}`).font = font;
      worksheet.getCell(`AD${rowIndex}`).alignment = { horizontal: 'right', vertical: 'middle' };
      
      rowIndex++;
    });
    
    // 10. ИТОГО (строка 39 или 60 в зависимости от количества работ)
    const itotoRow = data.works.length <= 8 ? 39 : 60;
    
    // Расчет итоговых сумм
    let totalAmount = parseFloat(data.totals?.amount || 0);
    let vatAmount = includeVat ? (totalAmount * 0.20) : 0;
    let totalWithVat = totalAmount + vatAmount;
    
    // Ячейки уже объединены в шаблоне
    worksheet.getCell(`F${itotoRow}`).value = 'Итого';
    worksheet.getCell(`F${itotoRow}`).font = { ...font, bold: true };
    worksheet.getCell(`F${itotoRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
    
    worksheet.getCell(`AD${itotoRow}`).value = formatNumber(totalAmount, 2);
    worksheet.getCell(`AD${itotoRow}`).font = { ...font, bold: true };
    worksheet.getCell(`AD${itotoRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    
    // Если включен НДС, добавляем дополнительные строки
    if (includeVat) {
      const vatRow = itotoRow + 1;
      const totalRow = itotoRow + 2;
      
      // Строка НДС
      worksheet.getCell(`F${vatRow}`).value = 'НДС 20%';
      worksheet.getCell(`F${vatRow}`).font = { ...font, bold: true };
      worksheet.getCell(`F${vatRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      
      worksheet.getCell(`AD${vatRow}`).value = formatNumber(vatAmount, 2);
      worksheet.getCell(`AD${vatRow}`).font = { ...font, bold: true };
      worksheet.getCell(`AD${vatRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
      
      // Строка Всего с НДС
      worksheet.getCell(`F${totalRow}`).value = 'Всего с НДС';
      worksheet.getCell(`F${totalRow}`).font = { ...font, bold: true };
      worksheet.getCell(`F${totalRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      
      worksheet.getCell(`AD${totalRow}`).value = formatNumber(totalWithVat, 2);
      worksheet.getCell(`AD${totalRow}`).font = { ...font, bold: true };
      worksheet.getCell(`AD${totalRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    }
  }
  
  // 11. ПОДПИСИ - СДАЛ (Подрядчик)
  if (data.signatories && Array.isArray(data.signatories)) {
    const contractorSigner = data.signatories.find(s => s.role === 'contractor_chief');
    if (contractorSigner) {
      // Должность
      worksheet.getCell('F62').value = contractorSigner.position || '';
      worksheet.getCell('F62').font = font;
      
      // ФИО
      worksheet.getCell('N62').value = contractorSigner.fullName || '';
      worksheet.getCell('N62').font = font;
    }
  }
  
  // 12. ПОДПИСИ - ПРИНЯЛ (Заказчик)
  if (data.signatories && Array.isArray(data.signatories)) {
    const customerSigner = data.signatories.find(s => s.role === 'customer_chief');
    if (customerSigner) {
      // Должность
      worksheet.getCell('F67').value = customerSigner.position || '';
      worksheet.getCell('F67').font = font;
      
      // ФИО
      worksheet.getCell('N67').value = customerSigner.fullName || '';
      worksheet.getCell('N67').font = font;
    }
  }
};

/**
 * Применение границ к ячейкам согласно ТЗ
 */
const applyBorders = (worksheet) => {
  const black = '00000000';
  
  // Вспомогательная функция для установки границ
  const setBorder = (cell, sides) => {
    const borders = cell.border || {};
    if (sides.bottom) borders.bottom = { style: sides.bottom, color: { argb: black } };
    if (sides.left) borders.left = { style: sides.left, color: { argb: black } };
    if (sides.right) borders.right = { style: sides.right, color: { argb: black } };
    if (sides.top) borders.top = { style: sides.top, color: { argb: black } };
    cell.border = borders;
  };
  
  // Применение границ согласно ТЗ из Forma_KC2_BORDERS_FILLS.md
  // Таблица строк 29-39 (первая страница)
  for (let row = 29; row <= 38; row++) {
    setBorder(worksheet.getCell(`A${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`B${row}`), row === 29 ? { bottom: 'thin', top: 'thin' } : row === 30 ? { bottom: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', right: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`C${row}`), row === 29 ? { bottom: 'thin', top: 'thin' } : row === 30 ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`D${row}`), row === 29 ? { bottom: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`E${row}`), row === 29 ? { bottom: 'thin', right: 'thin', top: 'thin' } : row === 30 ? { bottom: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', right: 'thin', top: 'thin' });
    
    // Колонка F-N (название работ)
    if (row === 29) {
      setBorder(worksheet.getCell(`F${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`N${row}`), { right: 'thin', top: 'thin' });
    } else if (row === 30) {
      setBorder(worksheet.getCell(`F${row}`), { bottom: 'thin', left: 'thin' });
      setBorder(worksheet.getCell(`N${row}`), { bottom: 'thin', right: 'thin' });
    } else {
      setBorder(worksheet.getCell(`F${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`N${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    for (let col of ['G', 'H', 'I', 'J', 'K', 'L', 'M']) {
      if (row === 29) {
        setBorder(worksheet.getCell(`${col}${row}`), { top: 'thin' });
      } else if (row === 30) {
        setBorder(worksheet.getCell(`${col}${row}`), { bottom: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), { bottom: 'thin', top: 'thin' });
      }
    }
    
    // Колонки O-P (номер по смете)
    if (row === 29) {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), row === 29 ? { right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
    } else if (row === 30) {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), { bottom: 'thin' });
    } else if (row <= 34) {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), { bottom: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки Q-T (единица измерения)
    for (let col of ['Q', 'R', 'S']) {
      if (row === 29) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Q' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 30) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Q' ? { bottom: 'thin', left: 'thin' } : { bottom: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Q' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 29) {
      setBorder(worksheet.getCell(`T${row}`), { right: 'thin', top: 'thin' });
    } else if (row === 30) {
      setBorder(worksheet.getCell(`T${row}`), { bottom: 'thin', right: 'thin' });
    } else {
      setBorder(worksheet.getCell(`T${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки U-X (количество)
    for (let col of ['U', 'V', 'W']) {
      if (row === 29) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 30) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 38) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 29) {
      setBorder(worksheet.getCell(`X${row}`), { bottom: 'thin', top: 'thin' });
    } else if (row === 30) {
      setBorder(worksheet.getCell(`X${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`X${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки Y-AC (цена за единицу)
    for (let col of ['Y', 'Z', 'AA', 'AB']) {
      if (row === 29) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Y' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 30) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Y' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Y' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 29) {
      setBorder(worksheet.getCell(`AC${row}`), { bottom: 'thin', top: 'thin' });
    } else if (row === 30) {
      setBorder(worksheet.getCell(`AC${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`AC${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки AD-AG (стоимость работ)
    for (let col of ['AD', 'AE', 'AF']) {
      if (row === 29) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'AD' ? { bottom: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 30) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'AD' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'AD' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 29) {
      setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else if (row === 30) {
      setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
  }
  
  // Строка 39 (Итого)
  setBorder(worksheet.getCell('U39'), { bottom: 'thin', left: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('V39'), { bottom: 'thin' });
  setBorder(worksheet.getCell('W39'), { bottom: 'thin' });
  setBorder(worksheet.getCell('X39'), { bottom: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('Y39'), { bottom: 'thin', left: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('Z39'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AA39'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AB39'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AC39'), { bottom: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('AD39'), { bottom: 'thin', left: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('AE39'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AF39'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AG39'), { bottom: 'thin', right: 'thin' });
  
  // Таблица строк 42-59 (вторая страница)
  for (let row = 42; row <= 57; row++) {
    setBorder(worksheet.getCell(`A${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`B${row}`), row === 42 ? { bottom: 'thin', top: 'thin' } : row === 43 ? { bottom: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', right: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`C${row}`), row === 42 ? { bottom: 'thin', top: 'thin' } : row === 43 ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`D${row}`), row === 42 ? { bottom: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
    setBorder(worksheet.getCell(`E${row}`), row === 42 ? { bottom: 'thin', right: 'thin', top: 'thin' } : row === 43 ? { bottom: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', right: 'thin', top: 'thin' });
    
    // Колонка F-N
    if (row === 42) {
      setBorder(worksheet.getCell(`F${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`N${row}`), { right: 'thin', top: 'thin' });
    } else if (row === 43) {
      setBorder(worksheet.getCell(`F${row}`), { bottom: 'thin', left: 'thin' });
      setBorder(worksheet.getCell(`N${row}`), { bottom: 'thin', right: 'thin' });
    } else {
      setBorder(worksheet.getCell(`F${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`N${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    for (let col of ['G', 'H', 'I', 'J', 'K', 'L', 'M']) {
      if (row === 42) {
        setBorder(worksheet.getCell(`${col}${row}`), { top: 'thin' });
      } else if (row === 43) {
        setBorder(worksheet.getCell(`${col}${row}`), { bottom: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), { bottom: 'thin', top: 'thin' });
      }
    }
    
    // Колонки O-P
    if (row === 42) {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), { top: 'thin' });
    } else if (row === 43) {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), { bottom: 'thin' });
    } else if (row <= 47) {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), { bottom: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`O${row}`), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
      setBorder(worksheet.getCell(`P${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки Q-T
    for (let col of ['Q', 'R', 'S']) {
      if (row === 42) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Q' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 43) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Q' ? { bottom: 'thin', left: 'thin' } : { bottom: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Q' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 42) {
      setBorder(worksheet.getCell(`T${row}`), { right: 'thin', top: 'thin' });
    } else if (row === 43) {
      setBorder(worksheet.getCell(`T${row}`), { bottom: 'thin', right: 'thin' });
    } else {
      setBorder(worksheet.getCell(`T${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки U-X
    for (let col of ['U', 'V', 'W']) {
      if (row === 42) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 43) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 57) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'U' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 42) {
      setBorder(worksheet.getCell(`X${row}`), { bottom: 'thin', top: 'thin' });
    } else if (row === 43) {
      setBorder(worksheet.getCell(`X${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`X${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки Y-AC
    for (let col of ['Y', 'Z', 'AA', 'AB']) {
      if (row === 42) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Y' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 43) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Y' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'Y' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 42) {
      setBorder(worksheet.getCell(`AC${row}`), { bottom: 'thin', top: 'thin' });
    } else if (row === 43) {
      setBorder(worksheet.getCell(`AC${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`AC${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
    
    // Колонки AD-AG
    for (let col of ['AD', 'AE', 'AF']) {
      if (row === 42) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'AD' ? { bottom: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else if (row === 43) {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'AD' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      } else {
        setBorder(worksheet.getCell(`${col}${row}`), col === 'AD' ? { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' } : { bottom: 'thin', top: 'thin' });
      }
    }
    
    if (row === 42) {
      setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else if (row === 43) {
      setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    } else {
      setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'thin', top: 'thin' });
    }
  }
  
  // Строка 58 (Итого)
  setBorder(worksheet.getCell('U58'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('V58'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('W58'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('X58'), { bottom: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('Y58'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('Z58'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AA58'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AB58'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AC58'), { bottom: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AD58'), { bottom: 'thin', left: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('AE58'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AF58'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AG58'), { bottom: 'thin', right: 'thin' });
  
  // Строка 59 (Всего по акту)
  setBorder(worksheet.getCell('U59'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('V59'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('W59'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('X59'), { bottom: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('Y59'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('Z59'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AA59'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AB59'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AC59'), { bottom: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AD59'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AE59'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AF59'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AG59'), { bottom: 'thin', right: 'thin', top: 'thin' });
  
  // Границы для остальных ячеек (шапка формы, реквизиты, подписи)
  // Строка 4 (ОКУД, Код)
  setBorder(worksheet.getCell('AD4'), { bottom: 'medium', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AE4'), { bottom: 'medium', top: 'thin' });
  setBorder(worksheet.getCell('AF4'), { bottom: 'medium', top: 'thin' });
  setBorder(worksheet.getCell('AG4'), { bottom: 'medium', right: 'thin', top: 'thin' });
  
  // Строка 5-20 (остальные коды)
  const codeRows = [
    { row: 5, left: 'medium', bottom: 'thin', right: 'medium', top: 'medium' },
    { row: 6, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 7, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 8, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 9, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 10, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 11, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 12, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 13, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 14, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 15, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 16, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 17, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 18, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 19, left: 'medium', bottom: 'thin', right: 'medium', top: 'thin' },
    { row: 20, left: 'medium', bottom: 'medium', right: 'medium', top: 'thin' }
  ];
  
  codeRows.forEach(({ row, left, bottom, right, top }) => {
    setBorder(worksheet.getCell(`AD${row}`), { left, bottom, right: 'thin', top });
    setBorder(worksheet.getCell(`AE${row}`), { bottom, top });
    setBorder(worksheet.getCell(`AF${row}`), { bottom, top });
    setBorder(worksheet.getCell(`AG${row}`), { right, bottom, top });
  });
  
  // Остальные границы из ТЗ (реквизиты, подписи и т.д.)
  // Строки для подписей и реквизитов (строка 7 - Инвестор)
  for (let col of ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA']) {
    setBorder(worksheet.getCell(`${col}7`), { bottom: 'thin' });
  }
  
  // Строка 9 - Заказчик (без E и F - они лишние)
  for (let col of ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA']) {
    setBorder(worksheet.getCell(`${col}9`), { bottom: 'thin' });
  }
  
  // Строка 11 - Подрядчик (без F и G - они лишние)
  for (let col of ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA']) {
    setBorder(worksheet.getCell(`${col}11`), { bottom: 'thin' });
  }
  
  // Строка 13 - Стройка
  for (let col of ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB']) {
    setBorder(worksheet.getCell(`${col}13`), { bottom: 'thin' });
  }
  
  // Строка 15 - Объект
  for (let col of ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB']) {
    setBorder(worksheet.getCell(`${col}15`), { bottom: 'thin' });
  }
  
  // Подписи (строки 62-63, 67-68)
  for (let col of ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG']) {
    setBorder(worksheet.getCell(`${col}62`), { bottom: 'thin' });
    setBorder(worksheet.getCell(`${col}63`), { top: 'thin' });
    setBorder(worksheet.getCell(`${col}67`), { bottom: 'thin' });
    setBorder(worksheet.getCell(`${col}68`), { top: 'thin' });
  }
  
  // Границы для строк 22-24 (документ)
  setBorder(worksheet.getCell('N22'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('O22'), { right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('P22'), { right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('Q22'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('R22'), { top: 'thin' });
  setBorder(worksheet.getCell('S22'), { top: 'thin' });
  setBorder(worksheet.getCell('T22'), { top: 'thin' });
  setBorder(worksheet.getCell('U22'), { right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('W22'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('X22'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('Y22'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('Z22'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AA22'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AB22'), { top: 'thin' });
  setBorder(worksheet.getCell('AC22'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AD22'), { bottom: 'thin', right: 'thin', top: 'thin' });
  
  setBorder(worksheet.getCell('N23'), { bottom: 'thin', left: 'thin' });
  setBorder(worksheet.getCell('O23'), { bottom: 'thin' });
  setBorder(worksheet.getCell('P23'), { bottom: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('Q23'), { bottom: 'thin', left: 'thin' });
  setBorder(worksheet.getCell('R23'), { bottom: 'thin' });
  setBorder(worksheet.getCell('S23'), { bottom: 'thin' });
  setBorder(worksheet.getCell('T23'), { bottom: 'thin' });
  setBorder(worksheet.getCell('U23'), { bottom: 'thin', right: 'thin' });
  setBorder(worksheet.getCell('W23'), { left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('X23'), { top: 'thin' });
  setBorder(worksheet.getCell('Y23'), { top: 'thin' });
  setBorder(worksheet.getCell('Z23'), { right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AA23'), { left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AB23'), { top: 'thin' });
  setBorder(worksheet.getCell('AC23'), { top: 'thin' });
  setBorder(worksheet.getCell('AD23'), { right: 'thin', top: 'thin' });
  
  setBorder(worksheet.getCell('N24'), { bottom: 'medium', left: 'medium', right: 'thin', top: 'medium' });
  setBorder(worksheet.getCell('O24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('P24'), { bottom: 'medium', right: 'thin', top: 'medium' });
  setBorder(worksheet.getCell('Q24'), { bottom: 'medium', left: 'thin', right: 'thin', top: 'medium' });
  setBorder(worksheet.getCell('R24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('S24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('T24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('U24'), { bottom: 'medium', right: 'thin', top: 'medium' });
  setBorder(worksheet.getCell('W24'), { bottom: 'medium', left: 'medium', right: 'thin', top: 'medium' });
  setBorder(worksheet.getCell('X24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('Y24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('Z24'), { bottom: 'medium', right: 'thin', top: 'medium' });
  setBorder(worksheet.getCell('AA24'), { bottom: 'medium', left: 'thin', right: 'thin', top: 'medium' });
  setBorder(worksheet.getCell('AB24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('AC24'), { bottom: 'medium', top: 'medium' });
  setBorder(worksheet.getCell('AD24'), { bottom: 'medium', right: 'thin', top: 'medium' });
  
  // Строка 27
  for (let col of ['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD']) {
    setBorder(worksheet.getCell(`${col}27`), { bottom: 'thin' });
  }
  
  // Другие границы согласно ТЗ
  setBorder(worksheet.getCell('C15'), { bottom: 'thin', right: 'medium' });
  setBorder(worksheet.getCell('D13'), { bottom: 'thin' });
  setBorder(worksheet.getCell('D15'), { bottom: 'thin' });
  setBorder(worksheet.getCell('E13'), { bottom: 'thin', right: 'medium' });
  setBorder(worksheet.getCell('E15'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AB13'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AB15'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AA7'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AA9'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AA11'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AA13'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AA15'), { bottom: 'thin' });
  setBorder(worksheet.getCell('AA16'), { top: 'thin' });
  setBorder(worksheet.getCell('AB16'), { top: 'thin' });
  setBorder(worksheet.getCell('AC13'), { bottom: 'thin', right: 'medium' });
  setBorder(worksheet.getCell('AC15'), { bottom: 'thin', right: 'medium' });
  setBorder(worksheet.getCell('AC16'), { top: 'thin' });
  
  // Дополнительные границы из ТЗ
  setBorder(worksheet.getCell('AB18'), { right: 'thin' });
  setBorder(worksheet.getCell('AC18'), { bottom: 'thin', left: 'thin', right: 'medium', top: 'thin' });
  setBorder(worksheet.getCell('AC19'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AC20'), { right: 'medium' });
  setBorder(worksheet.getCell('AC5'), { right: 'medium' });
  setBorder(worksheet.getCell('AE19'), { bottom: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AE20'), { bottom: 'medium', top: 'thin' });
  setBorder(worksheet.getCell('AF19'), { bottom: 'thin', left: 'thin', right: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AF20'), { bottom: 'medium', top: 'thin' });
  
  setBorder(worksheet.getCell('T18'), { right: 'thin' });
  setBorder(worksheet.getCell('T59'), { right: 'thin' });
  setBorder(worksheet.getCell('Z20'), { right: 'medium' });
  setBorder(worksheet.getCell('Y5'), { right: 'medium' });
  
  // Дополнительные границы для строк с кодами
  for (let row = 10; row <= 20; row += 2) {
    setBorder(worksheet.getCell(`AE${row}`), { top: 'thin' });
    setBorder(worksheet.getCell(`AF${row}`), { top: 'thin' });
  }
  
  for (let row = 11; row <= 19; row += 2) {
    setBorder(worksheet.getCell(`AE${row}`), { bottom: 'thin' });
    setBorder(worksheet.getCell(`AF${row}`), { bottom: 'thin' });
  }
  
  // Четные строки для кодов
  for (let row = 8; row <= 18; row += 2) {
    setBorder(worksheet.getCell(`AE${row}`), { top: 'thin' });
    setBorder(worksheet.getCell(`AF${row}`), { top: 'thin' });
  }
  
  for (let row = 7; row <= 17; row += 2) {
    setBorder(worksheet.getCell(`AE${row}`), { bottom: 'thin' });
    setBorder(worksheet.getCell(`AF${row}`), { bottom: 'thin' });
  }
  
  setBorder(worksheet.getCell('AE18'), { bottom: 'thin', top: 'thin' });
  setBorder(worksheet.getCell('AF18'), { bottom: 'thin', top: 'thin' });
  
  // Границы для правого столбца кодов
  for (let row = 10; row <= 18; row += 2) {
    setBorder(worksheet.getCell(`AG${row}`), { right: 'medium', top: 'thin' });
  }
  
  for (let row = 7; row <= 17; row += 2) {
    setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'medium' });
  }
  
  for (let row = 8; row <= 16; row += 2) {
    setBorder(worksheet.getCell(`AG${row}`), { right: 'medium', top: 'thin' });
  }
  
  for (let row = 9; row <= 17; row += 2) {
    setBorder(worksheet.getCell(`AG${row}`), { bottom: 'thin', right: 'medium' });
  }
  
  setBorder(worksheet.getCell('AG18'), { bottom: 'thin', right: 'medium', top: 'thin' });
  setBorder(worksheet.getCell('AG19'), { bottom: 'thin', right: 'medium', top: 'thin' });
  setBorder(worksheet.getCell('AG20'), { bottom: 'medium', right: 'medium', top: 'thin' });
  
  // Дополнительные границы для W16, X16, Y16, Z16
  setBorder(worksheet.getCell('W16'), { top: 'thin' });
  setBorder(worksheet.getCell('X16'), { top: 'thin' });
  setBorder(worksheet.getCell('Y16'), { top: 'thin' });
  setBorder(worksheet.getCell('Z16'), { top: 'thin' });
};

/**
 * Создание базового шаблона КС-2
 */
export const generateKS2Excel = async (data = {}, includeVat = false) => {
  try {const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('КС-2', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.4,
        bottom: 0.4,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  // Установка ширины колонок
  Object.entries(COLUMN_WIDTHS).forEach(([col, width]) => {
    worksheet.getColumn(col).width = width;
  });

  // Установка высоты строк
  Object.entries(ROW_HEIGHTS).forEach(([rowNum, height]) => {
    worksheet.getRow(parseInt(rowNum)).height = height;
  });

  // ============ ШАПКА ФОРМЫ (строки 1-3) ============
  
  // Строка 1
  worksheet.getCell('Y1').value = 'Унифицированная форма № КС- 2';
  worksheet.getCell('Y1').font = { name: 'Times New Roman', size: 9 };
  
  // Строка 2
  worksheet.getCell('Y2').value = 'Утверждена постановлением Госкомстата России';
  worksheet.getCell('Y2').font = { name: 'Times New Roman', size: 9 };
  
  // Строка 3
  worksheet.getCell('Y3').value = 'от 11.11.99 № 100';
  worksheet.getCell('Y3').font = { name: 'Times New Roman', size: 9 };

  // ============ КОДЫ (строки 4-20) ============
  
  // Строка 4
  worksheet.mergeCells('AD4:AG4');
  worksheet.getCell('AD4').value = 'Код';
  worksheet.getCell('AD4').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('AD4').alignment = { horizontal: 'center' };
  
  // Строка 5
  worksheet.mergeCells('Y5:AC5');
  worksheet.getCell('Y5').value = 'Форма по ОКУД  ';
  worksheet.getCell('Y5').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Y5').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD5:AG5');
  worksheet.getCell('AD5').value = '0322005';
  worksheet.getCell('AD5').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD5').alignment = { horizontal: 'center' };

  // ============ ИНВЕСТОР (строка 7) ============
  
  worksheet.getCell('B7').value = 'Инвестор';
  worksheet.getCell('B7').font = { name: 'Times New Roman', size: 10 };
  
  worksheet.mergeCells('E7:AA7');
  worksheet.getCell('E7').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('E7').alignment = { horizontal: 'center' };
  
  worksheet.getCell('AC7').value = 'по ОКПО';
  worksheet.getCell('AC7').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AC7').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD6:AG7');
  worksheet.getCell('AD6').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD6').alignment = { horizontal: 'center' };

  // Строка 8 - подсказка
  worksheet.getCell('J8').value = '(организация, адрес, телефон, факс)';
  worksheet.getCell('J8').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('J8').alignment = { vertical: 'top' };

  // ============ ЗАКАЗЧИК (строка 9) ============
  
  worksheet.getCell('B9').value = 'Заказчик (Генподрядчик)';
  worksheet.getCell('B9').font = { name: 'Times New Roman', size: 10 };
  
  worksheet.mergeCells('G9:AA9');
  worksheet.getCell('G9').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('G9').alignment = { horizontal: 'center' };
  
  worksheet.getCell('AC9').value = 'по ОКПО';
  worksheet.getCell('AC9').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AC9').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD8:AG9');
  worksheet.getCell('AD8').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD8').alignment = { horizontal: 'center' };

  // Строка 10 - подсказка
  worksheet.getCell('J10').value = '(организация, адрес, телефон, факс)';
  worksheet.getCell('J10').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('J10').alignment = { vertical: 'top' };

  // ============ ПОДРЯДЧИК (строка 11) ============
  
  worksheet.getCell('B11').value = 'Подрядчик (Субподрядчик)';
  worksheet.getCell('B11').font = { name: 'Times New Roman', size: 10 };
  
  worksheet.mergeCells('H11:AA11');
  worksheet.getCell('H11').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('H11').alignment = { horizontal: 'center' };
  
  worksheet.getCell('AC11').value = 'по ОКПО';
  worksheet.getCell('AC11').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AC11').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD10:AG11');
  worksheet.getCell('AD10').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD10').alignment = { horizontal: 'center' };

  // Строка 12 - подсказка
  worksheet.getCell('J12').value = '(организация, адрес, телефон, факс)';
  worksheet.getCell('J12').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('J12').alignment = { vertical: 'top' };

  // ============ СТРОЙКА (строка 13) ============
  
  worksheet.getCell('B13').value = 'Стройка';
  worksheet.getCell('B13').font = { name: 'Times New Roman', size: 10 };
  
  worksheet.mergeCells('E13:AC13');
  worksheet.getCell('E13').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('E13').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('AD12:AG13');
  worksheet.getCell('AD12').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD12').alignment = { horizontal: 'center' };

  // Строка 14 - подсказка
  worksheet.getCell('J14').value = '(наименование, адрес)';
  worksheet.getCell('J14').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('J14').alignment = { vertical: 'top' };

  // ============ ОБЪЕКТ (строка 15) ============
  
  worksheet.getCell('B15').value = 'Объект';
  worksheet.getCell('B15').font = { name: 'Times New Roman', size: 10 };
  
  worksheet.mergeCells('C15:AC15');
  worksheet.getCell('C15').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('C15').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('AD14:AG15');
  worksheet.getCell('AD14').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD14').alignment = { horizontal: 'center' };

  // Строка 16 - подсказка
  worksheet.getCell('J16').value = '(наименование)';
  worksheet.getCell('J16').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('J16').alignment = { vertical: 'top' };

  // ============ ВИД ДЕЯТЕЛЬНОСТИ (строки 16-17) ============
  
  worksheet.mergeCells('W16:AC17');
  worksheet.getCell('W16').value = 'Вид деятельности по ОКДП  ';
  worksheet.getCell('W16').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('W16').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD16:AG17');
  worksheet.getCell('AD16').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('AD16').alignment = { horizontal: 'center' };

  // ============ ДОГОВОР ПОДРЯДА (строки 18-19) ============
  
  // Строка 18
  worksheet.mergeCells('T18:AB18');
  worksheet.getCell('T18').value = 'Договор подряда (контракт)';
  worksheet.getCell('T18').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('T18').alignment = { horizontal: 'right' };
  
  worksheet.getCell('AC18').value = 'номер';
  worksheet.getCell('AC18').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AC18').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD18:AG18');
  worksheet.getCell('AD18').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD18').alignment = { horizontal: 'center' };

  // Строка 19
  worksheet.getCell('AC19').value = 'дата';
  worksheet.getCell('AC19').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AC19').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD19:AE19');
  worksheet.getCell('AD19').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD19').alignment = { horizontal: 'center' };

  // ============ ВИД ОПЕРАЦИИ (строка 20) ============
  
  worksheet.mergeCells('Z20:AC20');
  worksheet.getCell('Z20').value = 'Вид операции';
  worksheet.getCell('Z20').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Z20').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('AD20:AG20');
  worksheet.getCell('AD20').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD20').alignment = { horizontal: 'center' };

  // ============ АКТ - ЗАГОЛОВОК (строки 22-25) ============
  
  // Строка 22-23: Номер документа
  worksheet.mergeCells('N22:P23');
  worksheet.getCell('N22').value = 'Номер документа';
  worksheet.getCell('N22').font = { name: 'Times New Roman', size: 9 };
  worksheet.getCell('N22').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Строка 22-23: Дата составления
  worksheet.mergeCells('Q22:U23');
  worksheet.getCell('Q22').value = 'Дата составления';
  worksheet.getCell('Q22').font = { name: 'Times New Roman', size: 9 };
  worksheet.getCell('Q22').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Строка 22: Отчетный период
  worksheet.mergeCells('W22:AD22');
  worksheet.getCell('W22').value = 'Отчетный период';
  worksheet.getCell('W22').font = { name: 'Times New Roman', size: 9 };
  worksheet.getCell('W22').alignment = { horizontal: 'center' };
  
  // Строка 23: с
  worksheet.mergeCells('W23:Z23');
  worksheet.getCell('W23').value = 'с';
  worksheet.getCell('W23').font = { name: 'Times New Roman', size: 9 };
  worksheet.getCell('W23').alignment = { horizontal: 'center' };
  
  // Строка 23: по
  worksheet.mergeCells('AA23:AD23');
  worksheet.getCell('AA23').value = 'по';
  worksheet.getCell('AA23').font = { name: 'Times New Roman', size: 9 };
  worksheet.getCell('AA23').alignment = { horizontal: 'center' };
  
  // Строка 24: поля для данных
  worksheet.getCell('L24').value = 'АКТ';
  worksheet.getCell('L24').font = { name: 'Times New Roman', size: 11, bold: true };
  worksheet.getCell('L24').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('N24:P24');
  worksheet.getCell('N24').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('N24').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('Q24:U24');
  worksheet.getCell('Q24').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Q24').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('W24:Z24');
  worksheet.getCell('W24').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('W24').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('AA24:AD24');
  worksheet.getCell('AA24').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AA24').alignment = { horizontal: 'center' };
  
  // Строка 25: О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ
  worksheet.mergeCells('J25:S25');
  worksheet.getCell('J25').value = 'О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ';
  worksheet.getCell('J25').font = { name: 'Times New Roman', size: 11, bold: true };
  worksheet.getCell('J25').alignment = { horizontal: 'center' };

  // ============ СМЕТНАЯ СТОИМОСТЬ (строка 27) ============
  
  worksheet.getCell('B27').value = 'Сметная (договорная) стоимость в соответствии с договором подряда (субподряда)';
  worksheet.getCell('B27').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('B27').alignment = { horizontal: 'left' };
  
  worksheet.mergeCells('O27:AD27');
  worksheet.getCell('O27').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('O27').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.getCell('AE27').value = 'руб.';
  worksheet.getCell('AE27').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AE27').alignment = { horizontal: 'right' };

  // ============ ТАБЛИЦА - ШАПКА (строки 29-31) ============
  
  // Строка 29: Номер
  worksheet.mergeCells('A29:E29');
  worksheet.getCell('A29').value = 'Номер';
  worksheet.getCell('A29').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('A29').alignment = { horizontal: 'center' };
  
  // Строка 29-30: Наименование работ
  worksheet.mergeCells('F29:N30');
  worksheet.getCell('F29').value = 'Наименование работ';
  worksheet.getCell('F29').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('F29').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Строка 29-30: Номер единичной расценки
  worksheet.mergeCells('O29:P30');
  worksheet.getCell('O29').value = 'Номер единичной расценки';
  worksheet.getCell('O29').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('O29').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 29-30: Единица измерения
  worksheet.mergeCells('Q29:T30');
  worksheet.getCell('Q29').value = 'Единица измерения';
  worksheet.getCell('Q29').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Q29').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 29: Выполнено работ
  worksheet.mergeCells('U29:AG29');
  worksheet.getCell('U29').value = 'Выполнено работ';
  worksheet.getCell('U29').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('U29').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 30: по порядку
  worksheet.mergeCells('A30:B30');
  worksheet.getCell('A30').value = 'по\nпоряд-\nку';
  worksheet.getCell('A30').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('A30').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 30: позиции по смете
  worksheet.mergeCells('C30:E30');
  worksheet.getCell('C30').value = 'позиции по смете';
  worksheet.getCell('C30').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('C30').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 30: количество
  worksheet.mergeCells('U30:X30');
  worksheet.getCell('U30').value = 'количество';
  worksheet.getCell('U30').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('U30').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Строка 30: цена за единицу
  worksheet.mergeCells('Y30:AC30');
  worksheet.getCell('Y30').value = 'цена за единицу,\nруб.';
  worksheet.getCell('Y30').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Y30').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 30: стоимость
  worksheet.mergeCells('AD30:AG30');
  worksheet.getCell('AD30').value = 'стоимость,\nруб.';
  worksheet.getCell('AD30').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD30').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 31: Нумерация колонок 1-8
  worksheet.mergeCells('A31:B31');
  worksheet.getCell('A31').value = '1';
  worksheet.getCell('A31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('A31').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('C31:E31');
  worksheet.getCell('C31').value = '2';
  worksheet.getCell('C31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('C31').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('F31:N31');
  worksheet.getCell('F31').value = '3';
  worksheet.getCell('F31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('F31').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('O31:P31');
  worksheet.getCell('O31').value = '4';
  worksheet.getCell('O31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('O31').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('Q31:T31');
  worksheet.getCell('Q31').value = '5';
  worksheet.getCell('Q31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Q31').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('U31:X31');
  worksheet.getCell('U31').value = '6';
  worksheet.getCell('U31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('U31').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('Y31:AC31');
  worksheet.getCell('Y31').value = '7';
  worksheet.getCell('Y31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Y31').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('AD31:AG31');
  worksheet.getCell('AD31').value = '8';
  worksheet.getCell('AD31').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD31').alignment = { horizontal: 'center', vertical: 'middle' };

  // ============ СТРОКИ ДАННЫХ (32-38) - пустые шаблоны ============
  
  for (let rowNum = 32; rowNum <= 38; rowNum++) {
    // Колонка 1-2 (Номер по порядку)
    worksheet.mergeCells(`A${rowNum}:B${rowNum}`);
    worksheet.getCell(`A${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' };
    
    // Колонка 3-5 (Позиция по смете)
    worksheet.mergeCells(`C${rowNum}:E${rowNum}`);
    worksheet.getCell(`C${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };
    
    // Колонка 6-14 (Наименование работ)
    worksheet.mergeCells(`F${rowNum}:N${rowNum}`);
    worksheet.getCell(`F${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`F${rowNum}`).alignment = { horizontal: 'left', wrapText: true };
    
    // Колонка 15-16 (Номер расценки)
    worksheet.mergeCells(`O${rowNum}:P${rowNum}`);
    worksheet.getCell(`O${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`O${rowNum}`).alignment = { horizontal: 'center' };
    
    // Колонка 17-20 (Единица измерения)
    worksheet.mergeCells(`Q${rowNum}:T${rowNum}`);
    worksheet.getCell(`Q${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`Q${rowNum}`).alignment = { horizontal: 'center' };
    
    // Колонка 21-24 (Количество)
    worksheet.mergeCells(`U${rowNum}:X${rowNum}`);
    worksheet.getCell(`U${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`U${rowNum}`).alignment = { horizontal: 'center' };
    
    // Колонка 25-29 (Цена за единицу)
    worksheet.mergeCells(`Y${rowNum}:AC${rowNum}`);
    worksheet.getCell(`Y${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`Y${rowNum}`).alignment = { horizontal: 'center' };
    
    // Колонка 30-33 (Стоимость)
    worksheet.mergeCells(`AD${rowNum}:AG${rowNum}`);
    worksheet.getCell(`AD${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`AD${rowNum}`).alignment = { horizontal: 'center' };
  }

  // ============ ИТОГО (строка 39) ============
  
  worksheet.getCell('S39').value = 'Итого';
  worksheet.getCell('S39').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('S39').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('U39:X39');
  worksheet.getCell('U39').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('U39').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('Y39:AC39');
  worksheet.getCell('Y39').value = 'Х';
  worksheet.getCell('Y39').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('Y39').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('AD39:AG39');
  worksheet.getCell('AD39').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('AD39').alignment = { horizontal: 'center' };

  // ============ ВТОРАЯ СТРАНИЦА (строка 40) ============
  
  worksheet.getCell('AC40').value = '2-я страница формы № КС-2';
  worksheet.getCell('AC40').font = { name: 'Times New Roman', size: 11 };

  // ============ ТАБЛИЦА ВТОРОЙ СТРАНИЦЫ - ШАПКА (строки 42-44) ============
  
  // Строка 42: Номер
  worksheet.mergeCells('A42:E42');
  worksheet.getCell('A42').value = 'Номер';
  worksheet.getCell('A42').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('A42').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Строка 42-43: Наименование работ
  worksheet.mergeCells('F42:N43');
  worksheet.getCell('F42').value = 'Наименование работ';
  worksheet.getCell('F42').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('F42').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Строка 42-43: Номер единичной расценки
  worksheet.mergeCells('O42:P43');
  worksheet.getCell('O42').value = 'Номер единичной расценки';
  worksheet.getCell('O42').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('O42').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 42-43: Единица измерения
  worksheet.mergeCells('Q42:T43');
  worksheet.getCell('Q42').value = 'Единица измерения';
  worksheet.getCell('Q42').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Q42').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 42: Выполнено работ
  worksheet.mergeCells('U42:AG42');
  worksheet.getCell('U42').value = 'Выполнено работ';
  worksheet.getCell('U42').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('U42').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 43: по порядку
  worksheet.mergeCells('A43:B43');
  worksheet.getCell('A43').value = 'по\nпоряд-\nку';
  worksheet.getCell('A43').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('A43').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 43: позиции по смете
  worksheet.mergeCells('C43:E43');
  worksheet.getCell('C43').value = 'позиции по смете';
  worksheet.getCell('C43').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('C43').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 43: количество
  worksheet.mergeCells('U43:X43');
  worksheet.getCell('U43').value = 'количество';
  worksheet.getCell('U43').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('U43').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Строка 43: цена за единицу
  worksheet.mergeCells('Y43:AC43');
  worksheet.getCell('Y43').value = 'цена за единицу,\nруб.';
  worksheet.getCell('Y43').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Y43').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 43: стоимость
  worksheet.mergeCells('AD43:AG43');
  worksheet.getCell('AD43').value = 'стоимость,\nруб.';
  worksheet.getCell('AD43').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD43').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // Строка 44: Нумерация 1-8
  worksheet.mergeCells('A44:B44');
  worksheet.getCell('A44').value = '1';
  worksheet.getCell('A44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('A44').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('C44:E44');
  worksheet.getCell('C44').value = '2';
  worksheet.getCell('C44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('C44').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('F44:N44');
  worksheet.getCell('F44').value = '3';
  worksheet.getCell('F44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('F44').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('O44:P44');
  worksheet.getCell('O44').value = '4';
  worksheet.getCell('O44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('O44').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('Q44:T44');
  worksheet.getCell('Q44').value = '5';
  worksheet.getCell('Q44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Q44').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('U44:X44');
  worksheet.getCell('U44').value = '6';
  worksheet.getCell('U44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('U44').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('Y44:AC44');
  worksheet.getCell('Y44').value = '7';
  worksheet.getCell('Y44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('Y44').alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.mergeCells('AD44:AG44');
  worksheet.getCell('AD44').value = '8';
  worksheet.getCell('AD44').font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell('AD44').alignment = { horizontal: 'center', vertical: 'middle' };

  // ============ СТРОКИ ДАННЫХ 2-Й СТРАНИЦЫ (45-57) - пустые шаблоны ============
  
  for (let rowNum = 45; rowNum <= 57; rowNum++) {
    worksheet.mergeCells(`A${rowNum}:B${rowNum}`);
    worksheet.getCell(`A${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`C${rowNum}:E${rowNum}`);
    worksheet.getCell(`C${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`F${rowNum}:N${rowNum}`);
    worksheet.getCell(`F${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`F${rowNum}`).alignment = { wrapText: true };
    
    worksheet.mergeCells(`O${rowNum}:P${rowNum}`);
    worksheet.getCell(`O${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`O${rowNum}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`Q${rowNum}:T${rowNum}`);
    worksheet.getCell(`Q${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`Q${rowNum}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`U${rowNum}:X${rowNum}`);
    worksheet.getCell(`U${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`U${rowNum}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`Y${rowNum}:AC${rowNum}`);
    worksheet.getCell(`Y${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`Y${rowNum}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`AD${rowNum}:AG${rowNum}`);
    worksheet.getCell(`AD${rowNum}`).font = { name: 'Times New Roman', size: 10 };
    worksheet.getCell(`AD${rowNum}`).alignment = { horizontal: 'center' };
  }

  // ============ ИТОГО (строка 58) ============
  
  worksheet.getCell('S58').value = 'Итого';
  worksheet.getCell('S58').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('S58').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('U58:X58');
  worksheet.getCell('U58').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('U58').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('Y58:AC58');
  worksheet.getCell('Y58').value = 'Х';
  worksheet.getCell('Y58').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('Y58').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('AD58:AG58');
  worksheet.getCell('AD58').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('AD58').alignment = { horizontal: 'center' };

  // ============ ВСЕГО ПО АКТУ (строка 59) ============
  
  worksheet.getCell('S59').value = 'Всего по акту';
  worksheet.getCell('S59').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('S59').alignment = { horizontal: 'right' };
  
  worksheet.mergeCells('U59:X59');
  worksheet.getCell('U59').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('U59').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('Y59:AC59');
  worksheet.getCell('Y59').value = 'Х';
  worksheet.getCell('Y59').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('Y59').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('AD59:AG59');
  worksheet.getCell('AD59').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('AD59').alignment = { horizontal: 'center' };

  // ============ ПОДПИСИ СДАЛ (строки 62-63) ============
  
  worksheet.getCell('C62').value = 'Сдал';
  worksheet.getCell('C62').font = { name: 'Times New Roman', size: 11, bold: true };
  
  worksheet.mergeCells('F62:I62');
  worksheet.getCell('F62').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('F62').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('K62:L62');
  worksheet.getCell('K62').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('K62').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('N62:AG62');
  worksheet.getCell('N62').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('N62').alignment = { horizontal: 'center' };
  
  // Строка 63 - подсказки
  worksheet.mergeCells('F63:I63');
  worksheet.getCell('F63').value = '(должность)';
  worksheet.getCell('F63').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('F63').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('K63:L63');
  worksheet.getCell('K63').value = '(подпись)';
  worksheet.getCell('K63').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('K63').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('N63:AG63');
  worksheet.getCell('N63').value = '(расшифровка подписи)';
  worksheet.getCell('N63').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('N63').alignment = { horizontal: 'center' };
  
  // Строка 65 - М.П.
  worksheet.getCell('G65').value = 'М.П.';
  worksheet.getCell('G65').font = { name: 'Times New Roman', size: 11 };

  // ============ ПОДПИСИ ПРИНЯЛ (строки 67-68) ============
  
  worksheet.getCell('C67').value = 'Принял';
  worksheet.getCell('C67').font = { name: 'Times New Roman', size: 11, bold: true };
  
  worksheet.mergeCells('F67:I67');
  worksheet.getCell('F67').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('F67').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('K67:L67');
  worksheet.getCell('K67').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('K67').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('N67:AG67');
  worksheet.getCell('N67').font = { name: 'Times New Roman', size: 11 };
  worksheet.getCell('N67').alignment = { horizontal: 'center' };
  
  // Строка 68 - подсказки
  worksheet.mergeCells('F68:I68');
  worksheet.getCell('F68').value = '(должность)';
  worksheet.getCell('F68').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('F68').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('K68:L68');
  worksheet.getCell('K68').value = '(подпись)';
  worksheet.getCell('K68').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('K68').alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('N68:AG68');
  worksheet.getCell('N68').value = '(расшифровка подписи)';
  worksheet.getCell('N68').font = { name: 'Times New Roman', size: 8 };
  worksheet.getCell('N68').alignment = { horizontal: 'center' };
  
  // Строка 70 - М.П.
  worksheet.getCell('G70').value = 'М.П.';
  worksheet.getCell('G70').font = { name: 'Times New Roman', size: 11 };

  // ============ ЗАПОЛНЕНИЕ ДАННЫХ ============
  if (data && Object.keys(data).length > 0) {
    fillKS2Data(worksheet, data, includeVat);
  }

  // ============ ПРИМЕНЕНИЕ ГРАНИЦ ============
  applyBorders(worksheet);

  // ============ ГЕНЕРАЦИЯ ФАЙЛА ============
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  // Формируем имя файла
  const actNumber = data?.actNumber || 'без_номера';
  const actDate = data?.actDate ? formatDate(data.actDate).replace(/\./g, '-') : '';
  const fileName = actDate ? `КС-2_${actNumber}_${actDate}.xlsx` : `КС-2_${actNumber}.xlsx`;
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);} catch (error) {
    console.error('generateKS2Excel: Ошибка при генерации файла:', error);
    throw error;
  }
};
