import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import BajajAreaChartCard from './BajajAreaChartCard';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonPopularCard from 'ui-component/cards/Skeleton/PopularCard';
import { gridSpacing } from 'store/constant';

// assets
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';

export default function PopularCard({ isLoading }) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewAllProjects = () => {
    navigate('/app/projects');
  };

  // Загружаем данные о проектах с прибылью
  useEffect(() => {
    const fetchProjectsData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Загрузка данных прибыли проектов...');
        // Импортируем API здесь, чтобы избежать циклических зависимостей
        const { projectsAPI } = await import('api/projects');
        const response = await projectsAPI.getProjectsProfitData(10); // Загружаем больше проектов
        console.log('📊 Ответ API прибыли проектов:', response);
        if (response.success) {
          console.log('✅ Данные прибыли проектов получены:', response.data);
          setProjects(response.data);
        } else {
          console.error('❌ API вернул ошибку:', response);
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке данных прибыли проектов:', error);
        console.error('🔍 Детали ошибки:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchProjectsData();
    }
  }, [isLoading]);

  const formatCurrency = (value) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      return '₽0.00';
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(numValue));
  };

  const formatPercentage = (value) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      return '0%';
    }
    return `${Math.abs(numValue).toFixed(1)}%`;
  };

  const renderProjectItem = (project, index) => (
    <React.Fragment key={project.id}>
      <Grid container direction="column">
        <Grid>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid>
              <Typography variant="subtitle1" color="inherit" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {project.name}
              </Typography>
            </Grid>
            <Grid>
              <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Typography variant="subtitle1" color="inherit">
                    {formatCurrency(project.totalProfit)}
                  </Typography>
                </Grid>
                <Grid>
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '5px',
                      bgcolor: project.isProfit ? 'success.light' : 'orange.light',
                      color: project.isProfit ? 'success.dark' : 'orange.dark',
                      ml: 2
                    }}
                  >
                    {project.isProfit ? (
                      <KeyboardArrowUpOutlinedIcon fontSize="small" color="inherit" />
                    ) : (
                      <KeyboardArrowDownOutlinedIcon fontSize="small" color="inherit" />
                    )}
                  </Avatar>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid>
          <Typography variant="subtitle2" sx={{ color: project.isProfit ? 'success.dark' : 'orange.dark' }}>
            {formatPercentage(project.profitPercentage)} {project.isProfit ? 'Прибыль' : 'убыток'}
          </Typography>
        </Grid>
      </Grid>
      {index < projects.length - 1 && <Divider sx={{ my: 1.5 }} />}
    </React.Fragment>
  );

  return (
    <>
      {isLoading ? (
        <SkeletonPopularCard />
      ) : (
        <MainCard content={false} sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Grid container spacing={gridSpacing} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Grid size={12}>
                <Grid container sx={{ alignContent: 'center', justifyContent: 'space-between' }}>
                  <Grid>
                    <Typography variant="h4">Прибыльность проектов</Typography>
                  </Grid>
                  <Grid>
                    <IconButton size="small" sx={{ mt: -0.625 }}>
                      <MoreHorizOutlinedIcon
                        fontSize="small"
                        sx={{ cursor: 'pointer' }}
                        aria-controls="menu-popular-card"
                        aria-haspopup="true"
                        onClick={handleClick}
                      />
                    </IconButton>
                    <Menu
                      id="menu-popular-card"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleClose}
                      variant="selectedMenu"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      <MenuItem onClick={handleClose}> Сегодня</MenuItem>
                      <MenuItem onClick={handleClose}> Этот месяц</MenuItem>
                      <MenuItem onClick={handleClose}> Этот год </MenuItem>
                    </Menu>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12} sx={{ mt: -1 }}>
                <BajajAreaChartCard projects={projects} />
              </Grid>
              <Grid size={12} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {loading ? (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 2 }}>
                    Загрузка данных...
                  </Typography>
                ) : projects.length === 0 ? (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                    Нет данных для отображения
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      flexGrow: 1, // Занимает оставшееся пространство
                      overflowY: 'auto',
                      pr: 0.5, // Небольшой отступ для скроллбара
                      scrollbarWidth: 'thin', // Для Firefox
                      scrollbarColor: '#c1c1c1 #f1f1f1', // Для Firefox
                      // Стилизация скроллбара для Webkit браузеров
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '10px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#c1c1c1',
                        borderRadius: '10px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: '#a1a1a1',
                      },
                    }}
                  >
                    {projects.map((project, index) => renderProjectItem(project, index))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
          <CardActions sx={{ p: 1.25, pt: 0, justifyContent: 'center' }}>
            <Button size="small" disableElevation onClick={handleViewAllProjects}>
              Все проекты
              <ChevronRightOutlinedIcon />
            </Button>
          </CardActions>
        </MainCard>
      )}
    </>
  );
}

PopularCard.propTypes = { isLoading: PropTypes.bool };
