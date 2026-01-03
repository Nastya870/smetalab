// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import { useState } from 'react';

// project imports
import EarningCard from './EarningCard';
import PopularCard from './PopularCard';
import TotalOrderLineChartCard from './TotalOrderLineChartCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import TotalIncomeLightCard from 'ui-component/cards/TotalIncomeLightCard';
import IncomeExpenseDonutChart from './IncomeExpenseDonutChart';

import { gridSpacing } from 'store/constant';
import { useDashboardData } from 'hooks/useDashboardData';

// assets
import StorefrontTwoToneIcon from '@mui/icons-material/StorefrontTwoTone';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import PieChartOutlineOutlinedIcon from '@mui/icons-material/PieChartOutlineOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';

// ==============================|| DEFAULT DASHBOARD ||============================== //

// Компонент заголовка раздела с иконкой (compact premium style)
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <Box sx={{ mb: 1.5, mt: 0.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {Icon && (
        <Icon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.7 }} />
      )}
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 600, 
          color: 'text.primary',
          fontSize: '0.9rem'
        }}
      >
        {title}
      </Typography>
    </Box>
    {subtitle && (
      <Typography 
        variant="caption" 
        sx={{ 
          color: '#6B7280', 
          display: 'block',
          mt: 0.25,
          ml: Icon ? 3 : 0,
          fontSize: '0.7rem'
        }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

export default function Dashboard() {
  // Используем единый хук для всех данных дашборда
  const { data: dashboardData, isLoading, error } = useDashboardData();
  
  // Фильтры периода (пока статические, можно расширить)
  const [period, setPeriod] = useState('year');

  // Маппинг данных из API (API: totalProfit, incomeWorks, etc.)
  const profitData = dashboardData?.totalProfit;
  const chartData = dashboardData ? {
    month: dashboardData.chartDataMonth,
    year: dashboardData.chartDataYear
  } : null;
  const incomeWorksData = dashboardData?.incomeWorks;
  const incomeMaterialsData = dashboardData?.incomeMaterials;
  const growthData = dashboardData?.growthData;
  const projectsProfitData = dashboardData?.projectsProfitData;

  return (
    <Grid container spacing={2}>
      {/* ============================================ */}
      {/* HEADER: Заголовок страницы + фильтры */}
      {/* ============================================ */}
      <Grid size={12}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1.5
        }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                fontSize: '1.25rem'
              }}
            >
              Финансовый обзор
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#6B7280', 
                mt: 0.25,
                fontSize: '0.75rem'
              }}
            >
              Сводка по доходам, расходам и прибыльности проектов
            </Typography>
          </Box>
          
          {/* Premium фильтр периода */}
          <FormControl size="small">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              IconComponent={() => null}
              inputProps={{ 'aria-label': 'Выбор периода отчета' }}
              startAdornment={
                <CalendarTodayOutlinedIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: 'text.secondary', 
                    mr: 1 
                  }} 
                />
              }
              sx={{ 
                bgcolor: 'background.paper', 
                fontSize: '0.875rem',
                borderRadius: '10px',
                border: '1px solid #DCE1EA',
                minWidth: 140,
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none'
                },
                '&:hover': {
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                },
                transition: 'box-shadow 0.2s ease'
              }}
            >
              <MenuItem value="month">Этот месяц</MenuItem>
              <MenuItem value="quarter">Квартал</MenuItem>
              <MenuItem value="year">Этот год</MenuItem>
              <MenuItem value="all">Всё время</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Divider sx={{ borderColor: '#E8EBF1' }} />
      </Grid>

      {/* ============================================ */}
      {/* SECTION: Финансовые показатели (KPI Cards) */}
      {/* ============================================ */}
      <Grid size={12}>
        <SectionHeader 
          icon={ShowChartOutlinedIcon}
          title="Ключевые показатели"
          subtitle="Основные финансовые метрики за выбранный период"
        />
        <Grid container spacing={gridSpacing} alignItems="stretch">
          {/* Главный KPI - Общая прибыль (выделен) */}
          <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
            <EarningCard 
              isLoading={isLoading} 
              profitData={profitData}
              isPrimary={true}
            />
          </Grid>
          <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
            <TotalOrderLineChartCard 
              isLoading={isLoading} 
              chartData={chartData}
            />
          </Grid>
          <Grid size={{ lg: 4, md: 12, sm: 12, xs: 12 }}>
            <Grid container spacing={1.5} sx={{ height: '100%' }} alignItems="stretch">
              <Grid size={{ sm: 6, xs: 12, md: 6, lg: 12 }}>
                <TotalIncomeDarkCard 
                  isLoading={isLoading} 
                  incomeData={incomeWorksData}
                />
              </Grid>
              <Grid size={{ sm: 6, xs: 12, md: 6, lg: 12 }}>
                <TotalIncomeLightCard
                  isLoading={isLoading}
                  label="Доход (Материалы)"
                  icon={<StorefrontTwoToneIcon fontSize="inherit" />}
                  incomeData={incomeMaterialsData}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* ============================================ */}
      {/* SECTION: График + Прибыльность проектов */}
      {/* ============================================ */}
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 8 }}>
            <SectionHeader 
              icon={PieChartOutlineOutlinedIcon}
              title="Структура доходов и расходов"
              subtitle="Распределение финансовых потоков"
            />
            <IncomeExpenseDonutChart 
              isLoading={isLoading} 
              growthData={growthData}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <SectionHeader 
              icon={TrendingUpOutlinedIcon}
              title="Прибыльность проектов"
              subtitle="Топ проектов по доходности"
            />
            <PopularCard 
              isLoading={isLoading} 
              projectsData={projectsProfitData}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
