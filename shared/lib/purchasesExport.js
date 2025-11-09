/**
 * Утилиты для экспорта глобальных закупок
 * Поддерживает форматы: CSV, Excel (через HTML), PDF (через печать браузера)
 */

import { formatCurrency } from './formatters';

/**
 * Форматирование даты для экспорта
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
};

/**
 * Экспорт в CSV
 */
export const exportToCSV = (purchases, filters = {}) => {
  // Заголовки CSV
  const headers = [
    'Проект',
    'Смета',
    'Материал',
    'Артикул',
    'Количество',
    'Ед.изм.',
    'Цена закупки',
    'Сумма',
    'Дата закупки',
    'О/Ч'
  ];

  // Формируем строки CSV
  const rows = purchases.map(purchase => [
    escapeCsvField(purchase.project_name || '-'),
    escapeCsvField(purchase.estimate_name || '-'),
    escapeCsvField(purchase.material_name),
    escapeCsvField(purchase.material_sku || '-'),
    parseFloat(purchase.quantity).toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }),
    escapeCsvField(purchase.unit),
    parseFloat(purchase.purchase_price).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    parseFloat(purchase.total_price).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    formatDate(purchase.purchase_date),
    purchase.is_extra_charge ? 'Да' : 'Нет'
  ]);

  // Добавляем итоги
  const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
  const totalQuantities = purchases.length;

  rows.push([]);
  rows.push(['ИТОГО:', '', '', '', '', '', '', 
    totalAmount.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }), '', '']);
  rows.push(['Всего закупок:', totalQuantities, '', '', '', '', '', '', '', '']);

  // Формируем CSV контент
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Добавляем BOM для корректного отображения кириллицы в Excel
  const bom = '\ufeff';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Генерируем имя файла
  const timestamp = new Date().toISOString().split('T')[0];
  const projectFilter = filters.projectId ? `_проект_${filters.projectId}` : '';
  const filename = `Закупки${projectFilter}_${timestamp}.csv`;

  // Скачиваем файл
  downloadBlob(blob, filename);
};

/**
 * Экспорт в Excel (через HTML таблицу)
 */
export const exportToExcel = (purchases, statistics, filters = {}) => {
  // Группируем по проектам
  const groupedPurchases = purchases.reduce((acc, purchase) => {
    const projectName = purchase.project_name || 'Без проекта';
    if (!acc[projectName]) {
      acc[projectName] = {
        projectId: purchase.project_id,
        purchases: [],
        total: 0
      };
    }
    acc[projectName].purchases.push(purchase);
    acc[projectName].total += parseFloat(purchase.total_price || 0);
    return acc;
  }, {});

  // Формируем HTML таблицу
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #1976d2; }
        .filters { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px; }
        .statistics { margin: 20px 0; }
        .stat-item { display: inline-block; margin-right: 30px; padding: 10px; background: #e3f2fd; border-radius: 4px; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
        }
        th { 
          background: #1976d2; 
          color: white; 
          padding: 12px; 
          text-align: left;
          font-weight: 600;
        }
        td { 
          padding: 10px; 
          border: 1px solid #ddd; 
        }
        tr:nth-child(even) { background: #f9f9f9; }
        .group-header { 
          background: #e3f2fd !important; 
          font-weight: bold; 
          border-left: 4px solid #1976d2;
        }
        .total-row { 
          background: #fff3e0 !important; 
          font-weight: bold; 
        }
        .extra-charge { 
          background: #fff3e0; 
          padding: 2px 8px; 
          border-radius: 4px; 
          font-size: 12px;
        }
        .text-right { text-align: right; }
        .grand-total { 
          background: #1976d2 !important; 
          color: white !important; 
          font-size: 16px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>📦 Глобальные закупки</h1>
      
      <div class="filters">
        <strong>Фильтры:</strong><br>
        ${filters.projectId ? `Проект: ${filters.projectId}<br>` : ''}
        ${filters.dateFrom ? `Дата от: ${formatDate(filters.dateFrom)}<br>` : ''}
        ${filters.dateTo ? `Дата до: ${formatDate(filters.dateTo)}<br>` : ''}
        ${!filters.projectId && !filters.dateFrom && !filters.dateTo ? 'Все закупки' : ''}
      </div>

      ${statistics ? `
        <div class="statistics">
          <div class="stat-item">
            <strong>Всего закупок:</strong> ${statistics.totalPurchases || 0}
          </div>
          <div class="stat-item">
            <strong>Общая сумма:</strong> ${formatCurrency(statistics.totalAmount || 0)}
          </div>
          <div class="stat-item">
            <strong>Средний чек:</strong> ${formatCurrency(statistics.averageAmount || 0)}
          </div>
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>Проект</th>
            <th>Смета</th>
            <th>Материал</th>
            <th>Артикул</th>
            <th class="text-right">Количество</th>
            <th>Ед.изм.</th>
            <th class="text-right">Цена закупки</th>
            <th class="text-right">Сумма</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Добавляем группы
  Object.entries(groupedPurchases).forEach(([projectName, data], groupIndex) => {
    // Заголовок группы
    html += `
      <tr>
        <td colspan="9" class="group-header">
          ${groupIndex + 1}. ${projectName} (${data.purchases.length} закупок)
        </td>
      </tr>
    `;

    // Закупки проекта
    data.purchases.forEach(purchase => {
      html += `
        <tr>
          <td>${purchase.project_name || '-'}</td>
          <td>${purchase.estimate_name || '-'}</td>
          <td>
            ${purchase.is_extra_charge ? '<span class="extra-charge">О/Ч</span> ' : ''}
            ${purchase.material_name}
            ${purchase.material_sku ? `<br><small>Арт: ${purchase.material_sku}</small>` : ''}
          </td>
          <td>${purchase.material_sku || '-'}</td>
          <td class="text-right">${parseFloat(purchase.quantity).toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}</td>
          <td>${purchase.unit}</td>
          <td class="text-right">${formatCurrency(purchase.purchase_price)}</td>
          <td class="text-right">${formatCurrency(purchase.total_price)}</td>
          <td>${formatDate(purchase.purchase_date)}</td>
        </tr>
      `;
    });

    // Итого по проекту
    html += `
      <tr class="total-row">
        <td colspan="7" class="text-right"><strong>Итого по проекту:</strong></td>
        <td class="text-right"><strong>${formatCurrency(data.total)}</strong></td>
        <td></td>
      </tr>
    `;
  });

  // Общий итог
  const grandTotal = purchases.reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
  html += `
      <tr class="grand-total">
        <td colspan="7" class="text-right">ИТОГО:</td>
        <td class="text-right">${formatCurrency(grandTotal)}</td>
        <td></td>
      </tr>
    `;

  html += `
        </tbody>
      </table>
      
      <p style="color: #666; font-size: 12px;">
        Дата формирования: ${new Date().toLocaleString('ru-RU')}
      </p>
    </body>
    </html>
  `;

  // Создаем blob и скачиваем
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  
  const timestamp = new Date().toISOString().split('T')[0];
  const projectFilter = filters.projectId ? `_проект_${filters.projectId}` : '';
  const filename = `Закупки${projectFilter}_${timestamp}.xls`;

  downloadBlob(blob, filename);
};

/**
 * Экспорт в PDF (через печать браузера)
 */
export const exportToPDF = (purchases, statistics, filters = {}) => {
  // Группируем по проектам
  const groupedPurchases = purchases.reduce((acc, purchase) => {
    const projectName = purchase.project_name || 'Без проекта';
    if (!acc[projectName]) {
      acc[projectName] = {
        projectId: purchase.project_id,
        purchases: [],
        total: 0
      };
    }
    acc[projectName].purchases.push(purchase);
    acc[projectName].total += parseFloat(purchase.total_price || 0);
    return acc;
  }, {});

  // Создаем новое окно для печати
  const printWindow = window.open('', '_blank');
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Глобальные закупки</title>
      <style>
        @media print {
          @page { 
            size: A4 landscape; 
            margin: 15mm;
          }
          body { margin: 0; }
          .no-print { display: none; }
        }
        
        body { 
          font-family: Arial, sans-serif; 
          font-size: 10pt;
        }
        
        h1 { 
          color: #1976d2; 
          font-size: 18pt;
          margin-bottom: 10px;
        }
        
        .header {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #1976d2;
        }
        
        .filters { 
          margin: 10px 0; 
          font-size: 9pt;
          color: #666;
        }
        
        .statistics { 
          margin: 10px 0;
          display: flex;
          gap: 20px;
        }
        
        .stat-item { 
          padding: 8px 12px; 
          background: #e3f2fd; 
          border-radius: 4px;
          font-size: 9pt;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 15px 0;
          font-size: 9pt;
        }
        
        th { 
          background: #1976d2; 
          color: white; 
          padding: 8px 6px; 
          text-align: left;
          font-weight: 600;
          font-size: 8pt;
        }
        
        td { 
          padding: 6px; 
          border: 1px solid #ddd;
          font-size: 8pt;
        }
        
        tr:nth-child(even) { background: #f9f9f9; }
        
        .group-header { 
          background: #e3f2fd !important; 
          font-weight: bold; 
          border-left: 4px solid #1976d2;
          font-size: 9pt;
        }
        
        .total-row { 
          background: #fff3e0 !important; 
          font-weight: bold; 
        }
        
        .extra-charge { 
          background: #fff3e0; 
          padding: 1px 6px; 
          border-radius: 3px; 
          font-size: 7pt;
        }
        
        .text-right { text-align: right; }
        
        .grand-total { 
          background: #1976d2 !important; 
          color: white !important; 
          font-size: 10pt;
          font-weight: bold;
        }
        
        .footer {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          font-size: 8pt;
          color: #666;
        }
        
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 10px 20px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          z-index: 1000;
        }
        
        .print-button:hover {
          background: #1565c0;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Печать / Сохранить в PDF</button>
      
      <div class="header">
        <h1>📦 Глобальные закупки</h1>
        
        <div class="filters">
          <strong>Фильтры:</strong>
          ${filters.projectId ? `Проект: ${filters.projectId} | ` : ''}
          ${filters.dateFrom ? `Дата от: ${formatDate(filters.dateFrom)} | ` : ''}
          ${filters.dateTo ? `Дата до: ${formatDate(filters.dateTo)} | ` : ''}
          ${!filters.projectId && !filters.dateFrom && !filters.dateTo ? 'Все закупки' : ''}
        </div>

        ${statistics ? `
          <div class="statistics">
            <div class="stat-item">
              <strong>Всего закупок:</strong> ${statistics.totalPurchases || 0}
            </div>
            <div class="stat-item">
              <strong>Общая сумма:</strong> ${formatCurrency(statistics.totalAmount || 0)}
            </div>
            <div class="stat-item">
              <strong>Средний чек:</strong> ${formatCurrency(statistics.averageAmount || 0)}
            </div>
          </div>
        ` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 12%;">Проект</th>
            <th style="width: 12%;">Смета</th>
            <th style="width: 25%;">Материал</th>
            <th style="width: 8%;">Артикул</th>
            <th class="text-right" style="width: 8%;">Кол-во</th>
            <th style="width: 7%;">Ед.</th>
            <th class="text-right" style="width: 10%;">Цена</th>
            <th class="text-right" style="width: 12%;">Сумма</th>
            <th style="width: 8%;">Дата</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Добавляем группы
  Object.entries(groupedPurchases).forEach(([projectName, data], groupIndex) => {
    // Заголовок группы
    html += `
      <tr>
        <td colspan="9" class="group-header">
          ${groupIndex + 1}. ${projectName} (${data.purchases.length} закупок) - ${formatCurrency(data.total)}
        </td>
      </tr>
    `;

    // Закупки проекта
    data.purchases.forEach(purchase => {
      html += `
        <tr>
          <td>${purchase.project_name || '-'}</td>
          <td>${purchase.estimate_name || '-'}</td>
          <td>
            ${purchase.is_extra_charge ? '<span class="extra-charge">О/Ч</span> ' : ''}
            ${purchase.material_name}
          </td>
          <td>${purchase.material_sku || '-'}</td>
          <td class="text-right">${parseFloat(purchase.quantity).toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}</td>
          <td>${purchase.unit}</td>
          <td class="text-right">${formatCurrency(purchase.purchase_price)}</td>
          <td class="text-right">${formatCurrency(purchase.total_price)}</td>
          <td>${formatDate(purchase.purchase_date)}</td>
        </tr>
      `;
    });
  });

  // Общий итог
  const grandTotal = purchases.reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
  html += `
      <tr class="grand-total">
        <td colspan="7" class="text-right">ИТОГО:</td>
        <td class="text-right">${formatCurrency(grandTotal)}</td>
        <td></td>
      </tr>
    `;

  html += `
        </tbody>
      </table>
      
      <div class="footer">
        <p>Дата формирования: ${new Date().toLocaleString('ru-RU')}</p>
        <p>Система управления сметами "Smeta Pro"</p>
      </div>
      
      <script>
        // Автоматическая печать после загрузки (опционально)
        // window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Экранирование полей CSV (обработка запятых, кавычек, переносов строк)
 */
function escapeCsvField(field) {
  if (field == null) return '';
  
  const str = String(field);
  
  // Если есть запятая, кавычка или перенос строки - оборачиваем в кавычки
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Экранируем кавычки удвоением
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Скачивание blob как файл
 */
function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Очистка
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
