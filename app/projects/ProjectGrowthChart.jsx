import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// third party
import Chart from 'react-apexcharts';

// API
import workCompletionActsAPI from 'api/workCompletionActs';
import purchasesAPI from 'api/purchases';

// chart data
import barChartOptions from '../dashboard/Default/chart-data/total-growth-bar-chart';

// ==============================|| PROJECT GROWTH CHART ||============================== //

export default function ProjectGrowthChart({ projectId, estimates = [] }) {
  const theme = useTheme();

  const [chartOptions, setChartOptions] = useState(barChartOptions);
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState({
    incomeWorks: 0,      // Доход (Работы) - акты заказчика
    expenseWorks: 0,     // Расход (Работы) - акты специалиста
    incomeMaterials: 0,  // Доход (Материал) - ИТОГО ПО СМЕТЕ
    expenseMaterials: 0, // Расход (Материал) - ИТОГО ЗАКУПЛЕННО
    profitWorks: 0,      // Прибыль (Работы)
    profitMaterials: 0   // Прибыль (Материал)
  });

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const grey500 = theme.palette.grey[500];

  const primary200 = theme.palette.primary[200];
  const primaryDark = theme.palette.primary.dark;
  const secondaryMain = theme.palette.secondary.main;
  const secondaryLight = theme.palette.secondary.light;

  // Загрузка финансовых данных
  useEffect(() => {
    const loadFinancialData = async () => {
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

        // Загружаем данные для каждой сметыfor (const estimate of estimates) {
          try {// Получаем ВСЕ акты для сметы
            const allActs = await workCompletionActsAPI.getActsByEstimate(estimate.id);// Фильтруем акты заказчика
            const clientActs = allActs?.filter(act => act.actType === 'client') || [];if (clientActs.length > 0) {
              const clientTotal = clientActs.reduce((sum, act) => sum + (parseFloat(act.totalAmount) || 0), 0);totalIncomeWorks += clientTotal;
            }

            // Фильтруем акты специалиста
            const specialistActs = allActs?.filter(act => act.actType === 'specialist') || [];if (specialistActs.length > 0) {
              const specialistTotal = specialistActs.reduce((sum, act) => sum + (parseFloat(act.totalAmount) || 0), 0);totalExpenseWorks += specialistTotal;
            }

            // Получаем закупки
            const purchases = await purchasesAPI.getByEstimateId(estimate.id);if (purchases && purchases.purchases) {
              const purchasesData = purchases.purchases;// ИТОГО ПО СМЕТЕ (плановая сумма)
              const plannedTotal = purchasesData.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);totalIncomeMaterials += plannedTotal;

              // ИТОГО ЗАКУПЛЕННО (фактическая сумма)
              const actualTotal = purchasesData.reduce((sum, p) => sum + (parseFloat(p.actualTotalPrice) || 0), 0);totalExpenseMaterials += actualTotal;
            }
          } catch (err) {
            console.error(`Error loading data for estimate ${estimate.id}:`, err);
          }
        }// Рассчитываем прибыли
        const profitWorks = totalIncomeWorks - totalExpenseWorks;
        const profitMaterials = totalIncomeMaterials - totalExpenseMaterials;

        setFinancialData({
          incomeWorks: totalIncomeWorks,
          expenseWorks: totalExpenseWorks,
          incomeMaterials: totalIncomeMaterials,
          expenseMaterials: totalExpenseMaterials,
          profitWorks,
          profitMaterials
        });
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFinancialData();
  }, [projectId, estimates]);

  useEffect(() => {
    setChartOptions((prev) => ({
      ...prev,
      colors: [primary200, primaryDark, secondaryMain, secondaryLight],
      xaxis: {
        ...prev.xaxis,
        categories: ['Итого по проекту'],
        labels: { style: { colors: primary } }
      },
      yaxis: {
        logarithmic: true,
        min: 1,
        max: 1500000,
        tickAmount: 5,
        labels: { 
          style: { colors: primary },
          formatter: function (val) {
            if (val <= 10) return '0';
            if (val >= 1000 && val < 10000) return '1 000';
            if (val >= 10000 && val < 100000) return '10 000';
            if (val >= 100000 && val < 1000000) return '100 000';
            if (val >= 1000000 && val < 1500000) return '1 000 000';
            if (val >= 1500000) return '1 500 000';
            return val.toLocaleString('ru-RU');
          }
        }
      },
      grid: { ...prev.grid, borderColor: divider },
      tooltip: { 
        theme: 'light',
        y: {
          formatter: function (val) {
            return val.toLocaleString('ru-RU') + ' ₽';
          }
        }
      },
      legend: {
        ...prev.legend,
        labels: { ...prev.legend?.labels, colors: grey500 }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.palette]);

  // Форматирование валюты
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Создаем данные для графика на основе реальных финансовых данных
  // Отображаем итоговые суммы за весь проект (один столбец)
  // Используем минимальное значение 10000 для лучшей видимости на логарифмической шкале
  const minVisibleValue = 10000;
  const series = [
    { 
      name: 'Доход (Работы)', 
      data: [financialData.incomeWorks > 0 ? financialData.incomeWorks : minVisibleValue]
    },
    { 
      name: 'Доход (Материал)', 
      data: [financialData.incomeMaterials > 0 ? financialData.incomeMaterials : minVisibleValue]
    },
    { 
      name: 'Расход (Работы)', 
      data: [financialData.expenseWorks > 0 ? financialData.expenseWorks : minVisibleValue]
    },
    { 
      name: 'Расход (Материал)', 
      data: [financialData.expenseMaterials > 0 ? financialData.expenseMaterials : minVisibleValue]
    }
  ];

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Grid container direction="column" spacing={0.5}>
              <Grid>
                <Typography variant="h4">Финансовая аналитика</Typography>
              </Grid>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Прибыль (Работы)
                  </Typography>
                  <Typography variant="h5" color={financialData.profitWorks >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(financialData.profitWorks)}
                  </Typography>
                </Grid>
                <Grid>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Прибыль (Материал)
                  </Typography>
                  <Typography variant="h5" color={financialData.profitMaterials >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(financialData.profitMaterials)}
                  </Typography>
                </Grid>
                <Grid>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Расход (Работы)
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(financialData.expenseWorks)}
                  </Typography>
                </Grid>
                <Grid>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Расход (Материал)
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(financialData.expenseMaterials)}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid
            size={12}
            sx={{
              ...theme.applyStyles('light', {
                '& .apexcharts-series:nth-of-type(4) path:hover': {
                  filter: `brightness(0.95)`,
                  transition: 'all 0.3s ease'
                }
              }),
              '& .apexcharts-menu': {
                bgcolor: 'background.paper'
              },
              '.apexcharts-theme-light .apexcharts-menu-item:hover': {
                bgcolor: 'grey.200'
              }
            }}
          >
            <Chart options={chartOptions} series={series} type="bar" height={336} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

ProjectGrowthChart.propTypes = {
  projectId: PropTypes.string,
  estimates: PropTypes.array
};
