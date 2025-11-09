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
  Avatar,
  Typography,
  CardActions,
  LinearProgress,
  Stack
} from '@mui/material';
import { 
  IconBriefcase, 
  IconCalendar, 
  IconEye, 
  IconEdit, 
  IconTrash, 
  IconUser, 
  IconMapPin, 
  IconFileText 
} from '@tabler/icons-react';

// project imports
import { getStatusColor, getStatusText, formatDate } from './utils';

// ==============================|| PROJECT CARD ||============================== //

const ProjectCard = ({ project, onOpen, onEdit, onDelete, sx = {}, optimistic = false }) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          transform: 'translateY(-4px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        },
        ...sx
      }}
    >
      {/* Optimistic UI indicator */}
      {optimistic && (
        <Chip
          label="Сохраняется..."
          size="small"
          color="warning"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1,
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 }
            }
          }}
        />
      )}

      {/* Header с аватаром и статусом */}
      <CardHeader
        avatar={
          <Avatar 
            sx={{ 
              bgcolor: getStatusColor(project.status) + '.main',
              width: 44, 
              height: 44 
            }}
          >
            <IconBriefcase size={22} />
          </Avatar>
        }
        title={
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {project.objectName}
          </Typography>
        }
        subheader={
          <Chip 
            label={getStatusText(project.status)} 
            color={getStatusColor(project.status)} 
            size="small" 
            sx={{ mt: 0.75, height: 22, fontSize: '0.75rem' }} 
          />
        }
        sx={{ pb: 1.5, pt: 2 }}
      />

      {/* Progress bar вместо блока */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Прогресс выполнения
          </Typography>
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {project.progress}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={project.progress} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: project.progress === 100 
                ? 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)'
                : 'linear-gradient(90deg, #2196f3 0%, #42a5f5 100%)'
            }
          }} 
        />
      </Box>

      <Divider />

      {/* Компактная информация с иконками */}
      <CardContent sx={{ flexGrow: 1, py: 2, px: 2 }}>
        <Stack spacing={1.5}>
          {/* Заказчик */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <IconUser size={18} style={{ marginTop: 2, flexShrink: 0, opacity: 0.6 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                Заказчик
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight={500}
                sx={{ 
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {project.client}
              </Typography>
            </Box>
          </Box>

          {/* Номер договора */}
          {project.contractNumber && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <IconFileText size={18} style={{ marginTop: 2, flexShrink: 0, opacity: 0.6 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                  Договор
                </Typography>
                <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ lineHeight: 1.4 }}>
                  {project.contractNumber}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Подрядчик */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <IconBriefcase size={18} style={{ marginTop: 2, flexShrink: 0, opacity: 0.6 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                Подрядчик
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {project.contractor}
              </Typography>
            </Box>
          </Box>

          {/* Адрес */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <IconMapPin size={18} style={{ marginTop: 2, flexShrink: 0, opacity: 0.6 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                Адрес
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {project.address}
              </Typography>
            </Box>
          </Box>

          {/* Даты в одну строку */}
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 2, 
              pt: 1,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconCalendar size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                  Начало
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {formatDate(project.startDate)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconCalendar size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                  Окончание
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {formatDate(project.endDate)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Stack>
      </CardContent>

      <Divider />

      {/* Компактные кнопки */}
      <CardActions sx={{ p: 1.5, gap: 1, justifyContent: 'space-between' }}>
        <Button 
          size="small" 
          startIcon={<IconEye size={16} />} 
          onClick={() => onOpen(project)} 
          variant="contained" 
          color="primary"
          sx={{ flex: 1, fontSize: '0.75rem', py: 0.75 }}
        >
          Открыть
        </Button>
        <Button 
          size="small" 
          startIcon={<IconEdit size={16} />} 
          onClick={() => onEdit(project)} 
          variant="outlined" 
          color="warning"
          sx={{ minWidth: 40, px: 1 }}
        >
        </Button>
        <Button 
          size="small" 
          startIcon={<IconTrash size={16} />} 
          onClick={() => onDelete(project.id)} 
          variant="outlined" 
          color="error"
          sx={{ minWidth: 40, px: 1 }}
        >
        </Button>
      </CardActions>
    </Card>
  );
};

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired, // Phase 3: Поддержка temp-ID (string)
    objectName: PropTypes.string.isRequired,
    client: PropTypes.string.isRequired,
    contractor: PropTypes.string.isRequired,
    address: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    progress: PropTypes.number.isRequired,
    contractNumber: PropTypes.string, // Номер договора (опционально для старых проектов)
    _optimistic: PropTypes.bool // Phase 3: Optimistic flag
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  sx: PropTypes.object, // Phase 3: Custom styles
  optimistic: PropTypes.bool // Phase 3: Optimistic visual indicator
};

export default ProjectCard;
