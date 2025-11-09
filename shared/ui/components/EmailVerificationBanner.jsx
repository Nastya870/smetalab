import { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Collapse,
  IconButton,
  Box,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from 'hooks/useAuth';
import emailAPI from 'api/email';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    // Показываем баннер только если email не подтвержден
    if (user && !user.emailVerified) {
      // Проверяем localStorage - был ли баннер закрыт ранее
      const dismissed = localStorage.getItem('email_banner_dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      
      // Показываем снова через 24 часа после закрытия
      if (!dismissed || (now - dismissedTime) > 24 * 60 * 60 * 1000) {
        setOpen(true);
      }
    } else {
      setOpen(false);
    }

    // Проверяем cooldown для повторной отправки
    const lastSent = localStorage.getItem('email_verification_last_sent');
    if (lastSent) {
      const timeSince = Math.floor((Date.now() - parseInt(lastSent)) / 1000);
      const remainingCooldown = 60 - timeSince; // 60 секунд cooldown
      
      if (remainingCooldown > 0) {
        setCooldown(remainingCooldown);
      }
    }
  }, [user]);

  // Countdown таймер
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('email_banner_dismissed', Date.now().toString());
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    try {
      setSending(true);
      setMessage('');

      const data = await emailAPI.sendVerification();

      if (data.success) {
        setMessage('Письмо с подтверждением отправлено! Проверьте вашу почту.');
        setMessageType('success');
        
        // Устанавливаем cooldown
        localStorage.setItem('email_verification_last_sent', Date.now().toString());
        setCooldown(60);
      } else {
        setMessage(data.message || 'Ошибка при отправке письма');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      
      const errorMessage = error.response?.data?.message || 
        'Не удалось отправить письмо. Попробуйте позже.';
      
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setSending(false);
    }
  };

  if (!user || user.emailVerified) {
    return null;
  }

  return (
    <Collapse in={open}>
      <Alert
        severity="warning"
        icon={<EmailIcon />}
        sx={{
          mb: 2,
          borderRadius: 2,
          boxShadow: 1
        }}
        action={
          <IconButton
            aria-label="закрыть"
            color="inherit"
            size="small"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <AlertTitle sx={{ fontWeight: 'bold' }}>
          Email не подтвержден
        </AlertTitle>
        
        <Box sx={{ mb: message ? 2 : 0 }}>
          Пожалуйста, подтвердите ваш email адрес <strong>{user.email}</strong> для 
          полного доступа ко всем функциям системы.
        </Box>

        {message && (
          <Alert 
            severity={messageType} 
            sx={{ mb: 2, py: 0.5 }}
          >
            {message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            size="small"
            variant="contained"
            onClick={handleResend}
            disabled={sending || cooldown > 0}
            sx={{
              bgcolor: 'warning.dark',
              '&:hover': {
                bgcolor: 'warning.main'
              }
            }}
          >
            {sending ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} color="inherit" />
                Отправка...
              </>
            ) : cooldown > 0 ? (
              `Повторить через ${cooldown}с`
            ) : (
              'Отправить письмо повторно'
            )}
          </Button>

          <Button
            size="small"
            variant="text"
            onClick={handleClose}
            sx={{ color: 'text.secondary' }}
          >
            Напомнить позже
          </Button>
        </Box>
      </Alert>
    </Collapse>
  );
}
