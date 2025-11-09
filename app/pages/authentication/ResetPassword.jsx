import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

// project imports
import AuthWrapper1 from './AuthWrapper1';
import AuthCardWrapper from './AuthCardWrapper';
import ResetPasswordForm from '../auth-forms/ResetPasswordForm';

import Logo from 'ui-component/Logo';
import AuthFooter from 'ui-component/cards/AuthFooter';

// ================================|| RESET PASSWORD PAGE ||================================ //

export default function ResetPassword() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const [searchParams] = useSearchParams();
  
  const [status, setStatus] = useState('loading'); // loading, valid, invalid, expired
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setError('Токен сброса пароля не найден');
      return;
    }

    validateToken(token);
  }, [token]);

  const validateToken = async (token) => {
    try {
      const response = await fetch('/api/password/validate-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('valid');
        setTokenData(result.data);
      } else {
        setStatus('invalid');
        setError(result.message || 'Недействительный токен');
      }
    } catch (err) {
      console.error('Token validation error:', err);
      setStatus('invalid');
      setError('Ошибка при проверке токена');
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Проверяем токен сброса пароля...
          </Typography>
        </Box>
      );
    }

    if (status === 'invalid') {
      return (
        <Box>
          <Typography variant="h4" gutterBottom color="error.main">
            Недействительная ссылка
          </Typography>
          
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>

          <Typography variant="body1" sx={{ mb: 3 }}>
            Возможные причины:
          </Typography>
          
          <Box component="ul" sx={{ mb: 3, pl: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Ссылка устарела (действует только 1 час)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Ссылка уже была использована
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Ссылка повреждена при копировании
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              fullWidth
              size="large"
              variant="contained"
              color="secondary"
              component={Link}
              to="/pages/forgot-password"
            >
              Запросить новую ссылку
            </Button>

            <Button
              fullWidth
              size="large"
              variant="outlined"
              component={Link}
              to="/pages/login"
            >
              Вернуться к входу
            </Button>
          </Box>
        </Box>
      );
    }

    if (status === 'valid') {
      return <ResetPasswordForm token={token} tokenData={tokenData} />;
    }

    return null;
  };

  return (
    <AuthWrapper1>
      <Grid container direction="column" sx={{ justifyContent: 'flex-end', minHeight: '100vh' }}>
        <Grid size={12}>
          <Grid container sx={{ justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 68px)' }}>
            <Grid sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
              <AuthCardWrapper>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid sx={{ mb: 3 }}>
                    <Link to="#" aria-label="logo">
                      <Logo />
                    </Link>
                  </Grid>
                  <Grid size={12}>
                    {status === 'valid' && (
                      <Grid container direction={{ xs: 'column-reverse', md: 'row' }} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Grid>
                          <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'secondary.main' }}>
                              Сброс пароля
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '16px', textAlign: { xs: 'center', md: 'inherit' } }}>
                              Создайте новый надежный пароль
                            </Typography>
                          </Stack>
                        </Grid>
                      </Grid>
                    )}
                  </Grid>
                  <Grid size={12}>
                    {renderContent()}
                  </Grid>
                  {status === 'valid' && (
                    <>
                      <Grid size={12}>
                        <Divider />
                      </Grid>
                      <Grid size={12}>
                        <Grid container direction="column" sx={{ alignItems: 'center' }} size={12}>
                          <Typography component={Link} to="/pages/login" variant="subtitle1" sx={{ textDecoration: 'none' }}>
                            Вспомнили пароль? Войти
                          </Typography>
                        </Grid>
                      </Grid>
                    </>
                  )}
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