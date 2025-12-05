import { Link } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper1 from './AuthWrapper1';
import AuthCardWrapper from './AuthCardWrapper';
import AuthLogin from '../auth-forms/AuthLogin';

import Logo from 'ui-component/Logo';
import AuthFooter from 'ui-component/cards/AuthFooter';

// ================================|| AUTH3 - LOGIN ||================================ //

export default function Login() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  return (
    <AuthWrapper1>
      <Grid container direction="column" sx={{ justifyContent: 'flex-end', minHeight: '100vh' }}>
        <Grid size={12}>
          <Grid container sx={{ justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 68px)' }}>
            <Grid sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
              <AuthCardWrapper>
                <Grid container spacing={3} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  {/* Логотип - увеличенный с отступом сверху */}
                  <Grid sx={{ mb: 3.5, pt: 1 }}>
                    <Link to="/" aria-label="logo">
                      <Box sx={{ 
                        transform: 'scale(1.25)', 
                        transformOrigin: 'center',
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <Logo />
                      </Box>
                    </Link>
                  </Grid>
                  
                  {/* Заголовок и подзаголовок */}
                  <Grid size={12}>
                    <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                      <Typography 
                        variant={downMD ? 'h3' : 'h2'} 
                        sx={{ 
                          color: 'text.primary',
                          fontWeight: 600,
                          fontSize: downMD ? '1.5rem' : '1.75rem'
                        }}
                      >
                        Добро пожаловать!
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#6B7280',
                          textAlign: 'center',
                          lineHeight: 1.6,
                          fontSize: '0.95rem'
                        }}
                      >
                        Введите ваши данные для входа
                      </Typography>
                    </Stack>
                  </Grid>
                  
                  {/* Форма входа */}
                  <Grid size={12}>
                    <AuthLogin />
                  </Grid>
                  
                  {/* Разделитель - очень светлый */}
                  <Grid size={12} sx={{ pt: 1.5 }}>
                    <Divider sx={{ borderColor: '#E8EBF1', opacity: 0.8 }} />
                  </Grid>
                  
                  {/* Ссылка на регистрацию */}
                  <Grid size={12}>
                    <Stack direction="row" sx={{ justifyContent: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                        Нет аккаунта?
                      </Typography>
                      <Typography 
                        component={Link} 
                        to="/auth/register" 
                        variant="body2" 
                        sx={{ 
                          color: 'primary.main',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Зарегистрироваться
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </AuthCardWrapper>
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ px: 3, my: 3 }} size={12}>
          <AuthFooter />
        </Grid>
      </Grid>
    </AuthWrapper1>
  );
}
