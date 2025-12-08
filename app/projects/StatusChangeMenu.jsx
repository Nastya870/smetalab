import { useState } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  IconChevronDown,
  IconClipboardList,
  IconFileCheck,
  IconPlayerPlay,
  IconX,
  IconCircleCheck
} from '@tabler/icons-react';

// project imports
import { getStatusText, getStatusColor } from './utils';

// ==============================|| STATUS CHANGE MENU ||============================== //

/**
 * Компонент для изменения статуса проекта
 * Отображает текущий статус и меню для выбора нового статуса
 */
const StatusChangeMenu = ({ currentStatus, onStatusChange, loading = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const buttonRef = useState(null);
  const open = Boolean(anchorEl);

  // Список доступных статусов
  const statuses = [
    { value: 'planning', label: 'Планирование', icon: IconClipboardList, color: 'warning' }, // Желтый
    { value: 'approval', label: 'Согласование', icon: IconFileCheck, color: 'warning' }, // Оранжевый (используем warning как ближайший)
    { value: 'in_progress', label: 'В работе', icon: IconPlayerPlay, color: 'secondary' }, // Фиолетовый
    { value: 'rejected', label: 'Отказ', icon: IconX, color: 'error' }, // Красный
    { value: 'completed', label: 'Завершён', icon: IconCircleCheck, color: 'success' } // Зеленый
  ];

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStatusSelect = async (newStatus) => {
    if (newStatus !== currentStatus) {
      await onStatusChange(newStatus);
    }
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        endIcon={loading ? <CircularProgress size={14} sx={{ color: '#6B7280' }} /> : <IconChevronDown size={16} />}
        onClick={handleClick}
        disabled={loading}
        sx={{
          minWidth: 160,
          height: 36,
          justifyContent: 'space-between',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          color: '#374151',
          bgcolor: '#FFFFFF',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          px: 1.5,
          '&:hover': {
            borderColor: '#D1D5DB',
            bgcolor: '#F9FAFB'
          },
          '&:focus': {
            borderColor: '#6366F1',
            borderWidth: '2px'
          }
        }}
      >
        <Chip 
          label={getStatusText(currentStatus)} 
          size="small"
          sx={{
            height: 24,
            fontSize: '0.75rem',
            fontWeight: 500,
            bgcolor: `${getStatusColor(currentStatus)}.lighter`,
            color: `${getStatusColor(currentStatus)}.dark`,
            '& .MuiChip-label': { px: 1 }
          }}
        />
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableRestoreFocus
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            minWidth: 180,
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }
        }}
      >
        {statuses.map((status) => {
          const StatusIcon = status.icon;
          const isActive = status.value === currentStatus;
          
          return (
            <MenuItem
              key={status.value}
              onClick={() => handleStatusSelect(status.value)}
              selected={isActive}
              sx={{
                py: 1,
                fontSize: '0.875rem',
                ...(isActive && {
                  bgcolor: '#F3F4F6',
                  '&:hover': { bgcolor: '#F3F4F6' }
                })
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <StatusIcon size={18} color="#6B7280" />
              </ListItemIcon>
              <ListItemText sx={{ '& .MuiTypography-root': { fontSize: '0.875rem' } }}>
                {status.label}
                {isActive && (
                  <Chip 
                    label="Текущий" 
                    size="small" 
                    sx={{ ml: 1, height: 18, fontSize: '0.625rem', bgcolor: '#E5E7EB', color: '#6B7280' }}
                  />
                )}
              </ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

StatusChangeMenu.propTypes = {
  currentStatus: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

export default StatusChangeMenu;
