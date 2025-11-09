import ExcelJS from 'exceljs';
import { applyBorders } from './ks3Borders.js';
import { formatNumber, formatDate, numberToWords } from './excelFormatters.js';

/**
 * Экспорт формы КС-3 в Excel
 * @param {Object} data - Данные проекта
 * @returns {Promise<Blob>} - Excel файл в виде Blob
 */
export const generateKS3Excel = async (data = {}, includeVat = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('стр1');

  // Настройка колонок (53 колонки A-BA)
  const columnWidths = {
    A: 1.75, B: 1.625, C: 8.43, D: 1.5, E: 0.75, F: 1.625, G: 8.43, H: 8.43,
    I: 8.43, J: 8.43, K: 8.43, L: 8.43, M: 1.125, N: 1.5, O: 1.625, P: 1.25,
    Q: 0.875, R: 1.625, S: 8.43, T: 8.43, U: 8.43, V: 8.43, W: 1.75, X: 1.625,
    Y: 8.43, Z: 8.43, AA: 8.43, AB: 8.43, AC: 1.875, AD: 1.625, AE: 8.43,
    AF: 8.43, AG: 8.43, AH: 8.43, AI: 8.43, AJ: 1.0, AK: 2.125, AL: 1.625,
    AM: 1.75, AN: 8.43, AO: 0.375, AP: 1.625, AQ: 1.75, AR: 1.5, AS: 1.375,
    AT: 1.625, AU: 1.375, AV: 8.43, AW: 1.75, AX: 1.375, AY: 8.43, AZ: 8.43,
    BA: 1.75
  };

  Object.entries(columnWidths).forEach(([col, width]) => {
    worksheet.getColumn(col).width = width;
  });

  // Настройка высоты строк
  const rowHeights = {
    1: 11.1, 2: 11.1, 3: 11.1, 4: 13.5, 6: 9.75, 7: 12.75, 8: 9.75, 10: 9.75,
    12: 9.75, 14: 9.75, 15: 4.5, 18: 15.0, 21: 13.5, 22: 13.5, 25: 27.75,
    26: 42.0, 27: 14.25, 44: 13.5, 50: 9.75, 53: 18.75, 55: 9.75, 56: 23.25
  };

  Object.entries(rowHeights).forEach(([row, height]) => {
    worksheet.getRow(parseInt(row)).height = height;
  });

  // Применение структуры и текстов
  applyTextsAndMerges(worksheet, data);

  // Заполнение данных из API
  if (data && Object.keys(data).length > 0) {
    fillKS3Data(worksheet, data, includeVat);
  }

  // Применение границ
  applyBorders(worksheet);

  // Генерация и скачивание файла
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  // Создаём имя файла на основе данных
  const actNumber = data?.actNumber || 'без_номера';
  const actDate = data?.actDate ? new Date(data.actDate).toLocaleDateString('ru-RU') : '';
  const fileName = `КС-3_${actNumber}_${actDate}.xlsx`.replace(/\//g, '-');
  
  // Скачиваем файл
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Заполнение данных в форму КС-3
 * @param {ExcelJS.Worksheet} worksheet - Лист Excel
 * @param {Object} data - Данные акта из API
 */
const fillKS3Data = (worksheet, data, includeVat = false) => {
  const font = { name: 'Times New Roman', size: 10 };
  
  // Переменные для хранения итогов
  let totalFromStart = 0;
  let totalYTD = 0;
  let totalCurrent = 0;
  
  // 1. ШАПКА ФОРМЫ
  
  // Инвестор (строка 7) - объединенная ячейка M7:AM7
  if (data.investor && data.investor.name) {
    worksheet.getCell('M7').value = data.investor.name;
    worksheet.getCell('M7').font = font;
    worksheet.getCell('M7').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Заказчик (строка 9) - объединенная ячейка M9:AJ9
  if (data.customer && data.customer.name) {
    worksheet.getCell('M9').value = data.customer.name;
    worksheet.getCell('M9').font = font;
    worksheet.getCell('M9').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Подрядчик (строка 11) - объединенная ячейка M11:AM11
  if (data.contractor && data.contractor.name) {
    worksheet.getCell('M11').value = data.contractor.name;
    worksheet.getCell('M11').font = font;
    worksheet.getCell('M11').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Стройка (строка 13) - объединенная ячейка M13:AM13
  if (data.constructionObject && data.constructionObject.address) {
    worksheet.getCell('M13').value = data.constructionObject.address;
    worksheet.getCell('M13').font = font;
    worksheet.getCell('M13').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Номер документа (строка 22) - объединенная ячейка X22:AF22
  if (data.actNumber) {
    worksheet.getCell('X22').value = data.actNumber;
    worksheet.getCell('X22').font = font;
    worksheet.getCell('X22').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Дата составления документа (строка 22) - объединенная ячейка AG22:AP22
  if (data.actDate) {
    worksheet.getCell('AG22').value = formatDate(data.actDate);
    worksheet.getCell('AG22').font = font;
    worksheet.getCell('AG22').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Номер договора (строка 16) - объединенная ячейка AP16:BA16
  if (data.contract && data.contract.number) {
    worksheet.getCell('AP16').value = data.contract.number;
    worksheet.getCell('AP16').font = font;
    worksheet.getCell('AP16').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Дата договора (строка 17) - объединенная ячейка AP17:AS17
  if (data.contract && data.contract.date) {
    worksheet.getCell('AP17').value = formatDate(data.contract.date);
    worksheet.getCell('AP17').font = font;
    worksheet.getCell('AP17').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Отчетный период с (строка 22) - объединенная ячейка AR22:AV22
  if (data.periodFrom) {
    worksheet.getCell('AR22').value = formatDate(data.periodFrom);
    worksheet.getCell('AR22').font = font;
    worksheet.getCell('AR22').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // Отчетный период по (строка 22) - объединенная ячейка AW22:BA22
  if (data.periodTo) {
    worksheet.getCell('AW22').value = formatDate(data.periodTo);
    worksheet.getCell('AW22').font = font;
    worksheet.getCell('AW22').alignment = { horizontal: 'center', vertical: 'middle' };
  }
  
  // 2. ТАБЛИЦА РАБОТ
  // Согласно структуре формы КС-3:
  // Строка 28-29: ИТОГО "Всего работ и затрат, включаемых в стоимость работ"
  // Строка 30: "в том числе:"
  // Строки 31+: Детализация работ (1, 2, 3, 4...)
  // Колонка 1 (A-C): Номер по порядку
  // Колонка 2 (D-Z): Наименование
  // Колонка 3 (AA-AD): Код
  // Колонка 4 (AE-AK): Стоимость с начала проведения работ
  // Колонка 5 (AL-AS): Стоимость с начала года
  // Колонка 6 (AT-BA): Стоимость в текущем периоде
  
  const works = data.works || [];
  
  // Рассчитываем итоги для строки 28-29
  // ЛОГИКА НАКОПЛЕНИЯ (данные приходят с бэкенда):
  // - totalPriceYTD: стоимость с начала года (включая текущий период)
  // - totalPricePrevPeriod: стоимость за предыдущие периоды (до текущего акта)
  // - totalPriceCurrent: стоимость в текущем периоде
  //
  // Для отображения в КС-3:
  // - "С начала проведения работ" = totalPricePrevPeriod (сумма всех предыдущих актов)
  // - "С начала года" = totalPriceYTD - totalPriceCurrent (накопленное до текущего периода)
  // - "В том числе за отчетный период" = totalPriceCurrent
  
  totalFromStart = 0; // С начала проведения работ (все предыдущие акты)
  totalYTD = 0;       // С начала года (до текущего периода)
  totalCurrent = 0;   // В текущем периоде
  
  works.forEach(work => {
    // Текущий период - всегда берем из текущей работы
    const currentAmount = parseFloat(work.totalPriceCurrent || work.totalPrice || 0);
    totalCurrent += currentAmount;
    
    // С начала проведения работ - за предыдущие периоды
    const prevPeriodAmount = parseFloat(work.totalPricePrevPeriod || 0);
    totalFromStart += prevPeriodAmount;
    
    // С начала года (до текущего периода) = YTD минус текущий период
    const ytdAmount = parseFloat(work.totalPriceYTD || 0);
    totalYTD += (ytdAmount - currentAmount);
  });
  
  // Заполняем строку 28-29 "Всего работ и затрат"
  worksheet.getCell('AE28').value = formatNumber(totalFromStart);
  worksheet.getCell('AE28').font = { ...font, bold: true };
  worksheet.getCell('AE28').alignment = { horizontal: 'right', vertical: 'middle' };
  
  // AL28 должна содержать ту же сумму что и AT28
  worksheet.getCell('AL28').value = formatNumber(totalCurrent);
  worksheet.getCell('AL28').font = { ...font, bold: true };
  worksheet.getCell('AL28').alignment = { horizontal: 'right', vertical: 'middle' };
  
  worksheet.getCell('AT28').value = formatNumber(totalCurrent);
  worksheet.getCell('AT28').font = { ...font, bold: true };
  worksheet.getCell('AT28').alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Начинаем заполнять детализацию работ со строки 31
  const startRow = 31;
  
  works.forEach((work, index) => {
    const rowIndex = startRow + index;
    
    // Номер по порядку (объединенная ячейка A-C)
    worksheet.getCell(`A${rowIndex}`).value = work.position || index + 1;
    worksheet.getCell(`A${rowIndex}`).font = font;
    worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Наименование работы (объединенная ячейка D-Z)
    worksheet.getCell(`D${rowIndex}`).value = work.name || work.workName || '';
    worksheet.getCell(`D${rowIndex}`).font = font;
    worksheet.getCell(`D${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    
    // Код работы (объединенная ячейка AA-AD)
    worksheet.getCell(`AA${rowIndex}`).value = work.code || work.workCode || '';
    worksheet.getCell(`AA${rowIndex}`).font = font;
    worksheet.getCell(`AA${rowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Стоимость с начала проведения работ (объединенная ячейка AE-AK)
    worksheet.getCell(`AE${rowIndex}`).value = formatNumber(work.totalFromStart || work.totalPriceYTD || 0);
    worksheet.getCell(`AE${rowIndex}`).font = font;
    worksheet.getCell(`AE${rowIndex}`).alignment = { horizontal: 'right', vertical: 'middle' };
    
    // Стоимость с начала года (объединенная ячейка AL-AS) - ДОЛЖНА БЫТЬ ТА ЖЕ СУММА ЧТО И В AT31:BA31
    const currentPeriodAmount = formatNumber(work.totalCurrentPeriod || work.totalPriceCurrent || work.totalPrice || 0);
    worksheet.getCell(`AL${rowIndex}`).value = currentPeriodAmount;
    worksheet.getCell(`AL${rowIndex}`).font = font;
    worksheet.getCell(`AL${rowIndex}`).alignment = { horizontal: 'right', vertical: 'middle' };
    
    // Стоимость в текущем периоде (объединенная ячейка AT-BA)
    worksheet.getCell(`AT${rowIndex}`).value = currentPeriodAmount;
    worksheet.getCell(`AT${rowIndex}`).font = font;
    worksheet.getCell(`AT${rowIndex}`).alignment = { horizontal: 'right', vertical: 'middle' };
    
    // Автоподстройка высоты строки
    const workNameLength = ((work.name || work.workName) || '').length;
    const charsPerLine = 80;
    const linesNeeded = Math.ceil(workNameLength / charsPerLine);
    const minHeight = 15;
    const lineHeight = 14;
    const calculatedHeight = Math.max(minHeight, linesNeeded * lineHeight + 2);
    worksheet.getRow(rowIndex).height = calculatedHeight;
  });
  
  // 3. ИТОГОВЫЕ СТРОКИ
  // В форме КС-3 итоги показываются в строках 45-47
  // Согласно структуре: AT45:BA47
  
  const totalRow45 = 45; // Итого
  const totalRow46 = 46; // Сумма НДС
  const totalRow47 = 47; // Всего с учетом НДС
  
  // Используем рассчитанные итоги или данные из API
  const finalTotalFromStart = data.totals?.amountFromStart || totalFromStart;
  const finalTotalYTD = data.totals?.amountYTD || totalYTD;
  const finalTotalCurrent = data.totals?.amountCurrent || totalCurrent;
  
  // Итого (строка 45)
  // Стоимость с начала проведения работ
  worksheet.getCell(`AE${totalRow45}`).value = formatNumber(finalTotalFromStart);
  worksheet.getCell(`AE${totalRow45}`).font = { ...font, bold: true };
  worksheet.getCell(`AE${totalRow45}`).alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Стоимость с начала года - ДОЛЖНА БЫТЬ ТА ЖЕ СУММА ЧТО И В AT45
  worksheet.getCell(`AL${totalRow45}`).value = formatNumber(finalTotalCurrent);
  worksheet.getCell(`AL${totalRow45}`).font = { ...font, bold: true };
  worksheet.getCell(`AL${totalRow45}`).alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Стоимость в текущем периоде
  worksheet.getCell(`AT${totalRow45}`).value = formatNumber(finalTotalCurrent);
  worksheet.getCell(`AT${totalRow45}`).font = { ...font, bold: true };
  worksheet.getCell(`AT${totalRow45}`).alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Сумма НДС (строка 46) - только для текущего периода
  // Если includeVat = true, рассчитываем НДС 20%, иначе НДС = 0
  const vatAmount = includeVat ? (finalTotalCurrent * 0.20) : 0;
  worksheet.getCell(`AT${totalRow46}`).value = formatNumber(vatAmount);
  worksheet.getCell(`AT${totalRow46}`).font = { ...font, bold: true };
  worksheet.getCell(`AT${totalRow46}`).alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Всего с учетом НДС (строка 47) - только для текущего периода
  const totalWithVAT = finalTotalCurrent + vatAmount;
  worksheet.getCell(`AT${totalRow47}`).value = formatNumber(totalWithVAT);
  worksheet.getCell(`AT${totalRow47}`).font = { ...font, bold: true };
  worksheet.getCell(`AT${totalRow47}`).alignment = { horizontal: 'right', vertical: 'middle' };
  
  // 4. ПОДПИСИ
  
  // Заказчик (Генподрядчик) - строки 49-50
  const customer = data.signatories?.find(s => s.role === 'customer_chief') || data.customer;
  if (customer) {
    // Должность (объединенная ячейка N50:W50)
    if (customer.position || customer.chiefPosition) {
      worksheet.getCell('N50').value = customer.position || customer.chiefPosition || '';
      worksheet.getCell('N50').font = font;
      worksheet.getCell('N50').alignment = { horizontal: 'center', vertical: 'middle' };
    }
    
    // ФИО (объединенная ячейка AJ50:BA50)
    if (customer.fullName || customer.chiefName) {
      worksheet.getCell('AJ50').value = customer.fullName || customer.chiefName || '';
      worksheet.getCell('AJ50').font = font;
      worksheet.getCell('AJ50').alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }
  
  // Подрядчик (Субподрядчик) - строки 54-55
  const contractor = data.signatories?.find(s => s.role === 'contractor_chief') || data.contractor;
  if (contractor) {
    // Должность (объединенная ячейка N55:W55)
    if (contractor.position || contractor.chiefPosition) {
      worksheet.getCell('N55').value = contractor.position || contractor.chiefPosition || '';
      worksheet.getCell('N55').font = font;
      worksheet.getCell('N55').alignment = { horizontal: 'center', vertical: 'middle' };
    }
    
    // ФИО (объединенная ячейка AJ55:BA55)
    if (contractor.fullName || contractor.chiefName) {
      worksheet.getCell('AJ55').value = contractor.fullName || contractor.chiefName || '';
      worksheet.getCell('AJ55').font = font;
      worksheet.getCell('AJ55').alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }
};

function applyTextsAndMerges(worksheet, data) {
  const defaultFont = { name: 'Times New Roman', size: 10 };
  const smallFont = { name: 'Times New Roman', size: 8 };
  const tinyFont = { name: 'Times New Roman', size: 9 };

  // Шапка формы
  worksheet.getCell('AG1').value = 'Унифицированная форма № КС - 3';
  worksheet.getCell('AG1').font = tinyFont;

  worksheet.getCell('AG2').value = 'Утверждена постановлением Госкомстата России';
  worksheet.getCell('AG2').font = tinyFont;

  worksheet.getCell('AG3').value = 'от 11.11.99 № 100';
  worksheet.getCell('AG3').font = tinyFont;

  // Блок "Код"
  worksheet.mergeCells('AP4:BA4');
  worksheet.getCell('AP4').value = 'Код';
  worksheet.getCell('AP4').font = defaultFont;
  worksheet.getCell('AP4').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AG5:AO5');
  worksheet.getCell('AG5').value = 'Форма по ОКУД';
  worksheet.getCell('AG5').font = defaultFont;
  worksheet.getCell('AG5').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AP5:BA5');
  worksheet.getCell('AP5').value = '0322001';
  worksheet.getCell('AP5').font = defaultFont;
  worksheet.getCell('AP5').alignment = { horizontal: 'center' };

  // Реквизиты организаций
  worksheet.getCell('A7').value = 'Инвестор';
  worksheet.getCell('A7').font = defaultFont;

  worksheet.getCell('AN7').value = 'по ОКПО';
  worksheet.getCell('AN7').font = defaultFont;
  worksheet.getCell('AN7').alignment = { horizontal: 'left' };

  worksheet.mergeCells('M7:AM7');
  worksheet.getCell('M7').value = data?.investor || '';
  worksheet.getCell('M7').font = defaultFont;
  worksheet.getCell('M7').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AP6:BA7');
  worksheet.getCell('AP6').value = data?.investorCode || '';
  worksheet.getCell('AP6').font = defaultFont;
  worksheet.getCell('AP6').alignment = { horizontal: 'center' };

  worksheet.getCell('Z8').value = '(организация, адрес, телефон, факс)';
  worksheet.getCell('Z8').font = smallFont;

  // Заказчик
  worksheet.getCell('A9').value = 'Заказчик  (Генподрядчик)';
  worksheet.getCell('A9').font = defaultFont;

  worksheet.getCell('AN9').value = 'по ОКПО';
  worksheet.getCell('AN9').font = defaultFont;
  worksheet.getCell('AN9').alignment = { horizontal: 'left' };

  worksheet.mergeCells('M9:AM9');
  worksheet.getCell('M9').value = data?.customer || '';
  worksheet.getCell('M9').font = defaultFont;
  worksheet.getCell('M9').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AP8:BA9');
  worksheet.getCell('AP8').value = data?.customerCode || '';
  worksheet.getCell('AP8').font = defaultFont;
  worksheet.getCell('AP8').alignment = { horizontal: 'center' };

  worksheet.getCell('Z10').value = '(организация, адрес, телефон, факс)';
  worksheet.getCell('Z10').font = smallFont;

  // Подрядчик
  worksheet.getCell('A11').value = 'Подрядчик (Субподрядчик)';
  worksheet.getCell('A11').font = defaultFont;

  worksheet.getCell('AN11').value = 'по ОКПО';
  worksheet.getCell('AN11').font = defaultFont;
  worksheet.getCell('AN11').alignment = { horizontal: 'left' };

  worksheet.mergeCells('M11:AM11');
  worksheet.getCell('M11').value = data?.contractor || '';
  worksheet.getCell('M11').font = defaultFont;
  worksheet.getCell('M11').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AP10:BA11');
  worksheet.getCell('AP10').value = data?.contractorCode || '';
  worksheet.getCell('AP10').font = defaultFont;
  worksheet.getCell('AP10').alignment = { horizontal: 'center' };

  worksheet.getCell('Z12').value = '(организация, адрес, телефон, факс)';
  worksheet.getCell('Z12').font = smallFont;

  // Стройка
  worksheet.getCell('A13').value = 'Стройка';
  worksheet.getCell('A13').font = defaultFont;

  worksheet.getCell('AK13').value = 'по ОКПО';
  worksheet.getCell('AK13').font = defaultFont;
  worksheet.getCell('AK13').alignment = { horizontal: 'left' };

  worksheet.mergeCells('M13:AM13');
  worksheet.getCell('M13').value = data?.construction || '';
  worksheet.getCell('M13').font = defaultFont;
  worksheet.getCell('M13').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AP12:BA13');
  worksheet.getCell('AP12').value = data?.constructionCode || '';
  worksheet.getCell('AP12').font = defaultFont;
  worksheet.getCell('AP12').alignment = { horizontal: 'center' };

  worksheet.getCell('Z14').value = '(наименование, адрес)';
  worksheet.getCell('Z14').font = smallFont;

  worksheet.mergeCells('AC14:AO15');
  worksheet.getCell('AC14').value = 'Вид деятельности по ОКДП';
  worksheet.getCell('AC14').font = defaultFont;
  worksheet.getCell('AC14').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AP14:BA15');
  worksheet.getCell('AP14').value = data?.activityCode || '';
  worksheet.getCell('AP14').font = defaultFont;
  worksheet.getCell('AP14').alignment = { horizontal: 'center' };

  // Договор подряда
  worksheet.getCell('X16').value = 'Договор подряда (контракт)';
  worksheet.getCell('X16').font = defaultFont;

  worksheet.mergeCells('AK16:AO16');
  worksheet.getCell('AK16').value = 'номер';
  worksheet.getCell('AK16').font = defaultFont;
  worksheet.getCell('AK16').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AP16:BA16');
  worksheet.getCell('AP16').value = data?.contractNumber || '';
  worksheet.getCell('AP16').font = defaultFont;
  worksheet.getCell('AP16').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AK17:AO17');
  worksheet.getCell('AK17').value = 'дата';
  worksheet.getCell('AK17').font = defaultFont;
  worksheet.getCell('AK17').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AP17:AS17');
  worksheet.getCell('AP17').value = data?.contractDate ? new Date(data.contractDate).toLocaleDateString('ru-RU') : '';
  worksheet.getCell('AP17').font = defaultFont;
  worksheet.getCell('AP17').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AT17:AW17');
  worksheet.mergeCells('AX17:BA17');

  // Вид операции
  worksheet.getCell('AN18').value = 'Вид операции';
  worksheet.getCell('AN18').font = defaultFont;
  worksheet.getCell('AN18').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AP18:BA18');
  worksheet.getCell('AP18').value = data?.operationType || '';
  worksheet.getCell('AP18').font = defaultFont;
  worksheet.getCell('AP18').alignment = { horizontal: 'center' };

  // Блок документа и дат
  worksheet.mergeCells('X20:AF21');
  worksheet.getCell('X20').value = 'Номер документа';
  worksheet.getCell('X20').font = defaultFont;
  worksheet.getCell('X20').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('X22:AF22');
  worksheet.getCell('X22').value = data?.documentNumber || '';
  worksheet.getCell('X22').font = defaultFont;
  worksheet.getCell('X22').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AG20:AP21');
  worksheet.getCell('AG20').value = 'Дата составления';
  worksheet.getCell('AG20').font = defaultFont;
  worksheet.getCell('AG20').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('AG22:AP22');
  worksheet.getCell('AG22').value = data?.documentDate ? new Date(data.documentDate).toLocaleDateString('ru-RU') : '';
  worksheet.getCell('AG22').font = defaultFont;
  worksheet.getCell('AG22').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('AR20:BA20');
  worksheet.getCell('AR20').value = 'Отчетный период';
  worksheet.getCell('AR20').font = defaultFont;
  worksheet.getCell('AR20').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AR21:AV21');
  worksheet.getCell('AR21').value = 'с';
  worksheet.getCell('AR21').font = defaultFont;
  worksheet.getCell('AR21').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AW21:BA21');
  worksheet.getCell('AW21').value = 'по';
  worksheet.getCell('AW21').font = defaultFont;
  worksheet.getCell('AW21').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AR22:AV22');
  worksheet.getCell('AR22').value = data?.periodFrom ? new Date(data.periodFrom).toLocaleDateString('ru-RU') : '';
  worksheet.getCell('AR22').font = defaultFont;
  worksheet.getCell('AR22').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AW22:BA22');
  worksheet.getCell('AW22').value = data?.periodTo ? new Date(data.periodTo).toLocaleDateString('ru-RU') : '';
  worksheet.getCell('AW22').font = defaultFont;
  worksheet.getCell('AW22').alignment = { horizontal: 'center' };

  // СПРАВКА
  worksheet.mergeCells('R22:W22');
  worksheet.getCell('R22').value = 'СПРАВКА';
  worksheet.getCell('R22').font = { name: 'Times New Roman', size: 10, bold: true };
  worksheet.getCell('R22').alignment = { horizontal: 'center' };

  worksheet.getCell('K23').value = 'О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ';
  worksheet.getCell('K23').font = { name: 'Times New Roman', size: 10, bold: true };

  // Заголовки таблицы
  worksheet.mergeCells('A25:C26');
  worksheet.getCell('A25').value = 'Но-\nмер\nпо по-\nрядку';
  worksheet.getCell('A25').font = defaultFont;
  worksheet.getCell('A25').alignment = { horizontal: 'center', vertical: 'top', wrapText: true };

  worksheet.mergeCells('D25:Z26');
  worksheet.getCell('D25').value = 'Наименование пусковых комплексов, этапов, объектов, видов выполненных работ, оборудования, затрат';
  worksheet.getCell('D25').font = defaultFont;
  worksheet.getCell('D25').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  worksheet.mergeCells('AA25:AD26');
  worksheet.getCell('AA25').value = 'Код';
  worksheet.getCell('AA25').font = defaultFont;
  worksheet.getCell('AA25').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('AE25:BA25');
  worksheet.getCell('AE25').value = 'Стоимость выполненных работ и затрат,\nруб.';
  worksheet.getCell('AE25').font = defaultFont;
  worksheet.getCell('AE25').alignment = { horizontal: 'center', vertical: 'top', wrapText: true };

  worksheet.mergeCells('AE26:AK26');
  worksheet.getCell('AE26').value = 'с начала проведения работ';
  worksheet.getCell('AE26').font = defaultFont;
  worksheet.getCell('AE26').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  worksheet.mergeCells('AL26:AS26');
  worksheet.getCell('AL26').value = 'с начала года';
  worksheet.getCell('AL26').font = defaultFont;
  worksheet.getCell('AL26').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  worksheet.mergeCells('AT26:BA26');
  worksheet.getCell('AT26').value = 'в том числе за отчетный период';
  worksheet.getCell('AT26').font = defaultFont;
  worksheet.getCell('AT26').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Номера колонок
  worksheet.mergeCells('A27:C27');
  worksheet.getCell('A27').value = '1';
  worksheet.getCell('A27').font = defaultFont;
  worksheet.getCell('A27').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('D27:Z27');
  worksheet.getCell('D27').value = '2';
  worksheet.getCell('D27').font = defaultFont;
  worksheet.getCell('D27').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('AA27:AD27');
  worksheet.getCell('AA27').value = '3';
  worksheet.getCell('AA27').font = defaultFont;
  worksheet.getCell('AA27').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('AE27:AK27');
  worksheet.getCell('AE27').value = '4';
  worksheet.getCell('AE27').font = defaultFont;
  worksheet.getCell('AE27').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('AL27:AS27');
  worksheet.getCell('AL27').value = '5';
  worksheet.getCell('AL27').font = defaultFont;
  worksheet.getCell('AL27').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('AT27:BA27');
  worksheet.getCell('AT27').value = '6';
  worksheet.getCell('AT27').font = defaultFont;
  worksheet.getCell('AT27').alignment = { horizontal: 'center', vertical: 'middle' };

  // Строки таблицы (28-44)
  // Всего работ
  worksheet.mergeCells('A28:C29');
  worksheet.mergeCells('D28:Z28');
  worksheet.getCell('D28').value = 'Всего работ и затрат, включаемых в ';
  worksheet.getCell('D28').font = defaultFont;

  worksheet.mergeCells('D29:Z29');
  worksheet.getCell('D29').value = 'стоимость работ';
  worksheet.getCell('D29').font = defaultFont;

  worksheet.mergeCells('AA28:AD29');
  worksheet.mergeCells('AE28:AK29');
  worksheet.mergeCells('AL28:AS29');
  worksheet.mergeCells('AT28:BA29');

  // в том числе
  worksheet.mergeCells('A30:C30');
  worksheet.mergeCells('E30:Z30');
  worksheet.getCell('E30').value = 'в том числе:';
  worksheet.getCell('E30').font = defaultFont;

  worksheet.mergeCells('AA30:AD30');
  worksheet.mergeCells('AE30:AK30');
  worksheet.mergeCells('AL30:AS30');
  worksheet.mergeCells('AT30:BA30');

  // Пустые строки для данных (31-44)
  for (let row = 31; row <= 44; row++) {
    worksheet.mergeCells(`A${row}:C${row}`);
    worksheet.mergeCells(`D${row}:Z${row}`);
    worksheet.mergeCells(`AA${row}:AD${row}`);
    worksheet.mergeCells(`AE${row}:AK${row}`);
    worksheet.mergeCells(`AL${row}:AS${row}`);
    worksheet.mergeCells(`AT${row}:BA${row}`);
  }

  // Итого, НДС, Всего
  worksheet.getCell('AS45').value = 'Итого';
  worksheet.getCell('AS45').font = defaultFont;
  worksheet.getCell('AS45').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AT45:BA45');

  worksheet.getCell('AS46').value = 'Сумма НДС';
  worksheet.getCell('AS46').font = defaultFont;
  worksheet.getCell('AS46').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AT46:BA46');

  worksheet.getCell('AS47').value = 'Всего с учетом НДС';
  worksheet.getCell('AS47').font = defaultFont;
  worksheet.getCell('AS47').alignment = { horizontal: 'right' };

  worksheet.mergeCells('AT47:BA47');

  // Подписи Заказчик
  worksheet.getCell('A49').value = 'Заказчик (Генподрядчик)';
  worksheet.getCell('A49').font = defaultFont;

  worksheet.mergeCells('N49:W49');
  worksheet.mergeCells('Y49:AH49');
  worksheet.mergeCells('AJ49:BA49');

  worksheet.mergeCells('N50:W50');
  worksheet.getCell('N50').value = '(должность)';
  worksheet.getCell('N50').font = smallFont;
  worksheet.getCell('N50').alignment = { horizontal: 'center' };

  worksheet.mergeCells('Y50:AH50');
  worksheet.getCell('Y50').value = '(подпись)';
  worksheet.getCell('Y50').font = smallFont;
  worksheet.getCell('Y50').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AJ50:BA50');
  worksheet.getCell('AJ50').value = '(расшифровка подписи)';
  worksheet.getCell('AJ50').font = smallFont;
  worksheet.getCell('AJ50').alignment = { horizontal: 'center' };

  worksheet.getCell('A52').value = 'М.П.';
  worksheet.getCell('A52').font = defaultFont;

  // Подписи Подрядчик
  worksheet.getCell('A54').value = 'Подрядчик (Субподрядчик)';
  worksheet.getCell('A54').font = defaultFont;

  worksheet.mergeCells('N54:W54');
  worksheet.mergeCells('Y54:AH54');
  worksheet.mergeCells('AJ54:BA54');

  worksheet.mergeCells('N55:W55');
  worksheet.getCell('N55').value = '(должность)';
  worksheet.getCell('N55').font = smallFont;
  worksheet.getCell('N55').alignment = { horizontal: 'center' };

  worksheet.mergeCells('Y55:AH55');
  worksheet.getCell('Y55').value = '(подпись)';
  worksheet.getCell('Y55').font = smallFont;
  worksheet.getCell('Y55').alignment = { horizontal: 'center' };

  worksheet.mergeCells('AJ55:BA55');
  worksheet.getCell('AJ55').value = '(расшифровка подписи)';
  worksheet.getCell('AJ55').font = smallFont;
  worksheet.getCell('AJ55').alignment = { horizontal: 'center' };

  worksheet.getCell('A56').value = 'М.П.';
  worksheet.getCell('A56').font = defaultFont;
}
