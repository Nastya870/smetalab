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
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// ===============================|| RESET PASSWORD FORM ||=============================== //

export default function ResetPasswordForm({ token, tokenData }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const validateForm = () => {
    if (formData.password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.password)) {
      setError('Пароль должен содержать заглавные и строчные буквы, а также цифры');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password: formData.password
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Перенаправляем на страницу входа через 3 секунды
        setTimeout(() => {
          navigate('/pages/login', {
            state: {
              message: 'Пароль успешно изменен. Войдите с новым паролем.',
              email: result.data?.email
            }
          });
        }, 3000);
      } else {
        setError(result.message || 'Произошла ошибка. Попробуйте еще раз.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
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
            Пароль изменен!
          </Typography>
        </Box>
        
        <Alert severity="success" sx={{ mb: 3 }}>
          Ваш пароль успешно изменен. Теперь вы можете войти в систему с новым паролем.
        </Alert>

        <Typography variant="body1" sx={{ mb: 2 }}>
          Перенаправляем на страницу входа...
        </Typography>

        <Button
          fullWidth
          size="large"
          variant="contained"
          color="secondary"
          component={Link}
          to="/pages/login"
        >
          Войти в систему
        </Button>
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Новый пароль
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Введите новый пароль для аккаунта {tokenData?.email}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-password-reset">Новый пароль</InputLabel>
        <OutlinedInput
          id="outlined-adornment-password-reset"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange('password')}
          name="password"
          label="Новый пароль"
          required
          disabled={loading}
          placeholder="Минимум 8 символов"
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
                size="large"
                disabled={loading}
              >
                {showPassword ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-confirm-password-reset">Подтвердите пароль</InputLabel>
        <OutlinedInput
          id="outlined-adornment-confirm-password-reset"
          type={showConfirmPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          name="confirmPassword"
          label="Подтвердите пароль"
          required
          disabled={loading}
          placeholder="Повторите пароль"
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={handleClickShowConfirmPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
                size="large"
                disabled={loading}
              >
                {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры
      </Typography>

      <Box sx={{ mt: 3 }}>
        <AnimateButton>
          <Button
            color="secondary"
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            disabled={loading || !formData.password || !formData.confirmPassword}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Сохраняем...' : 'Сохранить новый пароль'}
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