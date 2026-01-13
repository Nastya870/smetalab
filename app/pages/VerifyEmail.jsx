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
import storageService from '@/shared/lib/services/storageService';

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
      setMessage('╨в╨╛╨║╨╡╨╜ ╨▓╨╡╤А╨╕╤Д╨╕╨║╨░╤Ж╨╕╨╕ ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜ ╨▓ URL');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      setStatus('loading');
      setMessage('╨Я╤А╨╛╨▓╨╡╤А╤П╨╡╨╝ ╨▓╨░╤И email...');

      const data = await emailAPI.verify(token);

      if (data.success) {
        setStatus('success');
        setMessage('Email ╤Г╤Б╨┐╨╡╤И╨╜╨╛ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜!');
        setEmail(data.data?.email || '');

        // ╨Ю╨▒╨╜╨╛╨▓╨╗╤П╨╡╨╝ emailVerified ╨▓ storage ╨╡╤Б╨╗╨╕ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╤Г╨╢╨╡ ╨╖╨░╨╗╨╛╨│╨╕╨╜╨╡╨╜
        try {
          const storedUser = storageService.get('user');
          if (storedUser) {
            storedUser.emailVerified = true;
            storageService.set('user', storedUser);
          }
        } catch (error) {
          console.error('тЭМ [VerifyEmail] ╨Ю╤И╨╕╨▒╨║╨░ ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╕╤П storage:', error);
        }

        // ╨Я╨╡╤А╨╡╨╜╨░╨┐╤А╨░╨▓╨╗╤П╨╡╨╝ ╨╜╨░ dashboard ╨╡╤Б╨╗╨╕ ╨╖╨░╨╗╨╛╨│╨╕╨╜╨╡╨╜, ╨╕╨╜╨░╤З╨╡ ╨╜╨░ login
        setTimeout(() => {
          const accessToken = storageService.get('accessToken');
          if (accessToken) {
            // ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨╖╨░╨╗╨╛╨│╨╕╨╜╨╡╨╜ - ╨┐╨╡╤А╨╡╨╖╨░╨│╤А╤Г╨╢╨░╨╡╨╝ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Г ╨┤╨╗╤П ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╕╤П ╨║╨╛╨╜╤В╨╡╨║╤Б╤В╨░
            window.location.href = '/app';
          } else {
            // ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨╜╨╡ ╨╖╨░╨╗╨╛╨│╨╕╨╜╨╡╨╜ - ╨╜╨░ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Г ╨▓╤Е╨╛╨┤╨░ ╤Б ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╨╡╨╝
            navigate('/pages/login', { 
              state: { 
                message: 'Email ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜! ╨Т╨╛╨╣╨┤╨╕╤В╨╡ ╨▓ ╤Б╨╕╤Б╤В╨╡╨╝╤Г.',
                email: data.data?.email
              } 
            });
          }
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.message || '╨Ю╤И╨╕╨▒╨║╨░ ╨┐╤А╨╕ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╕ email');
      }
    } catch (error) {
      console.error('Verification error:', error);
      
      setStatus('error');
      
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else if (error.response?.status === 400) {
        setMessage('╨Э╨╡╨┤╨╡╨╣╤Б╤В╨▓╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣ ╨╕╨╗╨╕ ╨╕╤Б╤В╨╡╨║╤И╨╕╨╣ ╤В╨╛╨║╨╡╨╜ ╨▓╨╡╤А╨╕╤Д╨╕╨║╨░╤Ж╨╕╨╕');
      } else {
        setMessage('╨Я╤А╨╛╨╕╨╖╨╛╤И╨╗╨░ ╨╛╤И╨╕╨▒╨║╨░ ╨┐╤А╨╕ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╕ email. ╨Я╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╨┐╨╛╨╖╨╢╨╡.');
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
          {/* ╨Ш╨║╨╛╨╜╨║╨░ ╤Б╤В╨░╤В╤Г╤Б╨░ */}
          <Box sx={{ mb: 3 }}>
            {status === 'loading' ? (
              <CircularProgress size={80} thickness={4} />
            ) : (
              getStatusIcon()
            )}
          </Box>

          {/* ╨Ч╨░╨│╨╛╨╗╨╛╨▓╨╛╨║ */}
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {status === 'loading' && '╨Я╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ Email'}
            {status === 'success' && '╨г╤Б╨┐╨╡╤И╨╜╨╛!'}
            {status === 'error' && '╨Ю╤И╨╕╨▒╨║╨░'}
          </Typography>

          {/* ╨б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╨╡ */}
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 3, fontSize: '1.1rem' }}
          >
            {message}
          </Typography>

          {/* Email (╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ ╤Г╤Б╨┐╨╡╤Е╨╡) */}
          {status === 'success' && email && (
            <Alert 
              severity="success" 
              icon={false}
              sx={{ mb: 3, justifyContent: 'center' }}
            >
              <Typography variant="body2">
                Email <strong>{email}</strong> ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜
              </Typography>
            </Alert>
          )}

          {/* ╨Ф╨╛╨┐╨╛╨╗╨╜╨╕╤В╨╡╨╗╤М╨╜╨░╤П ╨╕╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╤П */}
          {status === 'loading' && (
            <Typography variant="body2" color="text.secondary">
              ╨Я╨╛╨╢╨░╨╗╤Г╨╣╤Б╤В╨░, ╨┐╨╛╨┤╨╛╨╢╨┤╨╕╤В╨╡...
            </Typography>
          )}

          {status === 'success' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              ╨Т╤Л ╨▒╤Г╨┤╨╡╤В╨╡ ╨┐╨╡╤А╨╡╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╤Л ╨╜╨░ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Г ╨▓╤Е╨╛╨┤╨░ ╤З╨╡╤А╨╡╨╖ ╨╜╨╡╤Б╨║╨╛╨╗╤М╨║╨╛ ╤Б╨╡╨║╤Г╨╜╨┤
            </Alert>
          )}

          {/* ╨Ъ╨╜╨╛╨┐╨║╨╕ */}
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
                ╨Т╨╛╨╣╤В╨╕ ╨▓ ╤Б╨╕╤Б╤В╨╡╨╝╤Г
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
                  ╨Т╨╡╤А╨╜╤Г╤В╤М╤Б╤П ╨║ ╨▓╤Е╨╛╨┤╤Г
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/pages/register')}
                >
                  ╨Ч╨░╤А╨╡╨│╨╕╤Б╤В╤А╨╕╤А╨╛╨▓╨░╤В╤М╤Б╤П ╨╖╨░╨╜╨╛╨▓╨╛
                </Button>
              </>
            )}

            {(status === 'success' || status === 'error') && (
              <Button
                variant="text"
                onClick={() => navigate('/')}
                sx={{ mt: 2 }}
              >
                ╨Э╨░ ╨│╨╗╨░╨▓╨╜╤Г╤О
              </Button>
            )}
          </Stack>
        </Paper>

        {/* ╨Ф╨╛╨┐╨╛╨╗╨╜╨╕╤В╨╡╨╗╤М╨╜╨░╤П ╨╕╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╤П ╨▓╨╜╨╕╨╖╤Г */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
            ┬й 2025 Smeta Lab. ╨б╨╕╤Б╤В╨╡╨╝╨░ ╤Г╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П ╤Б╨╝╨╡╤В╨░╨╝╨╕
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
