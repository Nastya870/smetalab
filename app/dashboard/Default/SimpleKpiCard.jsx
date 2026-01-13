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
          ? '0 4px 12px 0 rgba(79, 70, 229, 0.2)'
          : '0 1px 3px 0 rgba(0,0,0,0.08)',
        borderRadius: '12px',
        border: isPrimary ? 'none' : '1px solid #E8EBF1',
        height: '100%',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: isPrimary
            ? '0 6px 16px 0 rgba(79, 70, 229, 0.3)'
            : '0 2px 8px 0 rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{
                color: isPrimary ? 'rgba(255,255,255,0.8)' : '#6B7280',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                mb: 0.5
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                color: isPrimary ? '#fff' : 'text.primary',
                fontSize: '1.5rem',
                fontWeight: 700,
                lineHeight: 1.1
              }}
            >
              {isLoading ? '—' : (typeof value === 'number' ? value.toLocaleString('ru-RU') : value)}
            </Typography>

            {/* Тренд под значением */}
            {change !== undefined && !isLoading && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.75
                }}
              >
                <Box sx={{ color: isPrimary ? '#fff' : trendColor, display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                  {getTrendIcon()}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: isPrimary ? '#fff' : trendColor,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {change > 0 ? '+' : ''}{change}%
                </Typography>
              </Box>
            )}
          </Box>

          {Icon && (
            <Box sx={{
              ml: 1.5,
              p: 1.25,
              borderRadius: '10px',
              bgcolor: isPrimary ? 'rgba(255,255,255,0.15)' : 'primary.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon
                sx={{
                  fontSize: 22,
                  color: isPrimary ? '#fff' : 'primary.main',
                }}
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SimpleKpiCard;
