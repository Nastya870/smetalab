import { Card, CardContent, Box, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

/**
 * Упрощенная KPI карточка
 * Только главное: значение, процент изменения, без лишних деталей
 */
const SimpleKpiCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  isPrimary = false,
  isLoading = false 
}) => {
  // Определяем цвет тренда
  const getTrendColor = () => {
    if (!change) return '#6B7280';
    if (change > 0) return '#10B981';
    if (change < 0) return '#EF4444';
    return '#6B7280';
  };

  const getTrendIcon = () => {
    if (!change || change === 0) return <RemoveIcon sx={{ fontSize: 16 }} />;
    if (change > 0) return <TrendingUpIcon sx={{ fontSize: 16 }} />;
    return <TrendingDownIcon sx={{ fontSize: 16 }} />;
  };

  const trendColor = getTrendColor();

  return (
    <Card
      sx={{
        bgcolor: isPrimary ? 'primary.main' : 'background.paper',
        boxShadow: isPrimary 
          ? '0 4px 12px 0 rgba(103, 80, 164, 0.24)'
          : '0 1px 3px 0 rgba(0,0,0,0.08)',
        borderRadius: '12px',
        border: isPrimary ? 'none' : '1px solid #E8EBF1',
        height: '100%',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: isPrimary
            ? '0 6px 16px 0 rgba(103, 80, 164, 0.32)'
            : '0 2px 8px 0 rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: isPrimary ? 'rgba(255,255,255,0.85)' : '#6B7280',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {title}
          </Typography>
          {Icon && (
            <Icon
              sx={{
                fontSize: 24,
                color: isPrimary ? 'rgba(255,255,255,0.7)' : 'primary.main',
                opacity: 0.8
              }}
            />
          )}
        </Box>

        {/* Главное значение */}
        <Typography
          variant="h3"
          sx={{
            color: isPrimary ? '#fff' : 'text.primary',
            fontSize: '2rem',
            fontWeight: 700,
            mb: 1,
            lineHeight: 1.2
          }}
        >
          {isLoading ? '—' : value}
        </Typography>

        {/* Процент изменения */}
        {change !== undefined && !isLoading && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: '6px',
              bgcolor: isPrimary 
                ? 'rgba(255,255,255,0.15)' 
                : `${trendColor}15`
            }}
          >
            <Box sx={{ color: isPrimary ? '#fff' : trendColor, display: 'flex', alignItems: 'center' }}>
              {getTrendIcon()}
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: isPrimary ? '#fff' : trendColor,
                fontSize: '0.8125rem',
                fontWeight: 600
              }}
            >
              {change > 0 ? '+' : ''}{change}%
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isPrimary ? 'rgba(255,255,255,0.75)' : '#6B7280',
                fontSize: '0.7rem',
                ml: 0.5
              }}
            >
              к пр. периоду
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleKpiCard;
