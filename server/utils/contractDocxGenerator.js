import fs from 'fs/promises';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ГОСТ Р 7.0.97-2016: Настройки форматирования
const GOST_SETTINGS = {
  font: 'Times New Roman',
  fontSize: 24, // 12pt = 24 half-points  
  titleSize: 28, // 14pt = 28 half-points (для заголовков)
  lineSpacing: 360, // 1.5 интервал
  indent: 708, // 1.25cm красная строка
};

/**
 * Генерирует договор в формате DOCX на основе JSON-шаблона
 */
async function generateContractDOCX(contract, schedulePhases = []) {
  try {
    console.log('📄 [CONTRACT-JSON] Starting DOCX generation for contract:', contract.id);
    console.log('📄 [CONTRACT-JSON] Contract data:', JSON.stringify(contract, null, 2));
    console.log('📄 [CONTRACT-JSON] Schedule phases:', JSON.stringify(schedulePhases, null, 2));

    // Читаем JSON-шаблон
    const templatePath = path.join(__dirname, '../templates/contract-template.json');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = JSON.parse(templateContent);

    // Готовим данные для замены плейсхолдеров
    // contract уже содержит customer, contractor, project, estimate из SQL запроса
    const data = prepareContractData(contract, schedulePhases);

    // Создаем DOCX документ
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1134,    // 2cm
              right: 850,   // 1.5cm
              bottom: 1134, // 2cm
              left: 1701    // 3cm
            }
          }
        },
        children: renderTemplate(template, data)
      }]
    });

    // Генерируем buffer
    const buffer = await Packer.toBuffer(doc);
    console.log('📄 [CONTRACT-JSON] DOCX generated successfully, size:', buffer.length, 'bytes');
    return buffer;

  } catch (error) {
    console.error('❌ [CONTRACT-JSON] Error generating contract:', error);
    throw new Error(`Не удалось сгенерировать договор: ${error.message}`);
  }
}

/**
 * Рендерит JSON-шаблон в массив элементов DOCX
 */
function renderTemplate(template, data) {
  const elements = [];

  // Рендерим каждую секцию
  for (const section of template.sections) {
    // Специальная обработка для таблицы этапов
    if (section.type === 'table' && section.headers && section.headers[0] === 'Этап') {
      // Динамически генерируем таблицу этапов на основе данных графика
      const stagesCount = data.stagesCount || 5;
      const stagesTable = {
        type: 'table',
        headers: section.headers,
        rows: []
      };
      
      for (let i = 1; i <= stagesCount; i++) {
        const stageName = data[`stage${i}Name`] || `Этап ${i}`;
        const stageAmount = data[`stage${i}Amount`] || '0.00';
        const stageAmountInWords = data[`stage${i}AmountInWords`] || 'ноль';
        const stageAmountKopecks = data[`stage${i}AmountKopecks`] || '00';
        
        stagesTable.rows.push([
          stageName,
          stageAmount,
          `${stageAmountInWords} руб. ${stageAmountKopecks} коп.`
        ]);
      }
      
      const rendered = createTable(stagesTable, data);
      if (rendered) elements.push(rendered);
    } else {
      // Обычная обработка для остальных секций
      const rendered = renderSection(section, data);
      if (rendered) {
        if (Array.isArray(rendered)) {
          elements.push(...rendered);
        } else {
          elements.push(rendered);
        }
      }
    }
  }

  return elements;
}

/**
 * Рендерит отдельную секцию шаблона
 */
function renderSection(section, data) {
  const content = replacePlaceholders(section.content || '', data);
  
  switch (section.type) {
    case 'header':
      return new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [
          new TextRun({
            text: content,
            font: GOST_SETTINGS.font,
            size: GOST_SETTINGS.titleSize,
            bold: true
          })
        ]
      });

    case 'heading1':
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: content,
            font: GOST_SETTINGS.font,
            size: GOST_SETTINGS.titleSize,
            bold: true,
            color: '000000'
          })
        ]
      });

    case 'heading2':
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: content,
            font: GOST_SETTINGS.font,
            size: GOST_SETTINGS.fontSize,
            bold: section.bold !== false,
            color: '000000'
          })
        ]
      });

    case 'heading3':
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.LEFT,
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: content,
            font: GOST_SETTINGS.font,
            size: GOST_SETTINGS.fontSize,
            bold: true,
            color: '000000'
          })
        ]
      });

    case 'paragraph':
      const alignment = section.align === 'right' ? AlignmentType.RIGHT :
                       section.align === 'center' ? AlignmentType.CENTER :
                       AlignmentType.JUSTIFIED;
      
      // Проверяем, начинается ли текст с номера пункта (например "2.1." или "2.1.1.")
      const numberMatch = content.match(/^(\d+\.(?:\d+\.)*)\s+(.+)$/);
      
      if (numberMatch) {
        // Если есть номер пункта, делаем его жирным
        const [, number, text] = numberMatch;
        return new Paragraph({
          alignment: alignment,
          spacing: { line: GOST_SETTINGS.lineSpacing },
          children: [
            new TextRun({
              text: number + ' ',
              font: GOST_SETTINGS.font,
              size: GOST_SETTINGS.fontSize,
              bold: true
            }),
            new TextRun({
              text: text,
              font: GOST_SETTINGS.font,
              size: GOST_SETTINGS.fontSize,
              bold: section.bold === true
            })
          ]
        });
      }
      
      // Обычный параграф без номера
      return new Paragraph({
        alignment: alignment,
        spacing: { line: GOST_SETTINGS.lineSpacing },
        indent: alignment === AlignmentType.JUSTIFIED && content.trim() ? { firstLine: GOST_SETTINGS.indent } : undefined,
        children: [
          new TextRun({
            text: content,
            font: GOST_SETTINGS.font,
            size: GOST_SETTINGS.fontSize,
            bold: section.bold === true
          })
        ]
      });

    case 'list':
      return (section.items || []).map((item, index) => {
        const itemText = replacePlaceholders(item, data);
        return new Paragraph({
          spacing: { line: GOST_SETTINGS.lineSpacing, before: 40, after: 40 },
          indent: { left: 720 },
          children: [
            new TextRun({
              text: `• ${itemText}`,
              font: GOST_SETTINGS.font,
              size: GOST_SETTINGS.fontSize
            })
          ]
        });
      });

    case 'table':
      return createTable(section, data);

    default:
      return null;
  }
}

/**
 * Создает таблицу
 */
function createTable(section, data) {
  const rows = [];

  // Заголовки таблицы
  if (section.headers && section.headers.length > 0) {
    const headerCells = section.headers.map(header => 
      new TableCell({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: header,
              font: GOST_SETTINGS.font,
              size: GOST_SETTINGS.fontSize,
              bold: true
            })
          ]
        })],
        shading: { fill: 'D9D9D9' }
      })
    );
    rows.push(new TableRow({ children: headerCells }));
  }

  // Данные таблицы
  if (section.rows && section.rows.length > 0) {
    for (const row of section.rows) {
      const cells = row.map(cellContent => {
        const text = replacePlaceholders(cellContent, data);
        return new TableCell({
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: text,
                font: GOST_SETTINGS.font,
                size: GOST_SETTINGS.fontSize
              })
            ]
          })]
        });
      });
      rows.push(new TableRow({ children: cells }));
    }
  }

  return new Table({
    rows: rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 }
    }
  });
}

/**
 * Заменяет плейсхолдеры {{variable}} в тексте на реальные значения
 */
function replacePlaceholders(text, data) {
  if (!text || typeof text !== 'string') return '';
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Подготавливает данные для договора (все 63 переменные)
 */
function prepareContractData(contract, schedulePhases = []) {
  // Данные уже приходят вложенными из SQL запроса с row_to_json()
  const customer = contract.customer || {};
  const contractor = contract.contractor || {};
  const project = contract.project || {};
  const estimate = contract.estimate || {};

  console.log('📄 [CONTRACT-JSON] Customer data:', customer);
  console.log('📄 [CONTRACT-JSON] Contractor data:', contractor);
  console.log('📄 [CONTRACT-JSON] Project data:', project);
  console.log('📄 [CONTRACT-JSON] Estimate data:', estimate);
  console.log('📄 [CONTRACT-JSON] Schedule phases:', schedulePhases);

  // Дата договора
  const contractDate = contract.date ? new Date(contract.date) : new Date();
  const contractDay = contractDate.getDate();
  const contractMonth = getMonthName(contractDate.getMonth());
  const contractYear = contractDate.getFullYear();

  // Номер договора (берём из БД, не генерируем)
  const contractNumber = contract.contract_number || generateContractNumber(contractDate);

  // Город
  const city = contractor.city || 'Москва';

  // Данные заказчика
  const customerFullName = customer.full_name || 'Не указано';
  const customerGender = customer.gender || 'мужской';
  const customerBirthDate = customer.birth_date ? formatDate(customer.birth_date) : 'Не указано';
  const customerBirthPlace = customer.birth_place || 'Не указано';
  
  // Паспортные данные из отдельных полей
  const customerPassportSeries = customer.passport_series || 'XXXX';
  const customerPassportNumber = customer.passport_number || 'XXXXXX';
  const customerPassportCode = customer.passport_issued_by_code || 'XXX-XXX';
  
  const customerPassportIssuedBy = customer.passport_issued_by || 'Не указано';
  const customerPassportIssueDate = customer.passport_issue_date ? formatDate(customer.passport_issue_date) : 'Не указано';
  const customerRegistrationAddress = customer.registration_address || 'Не указано';

  // Данные подрядчика
  const contractorCompanyFullName = contractor.company_name || 'Не указано';
  const contractorCompanyShortName = contractor.company_short_name || contractor.company_name || 'Не указано';
  const contractorINN = contractor.inn || 'Не указано';
  const contractorKPP = contractor.kpp || 'Не указано';
  const contractorOGRN = contractor.ogrn || 'Не указано';
  const contractorDirectorPosition = contractor.director_position || 'Генеральный директор';
  const contractorDirectorFullName = contractor.director_name || 'Не указано';
  const contractorDirectorShortName = contractor.director_name ? getShortName(contractor.director_name) : 'Не указано';
  const contractorBasisOfAuthority = contractor.basis_of_authority || 'Устава';
  const contractorLegalAddress = contractor.legal_address || 'Не указано';
  const contractorBankName = contractor.bank_name || 'Не указано';
  const contractorBankINN = contractor.bank_inn || 'Не указано';
  const contractorBankBIK = contractor.bank_bik || 'Не указано';
  const contractorBankAccount = contractor.bank_account || 'Не указано';
  const contractorBankCorrespondentAccount = contractor.correspondent_account || 'Не указано';
  const contractorEmail = contractor.email || 'info@example.com';
  const contractorPhone = contractor.phone || '+7 (XXX) XXX-XX-XX';

  // Адрес объекта
  const objectAddress = project.address || 'Не указано';

  // Финансовые данные
  const totalAmount = estimate.total_amount || estimate.totalAmount || 0;
  const { rubles: totalRubles, kopecks: totalKopecks } = splitAmount(totalAmount);
  const totalAmountInWords = numberToWords(totalRubles);
  const totalAmountKopecks = totalKopecks;

  // Материалы
  const materialsAmount = estimate.materials_amount || estimate.materialsAmount || 0;
  const { rubles: materialsRubles, kopecks: materialsKopecks } = splitAmount(materialsAmount);
  const materialsAmountInWords = numberToWords(materialsRubles);
  const materialsAmountKopecks = materialsKopecks;

  const materialsFirstPart = Math.floor(materialsAmount / 2);
  const { rubles: firstPartRubles, kopecks: firstPartKopecks } = splitAmount(materialsFirstPart);
  const materialsFirstPartInWords = numberToWords(firstPartRubles);
  const materialsFirstPartKopecks = firstPartKopecks;

  const materialsSecondPart = materialsAmount - materialsFirstPart;
  const { rubles: secondPartRubles, kopecks: secondPartKopecks } = splitAmount(materialsSecondPart);
  const materialsSecondPartInWords = numberToWords(secondPartRubles);
  const materialsSecondPartKopecks = secondPartKopecks;

  // Этапы работ из графика (динамическое количество этапов)
  const stageData = {};
  
  // Используем фазы из графика, если они есть
  if (schedulePhases && schedulePhases.length > 0) {
    console.log('📄 [CONTRACT-JSON] Using schedule phases:', schedulePhases.length, 'phases');
    
    schedulePhases.forEach((phase, index) => {
      const stageNum = index + 1;
      const amount = phase.amount || 0;
      const { rubles, kopecks } = splitAmount(amount);
      
      stageData[`stage${stageNum}Amount`] = formatAmount(amount);
      stageData[`stage${stageNum}AmountInWords`] = numberToWords(rubles);
      stageData[`stage${stageNum}AmountKopecks`] = kopecks;
      stageData[`stage${stageNum}Name`] = phase.phase; // Добавляем название фазы
    });
    
    // Сохраняем количество этапов
    stageData.stagesCount = schedulePhases.length;
  } else {
    // Если графика нет, используем старую логику (5 этапов по умолчанию)
    console.log('📄 [CONTRACT-JSON] No schedule phases, using default 5 stages');
    const stages = estimate.stages || [];
    
    for (let i = 1; i <= 5; i++) {
      const stage = stages[i - 1];
      const amount = stage?.amount || 0;
      const { rubles, kopecks } = splitAmount(amount);
      
      stageData[`stage${i}Amount`] = formatAmount(amount);
      stageData[`stage${i}AmountInWords`] = numberToWords(rubles);
      stageData[`stage${i}AmountKopecks`] = kopecks;
    }
    
    stageData.stagesCount = 5;
  }

  // Гарантийный срок
  const warrantyPeriod = contract.warranty_period || '12 месяцев';

  // Судебная юрисдикция
  const courtJurisdiction = contractor.court_jurisdiction || 'суде по месту нахождения Подрядчика';

  // Дата уведомления
  const notificationDate = formatDate(new Date());

  // Собираем все данные
  return {
    contractNumber,
    city,
    contractDay,
    contractMonth,
    contractYear,

    customerFullName,
    customerGender,
    customerBirthDate,
    customerBirthPlace,
    customerPassportSeries,
    customerPassportNumber,
    customerPassportIssuedBy,
    customerPassportIssueDate,
    customerPassportCode,
    customerRegistrationAddress,

    contractorCompanyFullName,
    contractorCompanyShortName,
    contractorINN,
    contractorKPP,
    contractorOGRN,
    contractorDirectorPosition,
    contractorDirectorFullName,
    contractorDirectorShortName,
    contractorBasisOfAuthority,
    contractorLegalAddress,
    contractorBankName,
    contractorBankINN,
    contractorBankBIK,
    contractorBankAccount,
    contractorBankCorrespondentAccount,
    contractorEmail,
    contractorPhone,

    objectAddress,

    totalAmount: formatAmount(totalAmount),
    totalAmountInWords,
    totalAmountKopecks,

    materialsAmount: formatAmount(materialsAmount),
    materialsAmountInWords,
    materialsAmountKopecks,

    materialsFirstPart: formatAmount(materialsFirstPart),
    materialsFirstPartInWords,
    materialsFirstPartKopecks,

    materialsSecondPart: formatAmount(materialsSecondPart),
    materialsSecondPartInWords,
    materialsSecondPartKopecks,

    ...stageData,

    warrantyPeriod,
    courtJurisdiction,
    notificationDate
  };
}

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

/**
 * Генерирует номер договора
 */
function generateContractNumber(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}${month}${day}-${random}`;
}

/**
 * Форматирует дату в формат ДД.ММ.ГГГГ
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Возвращает название месяца в родительном падеже
 */
function getMonthName(monthIndex) {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return months[monthIndex];
}

/**
 * Разделяет сумму на рубли и копейки
 */
function splitAmount(amount) {
  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);
  return { rubles, kopecks };
}

/**
 * Форматирует сумму с разделителями тысяч
 */
function formatAmount(amount) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Преобразует полное имя в короткий формат (И.О. Фамилия)
 */
function getShortName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  
  const lastName = parts[0];
  const firstName = parts[1] ? parts[1][0] + '.' : '';
  const middleName = parts[2] ? parts[2][0] + '.' : '';
  
  return `${firstName}${middleName} ${lastName}`;
}

/**
 * Преобразует число в слова (русский язык)
 */
function numberToWords(num) {
  if (num === 0) return 'ноль';

  const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  const thousandsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];

  function convertGroup(n, gender = 'male') {
    if (n === 0) return '';
    
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    let result = hundreds[h];
    
    if (t === 1) {
      result += ' ' + teens[u];
    } else {
      result += ' ' + tens[t];
      if (gender === 'female' && u > 0 && u < 3) {
        result += ' ' + thousandsFemale[u];
      } else {
        result += ' ' + units[u];
      }
    }
    
    return result.trim();
  }

  function getThousandWord(n) {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'тысяч';
    if (lastDigit === 1) return 'тысяча';
    if (lastDigit >= 2 && lastDigit <= 4) return 'тысячи';
    return 'тысяч';
  }

  function getMillionWord(n) {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'миллионов';
    if (lastDigit === 1) return 'миллион';
    if (lastDigit >= 2 && lastDigit <= 4) return 'миллиона';
    return 'миллионов';
  }

  const millions = Math.floor(num / 1000000);
  const thousandsCount = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  let result = '';

  if (millions > 0) {
    result += convertGroup(millions) + ' ' + getMillionWord(millions);
  }

  if (thousandsCount > 0) {
    result += ' ' + convertGroup(thousandsCount, 'female') + ' ' + getThousandWord(thousandsCount);
  }

  if (remainder > 0) {
    result += ' ' + convertGroup(remainder);
  }

  return result.trim();
}

export { generateContractDOCX };
