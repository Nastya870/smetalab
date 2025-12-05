import PropTypes from 'prop-types';
// material-ui
import { styled, useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeCard from 'ui-component/cards/Skeleton/TotalIncomeCard';

// assets
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

// styles - компактные для размещения 2 в 1 колонке
const CardWrapper = styled(MainCard)(({ theme }) => ({
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.light,
  overflow: 'hidden',
  position: 'relative',
  height: '100%',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 100,
    height: 100,
    background: `linear-gradient(210.04deg, ${theme.palette.primary[200]} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
    borderRadius: '50%',
    top: -25,
    right: -50,
    opacity: 0.25
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 80,
    height: 80,
    background: `linear-gradient(140.9deg, ${theme.palette.primary[200]} -14.02%, rgba(144, 202, 249, 0) 77.58%)`,
    borderRadius: '50%',
    top: -50,
    right: -30,
    opacity: 0.2
  }
}));

export default function TotalIncomeDarkCard({ isLoading, incomeData }) {
  const theme = useTheme();
  
  // incomeData - это число напрямую из API (не объект)
  const totalIncome = typeof incomeData === 'number' ? incomeData : (incomeData?.totalIncomeWorks || 0);

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
                bgcolor: 'primary.800',
                color: '#fff'
              }}
            >
              <TableChartOutlinedIcon fontSize="inherit" />
            </Avatar>
            <Box>
              <Typography 
                sx={{ 
                  color: '#fff',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  lineHeight: 1.2
                }}
              >
                {isLoading ? '...' : formatCurrency(totalIncome)}
              </Typography>
              <Typography 
                sx={{ 
                  color: 'primary.light', 
                  fontSize: '0.7rem',
                  mt: 0.25,
                  opacity: 0.85
                }}
              >
                Доход (Работы)
              </Typography>
            </Box>
          </Box>
        </CardWrapper>
      )}
    </>
  );
}

TotalIncomeDarkCard.propTypes = { 
  isLoading: PropTypes.bool,
  incomeData: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      totalIncomeWorks: PropTypes.number
    })
  ])
};
