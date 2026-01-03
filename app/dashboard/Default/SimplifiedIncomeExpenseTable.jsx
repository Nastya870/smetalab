import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';

/**
 * Упрощенная таблица доходов и расходов
 * Только: категория, сумма, процент от общего
 */
const SimplifiedIncomeExpenseTable = ({ data = [], isLoading = false }) => {
  // Моковые данные
  const mockData = [
    { category: 'Доход (акты)', amount: 23000, type: 'income' },
    { category: 'Доход (материалы)', amount: 0, type: 'income' },
    { category: 'Расход (акты)', amount: 20000, type: 'expense' },
    { category: 'Расход (закупки)', amount: 0, type: 'expense' }
  ];

  const tableData = data.length > 0 ? data : mockData;

  const totalIncome = tableData.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = tableData.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const total = totalIncome + totalExpense;

  const getPercentage = (amount) => {
    if (total === 0) return 0;
    return ((amount / total) * 100).toFixed(1);
  };

  const getColor = (type) => {
    return type === 'income' ? '#10B981' : '#EF4444';
  };

  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08)',
        borderRadius: '12px',
        border: '1px solid #E8EBF1'
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    bgcolor: '#F9FAFB',
                    borderBottom: '1px solid #E8EBF1',
                    py: 1.5,
                    px: 2.5
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280' }}>
                    КАТЕГОРИЯ
                  </Typography>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    bgcolor: '#F9FAFB',
                    borderBottom: '1px solid #E8EBF1',
                    py: 1.5,
                    px: 2.5
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280' }}>
                    СУММА
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: '#F9FAFB',
                    borderBottom: '1px solid #E8EBF1',
                    py: 1.5,
                    px: 2.5,
                    width: '30%'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280' }}>
                    ДОЛЯ
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((item, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:last-child td': { borderBottom: 'none' },
                    '&:hover': { bgcolor: '#F9FAFB' },
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <TableCell sx={{ py: 2, px: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: getColor(item.type)
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#111827' }}>
                        {item.category}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2, px: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#111827',
                        fontSize: '0.9375rem'
                      }}
                    >
                      {item.amount?.toLocaleString('ru-RU')} ₽
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2, px: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={parseFloat(getPercentage(item.amount))}
                        aria-label={`Доля ${getPercentage(item.amount)}%`}
                        aria-valuenow={parseFloat(getPercentage(item.amount))}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: '3px',
                          bgcolor: '#E5E7EB',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: '3px',
                            bgcolor: getColor(item.type)
                          }
                        }}
                      />
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', minWidth: 48, textAlign: 'right' }}>
                        {getPercentage(item.amount)}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer с итогами */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: '#F9FAFB',
            borderTop: '1px solid #E8EBF1'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10B981' }}>
              Всего доходов
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>
              {totalIncome.toLocaleString('ru-RU')} ₽
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#EF4444' }}>
              Всего расходов
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#EF4444' }}>
              {totalExpense.toLocaleString('ru-RU')} ₽
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SimplifiedIncomeExpenseTable;
