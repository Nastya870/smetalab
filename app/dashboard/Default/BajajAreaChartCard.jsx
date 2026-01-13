import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// third party
import Chart from 'react-apexcharts';

// project imports
import chartData from './chart-data/bajaj-area-chart';

// ===========================|| DASHBOARD DEFAULT - BAJAJ AREA CHART CARD ||=========================== //

export default function BajajAreaChartCard({ projects = [] }) {
  const theme = useTheme();
  const orangeDark = theme.palette.secondary[800];

  const [chartConfig, setChartConfig] = useState(chartData);

  // Подготавливаем данные для графика на основе проектов
  const prepareChartData = () => {
    if (!projects || projects.length === 0) {
      return chartData.series[0].data; // Используем дефолтные данные
    }
    
    // Создаем данные на основе прибыли проектов
    return projects.map((project, index) => Math.max(0, project.totalProfit / 1000)); // Конвертируем в тысячи для графика
  };

  useEffect(() => {
    const newChartData = prepareChartData();
    setChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [orangeDark],
        tooltip: { 
          ...prevState?.options?.tooltip, 
          theme: 'light',
          y: {
            title: {
              formatter: (seriesName) => 'Прибыль: '
            },
            formatter: (value, { dataPointIndex }) => {
              // Получаем реальную прибыль проекта для tooltip
              if (projects && projects[dataPointIndex]) {
                const profit = projects[dataPointIndex].totalProfit;
                const fractionDigits = Math.abs(profit) >= 1000 ? 2 : 2;
                return new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: fractionDigits,
                  maximumFractionDigits: fractionDigits
                }).format(profit);
              }
              return `₽${value * 1000}`;
            }
          }
        }
      },
      series: [{
        ...prevState.series[0],
        data: newChartData
      }]
    }));
  }, [orangeDark, projects]);

  return (
    <Card sx={{ 
      bgcolor: 'secondary.light',
      borderRadius: 3,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <Grid container sx={{ p: 2, pb: 0.5, color: '#fff' }}>
        <Grid size={12}>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: 'grey.600',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {projects && projects.length > 0 ? 'Топ проект' : 'Прибыль проектов'}
              </Typography>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: 'secondary.dark',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  mt: 0.25,
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {projects && projects.length > 0 ? projects[0]?.name || '—' : '—'}
              </Typography>
            </Grid>
            <Grid>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: 'grey.800',
                  fontWeight: 700,
                  fontSize: '1.25rem'
                }}
              >
                {projects && projects.length > 0 ? 
                  (() => {
                    const profit = projects[0]?.totalProfit || 0;
                    // Если сумма больше 1000, показываем без копеек, иначе с копейками
                    const fractionDigits = Math.abs(profit) >= 1000 ? 0 : 2;
                    return new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: fractionDigits,
                      maximumFractionDigits: fractionDigits
                    }).format(profit);
                  })()
                  : '₽0'
                }
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: projects?.[0]?.isProfit ? 'success.main' : 'error.main',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  display: 'block',
                  textAlign: 'right'
                }}
              >
                {projects && projects.length > 0 ? 
                  `${projects[0]?.isProfit ? '+' : ''}${Math.abs(projects[0]?.profitPercentage || 0).toFixed(1)}%`
                  : '—'
                }
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Chart {...chartConfig} />
    </Card>
  );
}

BajajAreaChartCard.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object)
};
