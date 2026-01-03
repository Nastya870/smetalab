// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';

// project imports - NEW DASHBOARD COMPONENTS
import MainFinancialChart from './MainFinancialChart';
import SimpleKpiCard from './SimpleKpiCard';
import SimplifiedProjectsTable from './SimplifiedProjectsTable';
import SimplifiedIncomeExpenseTable from './SimplifiedIncomeExpenseTable';

import { gridSpacing } from 'store/constant';
import { useDashboardData } from 'hooks/useDashboardData';

// assets
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

// ==============================|| DEFAULT DASHBOARD ||============================== //

export default function Dashboard() {
  // Используем единый хук для всех данных дашборда
  const { data: dashboardData, isLoading, error } = useDashboardData();
  
  // Фильтры периода (пока статические, можно расширить)
  const [period, setPeriod] = useState('year');

  // Маппинг данных из API для новых компонентов
  const profitData = dashboardData?.totalProfit || { value: 2670, change: 12.5 };
  const projectsCount = dashboardData?.activeProjects || { value: 3, change: 0 };
  const incomeWorksData = dashboardData?.incomeWorks || { value: 23000, change: 8.2 };

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
          pb: 2
        }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: 'text.primary',
                fontSize: '1.5rem'
              }}
            >
              Финансовый обзор
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#6B7280', 
                mt: 0.5,
                fontSize: '0.875rem'
              }}
            >
              Отчёт по доходам, расходам и прибыльности проектов
            </Typography>
          </Box>
          
          {/* Фильтр периода */}
          <FormControl size="small">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              inputProps={{ 'aria-label': 'Выбор периода отчета' }}
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
      </Grid>

      {/* ============================================ */}
      {/* BLOCK 1: KPI Cards (3 карточки) */}
      {/* ============================================ */}
      <Grid size={12}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <SimpleKpiCard
              title="Прибыль"
              value={profitData.value}
              change={profitData.change}
              icon={TrendingUpOutlinedIcon}
              isPrimary={true}
              isLoading={isLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <SimpleKpiCard
              title="Активные проекты"
              value={projectsCount.value}
              change={projectsCount.change}
              icon={AssignmentOutlinedIcon}
              isLoading={isLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <SimpleKpiCard
              title="Доход по работам"
              value={incomeWorksData.value}
              change={incomeWorksData.change}
              icon={AccountBalanceWalletOutlinedIcon}
              isLoading={isLoading}
            />
          </Grid>
        </Grid>
      </Grid>

      {/* ============================================ */}
      {/* BLOCK 2: Главный график (доминирует) */}
      {/* ============================================ */}
      <Grid size={12}>
        <MainFinancialChart isLoading={isLoading} />
      </Grid>

      {/* ============================================ */}
      {/* BLOCK 3: Две таблицы (8+4 колонки) */}
      {/* ============================================ */}
      <Grid size={12}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <SimplifiedIncomeExpenseTable isLoading={isLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <SimplifiedProjectsTable isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
