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
  Speed,
  TableChart,
  CloudUpload,
  Group,
  Security,
  TrendingUp
} from '@mui/icons-material';

// Styled components
const FeaturesSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(10, 0),
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
  marginBottom: theme.spacing(8),
  color: theme.palette.text.secondary,
  maxWidth: '600px',
  margin: '0 auto'
}));

const FeatureCard = styled(Paper)(({ theme }) => ({
  padding: 0,
  textAlign: 'center',
  height: 280, // Фиксированная меньшая высота
  width: '100%', // Фиксированная ширина
  maxWidth: 320, // Максимальная ширина для одинакового размера
  margin: '0 auto', // Центрирование
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.shadows[12],
    borderColor: theme.palette.primary.main
  }
}));

const FeatureImageContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  height: 140, // Уменьшенная высота изображения
  overflow: 'hidden'
});

const FeatureImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
});

const FeatureContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between'
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 10,
  right: 10,
  width: 50,
  height: 50,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: 'white',
  zIndex: 2,
  boxShadow: theme.shadows[4]
}));

const FeatureTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: 600,
  color: theme.palette.text.primary,
  fontSize: '1.1rem'
}));

const FeatureDescription = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  lineHeight: 1.4,
  fontSize: '0.9rem'
}));

// Features data
const FEATURES = [
  {
    icon: Speed,
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    title: 'Быстрое создание смет',
    description: 'Создавайте подробные строительные сметы за минуты, а не часы. Автоматические расчеты и готовые шаблоны ускорят вашу работу.'
  },
  {
    icon: TableChart,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    title: 'Точные расчеты',
    description: 'Профессиональные алгоритмы расчета стоимости работ и материалов с учетом региональных коэффициентов и актуальных цен.'
  },
  {
    icon: CloudUpload,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    title: 'Облачное хранение',
    description: 'Все ваши сметы сохраняются в облаке. Работайте из любого места и не беспокойтесь о потере данных.'
  },
  {
    icon: Group,
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    title: 'Командная работа',
    description: 'Приглашайте коллег к совместной работе над проектами. Контролируйте доступы и отслеживайте изменения.'
  },
  {
    icon: Security,
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    title: 'Безопасность данных',
    description: 'Ваши проекты защищены современными методами шифрования. Регулярные резервные копии и надежная инфраструктура.'
  },
  {
    icon: TrendingUp,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    title: 'Аналитика и отчеты',
    description: 'Детальная аналитика по проектам, отчеты о прибыльности и экспорт данных в популярные форматы.'
  }
];

// ==============================|| FEATURES SECTION ||============================== //

const Features = () => {
  const theme = useTheme();

  return (
    <FeaturesSection id="features">
      <Container maxWidth="lg">
        <SectionTitle variant="h3" component="h2">
          Возможности Smeta Lab
        </SectionTitle>
        
        <SectionSubtitle variant="h6" component="p">
          Полный набор инструментов для профессионального сметного планирования. 
          Все что нужно для эффективной работы с проектами любой сложности.
        </SectionSubtitle>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Grid container spacing={3} sx={{ maxWidth: 1000, justifyContent: 'center' }}>
            {FEATURES.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                <FeatureCard elevation={2}>
                  <FeatureImageContainer>
                    <FeatureImage 
                      src={feature.image} 
                      alt={feature.title}
                      loading="lazy"
                    />
                    <IconWrapper>
                      <feature.icon sx={{ fontSize: 24 }} />
                    </IconWrapper>
                  </FeatureImageContainer>
                  <FeatureContent>
                    <FeatureTitle variant="h6" component="h3">
                      {feature.title}
                    </FeatureTitle>
                    
                    <FeatureDescription variant="body2">
                      {feature.description}
                    </FeatureDescription>
                  </FeatureContent>
                </FeatureCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </FeaturesSection>
  );
};

export default Features;