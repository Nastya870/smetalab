import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import authService from 'services/authService';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// ===========================|| JWT - REGISTER ||=========================== //

export default function AuthRegister() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
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

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    if (!checked) {
      setError('Необходимо согласиться с условиями использования');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.register(formData);// Перенаправляем на страницу "Спасибо за регистрацию"
      navigate('/registration-success', {
        state: {
          email: formData.email,
          userName: formData.fullName.split(' ')[0] // Берем только имя
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Ошибка регистрации. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container direction="column" spacing={2} sx={{ justifyContent: 'center' }}>
        <Grid container sx={{ alignItems: 'center', justifyContent: 'center' }} size={12}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Регистрация компании</Typography>
          </Box>
        </Grid>
      </Grid>

      <TextField
        fullWidth
        label="Название компании"
        margin="normal"
        name="companyName"
        type="text"
        value={formData.companyName}
        onChange={handleChange('companyName')}
        required
        disabled={loading}
        placeholder="ООО Моя Компания"
        sx={{ ...theme.typography.customInput }}
      />

      <TextField
        fullWidth
        label="Полное имя"
        margin="normal"
        name="fullName"
        type="text"
        value={formData.fullName}
        onChange={handleChange('fullName')}
        required
        disabled={loading}
        placeholder="Иванов Иван Иванович"
        sx={{ ...theme.typography.customInput }}
      />

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-email-register">Email</InputLabel>
        <OutlinedInput
          id="outlined-adornment-email-register"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          name="email"
          label="Email"
          required
          disabled={loading}
          placeholder="example@company.com"
        />
      </FormControl>

      <TextField
        fullWidth
        label="Телефон (опционально)"
        margin="normal"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange('phone')}
        disabled={loading}
        placeholder="+7 (999) 123-45-67"
        sx={{ ...theme.typography.customInput }}
      />

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-password-register">Пароль</InputLabel>
        <OutlinedInput
          id="outlined-adornment-password-register"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange('password')}
          name="password"
          label="Пароль"
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

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры и специальные символы
      </Typography>

      <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Grid>
          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                name="checked"
                color="primary"
                disabled={loading}
              />
            }
            label={
              <Typography variant="subtitle1">
                Согласен с &nbsp;
                <Typography variant="subtitle1" component={Link} to="/terms-of-service" color="secondary" target="_blank">
                  условиями использования
                </Typography>
              </Typography>
            }
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <AnimateButton>
          <Button
            disableElevation
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            color="secondary"
            disabled={loading || !checked}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
        </AnimateButton>
      </Box>
    </form>
  );
}
