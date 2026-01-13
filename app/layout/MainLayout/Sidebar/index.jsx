import { memo, useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
// import MenuCard from './MenuCard'; // Скрыт виджет "Get Extra Space"
import MenuList from '../MenuList';
import LogoSection from '../LogoSection';
import MiniDrawerStyled from './MiniDrawerStyled';

import useConfig from 'hooks/useConfig';
import { drawerWidth } from 'store/constant';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// ==============================|| SIDEBAR DRAWER ||============================== //

function Sidebar() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const { miniDrawer, mode } = useConfig();

  const logo = useMemo(
    () => (
      <Box sx={{ display: 'flex', p: 2, pt: 2 }}>
        <LogoSection />
      </Box>
    ),
    []
  );

  const drawer = useMemo(() => {
    const drawerContent = (
      <>
        {/* MenuCard скрыт - виджет "Get Extra Space" не нужен */}
        {/* <MenuCard /> */}
        <Stack direction="row" sx={{ justifyContent: 'center', mb: 1.5, mt: 1, pt: 1 }}>
          <Chip
            label={import.meta.env.VITE_APP_VERSION}
            size="small"
            sx={{
              bgcolor: '#F4F5F9',
              color: '#9CA3AF',
              fontSize: '0.65rem',
              fontWeight: 500,
              borderRadius: '6px',
              height: 20
            }}
          />
        </Stack>
      </>
    );

    let drawerSX = { paddingLeft: '0px', paddingRight: '0px', marginTop: '8px' };
    if (drawerOpen) drawerSX = { paddingLeft: '10px', paddingRight: '10px', marginTop: '0px', paddingTop: '4px' };

    return (
      <>
        {downMD ? (
          <Box sx={drawerSX}>
            <MenuList />
            {drawerOpen && drawerContent}
          </Box>
        ) : (
          <PerfectScrollbar style={{ height: 'calc(100vh - 88px)', ...drawerSX }}>
            <MenuList />
            {drawerOpen && drawerContent}
          </PerfectScrollbar>
        )}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downMD, drawerOpen, mode]);

  return (
    <Box component="nav" sx={{ flexShrink: { md: 0 }, width: { xs: 'auto', md: drawerWidth } }} aria-label="mailbox folders">
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handlerDrawerOpen(!drawerOpen)}
          sx={{
            '& .MuiDrawer-paper': {
              mt: downMD ? 0 : 11,
              zIndex: 1099,
              width: drawerWidth,
              bgcolor: 'background.default',
              color: 'text.primary',
              borderRight: 'none',
              height: 'auto'
            }
          }}
          ModalProps={{ keepMounted: true }}
          color="inherit"
        >
          {downMD && logo}
          {drawer}
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen}>
          <Box sx={{ mt: 8 }}>{drawer}</Box>
        </MiniDrawerStyled>
      )}
    </Box>
  );
}

export default memo(Sidebar);
