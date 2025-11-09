import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Email,
  Phone,
  LocationOn
} from '@mui/icons-material';

// Styled components
const ContactSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(12, 0),
  backgroundColor: theme.palette.background.default
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(2),
  fontWeight: 'bold',
  color: theme.palette.text.primary
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  color: theme.palette.text.secondary,
  maxWidth: '600px',
  margin: '0 auto',
  marginBottom: theme.spacing(8)
}));

const ContactCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8]
  }
}));

const ContactIcon = styled(Box)(({ theme }) => ({
  width: 60,
  height: 60,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: 'white'
}));



// Contact data
const CONTACT_INFO = [
  {
    icon: Email,
    title: 'Электронная почта',
    content: 'info@smeta-lab.ru',
    description: 'Напишите нам, мы ответим в течение 24 часов'
  },
  {
    icon: Phone,
    title: 'Телефон',
    content: '+7 (495) 123-45-67',
    description: 'Звоните в рабочее время для консультации'
  },
  {
    icon: LocationOn,
    title: 'Офис',
    content: 'Москва, ул. Примерная, 123',
    description: 'Приходите к нам для личной встречи'
  }
];

// ==============================|| CONTACT SECTION ||============================== //

const Contact = () => {
  const theme = useTheme();

  return (
    <ContactSection id="contacts">
      <Container maxWidth="lg">
        <SectionTitle variant="h3" component="h2">
          Свяжитесь с нами
        </SectionTitle>
        
        <SectionSubtitle variant="h6" component="p">
          Готовы начать работу с Smeta Lab? Наша команда поможет вам 
          внедрить систему и ответит на все вопросы.
        </SectionSubtitle>

        <Grid container spacing={6}>
          {/* Контактная информация - в один ряд */}
          <Grid item xs={12}>
            <Grid container spacing={4} sx={{ mb: 6, justifyContent: 'center' }}>
              {CONTACT_INFO.map((contact, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <ContactCard elevation={2}>
                    <ContactIcon>
                      <contact.icon sx={{ fontSize: 30 }} />
                    </ContactIcon>
                    
                    <Typography 
                      variant="h6" 
                      component="h3" 
                      gutterBottom
                      sx={{ fontWeight: 600 }}
                    >
                      {contact.title}
                    </Typography>
                    
                    <Typography 
                      variant="body1" 
                      gutterBottom
                      sx={{ 
                        fontWeight: 500,
                        color: theme.palette.primary.main
                      }}
                    >
                      {contact.content}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ lineHeight: 1.5 }}
                    >
                      {contact.description}
                    </Typography>
                  </ContactCard>
                </Grid>
              ))}
            </Grid>
          </Grid>


        </Grid>
      </Container>
    </ContactSection>
  );
};

export default Contact;