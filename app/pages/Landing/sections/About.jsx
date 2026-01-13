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
  CheckCircle,
  Timeline,
  Build
} from '@mui/icons-material';

// Styled components
const AboutSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(12, 0),
  backgroundColor: theme.palette.grey[50]
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



const BenefitCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateX(8px)',
    boxShadow: theme.shadows[8]
  }
}));

const BenefitIcon = styled(Box)(({ theme }) => ({
  minWidth: 48,
  height: 48,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: 'white'
}));

// Benefits data
const BENEFITS = [
  {
    icon: CheckCircle,
    title: 'Экономия времени до 70%',
    description: 'Автоматизация расчетов и готовые шаблоны значительно ускоряют процесс создания смет'
  },
  {
    icon: Timeline,
    title: 'Точность расчетов 99.9%',
    description: 'Профессиональные алгоритмы исключают человеческие ошибки в вычислениях'
  },
  {
    icon: Build,
    title: 'Соответствие стандартам',
    description: 'Полное соответствие российским нормативам и стандартам ценообразования'
  }
];

// ==============================|| ABOUT SECTION ||============================== //

const About = () => {
  const theme = useTheme();

  return (
    <AboutSection id="about">
      <Container maxWidth="lg">
        <SectionTitle variant="h3" component="h2">
          Почему выбирают Smeta Lab?
        </SectionTitle>
        
        <SectionSubtitle variant="h6" component="p">
          Мы создали платформу, которая объединяет современные технологии 
          с глубоким пониманием потребностей строительной индустрии.
        </SectionSubtitle>

        {/* Центрированные преимущества */}
        <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
          <Typography 
            variant="h4" 
            component="h3" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: theme.palette.text.primary,
              mb: 6,
              textAlign: 'center'
            }}
          >
            Результаты, которые говорят сами за себя
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            {BENEFITS.map((benefit, index) => (
              <Grid size={{ xs: 12, md: 6 }} key={index}>
                <BenefitCard elevation={2}>
                  <BenefitIcon>
                    <benefit.icon sx={{ fontSize: 24 }} />
                  </BenefitIcon>
                  <Box>
                    <Typography 
                      variant="h6" 
                      component="h4" 
                      gutterBottom
                      sx={{ fontWeight: 600 }}
                    >
                      {benefit.title}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      {benefit.description}
                    </Typography>
                  </Box>
                </BenefitCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </AboutSection>
  );
};

export default About;