import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  ButtonGroup,
  Grid,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Calculate,
  Description as DocumentIcon,
  Analytics
} from '@mui/icons-material';

// Styled components
const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: 'calc(100vh - 70px)',
  display: 'flex',
  alignItems: 'center',
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    zIndex: 1
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1
  }
}));

const ContentWrapper = styled(Container)(({ theme }) => ({
  position: 'relative',
  zIndex: 2,
  paddingTop: theme.spacing(8),
  paddingBottom: theme.spacing(8)
}));

const MainHeading = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(3),
  letterSpacing: '-0.02em',
  color: 'white',
  [theme.breakpoints.down('md')]: {
    fontSize: '3rem'
  }
}));

const SubHeading = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontSize: '0.9rem',
  color: 'white'
}));

const Description = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  lineHeight: 1.7,
  maxWidth: '600px',
  color: 'white',
  [theme.breakpoints.down('md')]: {
    fontSize: '1.1rem'
  }
}));

const StyledButtonGroup = styled(ButtonGroup)(({ theme }) => ({
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    width: '100%'
  }
}));

const PrimaryButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 4),
  fontSize: '1.1rem',
  fontWeight: 600,
  borderRadius: theme.spacing(3),
  textTransform: 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: 'translateY(-2px)'
  },
  transition: 'all 0.3s ease'
}));

const SecondaryButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 4),
  fontSize: '1.1rem',
  fontWeight: 600,
  borderRadius: theme.spacing(3),
  textTransform: 'none',
  backgroundColor: 'transparent',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.5)'
  }
}));

const FeatureCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: theme.spacing(2),
  color: 'white',
  textAlign: 'center',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)'
  }
}));

// ==============================|| HERO SECTION ||============================== //

const Hero = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleGetStarted = () => {
    navigate('/auth/login');
  };

  const handleLearnMore = () => {
    // Прокрутка к секции Features
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <HeroSection>
      <ContentWrapper maxWidth="xl">
        <Grid container spacing={4} alignItems="center">
          {/* Левая часть с текстом */}
          <Grid item xs={12} md={7}>
            <SubHeading variant="subtitle2">
              Профессиональная система сметного планирования
            </SubHeading>
            
            <MainHeading variant="h1" component="h1">
              Создавайте точные сметы быстрее чем когда-либо
            </MainHeading>
            
            <Description variant="h6" component="p">
              Smeta Lab — это современная платформа для создания строительных смет, 
              расчета стоимости проектов и управления материалами. 
              Автоматизируйте рутинные задачи и сосредоточьтесь на результате.
            </Description>

            <StyledButtonGroup variant="text" orientation={isMobile ? 'vertical' : 'horizontal'}>
              <PrimaryButton onClick={handleGetStarted} size="large">
                Начать работу бесплатно →
              </PrimaryButton>
              <SecondaryButton onClick={handleLearnMore} size="large">
                Узнать больше
              </SecondaryButton>
            </StyledButtonGroup>
          </Grid>

          {/* Правая часть с изображением */}
          <Grid item xs={12} md={5}>
            <Box sx={{ 
              position: 'relative',
              zIndex: 3,
              display: 'flex',
              justifyContent: 'center',
              mt: { xs: 4, md: 0 }
            }}>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="Строительный проект"
                sx={{
                  width: '100%',
                  maxWidth: 500,
                  height: 'auto',
                  borderRadius: 3,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                  border: '3px solid rgba(255, 255, 255, 0.2)'
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </ContentWrapper>
    </HeroSection>
  );
};

export default Hero;