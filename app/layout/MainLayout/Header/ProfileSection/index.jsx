import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

// project imports
import Transitions from 'ui-component/extended/Transitions';
import useAuth from 'hooks/useAuth';
import { logout } from 'services/authService';

// assets
import User1 from 'assets/images/users/user-round.svg';
import { IconLogout, IconSettings, IconUser } from '@tabler/icons-react';

// ==============================|| PROFILE MENU ||============================== //

export default function ProfileSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [open, setOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

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

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // В случае ошибки всё равно перенаправляем на главную
      navigate('/');
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const handleSocialProfile = () => {
    setOpen(false);
    navigate('/app/account/profile');
  };

  // Получаем аватар пользователя
  const avatarSrc = user?.avatar_url || User1;

  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current.focus();
    }

    prevOpen.current = open;
  }, [open]);

  return (
    <>
      <Chip
        sx={{
          height: '40px',
          alignItems: 'center',
          borderRadius: '20px',
          bgcolor: '#F2F4F7',
          border: 'none',
          '& .MuiChip-label': {
            lineHeight: 0,
            pl: 1
          },
          '&:hover': {
            bgcolor: '#E8EBF0'
          }
        }}
        icon={
          <Avatar
            src={avatarSrc}
            alt="user-images"
            sx={{
              width: 32,
              height: 32,
              margin: '4px 0 4px 4px !important',
              cursor: 'pointer'
            }}
            ref={anchorRef}
            aria-controls={open ? 'menu-list-grow' : undefined}
            aria-haspopup="true"
            color="inherit"
          />
        }
        label={<IconSettings stroke={1.5} size="20px" color="#5E6278" />}
        ref={anchorRef}
        aria-controls={open ? 'menu-list-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        variant="outlined"
        aria-label="user-account"
      />
      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8]
            }
          }
        ]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions in={open} {...TransitionProps}>
              <Paper
                elevation={0}
                sx={{
                  width: 200,
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                  overflow: 'hidden'
                }}
              >
                {open && (
                  <List
                    component="nav"
                    sx={{
                      p: 0.5,
                      '& .MuiListItemButton-root': {
                        borderRadius: '6px',
                        py: 1,
                        px: 1.5,
                        '&:hover': {
                          bgcolor: '#F3F4F6'
                        }
                      }
                    }}
                  >
                    <ListItemButton onClick={handleSocialProfile}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <IconUser size={16} stroke={1.5} color="#6B7280" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography sx={{ fontSize: '0.875rem', color: '#111827' }}>
                            Профиль
                          </Typography>
                        }
                      />
                    </ListItemButton>
                    <ListItemButton onClick={handleLogoutClick}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <IconLogout size={16} stroke={1.5} color="#6B7280" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography sx={{ fontSize: '0.875rem', color: '#111827' }}>
                            Выйти
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </List>
                )}
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </Popper>

      {/* Диалог подтверждения выхода */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle id="logout-dialog-title" sx={{ pb: 1, fontSize: '1rem', fontWeight: 600 }}>
          Подтверждение выхода
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description" sx={{ color: '#4B5563' }}>
            Вы точно хотите выйти из системы?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button 
            onClick={handleLogoutCancel}
            sx={{ 
              color: '#6B7280',
              textTransform: 'none',
              '&:hover': { bgcolor: '#F3F4F6' }
            }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleLogoutConfirm} 
            variant="contained" 
            autoFocus
            sx={{
              bgcolor: '#DC2626',
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': { bgcolor: '#B91C1C' }
            }}
          >
            Выйти
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
