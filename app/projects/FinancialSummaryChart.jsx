import PropTypes from 'prop-types';

// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// third party
import Chart from 'react-apexcharts';

// icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// ==============================|| FINANCIAL SUMMARY CHART ||============================== //

/**
 * Финансовая сводка проекта
 * 
 * ОПТИМИЗАЦИЯ: Теперь принимает данные через props вместо загрузки через API.
 * Данные загружаются один раз в родительском компоненте через useProjectDashboard hook.
 * 
 * Раньше: FinancialSummaryChart загружал N×2 запросов (акты + закупки для каждой сметы)
 * Теперь: Данные приходят через financialSummary prop из единого endpoint
 * 
 * @param {Object} financialSummary - Данные финансовой сводки
 * @param {number} financialSummary.incomeWorks - Доход по работам (акты заказчика)
 * @param {number} financialSummary.expenseWorks - Расход по работам (акты специалистов)
 * @param {number} financialSummary.incomeMaterials - Доход по материалам (план)
 * @param {number} financialSummary.expenseMaterials - Расход по материалам (факт)
 * @param {boolean} isLoading - Состояние загрузки
 */
export default function FinancialSummaryChart({ 
  financialSummary = {
    incomeWorks: 0,
    expenseWorks: 0,
    incomeMaterials: 0,
    expenseMaterials: 0
  },
  isLoading = false
}) {
  const theme = useTheme();

  const financialData = {
    incomeWorks: financialSummary?.incomeWorks || 0,
    expenseWorks: financialSummary?.expenseWorks || 0,
    incomeMaterials: financialSummary?.incomeMaterials || 0,
    expenseMaterials: financialSummary?.expenseMaterials || 0
  };

  // Настройки графика
  const chartOptions = {
    chart: {
      id: 'financial-chart-v2',
      type: 'bar',
      toolbar: { show: false },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '70%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => {
        if (val === 0) return '0 ₽';
        // Компактный формат для надписей на столбцах
        if (val >= 1000000) {
          return (val / 1000000).toFixed(1) + ' млн ₽';
        } else if (val >= 1000) {
          return (val / 1000).toFixed(0) + ' тыс ₽';
        }
        return val.toFixed(0) + ' ₽';
      },
      style: {
        fontSize: '10px',
        fontWeight: 600,
        colors: ['#fff']
      },
      offsetY: -5
    },
    colors: [theme.palette.success.main, theme.palette.error.main],
    xaxis: {
      categories: ['Работы', 'Материалы'],
      labels: {
        style: {
          fontSize: '13px',
          fontWeight: 600
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => {
          if (val === 0) return '0';
          // Для больших чисел используем сокращения
          if (val >= 1000000) {
            return (val / 1000000).toFixed(1) + ' млн ₽';
          } else if (val >= 1000) {
            return (val / 1000).toFixed(0) + ' тыс. ₽';
          }
          return val.toFixed(0) + ' ₽';
        },
        style: {
          fontSize: '11px'
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '13px',
      fontWeight: 500
    },
    tooltip: {
      y: {
        formatter: (val) => {
          return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(val);
        }
      }
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4
    }
  };

  const series = [
    {
      name: 'Доход',
      data: [financialData.incomeWorks, financialData.incomeMaterials]
    },
    {
      name: 'Расход',
      data: [financialData.expenseWorks, financialData.expenseMaterials]
    }
  ];

  // Расчет прибыли
  const profitWorks = financialData.incomeWorks - financialData.expenseWorks;
  const profitMaterials = financialData.incomeMaterials - financialData.expenseMaterials;
  const totalProfit = profitWorks + profitMaterials;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ pb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Финансовая сводка проекта
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ pb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Финансовая сводка проекта
        </Typography>
        
        {/* Статистика сверху */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
              <Typography variant="h6" color="success.dark">
                {formatCurrency(financialData.incomeWorks + financialData.incomeMaterials)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Общий доход
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
              <Typography variant="h6" color="error.dark">
                {formatCurrency(financialData.expenseWorks + financialData.expenseMaterials)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Общий расход
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 2, 
              bgcolor: totalProfit >= 0 ? 'primary.lighter' : 'warning.lighter', 
              borderRadius: 1 
            }}>
              <Typography variant="h6" color={totalProfit >= 0 ? 'primary.dark' : 'warning.dark'}>
                {formatCurrency(totalProfit)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Прибыль
                {totalProfit >= 0 ? (
                  <TrendingUpIcon sx={{ fontSize: 16, ml: 0.5, verticalAlign: 'middle', color: 'success.main' }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: 16, ml: 0.5, verticalAlign: 'middle', color: 'error.main' }} />
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* График */}
        <Box sx={{ mt: 2, width: 'calc(100% + 48px)', ml: -3, mr: -3 }} key={`chart-${financialData.incomeWorks}`}>
          <Chart options={chartOptions} series={series} type="bar" height={280} />
        </Box>
      </CardContent>
    </Card>
  );
}

FinancialSummaryChart.propTypes = {
  financialSummary: PropTypes.shape({
    incomeWorks: PropTypes.number,
    expenseWorks: PropTypes.number,
    incomeMaterials: PropTypes.number,
    expenseMaterials: PropTypes.number
  }),
  isLoading: PropTypes.bool
};
