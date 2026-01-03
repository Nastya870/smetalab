import PropTypes from 'prop-types';

// material-ui
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  Chip,
  Box,
  Typography,
  CardActions,
  LinearProgress,
  Stack,
  IconButton
} from '@mui/material';
import { 
  IconBriefcase, 
  IconCalendar, 
  IconEye, 
  IconEdit, 
  IconTrash, 
  IconUser, 
  IconMapPin, 
  IconFileText,
  IconTool
} from '@tabler/icons-react';

// project imports
import { getStatusColor, getStatusText, formatDate } from './utils';

// ==============================|| Цвета для иконок статусов - осветлённые ||============================== //
const statusIconColors = {
  planning: { bg: '#FEF9E7', icon: '#D97706' },
  approval: { bg: '#EBF4FF', icon: '#2563EB' },
  in_progress: { bg: '#F3F0FF', icon: '#7C3AED' },
  rejected: { bg: '#FEF2F2', icon: '#DC2626' },
  completed: { bg: '#ECFDF5', icon: '#059669' },
  active: { bg: '#F3F0FF', icon: '#7C3AED' },
  default: { bg: '#F9FAFB', icon: '#6B7280' }
};

// ==============================|| Цвета прогресс-бара по статусу ||============================== //
const getProgressColor = (status, progress) => {
  if (progress === 100) return '#10B981';
  switch (status) {
    case 'planning': return '#F59E0B';
    case 'approval': return '#3B82F6';
    case 'in_progress': return '#8B5CF6';
    case 'rejected': return '#EF4444';
    case 'completed': return '#10B981';
    default: return '#6366F1';
  }
};

// ==============================|| Константы для единообразия ||============================== //
const ICON_SIZE = 18;
const ICON_COLOR = '#4B5563';
const ICON_MARGIN_RIGHT = 8;

// ==============================|| PROJECT CARD - STRUCTURED PREMIUM ||============================== //

const ProjectCard = ({ project, onOpen, onEdit, onDelete, sx = {}, optimistic = false }) => {
  const statusColors = statusIconColors[project.status] || statusIconColors.default;
  const progressColor = getProgressColor(project.status, project.progress);
  
  // Хелпер для отображения пустых значений - всегда показывает "—" если пусто
  const displayValue = (value) => {
    if (!value || value === 'Не указана' || value === 'Не указан' || value.trim() === '') {
      return '—';
    }
    return value;
  };

  // Хелпер для дат
  const displayDate = (date) => {
    const formatted = formatDate(date);
    if (!formatted || formatted === 'Не указана') {
      return '—';
    }
    return formatted;
  };
  
  return (
    <Card
      sx={{
        height: '100%',
        minHeight: 380,
        maxWidth: 320,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        border: '1px solid',
        borderColor: '#E5E7EB',
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          transform: 'translateY(-1px)',
          borderColor: '#D1D5DB'
        },
        ...sx
      }}
    >
      {/* Optimistic UI indicator */}
      {optimistic && (
        <Chip
          label="Сохраняется..."
          size="small"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 1,
            height: 18,
            fontSize: '0.625rem',
            bgcolor: '#FEF3C7',
            color: '#92400E',
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 }
            }
          }}
        />
      )}

      {/* Header с иконкой и статусом */}
      <CardHeader
        avatar={
          <Box 
            sx={{ 
              width: 38, 
              height: 38,
              borderRadius: '8px',
              bgcolor: statusColors.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconBriefcase size={18} style={{ color: statusColors.icon }} />
          </Box>
        }
        title={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography 
              variant="subtitle2" 
              component="div" 
              sx={{ 
                fontWeight: 600,
                fontSize: '0.8125rem',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                color: '#111827'
              }}
            >
              {project.objectName}
            </Typography>
            <Chip 
              label={getStatusText(project.status)} 
              size="small" 
              sx={{ 
                height: 18, 
                fontSize: '0.5625rem',
                fontWeight: 500,
                bgcolor: project.status === 'rejected' ? 'rgba(239, 68, 68, 0.08)' : `${getStatusColor(project.status)}.light`,
                color: project.status === 'rejected' ? '#DC2626' : `${getStatusColor(project.status)}.dark`,
                borderRadius: '4px',
                alignSelf: 'flex-start',
                '& .MuiChip-label': {
                  px: 0.625,
                  py: 0
                }
              }} 
            />
          </Box>
        }
        sx={{ pb: 1, pt: 1.25, px: 1.5 }}
      />

      <Divider sx={{ borderColor: '#F3F4F6' }} />

      {/* Информация - структурированные блоки */}
      <CardContent sx={{ flexGrow: 1, py: 1.5, px: 1.5 }}>
        <Stack spacing={1.5}>
          
          {/* Блок 1: Заказчик / Договор / Подрядчик */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Заказчик */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <IconUser size={ICON_SIZE} style={{ marginRight: ICON_MARGIN_RIGHT, marginTop: 1, flexShrink: 0, color: ICON_COLOR }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem', display: 'block', lineHeight: 1.2, mb: 0.25 }}>
                  Заказчик
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#374151'
                  }}
                >
                  {displayValue(project.client)}
                </Typography>
              </Box>
            </Box>

            {/* Договор - всегда отображается */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <IconFileText size={ICON_SIZE} style={{ marginRight: ICON_MARGIN_RIGHT, marginTop: 1, flexShrink: 0, color: ICON_COLOR }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem', display: 'block', lineHeight: 1.2, mb: 0.25 }}>
                  Договор
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: project.contractNumber ? 600 : 400,
                    fontSize: '0.8125rem',
                    lineHeight: 1.3,
                    color: project.contractNumber ? '#6366F1' : '#9CA3AF'
                  }}
                >
                  {displayValue(project.contractNumber)}
                </Typography>
              </Box>
            </Box>

            {/* Подрядчик */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <IconTool size={ICON_SIZE} style={{ marginRight: ICON_MARGIN_RIGHT, marginTop: 1, flexShrink: 0, color: ICON_COLOR }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem', display: 'block', lineHeight: 1.2, mb: 0.25 }}>
                  Подрядчик
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#374151'
                  }}
                >
                  {displayValue(project.contractor)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Блок 2: Адрес */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', pt: 0.5, borderTop: '1px solid #F3F4F6' }}>
            <IconMapPin size={ICON_SIZE} style={{ marginRight: ICON_MARGIN_RIGHT, marginTop: 1, flexShrink: 0, color: ICON_COLOR }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem', display: 'block', lineHeight: 1.2, mb: 0.25 }}>
                Адрес
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  color: '#374151'
                }}
              >
                {displayValue(project.address)}
              </Typography>
            </Box>
          </Box>

          {/* Блок 3: Даты - Начало / Окончание */}
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 3,
              pt: 0.5,
              borderTop: '1px solid #F3F4F6'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <IconCalendar size={ICON_SIZE} style={{ marginRight: ICON_MARGIN_RIGHT, marginTop: 1, flexShrink: 0, color: ICON_COLOR }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem', display: 'block', lineHeight: 1.2, mb: 0.25 }}>
                  Начало
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', whiteSpace: 'nowrap', color: '#374151' }}>
                  {displayDate(project.startDate)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <IconCalendar size={ICON_SIZE} style={{ marginRight: ICON_MARGIN_RIGHT, marginTop: 1, flexShrink: 0, color: ICON_COLOR }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem', display: 'block', lineHeight: 1.2, mb: 0.25 }}>
                  Окончание
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', whiteSpace: 'nowrap', color: '#374151' }}>
                  {displayDate(project.endDate)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Stack>
      </CardContent>

      {/* Прогресс - фиксированный формат */}
      <Box sx={{ px: 1.5, pb: 1.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#6B7280', 
              fontSize: '0.75rem', 
              fontWeight: 500,
              lineHeight: 1
            }}
          >
            Прогресс
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '0.75rem',
              color: project.progress === 0 ? '#9CA3AF' : progressColor,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1
            }}
          >
            {project.progress}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={project.progress}
          aria-label={`Прогресс проекта ${project.progress}%`}
          aria-valuenow={project.progress}
          sx={{ 
            height: 6, 
            borderRadius: '3px',
            bgcolor: '#E5E7EB',
            '& .MuiLinearProgress-bar': {
              borderRadius: '3px',
              bgcolor: progressColor
            }
          }} 
        />
      </Box>

      <Divider sx={{ borderColor: '#F3F4F6' }} />

      {/* Кнопки - выровнены по одной линии с фиксированным padding */}
      <CardActions sx={{ p: 1.5, gap: 0.75, justifyContent: 'space-between' }}>
        <Button 
          size="small" 
          startIcon={<IconEye size={14} />} 
          onClick={() => onOpen(project)} 
          variant="contained" 
          disableElevation
          sx={{ 
            flex: 1, 
            height: 32,
            fontSize: '0.8125rem', 
            fontWeight: 500,
            borderRadius: '6px',
            textTransform: 'none',
            bgcolor: '#6366F1',
            '&:hover': {
              bgcolor: '#4F46E5'
            }
          }}
        >
          Открыть
        </Button>
        <IconButton
          size="small"
          onClick={() => onEdit(project)}
          sx={{ 
            width: 32, 
            height: 32,
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            color: '#6B7280',
            '&:hover': {
              bgcolor: '#F3F4F6',
              borderColor: '#D1D5DB',
              color: '#4B5563'
            }
          }}
        >
          <IconEdit size={16} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDelete(project.id)}
          sx={{ 
            width: 32, 
            height: 32,
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            color: '#F87171',
            '&:hover': {
              bgcolor: '#FEF2F2',
              borderColor: '#FECACA'
            }
          }}
        >
          <IconTrash size={16} />
        </IconButton>
      </CardActions>
    </Card>
  );
};

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    objectName: PropTypes.string.isRequired,
    client: PropTypes.string.isRequired,
    contractor: PropTypes.string.isRequired,
    address: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    progress: PropTypes.number.isRequired,
    contractNumber: PropTypes.string,
    _optimistic: PropTypes.bool
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  sx: PropTypes.object,
  optimistic: PropTypes.bool
};

export default ProjectCard;
