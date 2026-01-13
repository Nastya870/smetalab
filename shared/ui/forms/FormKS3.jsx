import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack
} from '@mui/material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import TableViewIcon from '@mui/icons-material/TableView';
import { generateKS3Excel } from 'utils/exportFormsExcel_patched';

// Стили для печати
import 'assets/styles/printForms.css';

/**
 * Компонент для отображения формы КС-3 
 * (Справка о стоимости выполненных работ и затрат)
 * ОКУД 0322001
 * 
 * ✅ Точное соответствие унифицированной форме № КС-3 из PDF
 * ✅ Утверждена постановлением Госкомстата России от 11.11.99 № 100
 */
const FormKS3 = ({ data }) => {
  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Данные формы КС-3 не загружены
        </Typography>
      </Box>
    );
  }

  const formatDate = (date) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'dd.MM.yyyy', { locale: ru });
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Вычисляем итоги
  const totalFromStart = data.totals?.amountYTD || 0;          // С начала проведения работ
  const totalFromYearStart = data.totals?.amountFromYear || 0; // С начала года
  const totalCurrent = data.totals?.amountCurrent || 0;        // За отчетный период

  return (
    <Box className="form-ks3" sx={{ 
      p: 3, 
      bgcolor: 'background.paper', 
      maxWidth: '297mm', 
      margin: '0 auto',
      '@media print': {
        p: 0,
        m: 0,
        maxWidth: '100%',
        bgcolor: 'transparent'
      }
    }}>
      {/* Кнопка скачивания Excel */}
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ 
          mb: 3, 
          justifyContent: 'flex-end',
          '@media print': {
            display: 'none'
          }
        }}
      >
        <Button
          variant="contained"
          color="success"
          startIcon={<TableViewIcon />}
          onClick={() => generateKS3Excel(data)}
        >
          Скачать Excel
        </Button>
      </Stack>
      {/* Шапка формы с таблицей кодов справа */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '10px' }}>
            Унифицированная форма № КС-3
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontSize: '10px' }}>
            Утверждена постановлением Госкомстата России
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontSize: '10px' }}>
            от 11.11.99 № 100
          </Typography>
        </Box>
        
        {/* Таблица с кодами справа */}
        <Box sx={{ width: '180px', border: '1px solid #000' }}>
          <Box sx={{ borderBottom: '1px solid #000', p: 0.5, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '10px' }}>Код</Typography>
          </Box>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #000' }}>
            <Box sx={{ flex: 1, borderRight: '1px solid #000', p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>Форма по ОКУД</Typography>
            </Box>
            <Box sx={{ width: '80px', p: 0.5, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>0322001</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #000' }}>
            <Box sx={{ flex: 1, borderRight: '1px solid #000', p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>по ОКПО</Typography>
            </Box>
            <Box sx={{ width: '80px', p: 0.5 }}>&nbsp;</Box>
          </Box>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #000' }}>
            <Box sx={{ flex: 1, borderRight: '1px solid #000', p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>по ОКПО</Typography>
            </Box>
            <Box sx={{ width: '80px', p: 0.5 }}>&nbsp;</Box>
          </Box>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #000' }}>
            <Box sx={{ flex: 1, borderRight: '1px solid #000', p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>по ОКПО</Typography>
            </Box>
            <Box sx={{ width: '80px', p: 0.5 }}>&nbsp;</Box>
          </Box>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #000' }}>
            <Box sx={{ flex: 1, borderRight: '1px solid #000', p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>Вид деятельности по ОКДП</Typography>
            </Box>
            <Box sx={{ width: '80px', p: 0.5 }}>&nbsp;</Box>
          </Box>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #000' }}>
            <Box sx={{ flex: 1, borderRight: '1px solid #000', p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>Договор подряд (контракт)</Typography>
            </Box>
            <Box sx={{ width: '80px' }}>
              <Box sx={{ borderBottom: '1px solid #000', p: 0.3, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '9px' }}>номер</Typography>
              </Box>
              <Box sx={{ p: 0.3, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '9px' }}>дата</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 0.5, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '10px' }}>Вид операции</Typography>
          </Box>
        </Box>
      </Box>

      {/* Инвестор */}
      <Box sx={{ display: 'flex', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '10px', minWidth: '100px' }}>Инвестор</Typography>
        <Box sx={{ flex: 1, borderBottom: '1px solid #000', px: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px' }}>{data.investor?.name || ''}</Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary', ml: '100px', display: 'block', mb: 1 }}>
        (организация, адрес, телефон, факс)
      </Typography>

      {/* Заказчик (Генподрядчик) */}
      <Box sx={{ display: 'flex', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '10px', minWidth: '100px' }}>Заказчик ( Генподрядчик )</Typography>
        <Box sx={{ flex: 1, borderBottom: '1px solid #000', px: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px' }}>
            {data.customer?.name || ''}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary', ml: '100px', display: 'block', mb: 1 }}>
        (организация, адрес, телефон, факс)
      </Typography>

      {/* Подрядчик (Субподрядчик) */}
      <Box sx={{ display: 'flex', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '10px', minWidth: '100px' }}>Подрядчик ( Субподрядчик )</Typography>
        <Box sx={{ flex: 1, borderBottom: '1px solid #000', px: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px' }}>
            {data.contractor?.name || ''}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary', ml: '100px', display: 'block', mb: 1 }}>
        (организация, адрес, телефон, факс)
      </Typography>

      {/* Стройка */}
      <Box sx={{ display: 'flex', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '10px', minWidth: '100px' }}>Стройка</Typography>
        <Box sx={{ flex: 1, borderBottom: '1px solid #000', px: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px' }}>
            {data.constructionSite?.name || ''}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary', ml: '100px', display: 'block', mb: 2 }}>
        (наименование, адрес)
      </Typography>

      {/* Строка с номером документа и датой */}
      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '10px' }}>Номер документа</Typography>
          <Box sx={{ borderBottom: '1px solid #000', minWidth: '80px', px: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '11px' }}>{data.actNumber || ''}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '10px' }}>Дата составления</Typography>
          <Box sx={{ borderBottom: '1px solid #000', minWidth: '80px', px: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '11px' }}>{formatDate(data.actDate)}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '10px' }}>Отчетный период</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>с</Typography>
              <Box sx={{ borderBottom: '1px solid #000', minWidth: '60px', px: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '11px' }}>{formatDate(data.period?.from)}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>по</Typography>
              <Box sx={{ borderBottom: '1px solid #000', minWidth: '60px', px: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '11px' }}>{formatDate(data.period?.to)}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Заголовок СПРАВКА */}
      <Typography variant="h6" align="center" fontWeight="bold" sx={{ fontSize: '14px', mb: 0.5 }}>
        СПРАВКА
      </Typography>
      <Typography variant="h6" align="center" fontWeight="bold" sx={{ fontSize: '14px', mb: 2 }}>
        О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ
      </Typography>

      {/* Таблица работ с накопительными итогами */}
      <TableContainer sx={{ mb: 2, border: '2px solid #000' }}>
        <Table size="small" sx={{ '& td, & th': { border: '1px solid #000', padding: '4px 6px', fontSize: '10px' } }}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', minWidth: '35px' }}>
                №<br />пор<br />по<br />порядку
              </TableCell>
              <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', minWidth: '220px' }}>
                Наименование пусковых комплексов, этапов,<br />
                объектов, видов выполненных работ,<br />
                оборудования, затрат
              </TableCell>
              <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', minWidth: '50px' }}>
                Код
              </TableCell>
              <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold' }}>
                Стоимость выполненных работ и затрат,<br />руб.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '90px' }}>
                с начала<br />проведения<br />работ
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '90px' }}>
                с начала года
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '90px', bgcolor: '#e8f5e9' }}>
                в том числе за<br />отчетный<br />период
              </TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>1</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>2</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>3</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>4</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>5</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9' }}>6</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Строка "Всего работ и затрат" */}
            <TableRow sx={{ fontWeight: 'bold' }}>
              <TableCell>&nbsp;</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                Всего работ и затрат, включаемых в<br />стоимость работ
              </TableCell>
              <TableCell>&nbsp;</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(totalFromStart)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(totalFromYearStart)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9' }}>
                {formatCurrency(totalCurrent)}
              </TableCell>
            </TableRow>

            {/* Строка "в том числе:" */}
            <TableRow>
              <TableCell>&nbsp;</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>в том числе:</TableCell>
              <TableCell>&nbsp;</TableCell>
              <TableCell>&nbsp;</TableCell>
              <TableCell>&nbsp;</TableCell>
              <TableCell sx={{ bgcolor: '#e8f5e9' }}>&nbsp;</TableCell>
            </TableRow>

            {/* Детализация работ */}
            {data.works && data.works.length > 0 ? (
              data.works.map((work, index) => (
                <TableRow key={work.id || index}>
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell>{work.name}</TableCell>
                  <TableCell align="center">{work.code || ''}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(work.totalPriceFromStart || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(work.totalPriceFromYear || 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#e8f5e9' }}>
                    {formatCurrency(work.totalPrice || work.totalPriceCurrent || 0)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <>
                <TableRow>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell sx={{ bgcolor: '#e8f5e9' }}>&nbsp;</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell sx={{ bgcolor: '#e8f5e9' }}>&nbsp;</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell sx={{ bgcolor: '#e8f5e9' }}>&nbsp;</TableCell>
                </TableRow>
              </>
            )}

            {/* Пустые строки для заполнения */}
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`empty-${i}`}>
                <TableCell>&nbsp;</TableCell>
                <TableCell>&nbsp;</TableCell>
                <TableCell>&nbsp;</TableCell>
                <TableCell>&nbsp;</TableCell>
                <TableCell>&nbsp;</TableCell>
                <TableCell sx={{ bgcolor: '#e8f5e9' }}>&nbsp;</TableCell>
              </TableRow>
            ))}

            {/* Итого */}
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                Итого
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(totalFromStart)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(totalFromYearStart)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9' }}>
                {formatCurrency(totalCurrent)}
              </TableCell>
            </TableRow>

            {/* Сумма НДС */}
            <TableRow>
              <TableCell colSpan={3} align="right">
                Сумма НДС
              </TableCell>
              <TableCell align="right">
                {formatCurrency(data.vat?.fromStart || 0)}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(data.vat?.fromYear || 0)}
              </TableCell>
              <TableCell align="right" sx={{ bgcolor: '#e8f5e9' }}>
                {formatCurrency(data.vat?.current || 0)}
              </TableCell>
            </TableRow>

            {/* Всего с учетом НДС */}
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                Всего с учетом НДС
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(totalFromStart + (data.vat?.fromStart || 0))}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(totalFromYearStart + (data.vat?.fromYear || 0))}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9' }}>
                {formatCurrency(totalCurrent + (data.vat?.current || 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Подписи */}
      <Box sx={{ mt: 3 }}>
        {/* Заказчик (Генподрядчик) */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontSize: '10px', display: 'block', mb: 0.5 }}>
            Заказчик ( Генподрядчик )
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <Box sx={{ flex: 1, borderBottom: '1px solid #000', minHeight: '30px', display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '10px' }}>
                {data.customerSignatory?.position || ''}
              </Typography>
            </Box>
            <Box sx={{ flex: 0.7, borderBottom: '1px solid #000', minHeight: '30px' }}></Box>
            <Box sx={{ flex: 1, borderBottom: '1px solid #000', minHeight: '30px', display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '10px' }}>
                {data.customerSignatory?.fullName || ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>(должность)</Typography>
            </Box>
            <Box sx={{ flex: 0.7, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>(подпись)</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>(расшифровка подписи)</Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right', mt: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: '10px' }}>М.П.</Typography>
          </Box>
        </Box>

        {/* Подрядчик (Субподрядчик) */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontSize: '10px', display: 'block', mb: 0.5 }}>
            Подрядчик ( Субподрядчик )
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <Box sx={{ flex: 1, borderBottom: '1px solid #000', minHeight: '30px', display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '10px' }}>
                {data.contractorSignatory?.position || ''}
              </Typography>
            </Box>
            <Box sx={{ flex: 0.7, borderBottom: '1px solid #000', minHeight: '30px' }}></Box>
            <Box sx={{ flex: 1, borderBottom: '1px solid #000', minHeight: '30px', display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '10px' }}>
                {data.contractorSignatory?.fullName || ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>(должность)</Typography>
            </Box>
            <Box sx={{ flex: 0.7, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>(подпись)</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>(расшифровка подписи)</Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right', mt: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: '10px' }}>М.П.</Typography>
          </Box>
        </Box>
      </Box>

      {/* Примечания (если есть) */}
      {data.notes && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 1, border: '1px solid #ddd' }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Примечания
          </Typography>
          <Typography variant="body2">{data.notes}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default FormKS3;
