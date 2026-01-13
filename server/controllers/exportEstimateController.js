/**
 * Controller для экспорта сметы в Excel
 */

import ExcelJS from 'exceljs';
import db from '../config/database.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

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

/**
 * @route   POST /api/export-estimate-excel
 * @desc    Экспорт сметы в Excel
 * @access  Private
 */
export const exportEstimateToExcel = catchAsync(async (req, res) => {
  const { estimate } = req.body;
  const tenantId = req.user?.tenantId;

  if (!estimate) {
    throw new BadRequestError('Missing estimate data');
  }

    console.log('📤 Excel export requested for estimate:', estimate.id || 'new');
    console.log('🔐 Tenant ID:', tenantId);

    // Загружаем проект из БД
    let projectData = {};
    if (estimate.project_id) {
      console.log('🔍 Loading project from DB:', estimate.project_id);
      try {
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
          
          estimate.project_name = projectData.project_name;
          estimate.client_name = projectData.client_name;
          estimate.contractor_name = projectData.contractor_name;
          estimate.object_address = projectData.object_address;
          estimate.contract_number = projectData.contract_number;
        }
      } catch (dbError) {
        console.error('❌ Error loading project from DB:', dbError);
      }
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Смета', {
      pageSetup: { 
        paperSize: 9,
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

    // Set column widths
    worksheet.columns = [
      { key: 'num', width: 5 },
      { key: 'code', width: 12 },
      { key: 'name', width: 35 },
      { key: 'image', width: 12 },
      { key: 'unit', width: 8 },
      { key: 'quantity', width: 10 },
      { key: 'price', width: 12 },
      { key: 'total', width: 15 }
    ];

    let row = 1;

    // Шапка документа
    worksheet.mergeCells(`A${row}:H${row}`);
    const titleCell = worksheet.getCell(`A${row}`);
    titleCell.value = 'ЛОКАЛЬНАЯ СМЕТА';
    titleCell.font = titleFont;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    row++;

    worksheet.mergeCells(`A${row}:H${row}`);
    const numberCell = worksheet.getCell(`A${row}`);
    numberCell.value = `№ ${estimate.estimate_number || estimate.estimateNumber || 'б/н'}`;
    numberCell.font = { bold: true, size: 12 };
    numberCell.alignment = { horizontal: 'center' };
    row += 2;

    // Информация о проекте
    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Наименование проекта:';
    worksheet.getCell(`A${row}`).font = normalFont;
    worksheet.getCell(`A${row}`).border = thinBorder;
    
    worksheet.mergeCells(`C${row}:F${row}`);
    worksheet.getCell(`C${row}`).value = estimate.project_name || '';
    worksheet.getCell(`C${row}`).font = normalFont;
    worksheet.getCell(`C${row}`).border = thinBorder;
    
    worksheet.getCell(`G${row}`).value = 'Дата:';
    worksheet.getCell(`G${row}`).font = normalFont;
    worksheet.getCell(`G${row}`).border = thinBorder;
    
    worksheet.getCell(`H${row}`).value = estimate.estimate_date 
      ? new Date(estimate.estimate_date).toLocaleDateString('ru-RU')
      : '';
    worksheet.getCell(`H${row}`).font = normalFont;
    worksheet.getCell(`H${row}`).border = thinBorder;
    row++;

    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Заказчик:';
    worksheet.getCell(`A${row}`).font = normalFont;
    worksheet.getCell(`A${row}`).border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    worksheet.getCell(`C${row}`).value = estimate.client_name || '';
    worksheet.getCell(`C${row}`).font = normalFont;
    worksheet.getCell(`C${row}`).border = thinBorder;
    row++;

    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Подрядчик:';
    worksheet.getCell(`A${row}`).font = normalFont;
    worksheet.getCell(`A${row}`).border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    worksheet.getCell(`C${row}`).value = estimate.contractor_name || '';
    worksheet.getCell(`C${row}`).font = normalFont;
    worksheet.getCell(`C${row}`).border = thinBorder;
    row++;

    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Адрес объекта:';
    worksheet.getCell(`A${row}`).font = normalFont;
    worksheet.getCell(`A${row}`).border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    worksheet.getCell(`C${row}`).value = estimate.object_address || '';
    worksheet.getCell(`C${row}`).font = normalFont;
    worksheet.getCell(`C${row}`).border = thinBorder;
    row++;

    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Договор №:';
    worksheet.getCell(`A${row}`).font = normalFont;
    worksheet.getCell(`A${row}`).border = thinBorder;
    
    worksheet.mergeCells(`C${row}:H${row}`);
    worksheet.getCell(`C${row}`).value = estimate.contract_number || '';
    worksheet.getCell(`C${row}`).font = normalFont;
    worksheet.getCell(`C${row}`).border = thinBorder;
    row += 2;

    // Headers
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

    // Data rows
    let itemNum = 1;
    let totalWorks = 0;
    let totalMaterials = 0;
    const imagePromises = [];

    for (const section of estimate.sections || []) {
      worksheet.mergeCells(`A${row}:H${row}`);
      const sectionCell = worksheet.getCell(`A${row}`);
      sectionCell.value = section.name || 'Без названия';
      sectionCell.font = { bold: true, size: 11 };
      sectionCell.fill = sectionFill;
      sectionCell.border = thinBorder;
      row++;

      for (const item of section.items || []) {
        const workTotal = parseFloat(item.total || 0);
        totalWorks += workTotal;

        const workRow = worksheet.getRow(row);
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

          matRow.getCell(4).value = '';
          matRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
          matRow.getCell(4).fill = materialFill;
          matRow.getCell(4).border = thinBorder;

          if (material.image) {
            const currentRow = row;
            imagePromises.push(
              fetchImage(material.image).then(imageBuffer => {
                if (imageBuffer) {
                  return { buffer: imageBuffer, row: currentRow, col: 'D' };
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

    // Загружаем изображения
    const images = await Promise.all(imagePromises);
    for (const imageData of images) {
      if (imageData && imageData.buffer) {
        try {
          const imageId = workbook.addImage({
            buffer: imageData.buffer,
            extension: 'png',
          });
          
          worksheet.addImage(imageId, {
            tl: { col: 3.15, row: imageData.row - 0.85 },
            ext: { width: 60, height: 50 }
          });
        } catch (err) {
          console.error('Ошибка добавления изображения:', err);
        }
      }
    }

    row++;

    // Итоги
    const grandTotal = totalWorks + totalMaterials;

    worksheet.mergeCells(`A${row}:G${row}`);
    const totalWorksLabel = worksheet.getCell(`A${row}`);
    totalWorksLabel.value = 'Итого за работы:';
    totalWorksLabel.font = { bold: true, size: 10 };
    totalWorksLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totalWorksLabel.fill = totalWorksFill;
    totalWorksLabel.border = thinBorder;

    worksheet.getCell(`H${row}`).value = totalWorks;
    worksheet.getCell(`H${row}`).numFmt = '#,##0.00';
    worksheet.getCell(`H${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell(`H${row}`).font = { bold: true, size: 10 };
    worksheet.getCell(`H${row}`).fill = totalWorksFill;
    worksheet.getCell(`H${row}`).border = thinBorder;
    row++;

    worksheet.mergeCells(`A${row}:G${row}`);
    worksheet.getCell(`A${row}`).value = 'Итого за материалы:';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 10 };
    worksheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell(`A${row}`).fill = totalMaterialsFill;
    worksheet.getCell(`A${row}`).border = thinBorder;

    worksheet.getCell(`H${row}`).value = totalMaterials;
    worksheet.getCell(`H${row}`).numFmt = '#,##0.00';
    worksheet.getCell(`H${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell(`H${row}`).font = { bold: true, size: 10 };
    worksheet.getCell(`H${row}`).fill = totalMaterialsFill;
    worksheet.getCell(`H${row}`).border = thinBorder;
    row++;

    worksheet.mergeCells(`A${row}:G${row}`);
    worksheet.getCell(`A${row}`).value = 'ИТОГО ПО СМЕТЕ:';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell(`A${row}`).fill = grandTotalFill;
    worksheet.getCell(`A${row}`).border = thinBorder;

    worksheet.getCell(`H${row}`).value = grandTotal;
    worksheet.getCell(`H${row}`).numFmt = '#,##0.00';
    worksheet.getCell(`H${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell(`H${row}`).font = { bold: true, size: 12 };
    worksheet.getCell(`H${row}`).fill = grandTotalFill;
    worksheet.getCell(`H${row}`).border = thinBorder;
    row += 3;

    // Подписи
    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Составил:';
    worksheet.getCell(`A${row}`).font = normalFont;
    
    worksheet.mergeCells(`C${row}:D${row}`);
    worksheet.getCell(`C${row}`).value = '___________________';
    worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`C${row}`).font = normalFont;
    
    worksheet.getCell(`E${row}`).value = '(подпись)';
    worksheet.getCell(`E${row}`).font = smallFont;
    
    worksheet.mergeCells(`F${row}:H${row}`);
    worksheet.getCell(`F${row}`).value = '______________________________';
    worksheet.getCell(`F${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`F${row}`).font = normalFont;
    row++;

    worksheet.mergeCells(`E${row}:H${row}`);
    worksheet.getCell(`E${row}`).value = '(расшифровка подписи)';
    worksheet.getCell(`E${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`E${row}`).font = smallFont;
    row += 2;

    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Проверил:';
    worksheet.getCell(`A${row}`).font = normalFont;
    
    worksheet.mergeCells(`C${row}:D${row}`);
    worksheet.getCell(`C${row}`).value = '___________________';
    worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`C${row}`).font = normalFont;
    
    worksheet.getCell(`E${row}`).value = '(подпись)';
    worksheet.getCell(`E${row}`).font = smallFont;
    
    worksheet.mergeCells(`F${row}:H${row}`);
    worksheet.getCell(`F${row}`).value = '______________________________';
    worksheet.getCell(`F${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`F${row}`).font = normalFont;
    row++;

    worksheet.mergeCells(`E${row}:H${row}`);
    worksheet.getCell(`E${row}`).value = '(расшифровка подписи)';
    worksheet.getCell(`E${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`E${row}`).font = smallFont;
    row += 2;

    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = 'Утвердил:';
    worksheet.getCell(`A${row}`).font = normalFont;
    
    worksheet.mergeCells(`C${row}:D${row}`);
    worksheet.getCell(`C${row}`).value = '___________________';
    worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`C${row}`).font = normalFont;
    
    worksheet.getCell(`E${row}`).value = '(подпись)';
    worksheet.getCell(`E${row}`).font = smallFont;
    
    worksheet.mergeCells(`F${row}:H${row}`);
    worksheet.getCell(`F${row}`).value = '______________________________';
    worksheet.getCell(`F${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`F${row}`).font = normalFont;
    row++;

    worksheet.mergeCells(`E${row}:H${row}`);
    worksheet.getCell(`E${row}`).value = '(расшифровка подписи)';
    worksheet.getCell(`E${row}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`E${row}`).font = smallFont;

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    // Send response
    const estimateNumber = estimate.estimate_number || estimate.estimateNumber || 'б_н';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="estimate_${estimateNumber}.xlsx"`);
    res.send(Buffer.from(buffer));
});
