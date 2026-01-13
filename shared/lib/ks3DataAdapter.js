/**
 * Адаптер данных для формы КС-3
 * Конвертирует данные из API в формат, который ожидает компонент KS3.jsx
 */

export function adaptKS3Data(apiData) {
  if (!apiData) return { doc: {}, rows: [], totals: {} };

  // Документ (шапка)
  const doc = {
    contract: apiData.contractNumber || '',
    objectName: apiData.constructionObject?.name || apiData.objectName || '',
    contractor: apiData.contractor?.name || '',
    customer: apiData.customer?.name || '',
    number: apiData.reportNumber || '',
    date: apiData.reportDate || new Date(),
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
    name: work.name || '',
    unit: work.unit || '',
    qty: work.actualQuantity || work.quantity || 0,
    price: work.price || 0,
    sumPrev: work.previousPeriodAmount || 0,
    sumCurr: work.currentPeriodAmount || (work.actualQuantity || 0) * (work.price || 0),
    sumCumul: work.cumulativeAmount || 0,
  }));

  // Итоги
  const prev = apiData.totals?.previousPeriod || rows.reduce((acc, r) => acc + r.sumPrev, 0);
  const curr = apiData.totals?.currentPeriod || rows.reduce((acc, r) => acc + r.sumCurr, 0);
  const cumul = apiData.totals?.cumulative || rows.reduce((acc, r) => acc + r.sumCumul, 0);
  const vatRate = apiData.totals?.vatRate || 0.2;
  const vat = apiData.totals?.vat || curr * vatRate;
  const total = apiData.totals?.total || curr + vat;

  const totals = {
    prev,
    curr,
    cumul,
    vatRate,
    vat,
    total,
  };

  return { doc, rows, totals };
}
