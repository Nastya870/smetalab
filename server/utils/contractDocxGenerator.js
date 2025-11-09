/**
 * Генератор договоров в формате DOCX
 * Использует библиотеку docx для создания профессиональных документов
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

/**
 * Генерация договора в DOCX формате
 * @param {Object} contract - Данные договора из БД
 * @returns {Promise<Buffer>} - Buffer с DOCX файлом
 */
export const generateContractDOCX = async (contract) => {
  try {
    // Парсим template_data если это строка
    const templateData = typeof contract.template_data === 'string' 
      ? JSON.parse(contract.template_data) 
      : contract.template_data || {};

    // Используем актуальные данные из JOIN (приоритет) или fallback на template_data
    const actualData = {
      customer: contract.customer || templateData.customer || {},
      contractor: contract.contractor || templateData.contractor || {},
      project: contract.project || templateData.project || {},
      estimate: contract.estimate || templateData.estimate || {}
    };

    // Создаем DOCX документ
    const doc = createContractDocument(contract, actualData);
    
    // Генерируем Buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;
    
  } catch (error) {
    console.error('Error generating contract DOCX:', error);
    throw new Error('Не удалось сгенерировать договор');
  }
};

/**
 * Создание DOCX документа договора
 */
function createContractDocument(contract, data) {
  const { customer, contractor, project, estimate } = data;
  
  // Данные подрядчика (юр. лицо)
  const contractorName = contractor?.company_name || contractor?.companyName || 'Подрядчик';
  const directorPosition = contractor?.director_position || contractor?.directorPosition || 'Генеральный директор';
  const directorName = contractor?.director_name || contractor?.directorName || '[ФИО директора]';
  const contractorINN = contractor?.inn || '';
  const contractorOGRN = contractor?.ogrn || '';
  const contractorAddress = contractor?.legal_address || contractor?.legalAddress || '';
  
  // Данные заказчика (физ. лицо)
  const customerName = customer?.full_name || customer?.fullName || 'Заказчик';
  const passportSeriesNumber = customer?.passport_series_number || 
    (customer?.passportSeries && customer?.passportNumber 
      ? `${customer.passportSeries} ${customer.passportNumber}` 
      : '[серия номер]');
  const passportIssuedBy = customer?.passport_issued_by || customer?.passportIssuedBy || '[кем выдан]';
  const passportIssueDate = customer?.passport_issue_date || customer?.passportIssueDate;
  const registrationAddress = customer?.registration_address || customer?.registrationAddress || '[адрес]';
  
  // Данные проекта
  const projectName = project?.object_name || project?.objectName || project?.name || 'Объект';
  const projectAddress = project?.address || '[адрес объекта]';
  
  // Стоимость
  const totalAmount = contract.total_amount || 0;
  const worksCost = estimate?.works_cost || estimate?.worksCost || 0;
  const materialsCost = estimate?.materials_cost || estimate?.materialsCost || 0;

  return new Document({
    sections: [{
      properties: {},
      children: [
        // Заголовок
        new Paragraph({
          text: 'ДОГОВОР ПОДРЯДА',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `№ ${contract.contract_number}`,
              bold: true,
              size: 28
            })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `от ${formatDate(contract.contract_date)}`,
              size: 24
            })
          ],
          spacing: { after: 400 }
        }),
        
        // Стороны договора
        new Paragraph({
          children: [
            new TextRun({
              text: `    ${contractorName}`,
              bold: true
            }),
            new TextRun({
              text: `, именуемое в дальнейшем "Подрядчик", в лице ${directorPosition} ${directorName}, действующего на основании Устава, с одной стороны, и`
            })
          ],
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: `    ${customerName}`,
              bold: true
            }),
            new TextRun({
              text: `, именуемый в дальнейшем "Заказчик", паспорт: ${passportSeriesNumber}, выдан ${passportIssuedBy} ${formatDate(passportIssueDate)}, зарегистрированный по адресу: ${registrationAddress}, с другой стороны,`
            })
          ],
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          text: 'совместно именуемые "Стороны", заключили настоящий Договор о нижеследующем:',
          spacing: { after: 400 }
        }),
        
        // Раздел 1
        new Paragraph({
          text: '1. ПРЕДМЕТ ДОГОВОРА',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '1.1. ', bold: true }),
            new TextRun({ text: `Подрядчик обязуется по заданию Заказчика выполнить работы по объекту: "${projectName}"` })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: `Адрес объекта: ${projectAddress}`,
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '1.2. ', bold: true }),
            new TextRun({ text: 'Перечень работ, их объем и стоимость определяются Сметой (Приложение №1 к настоящему Договору).' })
          ],
          spacing: { after: 400 }
        }),
        
        // Раздел 2
        new Paragraph({
          text: '2. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЕТОВ',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '2.1. ', bold: true }),
            new TextRun({ text: 'Общая стоимость работ по настоящему Договору составляет:' })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: `${formatAmount(totalAmount)} (${numberToWords(totalAmount)})`,
              bold: true,
              size: 26
            })
          ],
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          text: 'В том числе:',
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: `- Стоимость работ: ${formatAmount(worksCost)}`,
          spacing: { after: 50 }
        }),
        
        new Paragraph({
          text: `- Стоимость материалов: ${formatAmount(materialsCost)}`,
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '2.2. ', bold: true }),
            new TextRun({ text: 'Расчеты производятся в соответствии с Графиком производства работ (Приложение №2 к настоящему Договору).' })
          ],
          spacing: { after: 400 }
        }),
        
        // Раздел 3
        new Paragraph({
          text: '3. СРОКИ ВЫПОЛНЕНИЯ РАБОТ',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '3.1. ', bold: true }),
            new TextRun({ text: `Срок выполнения работ: ${contract.contract_period || '1 год'} с момента подписания настоящего Договора.` })
          ],
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '3.2. ', bold: true }),
            new TextRun({ text: 'Сроки могут быть изменены по соглашению Сторон.' })
          ],
          spacing: { after: 400 }
        }),
        
        // Подписи
        new Paragraph({
          text: '4. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'ПОДРЯДЧИК:', bold: true })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: contractorName,
          spacing: { after: 50 }
        }),
        
        new Paragraph({
          text: `ИНН: ${contractorINN}`,
          spacing: { after: 50 }
        }),
        
        new Paragraph({
          text: `ОГРН: ${contractorOGRN}`,
          spacing: { after: 50 }
        }),
        
        new Paragraph({
          text: `Адрес: ${contractorAddress}`,
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          text: `${directorPosition} _______________ ${directorName}`,
          spacing: { after: 400 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'ЗАКАЗЧИК:', bold: true })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: customerName,
          spacing: { after: 50 }
        }),
        
        new Paragraph({
          text: `Паспорт: ${passportSeriesNumber}`,
          spacing: { after: 50 }
        }),
        
        new Paragraph({
          text: `Адрес: ${registrationAddress}`,
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          text: `_______________ ${customerName}`,
          spacing: { after: 200 }
        })
      ]
    }]
  });
}

/**
 * Форматирование даты в ДД.ММ.ГГГГ
 */
function formatDate(dateString) {
  if (!dateString) return '__.__.____';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Форматирование суммы в рубли
 */
function formatAmount(amount) {
  if (!amount) return '0.00 руб.';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Преобразование числа в слова (прописью)
 * Упрощенная версия для договора
 */
function numberToWords(num) {
  if (!num) return 'ноль рублей 00 копеек';
  
  const rubles = Math.floor(num);
  const kopecks = Math.round((num - rubles) * 100);
  
  // Упрощенная версия - возвращаем цифрами с текстом
  return `${rubles} (${getRubleWord(rubles)}) ${String(kopecks).padStart(2, '0')} копеек`;
}

/**
 * Получить правильное склонение слова "рубль"
 */
function getRubleWord(num) {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'рублей';
  }
  
  if (lastDigit === 1) {
    return 'рубль';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'рубля';
  }
  
  return 'рублей';
}
