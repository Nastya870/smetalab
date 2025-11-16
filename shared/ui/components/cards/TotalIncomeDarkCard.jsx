import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
// material-ui
import { styled, useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeCard from 'ui-component/cards/Skeleton/TotalIncomeCard';

// assets
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

// styles
const CardWrapper = styled(MainCard)(({ theme }) => ({
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.light,
  overflow: 'hidden',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(210.04deg, ${theme.palette.primary[200]} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
    borderRadius: '50%',
    top: -30,
    right: -180
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(140.9deg, ${theme.palette.primary[200]} -14.02%, rgba(144, 202, 249, 0) 77.58%)`,
    borderRadius: '50%',
    top: -160,
    right: -130
  }
}));

export default function TotalIncomeDarkCard({ isLoading }) {
  const theme = useTheme();
  const [incomeData, setIncomeData] = useState({ totalIncome: 0, projectsCount: 0 });
  const [loading, setLoading] = useState(true);

  // Загружаем данные о доходах от работ
  useEffect(() => {
    const fetchIncomeWorksData = async () => {
      try {
        setLoading(true);
// Импортируем API здесь, чтобы избежать циклических зависимостей
        const { projectsAPI } = await import('api/projects');
        const response = await projectsAPI.getTotalIncomeWorks();
if (response.success) {
setIncomeData({
            totalIncome: response.data.totalIncomeWorks || 0,
            projectsCount: 0
          });
        } else {
          console.error('❌ API вернул ошибку:', response);
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке данных о доходе от работ:', error);
        console.error('🔍 Детали ошибки:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchIncomeWorksData();
    }
  }, [isLoading]);

  const formatCurrency = (value) => {
    // Проверяем, что значение является числом
    const numValue = Number(value);
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      return '0 ₽';
    }
    if (numValue === 0) return '0 ₽';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  return (
    <>
      {isLoading ? (
        <TotalIncomeCard />
      ) : (
        <CardWrapper border={false} content={false}>
          <Box sx={{ p: 2 }}>
            <List sx={{ py: 0 }}>
              <ListItem alignItems="center" disableGutters sx={{ py: 0 }}>
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    sx={{
                      ...theme.typography.commonAvatar,
                      ...theme.typography.largeAvatar,
                      bgcolor: 'primary.800',
                      color: '#fff'
                    }}
                  >
                    <TableChartOutlinedIcon fontSize="inherit" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  sx={{
                    py: 0,
                    mt: 0.45,
                    mb: 0.45
                  }}
                  primary={
                    <Typography variant="h4" sx={{ color: '#fff' }}>
                      {loading ? '...' : formatCurrency(incomeData.totalIncome)}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="subtitle2" sx={{ color: 'primary.light', mt: 0.25 }}>
                      Общий доход (Работы)
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Box>
        </CardWrapper>
      )}
    </>
  );
}

TotalIncomeDarkCard.propTypes = { isLoading: PropTypes.bool };
