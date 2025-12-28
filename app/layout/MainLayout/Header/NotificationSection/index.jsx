import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import Transitions from 'ui-component/extended/Transitions';
import NotificationList from './NotificationList';
import { useNotifications } from 'shared/lib/contexts/NotificationsContext';

// assets
import { IconBell } from '@tabler/icons-react';

// notification status options
const status = [
  {
    value: 'all',
    label: 'All Notification'
  },
  {
    value: 'new',
    label: 'New'
  },
  {
    value: 'unread',
    label: 'Unread'
  },
  {
    value: 'other',
    label: 'Other'
  }
];

// ==============================|| NOTIFICATION ||============================== //

export default function NotificationSection() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const { unreadCount, markAllAsRead, notifications } = useNotifications();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('all');

  /**
   * anchorRef is used on different componets and specifying one type leads to other components throwing an error
   * */
  const anchorRef = useRef(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current.focus();
    }
    prevOpen.current = open;
  }, [open]);

  const handleChange = (event) => {
    event?.target.value && setValue(event?.target.value);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <>
      <Badge
        badgeContent={unreadCount}
        color="error"
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.65rem',
            height: 18,
            minWidth: 18,
            fontWeight: 700
          }
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 34,
            height: 34,
            bgcolor: '#F2F4F7',
            color: 'primary.main',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all .2s ease-in-out',
            '&[aria-controls="menu-list-grow"],&:hover': {
              bgcolor: 'primary.light',
              color: 'primary.dark'
            }
          }}
          ref={anchorRef}
          aria-controls={open ? 'menu-list-grow' : undefined}
          aria-haspopup="true"
          onClick={handleToggle}
        >
          <IconBell stroke={1.5} size="18px" />
        </Avatar>
      </Badge>
      <Popper
        placement={downMD ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [downMD ? 5 : 0, 20]
            }
          }
        ]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions position={downMD ? 'top' : 'top-right'} in={open} {...TransitionProps}>
              <Paper>
                {open && (
                  <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                    <Grid container direction="column" spacing={2}>
                      <Grid size={12}>
                        <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 2, px: 2 }}>
                          <Grid>
                            <Stack direction="row" spacing={2}>
                              <Typography variant="subtitle1">Уведомления</Typography>
                              {unreadCount > 0 && (
                                <Chip 
                                  size="small" 
                                  label={unreadCount} 
                                  sx={{ 
                                    color: 'background.default', 
                                    bgcolor: 'warning.dark',
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }} 
                                />
                              )}
                            </Stack>
                          </Grid>
                          <Grid>
                            <Typography
                              component="span"
                              variant="subtitle2"
                              onClick={handleMarkAllAsRead}
                              sx={{
                                color: 'primary.main',
                                cursor: 'pointer',
                                '&:hover': {
                                  textDecoration: 'underline'
                                }
                              }}
                            >
                              Отметить все
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid size={12}>
                        <Box
                          sx={{
                            height: '100%',
                            maxHeight: 'calc(100vh - 140px)',
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { 
                              width: 6
                            },
                            '&::-webkit-scrollbar-thumb': {
                              bgcolor: 'rgba(0,0,0,0.2)',
                              borderRadius: '10px'
                            }
                          }}
                        >
                          <NotificationList />
                        </Box>
                      </Grid>
                    </Grid>
                  </MainCard>
                )}
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
}
