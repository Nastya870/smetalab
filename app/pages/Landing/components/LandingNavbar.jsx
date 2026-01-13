import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  useTheme,
  useMediaQuery,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
  color: theme.palette.text.primary,
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
}));

const Logo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer'
}));

const LogoImage = styled('img')({
  height: 40,
  width: 'auto'
});

const NavButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    display: 'none'
  }
}));

const MobileMenuButton = styled(IconButton)(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'none'
  }
}));

const LoginButton = styled(Button)(({ theme }) => ({
  color: theme.palette.primary.main,
  borderColor: theme.palette.primary.main,
  '&:hover': {
    borderColor: theme.palette.primary.dark,
    backgroundColor: 'rgba(94, 109, 197, 0.04)'
  }
}));

const RegisterButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: 'white',
  '&:hover': {
    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`
  }
}));

// ==============================|| LANDING NAVBAR ||============================== //

const LandingNavbar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogin = () => {
    navigate('/auth/login');
    setMobileOpen(false);
  };

  const handleRegister = () => {
    navigate('/auth/register');
    setMobileOpen(false);
  };

  const handleLogoClick = () => {
    window.location.href = '/';
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          Smeta Lab
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => scrollToSection('features')}>
            <ListItemText primary="Возможности" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => scrollToSection('about')}>
            <ListItemText primary="О продукте" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => scrollToSection('contacts')}>
            <ListItemText primary="Контакты" />
          </ListItemButton>
        </ListItem>
        <Divider sx={{ my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogin}>
            <ListItemText primary="Войти" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleRegister}>
            <ListItemText primary="Регистрация" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <StyledAppBar position="fixed" elevation={0}>
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 64, sm: 70 } }}>
            {/* Logo */}
            <Logo onClick={handleLogoClick}>
              <LogoImage 
                src="/smeta-lab-logo.png" 
                alt="Smeta Lab"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  fontSize: { xs: '1.2rem', sm: '1.4rem' }
                }}
              >
                Smeta Lab
              </Typography>
            </Logo>

            {/* Desktop Navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {!isMobile && (
                <Box sx={{ display: 'flex', gap: 3, mr: 2 }}>
                  <Button 
                    color="inherit" 
                    onClick={() => scrollToSection('features')}
                    sx={{ textTransform: 'none' }}
                  >
                    Возможности
                  </Button>
                  <Button 
                    color="inherit" 
                    onClick={() => scrollToSection('about')}
                    sx={{ textTransform: 'none' }}
                  >
                    О продукте
                  </Button>
                  <Button 
                    color="inherit" 
                    onClick={() => scrollToSection('contacts')}
                    sx={{ textTransform: 'none' }}
                  >
                    Контакты
                  </Button>
                </Box>
              )}

              <NavButtons>
                <LoginButton 
                  variant="outlined" 
                  onClick={handleLogin}
                  sx={{ textTransform: 'none' }}
                >
                  Войти
                </LoginButton>
                <RegisterButton 
                  variant="contained" 
                  onClick={handleRegister}
                  sx={{ textTransform: 'none' }}
                >
                  Начать бесплатно
                </RegisterButton>
              </NavButtons>

              {/* Mobile menu button */}
              <MobileMenuButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </MobileMenuButton>
            </Box>
          </Toolbar>
        </Container>
      </StyledAppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>

      {/* Spacer to push content below fixed navbar */}
      <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }} />
    </>
  );
};

export default LandingNavbar;