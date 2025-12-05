// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';

// project imports
import LogoSection from '../LogoSection';
import ProfileSection from './ProfileSection';
import NotificationSection from './NotificationSection';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// assets
import { IconMenu2 } from '@tabler/icons-react';

// ==============================|| MAIN NAVBAR / HEADER - MINIMAL SAAS STYLE ||============================== //

export default function Header() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  return (
    <>
      {/* logo & toggler button - separated */}
      <Box sx={{ 
        width: downMD ? 'auto' : 220, 
        display: 'flex', 
        alignItems: 'center',
        gap: 2.5  // 20px отступ между логотипом и бургером
      }}>
        <Box component="span" sx={{ display: { xs: 'none', md: 'block' } }}>
          <LogoSection />
        </Box>
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
            '&:hover': {
              bgcolor: 'primary.light',
              color: 'primary.dark'
            }
          }}
          onClick={() => handlerDrawerOpen(!drawerOpen)}
        >
          <IconMenu2 stroke={1.5} size="18px" />
        </Avatar>
      </Box>

      {/* spacer */}
      <Box sx={{ flexGrow: 1 }} />

      {/* right section - notifications & profile */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NotificationSection />
        <ProfileSection />
      </Box>
    </>
  );
}
