import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

// material-ui
import { alpha, useTheme, styled } from '@mui/material/styles';
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

// styles
const CardWrapper = styled(MainCard)(({ theme }) => ({
  overflow: 'hidden',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(210.04deg, ${theme.palette.warning.dark} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
    borderRadius: '50%',
    top: -30,
    right: -180
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(140.9deg, ${theme.palette.warning.dark} -14.02%, rgba(144, 202, 249, 0) 70.50%)`,
    borderRadius: '50%',
    top: -160,
    right: -130
  }
}));

export default function TotalIncomeLightCard({ isLoading, total, icon, label, useMaterialsData = false }) {
  const theme = useTheme();
  const [materialsData, setMaterialsData] = useState({ totalIncome: 0, projectsCount: 0 });
  const [loading, setLoading] = useState(true);

  // Загружаем данные о доходах от материалов, если useMaterialsData = true
  useEffect(() => {
    const fetchMaterialsData = async () => {
      if (!useMaterialsData) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔄 Загрузка данных дохода от материалов...');
        // Импортируем API здесь, чтобы избежать циклических зависимостей
        const { projectsAPI } = await import('api/projects');
        const response = await projectsAPI.getTotalIncomeMaterials();
        console.log('📊 Ответ API дохода от материалов:', response);
        if (response.success) {
          console.log('✅ Данные дохода от материалов получены:', response.data);
          setMaterialsData({
            totalIncome: response.data.totalIncomeMaterials || 0,
            projectsCount: 0
          });
        } else {
          console.error('❌ API вернул ошибку:', response);
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке данных о доходе от материалов:', error);
        console.error('🔍 Детали ошибки:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchMaterialsData();
    }
  }, [isLoading, useMaterialsData]);

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

  // Определяем отображаемое значение
  const displayValue = useMaterialsData 
    ? (loading ? '...' : formatCurrency(materialsData.totalIncome))
    : `$${total}k`;

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
                      bgcolor: label === 'Meeting attends' ? alpha(theme.palette.error.light, 0.25) : 'warning.light',
                      color: label === 'Meeting attends' ? 'error.dark' : 'warning.dark'
                    }}
                  >
                    {icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  sx={{ py: 0, mt: 0.45, mb: 0.45 }}
                  primary={<Typography variant="h4">{displayValue}</Typography>}
                  secondary={
                    <Typography variant="subtitle2" sx={{ color: 'grey.500', mt: 0.5 }}>
                      {label}
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

TotalIncomeLightCard.propTypes = { 
  isLoading: PropTypes.bool, 
  total: PropTypes.number, 
  icon: PropTypes.node, 
  label: PropTypes.string,
  useMaterialsData: PropTypes.bool 
};
