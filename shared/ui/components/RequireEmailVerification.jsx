import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { Box, Container, Paper, Typography, Button, Alert } from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { useState } from 'react';
import emailAPI from 'api/email';

/**
 * Guard компонент, который требует подтверждения email
 * Блокирует доступ к защищенным роутам для неподтвержденных пользователей
 */
export default function RequireEmailVerification({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  // DEBUG: Логируем состояние пользователя
// Показываем загрузку пока проверяем пользователя
  if (loading) {
    return null; // или <Loader />
  }

  // Если пользователь не авторизован - редирект на логин
  if (!user) {
    return <Navigate to="/pages/login" state={{ from: location }} replace />;
  }

  // Если email подтвержден - пропускаем дальше
  if (user.emailVerified) {
    return children;
  }
  // Email НЕ подтвержден - показываем блокирующую страницу
  const handleResendEmail = async () => {
    try {
      setSending(true);
      setMessage('');

      const data = await emailAPI.sendVerification();

      if (data.success) {
        setMessage('✅ Письмо отправлено! Проверьте вашу почту.');
      } else {
        setMessage('❌ ' + (data.message || 'Ошибка при отправке письма'));
      }
    } catch (error) {
      console.error('Resend error:', error);
      setMessage('❌ Не удалось отправить письмо. Попробуйте позже.');
    } finally {
      setSending(false);
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
      <Container maxWidth="md">
        <Paper
          elevation={8}
          sx={{
            p: 5,
            borderRadius: 3,
            textAlign: 'center'
          }}
        >
          {/* Иконка */}
          <Box sx={{ mb: 3 }}>
            <EmailIcon sx={{ fontSize: 100, color: 'warning.main' }} />
          </Box>

          {/* Заголовок */}
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Подтвердите ваш Email
          </Typography>

          {/* Описание */}
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 3, fontSize: '1.1rem', lineHeight: 1.8 }}
          >
            Для доступа к системе необходимо подтвердить ваш email адрес:<br />
            <strong>{user.email}</strong>
          </Typography>

          {/* Инструкции */}
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              📧 <strong>Мы отправили письмо</strong> на указанный email адрес
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              📬 <strong>Проверьте папку "Входящие"</strong> и "Спам"
            </Typography>
            <Typography variant="body2">
              🔗 <strong>Перейдите по ссылке</strong> из письма для подтверждения
            </Typography>
          </Alert>

          {/* Сообщение об отправке */}
          {message && (
            <Alert 
              severity={message.startsWith('✅') ? 'success' : 'error'} 
              sx={{ mb: 3 }}
            >
              {message}
            </Alert>
          )}

          {/* Кнопки */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleResendEmail}
              disabled={sending}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                minWidth: 200,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #66408c 100%)',
                }
              }}
            >
              {sending ? 'Отправка...' : 'Отправить письмо повторно'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => window.location.reload()}
              sx={{ minWidth: 200 }}
            >
              Я подтвердил email
            </Button>
          </Box>

          {/* Контакты поддержки */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Не получили письмо? Проверьте правильность email адреса или{' '}
              <a href="mailto:support@smeta-lab.ru" style={{ color: '#667eea' }}>
                свяжитесь с поддержкой
              </a>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
