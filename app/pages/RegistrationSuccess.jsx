import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Stack
} from '@mui/material';
import {
  MarkEmailRead as EmailIcon,
  Login as LoginIcon
} from '@mui/icons-material';

export default function RegistrationSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Получаем email из state (передается после регистрации)
  const email = location.state?.email || 'вашу почту';
  const userName = location.state?.userName || '';

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
            <EmailIcon sx={{ fontSize: 100, color: 'success.main' }} />
          </Box>

          {/* Заголовок */}
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Спасибо за регистрацию{userName ? `, ${userName}` : ''}!
          </Typography>

          {/* Основное сообщение */}
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ mb: 4, lineHeight: 1.8 }}
          >
            Мы отправили письмо с подтверждением на <strong>{email}</strong>
          </Typography>

          {/* Инструкции */}
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Что делать дальше:</strong>
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                1️⃣ Откройте свою почту <strong>{email}</strong>
              </Typography>
              <Typography variant="body2">
                2️⃣ Найдите письмо от <strong>Smeta Lab</strong> (проверьте папку "Спам")
              </Typography>
              <Typography variant="body2">
                3️⃣ Нажмите кнопку <strong>"Подтвердить Email"</strong> в письме
              </Typography>
              <Typography variant="body2">
                4️⃣ После подтверждения войдите в систему
              </Typography>
            </Stack>
          </Alert>

          {/* Дополнительная информация */}
          <Alert severity="warning" sx={{ mb: 4 }}>
            <Typography variant="body2">
              ⚠️ Без подтверждения email вы не сможете войти в систему. 
              Письмо действительно в течение <strong>24 часов</strong>.
            </Typography>
          </Alert>

          {/* Кнопки */}
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/pages/login')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #66408c 100%)',
                }
              }}
            >
              Перейти к входу
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/')}
            >
              На главную
            </Button>
          </Stack>

          {/* Помощь */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="body2" color="text.secondary">
              Не получили письмо? После входа в систему вы сможете отправить его повторно.
            </Typography>
          </Box>
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
            © 2025 Smeta Lab. Система управления сметами
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
