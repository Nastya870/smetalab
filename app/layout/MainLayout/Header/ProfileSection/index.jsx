import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

// project imports
import UpgradePlanCard from './UpgradePlanCard';
import MainCard from 'ui-component/cards/MainCard';
import Transitions from 'ui-component/extended/Transitions';
import useConfig from 'hooks/useConfig';
import useAuth from 'hooks/useAuth';
import { logout } from 'services/authService';

// assets
import User1 from 'assets/images/users/user-round.svg';
import { IconLogout, IconSearch, IconSettings, IconUser } from '@tabler/icons-react';

// ==============================|| PROFILE MENU ||============================== //

export default function ProfileSection() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { borderRadius } = useConfig();
  const { user, tenant, getGreeting, getRoleDisplayName, loading } = useAuth();
  
  const [value, setValue] = useState('');
  const [selectedIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  /**
   * anchorRef is used on different components and specifying one type leads to other components throwing an error
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

  // Получаем имя пользователя и аватар
  const userName = user?.fullName || user?.email || 'Пользователь';
  const userRole = getRoleDisplayName();
  const greeting = getGreeting();
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
        placement="bottom"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 14]
            }
          }
        ]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions in={open} {...TransitionProps}>
              <Paper>
                {open && (
                  <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                    <Box sx={{ p: 2, pb: 0 }}>
                      <Stack>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Typography variant="h4">{greeting},</Typography>
                          <Typography component="span" variant="h4" sx={{ fontWeight: 400 }}>
                            {userName}
                          </Typography>
                        </Stack>
                        <Typography variant="subtitle2">{userRole}</Typography>
                      </Stack>
                      <OutlinedInput
                        sx={{ width: '100%', pr: 1, pl: 2, my: 2 }}
                        id="input-search-profile"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Search profile options"
                        startAdornment={
                          <InputAdornment position="start">
                            <IconSearch stroke={1.5} size="16px" />
                          </InputAdornment>
                        }
                        aria-describedby="search-helper-text"
                        slotProps={{ input: { 'aria-label': 'weight' } }}
                      />
                      <Divider />
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        py: 0,
                        height: '100%',
                        maxHeight: 'calc(100vh - 250px)',
                        overflowX: 'hidden',
                        '&::-webkit-scrollbar': { width: 5 }
                      }}
                    >
                      <UpgradePlanCard />
                      <Divider />
                      <List
                        component="nav"
                        sx={{
                          width: '100%',
                          maxWidth: 350,
                          minWidth: 300,
                          borderRadius: `${borderRadius}px`,
                          '& .MuiListItemButton-root': { mt: 0.5 }
                        }}
                      >
                        <ListItemButton
                          sx={{ borderRadius: `${borderRadius}px` }}
                          selected={selectedIndex === 0}
                          onClick={handleSocialProfile}
                        >
                          <ListItemIcon>
                            <IconUser stroke={1.5} size="20px" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Grid container spacing={1} sx={{ justifyContent: 'space-between' }}>
                                <Grid>
                                  <Typography variant="body2">Профиль</Typography>
                                </Grid>
                                <Grid>
                                  <Chip
                                    label="02"
                                    variant="filled"
                                    size="small"
                                    color="warning"
                                    sx={{ '& .MuiChip-label': { mt: 0.25 } }}
                                  />
                                </Grid>
                              </Grid>
                            }
                          />
                        </ListItemButton>
                        <ListItemButton
                          sx={{ borderRadius: `${borderRadius}px` }}
                          selected={selectedIndex === 1}
                          onClick={handleLogoutClick}
                        >
                          <ListItemIcon>
                            <IconLogout stroke={1.5} size="20px" />
                          </ListItemIcon>
                          <ListItemText primary={<Typography variant="body2">Выйти</Typography>} />
                        </ListItemButton>
                      </List>
                    </Box>
                  </MainCard>
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
      >
        <DialogTitle id="logout-dialog-title">
          Подтверждение выхода
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Вы точно хотите выйти из системы?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={handleLogoutCancel} color="primary" variant="outlined">
            Нет
          </Button>
          <Button onClick={handleLogoutConfirm} color="error" variant="contained" autoFocus>
            Да
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
