import PropTypes from 'prop-types';

// material-ui
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// third party
import Chart from 'react-apexcharts';

// icons
import { IconChartBar, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';

// ==============================|| FINANCIAL SUMMARY CHART - MODERN ||============================== //

export default function FinancialSummaryChart({ 
  financialSummary = {
    incomeWorks: 0,
    expenseWorks: 0,
    incomeMaterials: 0,
    expenseMaterials: 0
  },
  isLoading = false
}) {
  const financialData = {
    incomeWorks: financialSummary?.incomeWorks || 0,
    expenseWorks: financialSummary?.expenseWorks || 0,
    incomeMaterials: financialSummary?.incomeMaterials || 0,
    expenseMaterials: financialSummary?.expenseMaterials || 0
  };

  const totalIncome = financialData.incomeWorks + financialData.incomeMaterials;
  const totalExpense = financialData.expenseWorks + financialData.expenseMaterials;
  const totalProfit = totalIncome - totalExpense;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatShort = (val) => {
    if (val === 0) return '0';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + ' млн';
    if (val >= 1000) return (val / 1000).toFixed(0) + ' тыс';
    return val.toFixed(0);
  };

  const chartOptions = {
    chart: {
      id: 'financial-chart-modern',
      type: 'bar',
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
      fontFamily: 'inherit',
      offsetY: -12
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 6,
        borderRadiusApplication: 'end'
      }
    },
    dataLabels: { enabled: false },
    colors: ['#22C55E', '#EF4444'],
    xaxis: {
      categories: ['Работы', 'Материалы'],
      labels: {
        style: { fontSize: '11px', fontWeight: 500, colors: '#6B7280' },
        offsetY: -4
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: formatShort,
        style: { fontSize: '10px', colors: '#9CA3AF' }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      fontWeight: 500,
      labels: { colors: '#6B7280' },
      markers: { size: 6, shape: 'circle', offsetX: -2 },
      itemMargin: { horizontal: 8 },
      offsetY: 0
    },
    tooltip: {
      y: { formatter: (val) => formatCurrency(val) },
      style: { fontSize: '12px' }
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      padding: { top: -10, bottom: -5 }
    },
    states: {
      hover: { filter: { type: 'darken', value: 0.9 } }
    }
  };

  const series = [
    { name: 'Доход', data: [financialData.incomeWorks, financialData.incomeMaterials] },
    { name: 'Расход', data: [financialData.expenseWorks, financialData.expenseMaterials] }
  ];

  const summaryItems = [
    { label: 'Общий доход', value: totalIncome, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
    { label: 'Общий расход', value: totalExpense, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
    { label: 'Прибыль', value: totalProfit, color: totalProfit >= 0 ? '#4F46E5' : '#F59E0B', bg: totalProfit >= 0 ? 'rgba(99,102,241,0.08)' : 'rgba(245,158,11,0.08)', trend: true }
  ];

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconChartBar size={16} stroke={1.5} color="#6B7280" />
          <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: '#1F2937' }}>Финансовая сводка</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress size={24} sx={{ color: '#6B7280' }} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconChartBar size={16} stroke={1.5} color="#6B7280" />
        <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: '#1F2937' }}>Финансовая сводка</Typography>
      </Box>

      {/* Сводка - 3 карточки */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        {summaryItems.map((item, idx) => (
          <Box key={idx} sx={{ flex: 1, p: '16px 20px', borderRadius: '8px', bgcolor: item.bg, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: item.color }}>{formatCurrency(item.value)}</Typography>
              {item.trend && (
                item.value >= 0 
                  ? <IconTrendingUp size={14} color="#22C55E" /> 
                  : <IconTrendingDown size={14} color="#EF4444" />
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* График */}
      <Box sx={{ mx: -0.5, mt: -1 }} key={`chart-${financialData.incomeWorks}`}>
        <Chart options={chartOptions} series={series} type="bar" height={170} />
      </Box>
    </Paper>
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
