import PropTypes from 'prop-types';
import React, { useMemo } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalOrderCard from 'ui-component/cards/Skeleton/EarningCard';

// assets
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function TotalOrderLineChartCard({ isLoading, chartData: chartDataProp }) {
  const theme = useTheme();

  // Обработка данных из пропсов
  const projectCounts = useMemo(() => {
    if (!chartDataProp) {
      return { month: 0, year: 0 };
    }

    const monthData = chartDataProp.month?.chartData || [];
    const yearData = chartDataProp.year?.chartData || [];

    // Берем последние значения активных проектов (в работе)
    const currentMonthInProgress = monthData.length > 0 
      ? monthData[monthData.length - 1].inProgressProjects || 0 
      : 0;
    const currentYearInProgress = yearData.length > 0 
      ? yearData[yearData.length - 1].inProgressProjects || 0 
      : 0;

    return {
      month: currentMonthInProgress,
      year: currentYearInProgress
    };
  }, [chartDataProp]);

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
            minHeight: 135,
            '&:after': {
              content: '""',
              position: 'absolute',
              width: 160,
              height: 160,
              background: theme.palette.primary[800],
              borderRadius: '50%',
              top: { xs: -70 },
              right: { xs: -80 },
              opacity: 0.35
            },
            '&:before': {
              content: '""',
              position: 'absolute',
              width: 160,
              height: 160,
              background: theme.palette.primary[800],
              borderRadius: '50%',
              top: { xs: -110 },
              right: { xs: -10 },
              opacity: 0.25
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Grid container direction="column">
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
              <Grid>
                <Grid container sx={{ alignItems: 'center' }}>
                  <Grid>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, mr: 1, mt: 1.75, mb: 0.5 }}>
                      {isLoading ? '...' : projectCounts.year}
                    </Typography>
                  </Grid>
                  <Grid>
                    <Avatar
                      sx={{
                        ...theme.typography.smallAvatar,
                        bgcolor: 'primary.200',
                        color: 'primary.dark'
                      }}
                    >
                      <TrendingUpIcon fontSize="inherit" />
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
              <Grid sx={{ mb: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'primary.200'
                  }}
                >
                  Проекты в работе
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </MainCard>
      )}
    </>
  );
}

TotalOrderLineChartCard.propTypes = { 
  isLoading: PropTypes.bool,
  chartData: PropTypes.shape({
    month: PropTypes.object,
    year: PropTypes.object
  })
};
