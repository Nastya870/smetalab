import PropTypes from 'prop-types';
import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SkeletonEarningCard from 'ui-component/cards/Skeleton/EarningCard';

// assets
import EarningIcon from 'assets/images/icons/earning.svg';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GetAppTwoToneIcon from '@mui/icons-material/GetAppOutlined';
import FileCopyTwoToneIcon from '@mui/icons-material/FileCopyOutlined';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ArchiveTwoToneIcon from '@mui/icons-material/ArchiveOutlined';

// Унифицированный форматтер для всех KPI карточек (без копеек)
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

export default function EarningCard({ isLoading, profitData, isPrimary = false }) {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = React.useState(null);

  // Используем данные из пропсов или значения по умолчанию
  const totalProfit = profitData?.totalProfit || 0;
  const isPositive = totalProfit >= 0;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {isLoading ? (
        <SkeletonEarningCard />
      ) : (
        <MainCard
          border={false}
          content={false}
          sx={{
            bgcolor: isPrimary ? 'secondary.dark' : 'secondary.main',
            color: '#fff',
            overflow: 'hidden',
            position: 'relative',
            minHeight: 135,
            '&:after': {
              content: '""',
              position: 'absolute',
              width: 140,
              height: 140,
              background: theme.palette.secondary[800],
              borderRadius: '50%',
              top: { xs: -50 },
              right: { xs: -60 },
              opacity: 0.3
            },
            '&:before': {
              content: '""',
              position: 'absolute',
              width: 120,
              height: 120,
              background: theme.palette.secondary[800],
              borderRadius: '50%',
              top: { xs: -85 },
              right: { xs: -5 },
              opacity: 0.2
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Grid container direction="column">
              <Grid>
                <Grid container sx={{ justifyContent: 'space-between' }}>
                  <Grid>
                    <Avatar
                      variant="rounded"
                      sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.largeAvatar,
                        bgcolor: 'secondary.800',
                        mt: 1
                      }}
                    >
                      <CardMedia 
                        sx={{ width: 24, height: 24 }} 
                        component="img" 
                        src={EarningIcon} 
                        alt="Прибыль" 
                      />
                    </Avatar>
                  </Grid>
                  <Grid>
                    <Avatar
                      variant="rounded"
                      sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.mediumAvatar,
                        bgcolor: 'secondary.dark',
                        color: 'secondary.200',
                        zIndex: 1
                      }}
                      aria-controls="menu-earning-card"
                      aria-haspopup="true"
                      onClick={handleClick}
                    >
                      <MoreHorizIcon fontSize="inherit" />
                    </Avatar>
                    <Menu
                      id="menu-earning-card"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleClose}
                      variant="selectedMenu"
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                      }}
                    >
                      <MenuItem onClick={handleClose}>
                        <GetAppTwoToneIcon sx={{ mr: 1.75 }} /> Импорт данных
                      </MenuItem>
                      <MenuItem onClick={handleClose}>
                        <FileCopyTwoToneIcon sx={{ mr: 1.75 }} /> Копировать данные
                      </MenuItem>
                      <MenuItem onClick={handleClose}>
                        <PictureAsPdfTwoToneIcon sx={{ mr: 1.75 }} /> Экспорт
                      </MenuItem>
                      <MenuItem onClick={handleClose}>
                        <ArchiveTwoToneIcon sx={{ mr: 1.75 }} /> Архивировать файл
                      </MenuItem>
                    </Menu>
                  </Grid>
                </Grid>
              </Grid>
              <Grid>
                <Grid container sx={{ alignItems: 'center' }}>
                  <Grid>
                    <Typography 
                      sx={{ 
                        // Единый размер 1.5rem для главных сумм KPI
                        fontSize: '1.5rem', 
                        fontWeight: 600, 
                        mr: 1, 
                        mt: 1.75, 
                        mb: 0.5 
                      }}
                    >
                      {isLoading ? '...' : formatCurrency(totalProfit)}
                    </Typography>
                  </Grid>
                  <Grid>
                    <Avatar
                      sx={{
                        cursor: 'pointer',
                        ...theme.typography.smallAvatar,
                        bgcolor: isPositive ? 'success.light' : 'error.light',
                        color: isPositive ? 'success.dark' : 'error.dark'
                      }}
                    >
                      {isPositive ? (
                        <TrendingUpIcon fontSize="inherit" />
                      ) : (
                        <TrendingDownIcon fontSize="inherit" />
                      )}
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
              <Grid sx={{ mb: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'secondary.200'
                  }}
                >
                  {isPositive ? 'Общая прибыль' : 'Общий убыток'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </MainCard>
      )}
    </>
  );
}

EarningCard.propTypes = { 
  isLoading: PropTypes.bool,
  profitData: PropTypes.shape({
    totalProfit: PropTypes.number,
    projectsWithProfit: PropTypes.number
  }),
  isPrimary: PropTypes.bool
};
