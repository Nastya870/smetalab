import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';

// ===============================|| FORGOT PASSWORD FORM ||=============================== //

export default function ForgotPasswordForm() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/password/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(result.message || 'Произошла ошибка. Попробуйте еще раз.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Произошла ошибка. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 40, mr: 2 }} />
          <Typography variant="h4" color="success.main">
            Письмо отправлено!
          </Typography>
        </Box>
        
        <Alert severity="success" sx={{ mb: 3 }}>
          Если указанный email существует в нашей системе, на него отправлена ссылка для сброса пароля.
        </Alert>

        <Typography variant="body1" sx={{ mb: 2 }}>
          Проверьте вашу почту и следуйте инструкциям в письме для сброса пароля.
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Не получили письмо? Проверьте папку "Спам" или попробуйте еще раз через несколько минут.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <AnimateButton>
            <Button
              fullWidth
              size="large"
              variant="contained"
              color="secondary"
              onClick={() => setSuccess(false)}
            >
              Отправить повторно
            </Button>
          </AnimateButton>

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

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Восстановление пароля
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Введите ваш email адрес, и мы отправим вам ссылку для сброса пароля.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-email-forgot">Email Address</InputLabel>
        <OutlinedInput
          id="outlined-adornment-email-forgot"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          name="email"
          label="Email Address"
          required
          disabled={loading}
          placeholder="example@company.com"
        />
      </FormControl>

      <Box sx={{ mt: 3 }}>
        <AnimateButton>
          <Button
            color="secondary"
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            disabled={loading || !email}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Отправляем...' : 'Отправить ссылку'}
          </Button>
        </AnimateButton>
      </Box>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1" component={Link} to="/pages/login" color="secondary" sx={{ textDecoration: 'none' }}>
          Вернуться к входу
        </Typography>
      </Box>
    </form>
  );
}