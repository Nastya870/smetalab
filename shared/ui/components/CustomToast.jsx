import PropTypes from 'prop-types';
import { forwardRef } from 'react';

// material-ui
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

// icons
import {
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconX
} from '@tabler/icons-react';

// ==============================|| TOAST CONFIGS ||============================== //

const TOAST_CONFIGS = {
  success: {
    icon: IconCheck,
    bgColor: '#10B981',
    textColor: '#065F46',
    borderColor: '#10B981'
  },
  error: {
    icon: IconAlertCircle,
    bgColor: '#EF4444',
    textColor: '#991B1B',
    borderColor: '#EF4444'
  },
  warning: {
    icon: IconAlertTriangle,
    bgColor: '#F59E0B',
    textColor: '#92400E',
    borderColor: '#F59E0B'
  },
  info: {
    icon: IconInfoCircle,
    bgColor: '#3B82F6',
    textColor: '#1E40AF',
    borderColor: '#3B82F6'
  }
};

// ==============================|| CUSTOM TOAST NOTIFICATION ||============================== //

const CustomToast = forwardRef(({ id, message, variant = 'info', onClose }, ref) => {
  const theme = useTheme();
  const config = TOAST_CONFIGS[variant] || TOAST_CONFIGS.info;
  const Icon = config.icon;

  return (
    <Card
      ref={ref}
      sx={{
        width: 340,
        maxWidth: '100%',
        background: '#FFFFFF',
        borderRadius: '4px',
        borderLeft: `4px solid ${config.borderColor}`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            flexShrink: 0,
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.bgColor
          }}
        >
          <Icon size={20} stroke={2.5} />
        </Box>

        {/* Message */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 400,
              lineHeight: 1.4,
              fontSize: '0.8125rem'
            }}
          >
            {message}
          </Typography>
        </Box>

        {/* Close Button */}
        <IconButton
          size="small"
          onClick={() => onClose?.(id)}
          sx={{
            flexShrink: 0,
            color: theme.palette.text.secondary,
            padding: '4px',
            ml: 0.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              color: theme.palette.text.primary
            }
          }}
        >
          <IconX size={18} stroke={2} />
        </IconButton>
      </Box>
    </Card>
  );
});

CustomToast.displayName = 'CustomToast';

CustomToast.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  message: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func
};

export default CustomToast;
