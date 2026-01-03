import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

// project imports
import BajajAreaChartCard from './BajajAreaChartCard';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonPopularCard from 'ui-component/cards/Skeleton/PopularCard';
import { gridSpacing } from 'store/constant';

// assets
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';

export default function PopularCard({ isLoading, projectsData }) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  // Используем данные из пропсов или пустой массив
  const projects = useMemo(() => projectsData || [], [projectsData]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewAllProjects = () => {
    navigate('/app/projects');
  };

  // Форматирование без копеек
  const formatCurrency = (value) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      return '0 ₽';
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  // Получение цвета в зависимости от маржинальности
  const getProgressColor = (percentage, isProfit) => {
    if (!isProfit) return 'error';
    if (percentage >= 30) return 'success';
    if (percentage >= 15) return 'primary';
    return 'warning';
  };

  const renderProjectItem = (project, index) => {
    const percentage = Math.abs(project.profitPercentage || 0);
    const progressValue = Math.min(percentage, 100);
    const progressColor = getProgressColor(percentage, project.isProfit);
    
    return (
      <React.Fragment key={project.id}>
        <Box
          sx={{
            py: 1.5,
            px: 1.5,
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.100',
            mb: 1,
            '&:hover': { 
              bgcolor: 'grey.100',
              borderColor: 'grey.200',
              transform: 'translateY(-1px)'
            }
          }}
          onClick={() => navigate(`/app/projects/${project.id}`)}
        >
          {/* Строка 1: Название + Прибыль */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
            <Typography 
              sx={{ 
                fontSize: '0.875rem',
                fontWeight: 500,
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '55%',
                color: 'text.primary'
              }}
            >
              {project.name}
            </Typography>
            <Typography 
              sx={{ 
                fontSize: '0.95rem',
                fontWeight: 600,
                color: project.isProfit ? 'success.main' : 'error.main',
                fontVariantNumeric: 'tabular-nums' // Выравнивание цифр
              }}
            >
              {project.isProfit ? '+' : ''}{formatCurrency(project.totalProfit)}
            </Typography>
          </Box>
          
          {/* Строка 2: Прогресс-бар + процент */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              color={progressColor}
              aria-label={`Прогресс ${progressValue}%`}
              aria-valuenow={progressValue}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: '4px',
                bgcolor: '#E5EAF0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: '4px'
                },
                // Мягкий зелёный вместо неонового
                '&.MuiLinearProgress-colorSuccess .MuiLinearProgress-bar': {
                  backgroundColor: '#34A853'
                }
              }}
            />
            <Typography 
              sx={{ 
                fontSize: '0.75rem',
                fontWeight: 600,
                color: project.isProfit ? `${progressColor}.main` : 'error.main',
                minWidth: 42,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {percentage.toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      </React.Fragment>
    );
  };

  // Высота списка проектов (с учетом мини-графика и кнопки)
  const CARD_HEIGHT = 400; // Выровнено с IncomeExpenseDonutChart
  const CHART_HEIGHT = 120; // Мини-график
  const BUTTON_HEIGHT = 48; // Кнопка внизу
  const PADDING = 32; // Паддинги
  const LIST_HEIGHT = CARD_HEIGHT - CHART_HEIGHT - BUTTON_HEIGHT - PADDING;

  return (
    <>
      {isLoading ? (
        <SkeletonPopularCard />
      ) : (
        <MainCard content={false} sx={{ height: CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden' }}>
            {/* Мини-график */}
            <Box sx={{ mb: 1, flexShrink: 0 }}>
              <BajajAreaChartCard projects={projects} />
            </Box>
            
            {/* Список проектов со скроллом */}
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
              {isLoading ? (
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
                    height: '100%',
                    overflowY: projects.length > 2 ? 'auto' : 'visible',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#c1c1c1 transparent',
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent', borderRadius: '10px' },
                    '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '10px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: '#a1a1a1' }
                  }}
                >
                  {projects.map((project, index) => renderProjectItem(project, index))}
                </Box>
              )}
            </Box>
          </CardContent>
          <CardActions sx={{ p: 1.25, pt: 0, justifyContent: 'center', flexShrink: 0 }}>
            <Button size="small" disableElevation onClick={handleViewAllProjects}>
              Все Проекты
              <ChevronRightOutlinedIcon />
            </Button>
          </CardActions>
        </MainCard>
      )}
    </>
  );
}

PopularCard.propTypes = { 
  isLoading: PropTypes.bool,
  projectsData: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    totalProfit: PropTypes.number,
    isProfit: PropTypes.bool,
    profitPercentage: PropTypes.number
  }))
};
