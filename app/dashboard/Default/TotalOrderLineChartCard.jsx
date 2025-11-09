import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import Chart from 'react-apexcharts';

// project imports
import ChartDataMonth from './chart-data/total-order-month-line-chart';
import ChartDataYear from './chart-data/total-order-year-line-chart';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalOrderCard from 'ui-component/cards/Skeleton/EarningCard';
import { projectsAPI } from 'api/projects';

// assets
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export default function TotalOrderLineChartCard({ isLoading }) {
  const theme = useTheme();

  const [chartData, setChartData] = useState({ month: {}, year: {} });
  const [projectCounts, setProjectCounts] = useState({ month: 0, year: 0 });
  const [monthNames, setMonthNames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Загрузка данных о проектах
  useEffect(() => {
    const fetchProjectsData = async () => {
      try {
        setLoading(true);
        
        // Загружаем данные за месяц и год параллельно
        const [monthResponse, yearResponse] = await Promise.all([
          projectsAPI.getChartData('month'),
          projectsAPI.getChartData('year')
        ]);

        console.log('📊 Ответы API проектов:', { monthResponse, yearResponse });
        
        if (monthResponse.success && yearResponse.success) {
          const monthData = monthResponse.data.chartData;
          const yearData = yearResponse.data.chartData;
          
          console.log('📅 Данные по месяцам:', monthData);
          console.log('📆 Данные по годам:', yearData);
          
          // Подготавливаем данные для графиков - все 5 статусов
          const prepareStatusData = (data) => ({
            planning: data.map(item => item.planningProjects || 0),
            approval: data.map(item => item.approvalProjects || 0),
            inProgress: data.map(item => item.inProgressProjects || 0),
            rejected: data.map(item => item.rejectedProjects || 0),
            completed: data.map(item => item.completedProjects || 0),
            total: data.map(item => item.totalProjects || 0)
          });

          setChartData({
            month: prepareStatusData(monthData),
            year: prepareStatusData(yearData)
          });

          // Берем последние значения активных проектов (в работе)
          const currentMonthInProgress = monthData.length > 0 
            ? monthData[monthData.length - 1].inProgressProjects || 0 
            : 0;
          const currentYearInProgress = yearData.length > 0 
            ? yearData[yearData.length - 1].inProgressProjects || 0 
            : 0;
          
          console.log('🔢 Текущие проекты в работе:', { currentMonthInProgress, currentYearInProgress });
          
          setProjectCounts({
            month: currentMonthInProgress,
            year: currentYearInProgress
          });

          // Сохраняем русские названия месяцев из API
          if (yearResponse.data.months) {
            setMonthNames(yearResponse.data.months);
            console.log('📅 Русские месяцы:', yearResponse.data.months);
          }
        } else {
          console.error('❌ Ошибка в ответах API:', { monthResponse, yearResponse });
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке данных проектов:', error);
        console.error('🔍 Детали ошибки проектов:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchProjectsData();
    }
  }, [isLoading]);

  return (
    <>
      {isLoading ? (
        <SkeletonTotalOrderCard />
      ) : (
        <MainCard
          border={false}
          content={false}
          sx={{
            bgcolor: 'primary.dark',
            color: '#fff',
            overflow: 'hidden',
            position: 'relative',
            '&>div': {
              position: 'relative',
              zIndex: 5
            },
            '&:after': {
              content: '""',
              position: 'absolute',
              width: 210,
              height: 210,
              background: theme.palette.primary[800],
              borderRadius: '50%',
              top: { xs: -85 },
              right: { xs: -95 }
            },
            '&:before': {
              content: '""',
              position: 'absolute',
              width: 210,
              height: 210,
              background: theme.palette.primary[800],
              borderRadius: '50%',
              top: { xs: -125 },
              right: { xs: -15 },
              opacity: 0.5
            }
          }}
        >
          <Box sx={{ p: 2.25, position: 'relative', overflow: 'visible' }}>
            <Grid container direction="column">
              <Grid>
                <Grid container sx={{ justifyContent: 'space-between' }}>
                  <Grid>
                    <Avatar
                      variant="rounded"
                      sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.largeAvatar,
                        bgcolor: 'primary.800',
                        color: '#fff',
                        mt: 1
                      }}
                    >
                      <LocalMallOutlinedIcon fontSize="inherit" />
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
              <Grid sx={{ mb: 0.75 }}>
                <Grid container sx={{ alignItems: 'center' }}>
                  <Grid size={6}>
                    <Grid container sx={{ alignItems: 'center' }}>
                      <Grid>
                        <Typography sx={{ fontSize: '2.125rem', fontWeight: 500, mr: 1, mt: 1.75, mb: 0.75 }}>
                          {loading ? '...' : projectCounts.year}
                        </Typography>
                      </Grid>
                      <Grid>
                        <Avatar
                          sx={{
                            ...theme.typography.smallAvatar,
                            cursor: 'pointer',
                            bgcolor: 'primary.200',
                            color: 'primary.dark'
                          }}
                        >
                          <ArrowDownwardIcon fontSize="inherit" sx={{ transform: 'rotate3d(1, 1, 1, 45deg)' }} />
                        </Avatar>
                      </Grid>
                      <Grid size={12}>
                        <Typography
                          sx={{
                            fontSize: '1rem',
                            fontWeight: 500,
                            color: 'primary.200'
                          }}
                        >
                          Проекты в работе
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid
                    size={6}
                    sx={{
                      position: 'relative',
                      zIndex: 10,
                      '.apexcharts-tooltip.apexcharts-theme-light': {
                        color: theme.palette.text.primary,
                        background: theme.palette.background.default
                      },
                      '.apexcharts-tooltip.apexcharts-theme-dark': {
                        background: 'rgba(0, 0, 0, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    {loading ? (
                      <div>Загрузка...</div>
                    ) : (
                      <Chart 
                        options={{
                            ...ChartDataYear.options,
                            yaxis: {
                              min: 0,
                              max: Math.max(10, 
                                ...(chartData.year?.planning || [0]), 
                                ...(chartData.year?.approval || [0]),
                                ...(chartData.year?.inProgress || [0]),
                                ...(chartData.year?.rejected || [0]),
                                ...(chartData.year?.completed || [0])
                              ),
                              labels: {
                                show: false
                              }
                            },
                            xaxis: {
                              categories: monthNames.length > 0 ? monthNames : ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
                              labels: {
                                show: false
                              }
                            },
                            colors: ['#ffc107', '#ff9800', '#9c27b0', '#f44336', '#4caf50'],
                            stroke: {
                              width: 2,
                              curve: 'smooth'
                            },
                            legend: {
                              show: false
                            },
                            tooltip: {
                              enabled: true,
                              shared: true,
                              intersect: false,
                              theme: 'dark',
                              x: {
                                show: true
                              },
                              y: {
                                title: {
                                  formatter: (seriesName) => seriesName + ': '
                                }
                              },
                              marker: {
                                show: true
                              },
                              fixed: {
                                enabled: false
                              },
                              style: {
                                fontSize: '9px',
                                fontFamily: 'Roboto, sans-serif'
                              },
                              custom: function({ series, seriesIndex, dataPointIndex, w }) {
                                const month = w.globals.categoryLabels[dataPointIndex];
                                const statuses = [
                                  { name: 'Планирование', value: series[0][dataPointIndex], color: '#ffc107' },
                                  { name: 'Согласование', value: series[1][dataPointIndex], color: '#ff9800' },
                                  { name: 'В работе', value: series[2][dataPointIndex], color: '#9c27b0' },
                                  { name: 'Отказ', value: series[3][dataPointIndex], color: '#f44336' },
                                  { name: 'Завершён', value: series[4][dataPointIndex], color: '#4caf50' }
                                ];
                                
                                return `
                                  <div style="background: rgba(0,0,0,0.85); padding: 4px 6px; border-radius: 4px; font-size: 9px; min-width: 100px;">
                                    <div style="font-weight: 500; margin-bottom: 3px; font-size: 9px;">${month}</div>
                                    ${statuses.map(s => `
                                      <div style="display: flex; align-items: center; margin: 2px 0; font-size: 9px;">
                                        <span style="width: 8px; height: 8px; background: ${s.color}; border-radius: 50%; margin-right: 4px; display: inline-block;"></span>
                                        <span style="flex: 1; font-size: 9px;">${s.name}:</span>
                                        <span style="font-weight: 500; margin-left: 4px; font-size: 9px;">${s.value}</span>
                                      </div>
                                    `).join('')}
                                  </div>
                                `;
                              }
                            },
                            chart: {
                              ...ChartDataYear.options.chart,
                              toolbar: {
                                show: false
                              }
                            }
                          }}
                          series={[
                            {
                              name: 'Планирование',
                              data: chartData.year?.planning || []
                            },
                            {
                              name: 'Согласование',
                              data: chartData.year?.approval || []
                            },
                            {
                              name: 'В работе',
                              data: chartData.year?.inProgress || []
                            },
                            {
                              name: 'Отказ',
                              data: chartData.year?.rejected || []
                            },
                            {
                              name: 'Завершён',
                              data: chartData.year?.completed || []
                            }
                          ]}
                          type="line"
                          height={90}
                        />
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </MainCard>
      )}
    </>
  );
}

TotalOrderLineChartCard.propTypes = { isLoading: PropTypes.bool };
