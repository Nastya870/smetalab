import { Link } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// project imports
import Logo from 'ui-component/Logo';
import AnimateButton from 'ui-component/extended/AnimateButton';

// assets
import CalculateIcon from '@mui/icons-material/Calculate';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// ==============================|| LANDING PAGE ||============================== //

export default function Landing() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.dark} 100%)`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Декоративные элементы фона */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          filter: 'blur(40px)'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          filter: 'blur(60px)'
        }}
      />

      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          {/* Левая часть - Контент */}
          <Grid item xs={12} md={6}>
            <Stack spacing={4}>
              {/* Логотип */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Logo />
                <Typography
                  variant="h4"
                  sx={{
                    color: 'white',
                    fontWeight: 700
                  }}
                >
                  Сметное приложение
                </Typography>
              </Box>

              {/* Заголовок */}
              <Typography
                variant="h1"
                sx={{
                  color: 'white',
                  fontWeight: 800,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  lineHeight: 1.2
                }}
              >
                Управляйте сметами{' '}
                <Box component="span" sx={{ color: theme.palette.warning.light }}>
                  легко и быстро
                </Box>
              </Typography>

              {/* Описание */}
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 400,
                  lineHeight: 1.6
                }}
              >
                Современное решение для создания, управления и контроля смет. 
                Автоматизируйте рутинные процессы и сосредоточьтесь на важном.
              </Typography>

              {/* Кнопки */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 2 }}>
                <AnimateButton>
                  <Button
                    component={Link}
                    to="/pages/login"
                    variant="contained"
                    size="large"
                    startIcon={<LoginIcon />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      backgroundColor: 'white',
                      color: theme.palette.primary.main,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Вход
                  </Button>
                </AnimateButton>

                <AnimateButton>
                  <Button
                    component={Link}
                    to="/pages/register"
                    variant="outlined"
                    size="large"
                    startIcon={<PersonAddIcon />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderColor: 'white',
                      color: 'white',
                      borderWidth: 2,
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 2,
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Регистрация
                  </Button>
                </AnimateButton>
              </Stack>

              {/* Дополнительная информация */}
              <Stack direction="row" spacing={4} sx={{ pt: 2 }}>
                <Box>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                    100%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Бесплатно
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                    24/7
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Доступность
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                    ∞
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Проектов
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Grid>

          {/* Правая часть - Иллюстрация */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 500,
                  height: 500,
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 3,
                  p: 4,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <CalculateIcon sx={{ fontSize: 120, color: 'white', opacity: 0.9 }} />
                <Typography
                  variant="h3"
                  align="center"
                  sx={{
                    color: 'white',
                    fontWeight: 700
                  }}
                >
                  Профессиональное управление сметами
                </Typography>
                <Typography
                  variant="body1"
                  align="center"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '1.1rem'
                  }}
                >
                  Создавайте, редактируйте и контролируйте сметы в одном месте
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
