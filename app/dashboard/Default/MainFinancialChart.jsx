import { Card, CardContent, Box, Typography } from '@mui/material';
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
 * 5. Прибыль - зона между доходом и расходом по работам
 */

// Моковые данные (потом заменить на реальные из API)
const generateMockData = () => {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  
  return {
    categories: months,
    series: [
      {
        name: 'Доход · Работы',
        type: 'line',
        data: [15000, 18000, 22000, 25000, 28000, 32000, 35000, 38000, 42000, 45000, 48000, 50000]
      },
      {
        name: 'Доход · Материалы',
        type: 'line',
        data: [8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000]
      },
      {
        name: 'Расход · Работы',
        type: 'line',
        data: [12000, 14000, 17000, 19000, 21000, 24000, 26000, 28000, 31000, 33000, 35000, 37000]
      },
      {
        name: 'Расход · Материалы',
        type: 'line',
        data: [6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000]
      },
      {
        name: 'Прибыль',
        type: 'area',
        data: [5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 15000]
      }
    ]
  };
};

const MainFinancialChart = ({ isLoading = false }) => {
  const theme = useTheme();
  const data = generateMockData();

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
      width: [3, 2, 3, 2, 0], // Работы толще, материалы тоньше, прибыль - зона
      curve: 'smooth',
      dashArray: [0, 6, 0, 6, 0] // Материалы - пунктир
    },
    fill: {
      type: ['solid', 'solid', 'solid', 'solid', 'gradient'],
      opacity: [1, 1, 1, 1, 0.1],
      gradient: {
        shade: 'light',
        type: 'vertical',
        opacityFrom: 0.12,
        opacityTo: 0.08,
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
      <CardContent sx={{ p: 3 }}>
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
      </CardContent>
    </Card>
  );
};

export default MainFinancialChart;
