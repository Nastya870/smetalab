import { Card, CardContent, Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactApexChart from 'react-apexcharts';

/**
 * Главный график дашборда: Доходы, Расходы, Прибыль
 * 
 * 5 серий данных:
 * 1. Доход (работы) - основная зеленая линия
 * 2. Доход (материалы) - зеленый пунктир
 * 3. Расход (работы) - основная красная линия
 * 4. Расход (материалы) - красный пунктир
 * 5. Прибыль - зона (доход минус расход)
 * 
 * @param {Object} chartData - Данные графика из API
 * @param {string} chartPeriod - Период для отображения ('month', 'quarter', 'halfyear', 'year')
 * @param {Function} onChartPeriodChange - Callback для изменения периода
 */

const MainFinancialChart = ({ chartData, chartPeriod = 'year', onChartPeriodChange, isLoading = false }) => {
  const theme = useTheme();
  
  // Подготовка данных из API
  const prepareChartData = () => {
    if (!chartData || !chartData.categories || !chartData.series) {
      // Если данных нет - показываем пустой график
      return {
        categories: [],
        series: [
          { name: 'Доход · Работы', type: 'line', data: [] },
          { name: 'Доход · Материалы', type: 'line', data: [] },
          { name: 'Расход · Работы', type: 'line', data: [] },
          { name: 'Расход · Материалы', type: 'line', data: [] },
          { name: 'Прибыль', type: 'area', data: [] }
        ]
      };
    }

    // Поиск серий по имени
    const findSeries = (name) => chartData.series.find(s => s.name === name)?.data || [];
    
    const incomeWorks = findSeries('income_works') || findSeries('Доход (работы)');
    const incomeMaterials = findSeries('income_materials') || findSeries('Доход (материалы)');
    const expenseWorks = findSeries('expense_works') || findSeries('Расход (работы)');
    const expenseMaterials = findSeries('expense_materials') || findSeries('Расход (материалы)');
    
    // Расчет прибыли (доход - расход)
    const profit = incomeWorks.map((income, i) => {
      const totalIncome = (income || 0) + (incomeMaterials[i] || 0);
      const totalExpense = (expenseWorks[i] || 0) + (expenseMaterials[i] || 0);
      return Math.max(0, totalIncome - totalExpense); // Не показываем отрицательную прибыль
    });

    return {
      categories: chartData.categories,
      series: [
        { name: 'Доход · Работы', type: 'line', data: incomeWorks },
        { name: 'Доход · Материалы', type: 'line', data: incomeMaterials },
        { name: 'Расход · Работы', type: 'line', data: expenseWorks },
        { name: 'Расход · Материалы', type: 'line', data: expenseMaterials },
        { name: 'Прибыль', type: 'area', data: profit }
      ]
    };
  };

  const data = prepareChartData();

  const chartOptions = {
    chart: {
      height: 420,
      type: 'line',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      fontFamily: theme.typography.fontFamily
    },
    colors: [
      '#10B981', // Доход работы - зеленый
      '#10B981', // Доход материалы - зеленый
      '#EF4444', // Расход работы - красный
      '#EF4444', // Расход материалы - красный
      '#8B5CF6'  // Прибыль - фиолетовый
    ],
    stroke: {
      width: [3, 2, 3, 2, 2.5], // Работы толще, материалы тоньше, прибыль - заметная обводка
      curve: 'smooth',
      dashArray: [0, 6, 0, 6, 0] // Материалы - пунктир
    },
    fill: {
      type: ['solid', 'solid', 'solid', 'solid', 'gradient'],
      opacity: [1, 1, 1, 1, 0.25], // Прибыль более заметная
      gradient: {
        shade: 'light',
        type: 'vertical',
        opacityFrom: 0.35,
        opacityTo: 0.15,
        stops: [0, 100]
      }
    },
    grid: {
      show: true,
      borderColor: '#E5E7EB',
      strokeDashArray: 2,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 20,
        bottom: 0,
        left: 20
      }
    },
    xaxis: {
      categories: data.categories,
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px',
          fontWeight: 500
        }
      },
      axisBorder: {
        show: true,
        color: '#E5E7EB'
      },
      axisTicks: {
        show: false
      },
      title: {
        text: 'Период',
        style: {
          color: '#6B7280',
          fontSize: '13px',
          fontWeight: 600
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px',
          fontWeight: 500
        },
        formatter: (value) => {
          if (value >= 1000) {
            return `${(value / 1000).toFixed(0)} тыс ₽`;
          }
          return `${value} ₽`;
        }
      },
      title: {
        text: 'Сумма, ₽',
        style: {
          color: '#6B7280',
          fontSize: '13px',
          fontWeight: 600
        }
      }
    },
    legend: {
      show: false // Используем кастомную легенду
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => {
          return `${value?.toLocaleString('ru-RU')} ₽`;
        }
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 6
      }
    }
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
        {/* Header с фильтром периода */}
        <Box sx={{ 
          p: 2.5, 
          pb: 1.5,
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: '#111827' }}>
              Финансовая динамика
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
              Доходы, расходы и прибыль за период
            </Typography>
          </Box>
          
          {/* Селектор периода графика */}
          <FormControl size="small">
            <Select
              value={chartPeriod}
              onChange={(e) => onChartPeriodChange?.(e.target.value)}
              inputProps={{ 'aria-label': 'Выбор периода графика' }}
              sx={{ 
                bgcolor: '#F9FAFB',
                fontSize: '0.8125rem',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                minWidth: 140,
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none'
                },
                '&:hover': {
                  bgcolor: '#F3F4F6'
                },
                transition: 'background-color 0.2s ease'
              }}
            >
              <MenuItem value="month">Месяц</MenuItem>
              <MenuItem value="quarter">Квартал</MenuItem>
              <MenuItem value="halfyear">Полугодие</MenuItem>
              <MenuItem value="year">Год</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* График */}
        <Box sx={{ p: 2 }}>
          {/* Структурная легенда */}
          <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {/* Блок "Доход" */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#6B7280', mb: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                ДОХОД
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 2.5, bgcolor: '#10B981', borderRadius: '2px' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                    Работы
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 24, 
                    height: 2.5, 
                    bgcolor: '#10B981', 
                    borderRadius: '2px',
                    opacity: 0.6,
                    backgroundImage: 'linear-gradient(90deg, #10B981 50%, transparent 50%)',
                    backgroundSize: '8px 100%'
                  }} />
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                    Материалы
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Блок "Расход" */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#6B7280', mb: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                РАСХОД
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 2.5, bgcolor: '#EF4444', borderRadius: '2px' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                    Работы
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 24, 
                    height: 2.5, 
                    bgcolor: '#EF4444', 
                    borderRadius: '2px',
                    opacity: 0.6,
                    backgroundImage: 'linear-gradient(90deg, #EF4444 50%, transparent 50%)',
                    backgroundSize: '8px 100%'
                  }} />
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                    Материалы
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Блок "Прибыль" */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#6B7280', mb: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                ПРИБЫЛЬ
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  width: 24, 
                  height: 16, 
                  bgcolor: '#8B5CF6', 
                  borderRadius: '3px',
                  opacity: 0.12
                }} />
                <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                  Зона прибыли
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

          {/* График */}
          <Box sx={{ mt: 2 }}>
            <ReactApexChart
              options={chartOptions}
              series={data.series}
              type="line"
              height={420}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MainFinancialChart;
