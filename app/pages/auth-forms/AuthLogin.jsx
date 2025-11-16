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
  const [checked, setChecked] = useState(true);
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      localStorage.removeItem('tenants');
      localStorage.removeItem('roles');

      const result = await authService.login({
        email,
        password
      });
// Дополнительно сохраняем роли если они есть
      if (result.data?.roles) {
        localStorage.setItem('roles', JSON.stringify(result.data.roles));
      }
      
      // Проверяем что токены действительно сохранились
      const savedToken = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');
      
      if (!savedToken || !savedUser) {
        throw new Error('Ошибка сохранения данных авторизации');
      }

      // ВАЖНО: Обновляем AuthContext с данными пользователя
      authLogin(result.data.user, result.data.tenant, result.data.tokens.accessToken);
      
      // Перенаправляем в приложение
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/app';
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Ошибка входа. Проверьте email и пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
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
                size="large"
                disabled={loading}
              >
                {showPassword ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>

      <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Grid>
          <FormControlLabel
            control={<Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} name="checked" color="primary" disabled={loading} />}
            label="Запомнить меня"
          />
        </Grid>
        <Grid>
          <Typography variant="subtitle1" component={Link} to="/pages/forgot-password" color="secondary" sx={{ textDecoration: 'none' }}>
            Забыли пароль?
          </Typography>
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <AnimateButton>
          <Button 
            color="secondary" 
            fullWidth 
            size="large" 
            type="submit" 
            variant="contained"
            disabled={loading || !email || !password}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </AnimateButton>
      </Box>
    </form>
  );
}
