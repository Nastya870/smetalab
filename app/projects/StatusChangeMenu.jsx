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
    handleClose();
    
    if (newStatus !== currentStatus) {
      await onStatusChange(newStatus);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        endIcon={loading ? <CircularProgress size={16} /> : <IconChevronDown size={18} />}
        onClick={handleClick}
        disabled={loading}
        sx={{
          minWidth: 200, // Уменьшенная ширина
          justifyContent: 'space-between',
          borderColor: `${getStatusColor(currentStatus)}.main`,
          color: `${getStatusColor(currentStatus)}.main`,
          '&:hover': {
            borderColor: `${getStatusColor(currentStatus)}.dark`,
            bgcolor: `${getStatusColor(currentStatus)}.lighter`
          }
        }}
      >
        <Chip 
          label={getStatusText(currentStatus)} 
          color={getStatusColor(currentStatus)} 
          size="small"
        />
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220
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
                py: 1.5,
                ...(isActive && {
                  bgcolor: `${status.color}.lighter`,
                  '&:hover': {
                    bgcolor: `${status.color}.lighter`
                  }
                })
              }}
            >
              <ListItemIcon>
                <StatusIcon size={20} />
              </ListItemIcon>
              <ListItemText>
                {status.label}
                {isActive && (
                  <Chip 
                    label="Текущий" 
                    size="small" 
                    color={status.color}
                    sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
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
