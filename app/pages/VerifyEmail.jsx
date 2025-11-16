import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack
} from '@mui/material';
import {
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as LoadingIcon
} from '@mui/icons-material';
import emailAPI from 'api/email';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Токен верификации не найден в URL');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      setStatus('loading');
      setMessage('Проверяем ваш email...');

      const data = await emailAPI.verify(token);

      if (data.success) {
        setStatus('success');
        setMessage('Email успешно подтвержден!');
        setEmail(data.data?.email || '');

        // Обновляем emailVerified в localStorage если пользователь уже залогинен
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            userData.emailVerified = true;
            localStorage.setItem('user', JSON.stringify(userData));}
        } catch (error) {
          console.error('❌ [VerifyEmail] Ошибка обновления localStorage:', error);
        }

        // Перенаправляем на dashboard если залогинен, иначе на login
        setTimeout(() => {
          const accessToken = localStorage.getItem('accessToken');
          if (accessToken) {
            // Пользователь залогинен - перезагружаем страницу для обновления контекста
            window.location.href = '/app';
          } else {
            // Пользователь не залогинен - на страницу входа с сообщением
            navigate('/pages/login', { 
              state: { 
                message: 'Email подтвержден! Войдите в систему.',
                email: data.data?.email
              } 
            });
          }
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Ошибка при подтверждении email');
      }
    } catch (error) {
      console.error('Verification error:', error);
      
      setStatus('error');
      
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else if (error.response?.status === 400) {
        setMessage('Недействительный или истекший токен верификации');
      } else {
        setMessage('Произошла ошибка при подтверждении email. Попробуйте позже.');
      }
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <LoadingIcon sx={{ fontSize: 80, color: 'info.main' }} />;
      case 'success':
        return <SuccessIcon sx={{ fontSize: 80, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 80, color: 'error.main' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'info';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 5,
            borderRadius: 3,
            textAlign: 'center'
          }}
        >
          {/* Иконка статуса */}
          <Box sx={{ mb: 3 }}>
            {status === 'loading' ? (
              <CircularProgress size={80} thickness={4} />
            ) : (
              getStatusIcon()
            )}
          </Box>

          {/* Заголовок */}
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {status === 'loading' && 'Подтверждение Email'}
            {status === 'success' && 'Успешно!'}
            {status === 'error' && 'Ошибка'}
          </Typography>

          {/* Сообщение */}
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 3, fontSize: '1.1rem' }}
          >
            {message}
          </Typography>

          {/* Email (только при успехе) */}
          {status === 'success' && email && (
            <Alert 
              severity="success" 
              icon={false}
              sx={{ mb: 3, justifyContent: 'center' }}
            >
              <Typography variant="body2">
                Email <strong>{email}</strong> подтвержден
              </Typography>
            </Alert>
          )}

          {/* Дополнительная информация */}
          {status === 'loading' && (
            <Typography variant="body2" color="text.secondary">
              Пожалуйста, подождите...
            </Typography>
          )}

          {status === 'success' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Вы будете перенаправлены на страницу входа через несколько секунд
            </Alert>
          )}

          {/* Кнопки */}
          <Stack spacing={2} sx={{ mt: 4 }}>
            {status === 'success' && (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/pages/login')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #66408c 100%)',
                  }
                }}
              >
                Войти в систему
              </Button>
            )}

            {status === 'error' && (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/pages/login')}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #66408c 100%)',
                    }
                  }}
                >
                  Вернуться к входу
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/pages/register')}
                >
                  Зарегистрироваться заново
                </Button>
              </>
            )}

            {(status === 'success' || status === 'error') && (
              <Button
                variant="text"
                onClick={() => navigate('/')}
                sx={{ mt: 2 }}
              >
                На главную
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Дополнительная информация внизу */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
            © 2025 Smeta Lab. Система управления сметами
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
