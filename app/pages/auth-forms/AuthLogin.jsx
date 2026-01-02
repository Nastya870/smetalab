import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import authService from 'services/authService';
import { useAuth } from 'contexts/AuthContext';
import storageService from '@/shared/lib/services/storageService';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// ===============================|| JWT - LOGIN ||=============================== //

export default function AuthLogin() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();

  // Получаем данные из navigation state (после верификации)
  const successMessage = location.state?.message;
  const emailFromState = location.state?.email;

  const [email, setEmail] = useState(emailFromState || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // По умолчанию включено "Запомнить меня"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(successMessage || '');

  // Очищаем state после отображения сообщения
  useEffect(() => {
    if (successMessage) {
      // Очищаем state в истории
      window.history.replaceState({}, document.title);
    }
  }, [successMessage]);

  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Сначала очищаем старые данные
      storageService.remove('accessToken');
      storageService.remove('refreshToken');
      storageService.remove('user');
      storageService.remove('tenant');
      storageService.remove('tenants');
      storageService.remove('roles');

      const result = await authService.login({
        email,
        password,
        rememberMe
      });

      // Дополнительно сохраняем роли если они есть
      if (result.data?.roles) {
        storageService.set('roles', result.data.roles);
      }
      
      // Проверяем что токены действительно сохранились
      const savedToken = storageService.get('accessToken');
      const savedUser = storageService.get('user');
      
      if (!savedToken || !savedUser) {
        throw new Error('Ошибка сохранения данных авторизации');
      }

      // ВАЖНО: Обновляем AuthContext с данными пользователя
      authLogin(result.data.user, result.data.tenant, result.data.tokens.accessToken);
      
      // Перенаправляем в приложение
      const redirectPath = storageService.get('redirectAfterLogin') || '/app';
      storageService.remove('redirectAfterLogin');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Ошибка входа. Проверьте email и пароль.');
    } finally {
      setLoading(false);
    }
  };

  // Стили для иконки показа пароля
  const passwordIconStyles = {
    opacity: 0.5,
    transition: 'opacity 0.2s ease',
    '&:hover': {
      opacity: 1,
      backgroundColor: 'transparent'
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '10px' }}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-email-login">Email адрес</InputLabel>
        <OutlinedInput
          id="outlined-adornment-email-login"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          name="email"
          label="Email адрес"
          required
          disabled={loading}
          placeholder="example@company.com"
        />
      </FormControl>

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-password-login">Пароль</InputLabel>
        <OutlinedInput
          id="outlined-adornment-password-login"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          name="password"
          label="Пароль"
          required
          disabled={loading}
          placeholder="Введите пароль"
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
                size="small"
                disabled={loading}
                sx={passwordIconStyles}
              >
                {showPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>

      <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
        <Grid>
          <FormControlLabel
            control={
              <Checkbox 
                checked={rememberMe} 
                onChange={(event) => setRememberMe(event.target.checked)} 
                name="rememberMe" 
                color="primary" 
                disabled={loading}
                size="small"
                sx={{
                  '& .MuiSvgIcon-root': {
                    fontSize: 18,
                    strokeWidth: 0.5
                  },
                  padding: '4px',
                  marginRight: '6px'
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                Запомнить меня (48 часов)
              </Typography>
            }
            sx={{ marginLeft: 0 }}
          />
        </Grid>
        <Grid>
          <Typography 
            variant="body2" 
            component={Link} 
            to="/pages/forgot-password" 
            sx={{ 
              color: 'primary.main',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Забыли пароль?
          </Typography>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3.5 }}>
        <AnimateButton>
          <Button 
            color="secondary" 
            fullWidth 
            size="large" 
            type="submit" 
            variant="contained"
            disabled={loading || !email || !password}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              height: 52,
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(103, 58, 183, 0.25)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(103, 58, 183, 0.35)'
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(103, 80, 164, 0.25)',
                color: '#6F6F6F',
                boxShadow: 'none'
              }
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </AnimateButton>
      </Box>
    </form>
  );
}
