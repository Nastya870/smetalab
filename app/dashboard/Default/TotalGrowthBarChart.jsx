import PropTypes from 'prop-types';
import { useEffect, useState, useMemo, useRef } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';

// third party
import Chart from 'react-apexcharts';

// project imports
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

// chart data
import barChartOptions from './chart-data/total-growth-bar-chart';

// Пустые данные вместо демо-данных - КОРОТКИЕ НАЗВАНИЯ для легенды
const emptySeries = [
  { name: 'Доход (акты)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Доход (ПМ)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Расход (акты)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Расход (закуп)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
];

// Маппинг коротких названий на полные (для tooltip)
const fullSeriesNames = {
  'Доход (акты)': 'Доход от актов заказчика',
  'Доход (ПМ)': 'Доход от планируемых материалов',
  'Расход (акты)': 'Расход по актам специалистов',
  'Расход (закуп)': 'Расход на закупки материалов'
};

export default function TotalGrowthBarChart({ isLoading, growthData }) {
  const theme = useTheme();
  const chartRef = useRef(null);

  const [chartOptions, setChartOptions] = useState(barChartOptions);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const grey500 = theme.palette.grey[500];

  const primary200 = theme.palette.primary[200];
  const primaryDark = theme.palette.primary.dark;
  const secondaryMain = theme.palette.secondary.main;
  const secondaryLight = theme.palette.secondary.light;

  // Обработка данных из пропсов
  const { chartSeries, totalGrowth, months } = useMemo(() => {
    if (!growthData || !growthData.series) {
      return {
        chartSeries: emptySeries,
        totalGrowth: 0,
        months: []
      };
    }

    // Проверяем, есть ли реальные данные (не все нули)
    const hasRealData = growthData.series.some(series => 
      series.data.some(value => value > 0)
    );
    
    if (!hasRealData) {
      return {
        chartSeries: emptySeries,
        totalGrowth: 0,
        months: growthData.months || []
      };
    }

    // Трансформируем названия серий в короткие
    const shortNamedSeries = growthData.series.map((series, index) => ({
      ...series,
      name: emptySeries[index]?.name || series.name
    }));

    // Вычисляем общий рост (доходы - расходы)
    const totalIncome = growthData.series[0].data.reduce((sum, val) => sum + val, 0) + 
                       growthData.series[1].data.reduce((sum, val) => sum + val, 0);
    const totalExpense = growthData.series[2].data.reduce((sum, val) => sum + val, 0) + 
                        growthData.series[3].data.reduce((sum, val) => sum + val, 0);

    return {
      chartSeries: shortNamedSeries,
      totalGrowth: (totalIncome - totalExpense) * 1000, // Конвертируем обратно из тысяч
      months: growthData.months || []
    };
  }, [growthData]);

  // Обновляем опции графика при изменении месяцев
  useEffect(() => {
    if (months.length > 0) {
      setChartOptions((prev) => ({
        ...prev,
        xaxis: {
          ...prev.xaxis,
          categories: months
        }
      }));
    }
  }, [months]);

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
      tooltip: { 
        theme: 'light',
        // Детализация в tooltip при наведении
        y: {
          formatter: function(value, { seriesIndex, dataPointIndex, w }) {
            const seriesName = w.config.series[seriesIndex].name;
            const fullName = fullSeriesNames[seriesName] || seriesName;
            return `${value.toLocaleString('ru-RU')} тыс. ₽`;
          },
          title: {
            formatter: function(seriesName) {
              return fullSeriesNames[seriesName] || seriesName;
            }
          }
        }
      },
      legend: {
        ...prev.legend,
        labels: { ...prev.legend?.labels, colors: grey500 },
        fontSize: '12px',
        itemMargin: {
          horizontal: 10,
          vertical: 5
        }
      },
      // Скрываем встроенный тулбар ApexCharts
      chart: {
        ...prev.chart,
        toolbar: { show: false }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.palette]);

  // Форматирование суммы без копеек
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Обработчики меню экспорта
  const handleExportClick = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (format) => {
    // Получаем инстанс ApexCharts
    const chartInstance = window.ApexCharts?.getChartByID('total-growth-chart');
    
    if (chartInstance) {
      switch (format) {
        case 'svg':
          chartInstance.exports.svg();
          break;
        case 'png':
          chartInstance.exports.png();
          break;
        case 'csv':
          chartInstance.exports.csv();
          break;
        default:
          break;
      }
    }
    handleExportClose();
  };

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
                  <Typography 
                    sx={{ 
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      mb: 0.5
                    }}
                  >
                    Баланс за период
                  </Typography>
                  <Typography 
                    sx={{ 
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: totalGrowth >= 0 ? 'success.main' : 'error.main'
                    }}
                  >
                    {totalGrowth >= 0 ? '+' : ''}{formatCurrency(totalGrowth)}
                  </Typography>
                </Grid>
                {/* Компактная кнопка экспорта */}
                <Grid>
                  <IconButton 
                    onClick={handleExportClick}
                    size="small"
                    sx={{ 
                      bgcolor: 'grey.100',
                      '&:hover': { bgcolor: 'grey.200' }
                    }}
                  >
                    <FileDownloadOutlinedIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={exportMenuAnchor}
                    open={Boolean(exportMenuAnchor)}
                    onClose={handleExportClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    <MenuItem onClick={() => handleExport('svg')}>
                      <ListItemIcon>
                        <ImageOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Скачать SVG</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('png')}>
                      <ListItemIcon>
                        <PictureAsPdfOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Скачать PNG</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('csv')}>
                      <ListItemIcon>
                        <TableChartOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Экспорт CSV</ListItemText>
                    </MenuItem>
                  </Menu>
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
              <Chart 
                ref={chartRef}
                options={{
                  ...chartOptions,
                  chart: {
                    ...chartOptions.chart,
                    id: 'total-growth-chart'
                  }
                }} 
                series={isLoading ? emptySeries : chartSeries} 
                type="bar" 
                height={420} 
              />
            </Grid>
          </Grid>
        </MainCard>
      )}
    </>
  );
}

TotalGrowthBarChart.propTypes = { 
  isLoading: PropTypes.bool,
  growthData: PropTypes.shape({
    series: PropTypes.array,
    months: PropTypes.array
  })
};
