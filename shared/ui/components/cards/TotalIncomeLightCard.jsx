import PropTypes from 'prop-types';

// material-ui
import { alpha, useTheme, styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeCard from 'ui-component/cards/Skeleton/TotalIncomeCard';

// styles - компактные для размещения 2 в 1 колонке
const CardWrapper = styled(MainCard)(({ theme }) => ({
  overflow: 'hidden',
  position: 'relative',
  height: '100%',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 100,
    height: 100,
    background: `linear-gradient(210.04deg, ${theme.palette.warning.dark} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
    borderRadius: '50%',
    top: -25,
    right: -50,
    opacity: 0.15
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 80,
    height: 80,
    background: `linear-gradient(140.9deg, ${theme.palette.warning.dark} -14.02%, rgba(144, 202, 249, 0) 70.50%)`,
    borderRadius: '50%',
    top: -50,
    right: -30,
    opacity: 0.12
  }
}));

export default function TotalIncomeLightCard({ isLoading, icon, label, incomeData }) {
  const theme = useTheme();
  
  // incomeData - это число напрямую из API (не объект)
  const totalIncome = typeof incomeData === 'number' ? incomeData : (incomeData?.totalIncomeMaterials || 0);

  const formatCurrency = (value) => {
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

  const displayValue = isLoading ? '...' : formatCurrency(totalIncome);

  return (
    <>
      {isLoading ? (
        <TotalIncomeCard />
      ) : (
        <CardWrapper border={false} content={false}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
            <Avatar
              variant="rounded"
              sx={{
                ...theme.typography.commonAvatar,
                ...theme.typography.mediumAvatar,
                bgcolor: label === 'Meeting attends' ? alpha(theme.palette.error.light, 0.25) : 'warning.light',
                color: label === 'Meeting attends' ? 'error.dark' : 'warning.dark'
              }}
            >
              {icon}
            </Avatar>
            <Box>
              <Typography 
                sx={{ 
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  lineHeight: 1.2
                }}
              >
                {displayValue}
              </Typography>
              <Typography 
                sx={{ 
                  color: '#6B7280', 
                  fontSize: '0.7rem',
                  mt: 0.25
                }}
              >
                {label}
              </Typography>
            </Box>
          </Box>
        </CardWrapper>
      )}
    </>
  );
}

TotalIncomeLightCard.propTypes = { 
  isLoading: PropTypes.bool, 
  icon: PropTypes.node, 
  label: PropTypes.string,
  incomeData: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      totalIncomeMaterials: PropTypes.number
    })
  ])
};
