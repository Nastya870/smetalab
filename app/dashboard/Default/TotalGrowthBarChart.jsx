import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// third party
import Chart from 'react-apexcharts';

// project imports
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// chart data
import barChartOptions from './chart-data/total-growth-bar-chart';

// Пустые данные вместо демо-данных
const emptySeries = [
  { name: 'Доход (Акты заказчика)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Доход (Итого по смете)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Расход (Акты специалиста)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Расход (Итого закупленно)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
];

export default function TotalGrowthBarChart({ isLoading }) {
  const theme = useTheme();

  const [chartOptions, setChartOptions] = useState(barChartOptions);
  const [chartSeries, setChartSeries] = useState(emptySeries);
  const [loading, setLoading] = useState(true);
  const [totalGrowth, setTotalGrowth] = useState(0);

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const grey500 = theme.palette.grey[500];

  const primary200 = theme.palette.primary[200];
  const primaryDark = theme.palette.primary.dark;
  const secondaryMain = theme.palette.secondary.main;
  const secondaryLight = theme.palette.secondary.light;

  // Загружаем данные роста по месяцам
  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        setLoading(true);// Импортируем API здесь, чтобы избежать циклических зависимостей
        const { projectsAPI } = await import('api/projects');
        const response = await projectsAPI.getMonthlyGrowthData();if (response.success && response.data && response.data.series) {// Проверяем, есть ли реальные данные (не все нули)
          const hasRealData = response.data.series.some(series => 
            series.data.some(value => value > 0)
          );
          
          if (hasRealData) {
            setChartSeries(response.data.series);// Обновляем категории месяцев из данных API
            if (response.data.months && response.data.months.length > 0) {
              setChartOptions((prev) => ({
                ...prev,
                xaxis: {
                  ...prev.xaxis,
                  categories: response.data.months
                }
              }));}
            
            // Вычисляем общий рост (доходы - расходы)
            const totalIncome = response.data.series[0].data.reduce((sum, val) => sum + val, 0) + 
                               response.data.series[1].data.reduce((sum, val) => sum + val, 0);
            const totalExpense = response.data.series[2].data.reduce((sum, val) => sum + val, 0) + 
                                response.data.series[3].data.reduce((sum, val) => sum + val, 0);
            setTotalGrowth((totalIncome - totalExpense) * 1000); // Конвертируем обратно из тысяч
          } else {setChartSeries(emptySeries);
            setTotalGrowth(0);
          }
        } else {
          console.error('❌ API вернул ошибку или пустые данные:', response);
          setChartSeries(emptySeries);
          setTotalGrowth(0);
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке данных роста:', error);
        console.error('🔍 Детали ошибки:', error.response?.data || error.message);
        setChartSeries(emptySeries);
        setTotalGrowth(0);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchGrowthData();
    }
  }, [isLoading]);

  useEffect(() => {
    setChartOptions((prev) => ({
      ...prev,
      colors: [primary200, primaryDark, secondaryMain, secondaryLight],
      xaxis: {
        ...prev.xaxis,
        labels: { style: { colors: primary } }
      },
      yaxis: {
        labels: { style: { colors: primary } }
      },
      grid: { ...prev.grid, borderColor: divider },
      tooltip: { theme: 'light' },
      legend: {
        ...prev.legend,
        labels: { ...prev.legend?.labels, colors: grey500 }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.palette]);

  return (
    <>
      {isLoading ? (
        <SkeletonTotalGrowthBarChart />
      ) : (
        <MainCard>
          <Grid container spacing={gridSpacing}>
            <Grid size={12}>
              <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Grid container direction="column" spacing={1}>
                    <Grid>
                      <Typography variant="subtitle2">Общий рост</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="h3">
                        {totalGrowth >= 0 ? '+' : ''}₽{totalGrowth.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
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
                },
                '& .apexcharts-theme-light .apexcharts-menu-icon:hover svg, .apexcharts-theme-light .apexcharts-reset-icon:hover svg, .apexcharts-theme-light .apexcharts-selection-icon:not(.apexcharts-selected):hover svg, .apexcharts-theme-light .apexcharts-zoom-icon:not(.apexcharts-selected):hover svg, .apexcharts-theme-light .apexcharts-zoomin-icon:hover svg, .apexcharts-theme-light .apexcharts-zoomout-icon:hover svg':
                  {
                    fill: theme.palette.grey[400]
                  }
              }}
            >
              <Chart options={chartOptions} series={loading ? emptySeries : chartSeries} type="bar" height={480} />
            </Grid>
          </Grid>
        </MainCard>
      )}
    </>
  );
}

TotalGrowthBarChart.propTypes = { isLoading: PropTypes.bool };
