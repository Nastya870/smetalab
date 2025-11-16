import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';

// third party
import Chart from 'react-apexcharts';

// API
import workCompletionActsAPI from 'api/workCompletionActs';
import purchasesAPI from 'api/purchases';

// icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// ==============================|| FINANCIAL SUMMARY CHART ||============================== //

export default function FinancialSummaryChart({ projectId, estimates = [] }) {
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState({
    incomeWorks: 0,
    expenseWorks: 0,
    incomeMaterials: 0,
    expenseMaterials: 0
  });

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
if (!projectId || !estimates || estimates.length === 0) {
setLoading(false);
        return;
      }

      try {
        setLoading(true);
let totalIncomeWorks = 0;
        let totalExpenseWorks = 0;
        let totalIncomeMaterials = 0;
        let totalExpenseMaterials = 0;

        for (const estimate of estimates) {
          try {
            // Получаем акты
            const allActs = await workCompletionActsAPI.getActsByEstimate(estimate.id);
            
            if (allActs && allActs.length > 0) {
              // Акты заказчика = Доход
              const clientActs = allActs.filter(act => act.actType === 'client');
              const clientTotal = clientActs.reduce((sum, act) => sum + (parseFloat(act.totalAmount) || 0), 0);
              totalIncomeWorks += clientTotal;
              
              // Акты специалиста = Расход
              const specialistActs = allActs.filter(act => act.actType === 'specialist');
              const specialistTotal = specialistActs.reduce((sum, act) => sum + (parseFloat(act.totalAmount) || 0), 0);
              totalExpenseWorks += specialistTotal;
            }

            // Получаем закупки (если не сформированы - пропускаем)
            try {
              const purchases = await purchasesAPI.getByEstimateId(estimate.id);
              
              if (purchases && purchases.purchases && purchases.purchases.length > 0) {
                // План = Доход материалов
                const plannedTotal = purchases.purchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
                totalIncomeMaterials += plannedTotal;
                
                // Факт = Расход материалов
                const actualTotal = purchases.purchases.reduce((sum, p) => sum + (parseFloat(p.actualTotalPrice) || 0), 0);
                totalExpenseMaterials += actualTotal;
              }
            } catch (purchasesErr) {
              // 404 - закупки не сформированы, это нормально
              if (purchasesErr.response?.status !== 404) {
                console.error(`Error loading purchases for estimate ${estimate.id}:`, purchasesErr);
              }
            }
          } catch (err) {
            console.error(`Error processing estimate ${estimate.id}:`, err);
          }
        }
        
        setFinancialData({
          incomeWorks: totalIncomeWorks,
          expenseWorks: totalExpenseWorks,
          incomeMaterials: totalIncomeMaterials,
          expenseMaterials: totalExpenseMaterials
        });
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, estimates]);

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

  if (loading) {
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
  projectId: PropTypes.string.isRequired,
  estimates: PropTypes.array
};
