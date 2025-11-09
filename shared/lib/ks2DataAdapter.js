/**
 * Адаптер данных для формы КС-2
 * Конвертирует данные из API в формат, который ожидает компонент KS2.jsx
 */

export function adaptKS2Data(apiData) {
  if (!apiData) return { doc: {}, rows: [], totals: {} };

  // Документ (шапка)
  const doc = {
    investor: apiData.investor?.name || '',
    customer: apiData.customer?.name || '',
    contractor: apiData.contractor?.name || '',
    project: apiData.constructionSite?.name || apiData.projectName || '',
    objectName: apiData.constructionObject?.name || apiData.objectName || '',
    number: apiData.actNumber || '',
    date: apiData.actDate || new Date(),
    periodFrom: apiData.periodFrom || '',
    periodTo: apiData.periodTo || '',
    contractorPosition: apiData.contractorSignatory?.position || '',
    contractorSign: apiData.contractorSignatory?.fullName || '',
    customerPosition: apiData.customerSignatory?.position || '',
    customerSign: apiData.customerSignatory?.fullName || '',
  };

  // Строки работ
  const rows = (apiData.works || []).map((work, index) => ({
    n: index + 1,
    code: work.position || work.code || '',
    name: work.name || '',
    priceCode: work.unitPriceCode || '',
    unit: work.unit || '',
    qty: work.actualQuantity || work.quantity || 0,
    price: work.price || 0,
    sum: work.totalPrice || (work.actualQuantity || 0) * (work.price || 0),
  }));

  // Итоги
  const sum = apiData.totals?.amount || rows.reduce((acc, r) => acc + r.sum, 0);
  const vatRate = apiData.totals?.vatRate || 0.2;
  const vat = apiData.totals?.vat || sum * vatRate;
  const total = apiData.totals?.total || sum + vat;

  const totals = {
    sum,
    vatRate,
    vat,
    total,
  };

  return { doc, rows, totals };
}
