import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

// third party
import Chart from 'react-apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

// ===========================|| DONUT CHART - СТРУКТУРА ДОХОДОВ И РАСХОДОВ ||=========================== //

// Цвета секторов - приглушённые, финансовые
const CHART_COLORS = ['#6B5ECD', '#4DB6AC', '#E8A545', '#D97B93'];

// Короткие названия для легенды
const LABELS = ['Доход (акты)', 'Доход (материалы)', 'Расход (акты)', 'Расход (закупки)'];

// Полные названия для tooltip
const FULL_LABELS = [
  'Доход от актов заказчика',
  'Доход от планируемых материалов',
  'Расход по актам специалистов',
  'Расход на закупки материалов'
];

// Форматирование валюты
const formatCurrency = (value) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Форматирование короткое
const formatShort = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} млн`;
  if (value >= 1000) return `${Math.round(value / 1000)} тыс`;
  return value.toString();
};

// Кастомный Tooltip через Portal - рендерится в body, поверх всего
function CustomTooltip({ visible, x, y, label, value, color }) {
  if (!visible) return null;
  
  // Рассчитываем позицию с учетом границ экрана
  const tooltipWidth = 220;
  const tooltipHeight = 60;
  const padding = 15;
  
  let left = x + padding;
  let top = y - tooltipHeight / 2;
  
  // Если tooltip выходит за правый край - показываем слева от курсора
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = x - tooltipWidth - padding;
  }
  
  // Если tooltip выходит за левый край - показываем справа от курсора
  if (left < 10) {
    left = x + padding;
  }
  
  // Если tooltip выходит за верхний край
  if (top < 10) {
    top = 10;
  }
  
  // Если tooltip выходит за нижний край
  if (top + tooltipHeight > window.innerHeight - 10) {
    top = window.innerHeight - tooltipHeight - 10;
  }

  return createPortal(
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: left,
        top: top,
        zIndex: 99999,
        p: 1.5,
        minWidth: 180,
        maxWidth: tooltipWidth,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        pointerEvents: 'none',
        bgcolor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          bgcolor: color,
          flexShrink: 0
        }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', pl: 2.5 }}>
        {value}
      </Typography>
    </Paper>,
    document.body
  );
}

CustomTooltip.propTypes = {
  visible: PropTypes.bool,
  x: PropTypes.number,
  y: PropTypes.number,
  label: PropTypes.string,
  value: PropTypes.string,
  color: PropTypes.string
};

export default function IncomeExpenseDonutChart({ isLoading, growthData }) {
  const theme = useTheme();
  const [chartData, setChartData] = useState([0, 0, 0, 0]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });
  const [chartKey, setChartKey] = useState(0);
  
  // Состояние для кастомного tooltip
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    seriesIndex: 0
  });

  // Обновление данных
  useEffect(() => {
    if (growthData?.series) {
      const sums = growthData.series.map(s => s.data.reduce((sum, val) => sum + val, 0) * 1000);
      setChartData(sums);
      const totalIncome = sums[0] + sums[1];
      const totalExpense = sums[2] + sums[3];
      setTotals({ 
        income: totalIncome, 
        expense: totalExpense, 
        balance: totalIncome - totalExpense 
      });
      setChartKey(prev => prev + 1);
    }
  }, [growthData]);

  // Конфигурация графика
  const chartConfig = {
    type: 'donut',
    height: 280,
    options: {
      chart: {
        id: 'income-expense-donut',
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
        events: {
          dataPointMouseEnter: (event, chartContext, config) => {
            setTooltip({
              visible: true,
              x: event.clientX,
              y: event.clientY,
              seriesIndex: config.dataPointIndex
            });
          },
          dataPointMouseLeave: () => {
            setTooltip(prev => ({ ...prev, visible: false }));
          }
        }
      },
      labels: LABELS,
      colors: CHART_COLORS,
      stroke: { width: 3, colors: [theme.palette.background.paper] },
      plotOptions: {
        pie: {
          donut: {
            size: '58%', // Увеличена толщина кольца (меньше % = толще кольцо)
            labels: {
              show: true,
              name: { 
                show: true, 
                fontSize: '12px', 
                fontWeight: 500, 
                offsetY: -8,
                color: theme.palette.text.secondary
              },
              value: { 
                show: true, 
                fontSize: '20px', 
                fontWeight: 600, 
                offsetY: 4,
                color: theme.palette.text.primary,
                formatter: (val) => formatShort(parseFloat(val))
              },
              total: { 
                show: true, 
                showAlways: true, 
                label: totals.balance >= 0 ? 'Прибыль' : 'Убыток', 
                fontSize: '11px', 
                fontWeight: 500,
                color: totals.balance >= 0 ? theme.palette.success.main : theme.palette.error.main,
                formatter: () => formatCurrency(totals.balance)
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { enabled: false }, // Отключаем встроенный tooltip
      states: {
        hover: {
          filter: { type: 'lighten', value: 0.15 }
        },
        active: {
          filter: { type: 'darken', value: 0.1 }
        }
      }
    },
    series: chartData
  };

  if (isLoading) return <SkeletonTotalGrowthBarChart />;

  return (
    <>
      {/* Кастомный tooltip через Portal */}
      <CustomTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        label={FULL_LABELS[tooltip.seriesIndex]}
        value={formatCurrency(chartData[tooltip.seriesIndex])}
        color={CHART_COLORS[tooltip.seriesIndex]}
      />
      
      <MainCard sx={{ height: 400 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', gap: 2 }}>
          
          {/* Левая часть - График */}
          <Box sx={{ 
            flex: { xs: 1, md: '0 0 50%' },
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <Chart key={chartKey} {...chartConfig} />
          </Box>

          {/* Правая часть - Легенда (скрывается на узких экранах) */}
          <Box sx={{ 
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column', 
            justifyContent: 'center',
            gap: 1,
            minWidth: 0,
            overflow: 'hidden'
          }}>
            {/* Блоки итогов */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              <Box sx={{ 
                flex: '1 1 45%', 
                minWidth: 100,
                p: 1.5, 
                borderRadius: 2, 
                bgcolor: 'success.lighter', 
                border: '1px solid', 
                borderColor: 'success.light' 
              }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'success.dark', lineHeight: 1.2 }}>
                  Всего доходов
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'success.dark', lineHeight: 1.3 }}>
                  {formatShort(totals.income)} ₽
                </Typography>
              </Box>
              <Box sx={{ 
                flex: '1 1 45%', 
                minWidth: 100,
                p: 1.5, 
                borderRadius: 2, 
                bgcolor: 'error.lighter', 
                border: '1px solid', 
                borderColor: 'error.light' 
              }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'error.dark', lineHeight: 1.2 }}>
                  Всего расходов
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'error.dark', lineHeight: 1.3 }}>
                  {formatShort(totals.expense)} ₽
                </Typography>
              </Box>
            </Box>

            {/* Элементы легенды */}
            {LABELS.map((label, index) => (
              <Box 
                key={label}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'grey.100',
                  transition: 'background-color 0.2s',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <Box sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  bgcolor: CHART_COLORS[index],
                  flexShrink: 0
                }} />
                <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Typography sx={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 500, 
                    color: 'text.primary',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {label}
                  </Typography>
                  <Typography sx={{ 
                    fontSize: '0.65rem', 
                    color: 'text.secondary',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', lg: 'block' }
                  }}>
                    {FULL_LABELS[index]}
                  </Typography>
                </Box>
                <Typography sx={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  color: 'text.primary',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {formatShort(chartData[index])} ₽
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </MainCard>
    </>
  );
}

IncomeExpenseDonutChart.propTypes = {
  isLoading: PropTypes.bool,
  growthData: PropTypes.shape({
    series: PropTypes.array,
    months: PropTypes.array
  })
};
