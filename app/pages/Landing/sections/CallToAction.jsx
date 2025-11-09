import React from 'react';
import {
  Box,
  Container,
  Typography,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components
const CtaSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(12, 0),
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: 'white',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.15,
    zIndex: 1
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.2)',
    zIndex: 1
  }
}));

const CtaTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  fontWeight: 'bold',
  color: 'white',
  [theme.breakpoints.down('md')]: {
    fontSize: '2.5rem'
  }
}));

const CtaDescription = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(5),
  color: 'white',
  maxWidth: '600px',
  margin: '0 auto',
  lineHeight: 1.6
}));

// ==============================|| CALL TO ACTION SECTION ||============================== //

const CallToAction = () => {
  return (
    <CtaSection>
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2 }}>
        <CtaTitle variant="h3" component="h2">
          Готовы начать создавать сметы профессионально?
        </CtaTitle>
        
        <CtaDescription variant="h6" component="p" sx={{ mb: 0 }}>
          Присоединяйтесь к тысячам специалистов, которые уже используют Smeta Lab 
          для создания точных смет и эффективного управления проектами.
        </CtaDescription>
      </Container>
    </CtaSection>
  );
};

export default CallToAction;