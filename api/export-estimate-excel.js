/**
 * @swagger
 * /api/export-estimate-excel:
 *   post:
 *     tags:
 *       - Estimates
 *     summary: Экспорт сметы в Excel
 *     description: |
 *       Генерирует профессиональный Excel файл со сметой.
 *       
 *       **Особенности:**
 *       - Автоматически загружает данные проекта из БД (заказчик, подрядчик, адрес, договор)
 *       - Включает фотографии материалов (60x50px)
 *       - Группировка по разделам
 *       - Подитоги по разделам и общий итог
 *       - Профессиональное форматирование
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estimate
 *             properties:
 *               estimate:
 *                 type: object
 *                 required:
 *                   - sections
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                     description: ID сметы
 *                   project_id:
 *                     type: string
 *                     format: uuid
 *                     description: ID проекта (для автозагрузки данных)
 *                   estimate_number:
 *                     type: string
 *                     description: Номер сметы
 *                     example: "ba757fbd-62fb-498b-9cd7-4b8a45aee84e"
 *                   estimate_date:
 *                     type: string
 *                     format: date
 *                     description: Дата сметы
 *                     example: "2025-11-05"
 *                   project_name:
 *                     type: string
 *                     description: Название проекта
 *                     example: "Инженерные сети"
 *                   sections:
 *                     type: array
 *                     description: Разделы сметы
 *                     items:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           description: Название раздела
 *                         items:
 *                           type: array
 *                           description: Позиции в разделе
 *                           items:
 *                             type: object
 *                             properties:
 *                               code:
 *                                 type: string
 *                                 description: Код работы
 *                               name:
 *                                 type: string
 *                                 description: Наименование работы
 *                               unit:
 *                                 type: string
 *                                 description: Единица измерения
 *                               quantity:
 *                                 type: number
 *                                 description: Количество
 *                               price:
 *                                 type: number
 *                                 description: Цена за единицу
 *                               total:
 *                                 type: number
 *                                 description: Общая сумма
 *                               type:
 *                                 type: string
 *                                 enum: [work, material]
 *                                 description: Тип позиции
 *                               image_url:
 *                                 type: string
 *                                 description: URL фотографии (для материалов)
 *     responses:
 *       200:
 *         description: Excel файл успешно сгенерирован
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Неверные данные запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Missing estimate data"
 *       500:
 *         description: Ошибка генерации Excel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */

/**
 * Serverless Function: Export Estimate to Excel with Professional Template
 * Endpoint: /api/export-estimate-excel
 */

import ExcelJS from 'exceljs';
import db from '../server/config/database.js';

// Вспомогательная функция для загрузки изображения
async function fetchImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Ошибка загрузки изображения:', url, error);
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const { estimate } = req.body;
    const tenantId = req.user?.tenantId; // Получаем tenantId из токена

    if (!estimate) {
      return res.status(400).json({ success: false, error: 'Missing estimate data' });
    }

    console.log('📤 Excel export requested for estimate:', estimate.id || 'new');
    console.log('🔐 Tenant ID:', tenantId);

    // 🔥 ЗАГРУЖАЕМ ПРОЕКТ ИЗ БД НАПРЯМУЮ
    let projectData = {};
    if (estimate.project_id) {
      console.log('🔍 Loading project from DB:', estimate.project_id);
      try {
        // Добавляем проверку tenantId для безопасности
        const projectResult = await db.query(
          'SELECT name, client, contractor, address, contract_number FROM projects WHERE id = $1 AND tenant_id = $2',
          [estimate.project_id, tenantId]
        );
        
        if (projectResult.rows.length > 0) {
          const project = projectResult.rows[0];
          projectData = {
            project_name: project.name || '',
            client_name: project.client || '',
            contractor_name: project.contractor || '',
            object_address: project.address || '',
            contract_number: project.contract_number || ''
          };
          console.log('✅ Project loaded from DB:', projectData);
          
          // Обновляем estimate данными из БД
          estimate.project_name = projectData.project_name;
          estimate.client_name = projectData.client_name;
          estimate.contractor_name = projectData.contractor_name;
          estimate.object_address = projectData.object_address;
          estimate.contract_number = projectData.contract_number;
        } else {
          console.log('⚠️ Project not found in DB');
        }
      } catch (dbError) {
        console.error('❌ Error loading project from DB:', dbError);
      }
    } else {
      console.log('⚠️ No project_id in estimate');
    }

    // ✅ Логируем данные для отладки
    console.log('📊 Excel Export - Received data:', {
      project_name: estimate.project_name,
      client_name: estimate.client_name,
      contractor_name: estimate.contractor_name,
      object_address: estimate.object_address,
      contract_number: estimate.contract_number,
      estimate_date: estimate.estimate_date,
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Смета', {
      pageSetup: { 
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        margins: {
          left: 0.5, right: 0.5,
          top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      }
    });

    // Styles
    const headerFont = { bold: true, size: 10 };
    const titleFont = { bold: true, size: 14 };
    const normalFont = { size: 10 };
    const smallFont = { size: 9 };
    
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
    const sectionFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    const materialFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFAFAFA' }
    };
    const totalWorksFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE3F2FD' }
    };
    const totalMaterialsFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5E9' }
    };
    const grandTotalFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF3E0' }
    };

    const thinBorder = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Set column widths (колонка Фото после Наименования)
    worksheet.columns = [
      { key: 'num', width: 5 },
      { key: 'code', width: 12 },
      { key: 'name', width: 35 },
      { key: 'image', width: 12 },  // ✅ Изображение после наименования
      { key: 'unit', width: 8 },
      { key: 'quantity', width: 10 },
      { key: 'price', width: 12 },
      { key: 'total', width: 15 }
    ];

    let row = 1;

    // ========== ШАПКА ДОКУМЕНТА ==========
    
    // Заголовок
    worksheet.mergeCells(`A${row}:H${row}`);
    const titleCell = worksheet.getCell(`A${row}`);
    titleCell.value = 'ЛОКАЛЬНАЯ СМЕТА';
    titleCell.font = titleFont;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    row++;

    // Номер сметы
    worksheet.mergeCells(`A${row}:H${row}`);
    const numberCell = worksheet.getCell(`A${row}`);
    numberCell.value = `№ ${estimate.estimate_number || estimate.estimateNumber || 'б/н'}`;
    numberCell.font = { bold: true, size: 12 };
    numberCell.alignment = { horizontal: 'center' };
    row += 2;

    // Информация о проекте (таблица 2x2)
    const infoStartRow = row;
    
    // Строка 1: Проект | Дата
    worksheet.mergeCells(`A${row}:B${row}`);
    const projectLabelCell = worksheet.getCell(`A${row}`);
    projectLabelCell.value = 'Наименование проекта:';
    projectLabelCell.font = normalFont;
    projectLabelCell.border = thinBorder;
    
    worksheet.mergeCells(`C${row}:F${row}`);
    const projectValueCell = worksheet.getCell(`C${row}`);
    projectValueCell.value = estimate.project_name || estimate.projectName || '';
    projectValueCell.font = normalFont;
    projectValueCell.border = thinBorder;
    
    worksheet.getCell(`G${row}`).value = 'Дата:';
    worksheet.getCell(`G${row}`).font = normalFont;
    worksheet.getCell(`G${row}`).border = thinBorder;
    
    worksheet.getCell(`H${row}`).value = estimate.estimate_date 
      ? new Date(estimate.estimate_date).toLocaleDateString('ru-RU')
      : '';
    worksheet.getCell(`H${row}`).font = normalFont;
    worksheet.getCell(`H${row}`).border = thinBorder;
    row++;

    // Строка 2: Заказчик
    worksheet.mergeCells(`A${row}:B${row}`);
    const clientLabelCell = worksheet.getCell(`A${row}`);
    clientLabelCell.value = 'Заказчик:';
    clientLabelCell.font = normalFont;
    clientLabelCell.border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    const clientValueCell = worksheet.getCell(`C${row}`);
    clientValueCell.value = estimate.client_name || estimate.clientName || '';
    clientValueCell.font = normalFont;
    clientValueCell.border = thinBorder;
    row++;

    // Строка 3: Подрядчик
    worksheet.mergeCells(`A${row}:B${row}`);
    const contractorLabelCell = worksheet.getCell(`A${row}`);
    contractorLabelCell.value = 'Подрядчик:';
    contractorLabelCell.font = normalFont;
    contractorLabelCell.border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    const contractorValueCell = worksheet.getCell(`C${row}`);
    contractorValueCell.value = estimate.contractor_name || estimate.contractorName || '';
    contractorValueCell.font = normalFont;
    contractorValueCell.border = thinBorder;
    row++;

    // Строка 4: Адрес объекта
    worksheet.mergeCells(`A${row}:B${row}`);
    const addressLabelCell = worksheet.getCell(`A${row}`);
    addressLabelCell.value = 'Адрес объекта:';
    addressLabelCell.font = normalFont;
    addressLabelCell.border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    const addressValueCell = worksheet.getCell(`C${row}`);
    addressValueCell.value = estimate.object_address || estimate.objectAddress || '';
    addressValueCell.font = normalFont;
    addressValueCell.border = thinBorder;
    row++;

    // Строка 5: Договор №
    worksheet.mergeCells(`A${row}:B${row}`);
    const contractLabelCell = worksheet.getCell(`A${row}`);
    contractLabelCell.value = 'Договор №:';
    contractLabelCell.font = normalFont;
    contractLabelCell.border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    const contractValueCell = worksheet.getCell(`C${row}`);
    contractValueCell.value = estimate.contract_number || estimate.contractNumber || '';
    contractValueCell.font = normalFont;
    contractValueCell.border = thinBorder;
    row += 2;

    // ========== ТАБЛИЦА ДАННЫХ ==========
    
    // Headers (Фото после Наименования)
    const headers = ['№', 'Код', 'Наименование работ и затрат', 'Фото', 'Ед.изм.', 'Кол-во', 'Цена, ₽', 'Сумма, ₽'];
    const headerRow = worksheet.getRow(row);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    headerRow.height = 30;

    row++;

    // ========== ДАННЫЕ СМЕТЫ ==========

    // Data rows
    let itemNum = 1;
    let totalWorks = 0;
    let totalMaterials = 0;

    // ✅ Массив для хранения информации об изображениях
    const imagePromises = [];

    for (const section of estimate.sections || []) {
      // Section header
      worksheet.mergeCells(`A${row}:H${row}`);
      const sectionCell = worksheet.getCell(`A${row}`);
      sectionCell.value = section.name || 'Без названия';
      sectionCell.font = { bold: true, size: 11 };
      sectionCell.fill = sectionFill;
      sectionCell.border = thinBorder;
      sectionCell.alignment = { vertical: 'middle' };
      row++;

      for (const item of section.items || []) {
        // Work row
        const workTotal = parseFloat(item.total || 0);
        totalWorks += workTotal;

        const workRow = worksheet.getRow(row);
        // ✅ Автоматическая высота на основе длины текста (минимум 20, +5 за каждые 50 символов)
        const textLength = (item.name || '').length;
        workRow.height = Math.max(20, 20 + Math.floor(textLength / 50) * 15);
        
        workRow.getCell(1).value = itemNum;
        workRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        workRow.getCell(1).border = thinBorder;

        workRow.getCell(2).value = item.code || '-';
        workRow.getCell(2).alignment = { vertical: 'middle' };
        workRow.getCell(2).border = thinBorder;

        workRow.getCell(3).value = item.name || '';
        workRow.getCell(3).font = { bold: true, size: 10 };
        workRow.getCell(3).alignment = { vertical: 'middle', wrapText: true };
        workRow.getCell(3).border = thinBorder;

        // ✅ Колонка для изображения работы (4-я колонка)
        workRow.getCell(4).value = '';
        workRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        workRow.getCell(4).border = thinBorder;

        workRow.getCell(5).value = item.unit || 'шт';
        workRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        workRow.getCell(5).border = thinBorder;

        workRow.getCell(6).value = parseFloat(item.quantity || 0);
        workRow.getCell(6).numFmt = '#,##0.00';
        workRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
        workRow.getCell(6).border = thinBorder;

        workRow.getCell(7).value = parseFloat(item.price || 0);
        workRow.getCell(7).numFmt = '#,##0.00';
        workRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
        workRow.getCell(7).border = thinBorder;

        workRow.getCell(8).value = workTotal;
        workRow.getCell(8).numFmt = '#,##0.00';
        workRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
        workRow.getCell(8).font = { bold: true };
        workRow.getCell(8).border = thinBorder;

        row++;
        itemNum++;

        // Material rows
        for (const material of item.materials || []) {
          const matTotal = parseFloat(material.total || 0);
          totalMaterials += matTotal;

          const matRow = worksheet.getRow(row);
          // ✅ Автоматическая высота для материалов (увеличена для изображения)
          const matTextLength = (material.name || '').length;
          matRow.height = material.image ? 70 : Math.max(18, 18 + Math.floor(matTextLength / 50) * 12);
          
          matRow.getCell(1).value = '';
          matRow.getCell(1).border = thinBorder;

          matRow.getCell(2).value = material.code || material.sku || '-';
          matRow.getCell(2).font = smallFont;
          matRow.getCell(2).alignment = { vertical: 'middle' };
          matRow.getCell(2).fill = materialFill;
          matRow.getCell(2).border = thinBorder;

          matRow.getCell(3).value = `  → ${material.name || ''}`;
          matRow.getCell(3).font = { italic: true, size: 9 };
          matRow.getCell(3).alignment = { vertical: 'middle', wrapText: true };
          matRow.getCell(3).fill = materialFill;
          matRow.getCell(3).border = thinBorder;

          // ✅ Колонка для изображения материала (4-я колонка)
          matRow.getCell(4).value = '';
          matRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
          matRow.getCell(4).fill = materialFill;
          matRow.getCell(4).border = thinBorder;

          // ✅ Если есть изображение, загружаем его асинхронно
          // ВАЖНО: сохраняем текущий номер строки в замыкании!
          if (material.image) {
            const currentRow = row; // ✅ Фиксируем номер строки для этого материала
            imagePromises.push(
              fetchImage(material.image).then(imageBuffer => {
                if (imageBuffer) {
                  return { buffer: imageBuffer, row: currentRow, col: 'D' }; // ✅ Колонка D (4-я)
                }
                return null;
              })
            );
          }

          matRow.getCell(5).value = material.unit || 'шт';
          matRow.getCell(5).font = smallFont;
          matRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
          matRow.getCell(5).fill = materialFill;
          matRow.getCell(5).border = thinBorder;

          matRow.getCell(6).value = parseFloat(material.quantity || 0);
          matRow.getCell(6).font = smallFont;
          matRow.getCell(6).numFmt = '#,##0.00';
          matRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
          matRow.getCell(6).fill = materialFill;
          matRow.getCell(6).border = thinBorder;

          matRow.getCell(7).value = parseFloat(material.price || 0);
          matRow.getCell(7).font = smallFont;
          matRow.getCell(7).numFmt = '#,##0.00';
          matRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
          matRow.getCell(7).fill = materialFill;
          matRow.getCell(7).border = thinBorder;

          matRow.getCell(8).value = matTotal;
          matRow.getCell(8).font = smallFont;
          matRow.getCell(8).numFmt = '#,##0.00';
          matRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
          matRow.getCell(8).fill = materialFill;
          matRow.getCell(8).border = thinBorder;

          row++;
        }
      }
    }

    // ✅ Загружаем все изображения и добавляем в workbook
    const images = await Promise.all(imagePromises);
    for (const imageData of images) {
      if (imageData && imageData.buffer) {
        try {
          const imageId = workbook.addImage({
            buffer: imageData.buffer,
            extension: 'png',
          });
          
          // ✅ Вставляем изображение в центр ячейки D (4-я колонка)
          // Колонка D = индекс 3, смещение 0.15 для центрирования
          // Размер: 60x50 пикселей
          worksheet.addImage(imageId, {
            tl: { col: 3.15, row: imageData.row - 0.85 }, // Колонка D с центрированием
            ext: { width: 60, height: 50 }
          });
        } catch (err) {
          console.error('Ошибка добавления изображения в Excel:', err);
        }
      }
    }

    row++;

    // ========== ИТОГИ ==========

    const grandTotal = totalWorks + totalMaterials;

    // Total works
    worksheet.mergeCells(`A${row}:G${row}`);
    const totalWorksLabel = worksheet.getCell(`A${row}`);
    totalWorksLabel.value = 'Итого за работы:';
    totalWorksLabel.font = { bold: true, size: 10 };
    totalWorksLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totalWorksLabel.fill = totalWorksFill;
    totalWorksLabel.border = thinBorder;

    const totalWorksCell = worksheet.getCell(`H${row}`);
    totalWorksCell.value = totalWorks;
    totalWorksCell.numFmt = '#,##0.00';
    totalWorksCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalWorksCell.font = { bold: true, size: 10 };
    totalWorksCell.fill = totalWorksFill;
    totalWorksCell.border = thinBorder;
    row++;

    // Total materials
    worksheet.mergeCells(`A${row}:G${row}`);
    const totalMatLabel = worksheet.getCell(`A${row}`);
    totalMatLabel.value = 'Итого за материалы:';
    totalMatLabel.font = { bold: true, size: 10 };
    totalMatLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totalMatLabel.fill = totalMaterialsFill;
    totalMatLabel.border = thinBorder;

    const totalMatCell = worksheet.getCell(`H${row}`);
    totalMatCell.value = totalMaterials;
    totalMatCell.numFmt = '#,##0.00';
    totalMatCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalMatCell.font = { bold: true, size: 10 };
    totalMatCell.fill = totalMaterialsFill;
    totalMatCell.border = thinBorder;
    row++;

    // Grand total
    worksheet.mergeCells(`A${row}:G${row}`);
    const grandLabel = worksheet.getCell(`A${row}`);
    grandLabel.value = 'ИТОГО ПО СМЕТЕ:';
    grandLabel.font = { bold: true, size: 12 };
    grandLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    grandLabel.fill = grandTotalFill;
    grandLabel.border = thinBorder;

    const grandCell = worksheet.getCell(`H${row}`);
    grandCell.value = grandTotal;
    grandCell.numFmt = '#,##0.00';
    grandCell.alignment = { horizontal: 'right', vertical: 'middle' };
    grandCell.font = { bold: true, size: 12 };
    grandCell.fill = grandTotalFill;
    grandCell.border = thinBorder;
    row += 3;

    // ========== ПОДПИСИ ==========

    // Составил
    worksheet.mergeCells(`A${row}:B${row}`);
    const composedLabelCell = worksheet.getCell(`A${row}`);
    composedLabelCell.value = 'Составил:';
    composedLabelCell.font = normalFont;
    
    worksheet.mergeCells(`C${row}:D${row}`);
    const composedSignCell = worksheet.getCell(`C${row}`);
    composedSignCell.value = '___________________';
    composedSignCell.alignment = { horizontal: 'center' };
    composedSignCell.font = normalFont;
    
    worksheet.getCell(`E${row}`).value = '(подпись)';
    worksheet.getCell(`E${row}`).font = smallFont;
    
    worksheet.mergeCells(`F${row}:H${row}`);
    const composedNameCell = worksheet.getCell(`F${row}`);
    composedNameCell.value = '______________________________';
    composedNameCell.alignment = { horizontal: 'center' };
    composedNameCell.font = normalFont;
    row++;

    worksheet.mergeCells(`E${row}:H${row}`);
    const composedNameLabelCell = worksheet.getCell(`E${row}`);
    composedNameLabelCell.value = '(расшифровка подписи)';
    composedNameLabelCell.alignment = { horizontal: 'center' };
    composedNameLabelCell.font = smallFont;
    row += 2;

    // Проверил
    worksheet.mergeCells(`A${row}:B${row}`);
    const checkedLabelCell = worksheet.getCell(`A${row}`);
    checkedLabelCell.value = 'Проверил:';
    checkedLabelCell.font = normalFont;
    
    worksheet.mergeCells(`C${row}:D${row}`);
    const checkedSignCell = worksheet.getCell(`C${row}`);
    checkedSignCell.value = '___________________';
    checkedSignCell.alignment = { horizontal: 'center' };
    checkedSignCell.font = normalFont;
    
    worksheet.getCell(`E${row}`).value = '(подпись)';
    worksheet.getCell(`E${row}`).font = smallFont;
    
    worksheet.mergeCells(`F${row}:H${row}`);
    const checkedNameCell = worksheet.getCell(`F${row}`);
    checkedNameCell.value = '______________________________';
    checkedNameCell.alignment = { horizontal: 'center' };
    checkedNameCell.font = normalFont;
    row++;

    worksheet.mergeCells(`E${row}:H${row}`);
    const checkedNameLabelCell = worksheet.getCell(`E${row}`);
    checkedNameLabelCell.value = '(расшифровка подписи)';
    checkedNameLabelCell.alignment = { horizontal: 'center' };
    checkedNameLabelCell.font = smallFont;
    row += 2;

    // Утвердил
    worksheet.mergeCells(`A${row}:B${row}`);
    const approvedLabelCell = worksheet.getCell(`A${row}`);
    approvedLabelCell.value = 'Утвердил:';
    approvedLabelCell.font = normalFont;
    
    worksheet.mergeCells(`C${row}:D${row}`);
    const approvedSignCell = worksheet.getCell(`C${row}`);
    approvedSignCell.value = '___________________';
    approvedSignCell.alignment = { horizontal: 'center' };
    approvedSignCell.font = normalFont;
    
    worksheet.getCell(`E${row}`).value = '(подпись)';
    worksheet.getCell(`E${row}`).font = smallFont;
    
    worksheet.mergeCells(`F${row}:H${row}`);
    const approvedNameCell = worksheet.getCell(`F${row}`);
    approvedNameCell.value = '______________________________';
    approvedNameCell.alignment = { horizontal: 'center' };
    approvedNameCell.font = normalFont;
    row++;

    worksheet.mergeCells(`E${row}:H${row}`);
    const approvedNameLabelCell = worksheet.getCell(`E${row}`);
    approvedNameLabelCell.value = '(расшифровка подписи)';
    approvedNameLabelCell.alignment = { horizontal: 'center' };
    approvedNameLabelCell.font = smallFont;

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    // Send response
    const estimateNumber = estimate.estimate_number || estimate.estimateNumber || 'б_н';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="estimate_${estimateNumber}.xlsx"`);
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
