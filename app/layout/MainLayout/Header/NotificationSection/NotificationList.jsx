import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NOTIFICATION_TYPES } from 'shared/lib/contexts/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

// icons
import {
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconX,
  IconBriefcase,
  IconFileText,
  IconPackage,
  IconTool,
  IconShoppingCart,
  IconUser
} from '@tabler/icons-react';

// ==============================|| NOTIFICATION CONFIG ||============================== //

const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.SUCCESS]: {
    icon: IconCheck,
    bgColor: '#10B981',
    color: '#ECFDF5'
  },
  [NOTIFICATION_TYPES.ERROR]: {
    icon: IconAlertCircle,
    bgColor: '#EF4444',
    color: '#FEF2F2'
  },
  [NOTIFICATION_TYPES.WARNING]: {
    icon: IconAlertTriangle,
    bgColor: '#F59E0B',
    color: '#FFFBEB'
  },
  [NOTIFICATION_TYPES.INFO]: {
    icon: IconInfoCircle,
    bgColor: '#3B82F6',
    color: '#EFF6FF'
  }
};

const CATEGORY_ICONS = {
  project: IconBriefcase,
  estimate: IconFileText,
  material: IconPackage,
  work: IconTool,
  purchase: IconShoppingCart,
  user: IconUser,
  system: IconInfoCircle
};

// ==============================|| NOTIFICATION LIST ITEM WRAPPER ||============================== //

function ListItemWrapper({ children, onClick, read }) {
  const theme = useTheme();

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        position: 'relative',
        bgcolor: read ? 'transparent' : alpha(theme.palette.primary.light, 0.05),
        transition: 'background-color 0.2s ease',
        '&:hover': {
          bgcolor: alpha(theme.palette.grey[200], 0.3),
          '& .notification-message': {
            color: theme.palette.primary.main,
            textDecoration: 'underline'
          }
        },
        '&::before': read
          ? {}
          : {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '4px',
              height: '60%',
              bgcolor: 'primary.main',
              borderRadius: '0 4px 4px 0'
            }
      }}
    >
      {children}
    </Box>
  );
}

ListItemWrapper.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  read: PropTypes.bool
};

// ==============================|| NOTIFICATION LIST ||============================== //

export default function NotificationList() {
  const { notifications, markAsRead, removeNotification } = useNotifications();
  const theme = useTheme();
  const navigate = useNavigate();

  if (notifications.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          color: theme.palette.text.secondary
        }}
      >
        <IconInfoCircle size={48} stroke={1.5} style={{ opacity: 0.3, marginBottom: 16 }} />
        <Typography variant="body2">Нет уведомлений</Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', maxWidth: { xs: 300, md: 380 }, py: 0 }}>
      {notifications.map((notification) => {
        const config = NOTIFICATION_CONFIG[notification.type];
        const Icon = config?.icon || IconInfoCircle;
        const CategoryIcon = CATEGORY_ICONS[notification.category] || IconInfoCircle;

        return (
          <ListItemWrapper
            key={notification.id}
            onClick={() => {
              if (!notification.read) {
                markAsRead(notification.id);
              }
              if (notification.link) {
                navigate(notification.link);
              }
            }}
            read={notification.read}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              {/* Avatar с иконкой */}
              <ListItemAvatar sx={{ minWidth: 48 }}>
                <Avatar
                  sx={{
                    bgcolor: config?.color || '#EFF6FF',
                    color: config?.bgColor || '#3B82F6',
                    width: 40,
                    height: 40
                  }}
                >
                  <Icon size={20} stroke={2} />
                </Avatar>
              </ListItemAvatar>

              {/* Контент уведомления */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                  <CategoryIcon size={14} stroke={2} style={{ opacity: 0.6 }} />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      color: theme.palette.text.primary
                    }}
                  >
                    {notification.title}
                  </Typography>
                </Stack>

                <Typography
                  variant="body2"
                  className="notification-message"
                  sx={{
                    fontSize: '0.8125rem',
                    color: theme.palette.text.secondary,
                    mb: 1,
                    lineHeight: 1.5,
                    transition: 'color 0.2s ease, text-decoration 0.2s ease',
                    fontWeight: notification.link ? 500 : 400
                  }}
                >
                  {notification.message}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.disabled,
                      fontSize: '0.75rem'
                    }}
                  >
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: ru
                    })}
                  </Typography>

                  {!notification.read && (
                    <Chip
                      label="Новое"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        bgcolor: theme.palette.primary.main,
                        color: '#fff',
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Кнопка удаления */}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                sx={{
                  opacity: 0.5,
                  '&:hover': {
                    opacity: 1,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main
                  }
                }}
              >
                <IconX size={16} />
              </IconButton>
            </Stack>
          </ListItemWrapper>
        );
      })}
    </List>
  );
}
