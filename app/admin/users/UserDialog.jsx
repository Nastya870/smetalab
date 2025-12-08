import { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

// project imports
import { createUser, updateUser } from 'api/users';

// ==============================|| USER CREATE/EDIT DIALOG ||============================== //

// Стили для инпутов
const inputSx = {
  '& .MuiOutlinedInput-root': {
    height: 44,
    borderRadius: '8px',
    fontSize: '0.875rem',
    '& fieldset': { borderColor: '#E5E7EB' },
    '&:hover fieldset': { borderColor: '#D1D5DB' },
    '&.Mui-focused fieldset': { borderColor: '#7C3AED', borderWidth: '1.5px' }
  },
  '& .MuiInputBase-input': {
    color: '#374151',
    '&::placeholder': { color: '#9CA3AF', opacity: 1 }
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
    color: '#6B7280',
    '&.Mui-focused': { color: '#7C3AED' }
  }
};

// Компонент лейбла
const FieldLabel = ({ children, required }) => (
  <Typography sx={{ fontSize: '13px', color: '#6B7280', mb: '4px', fontWeight: 500 }}>
    {children}
    {required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
  </Typography>
);

const UserDialog = ({ open, user, onClose, onSave }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(user);

  // Validation schema
  const validationSchema = Yup.object({
    fullName: Yup.string().required('Введите полное имя'),
    email: Yup.string().email('Некорректный email').required('Введите email'),
    phone: Yup.string().nullable(),
    password: isEdit
      ? Yup.string().min(6, 'Минимум 6 символов')
      : Yup.string().min(6, 'Минимум 6 символов').required('Введите пароль'),
    confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], 'Пароли не совпадают')
  });

  // Formik
  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError(null);

      try {
        const userData = {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone || null
        };

        // Добавляем пароль только если он указан
        if (values.password) {
          userData.password = values.password;
        }

        if (isEdit) {
          await updateUser(user.id, userData);
        } else {
          await createUser(userData);
        }

        onSave();
        formik.resetForm();
      } catch (err) {
        console.error('Error saving user:', err);
        setError(err.response?.data?.message || 'Ошибка сохранения пользователя');
      } finally {
        setLoading(false);
      }
    }
  });

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        formik.setValues({
          fullName: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          password: '',
          confirmPassword: ''
        });
      } else {
        formik.resetForm();
      }
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const handleClose = () => {
    formik.resetForm();
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '16px',
          width: '100%',
          maxWidth: '560px',
          m: isMobile ? 0 : 2
        }
      }}
    >
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#111827', pb: '16px', pt: 3 }}>
          {isEdit ? 'Редактирование пользователя' : 'Создание пользователя'}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <FieldLabel required>Полное имя</FieldLabel>
              <TextField
                fullWidth
                name="fullName"
                placeholder="Иван Иванов"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName}
                disabled={loading}
                sx={inputSx}
              />
            </Box>

            <Box>
              <FieldLabel required>Email</FieldLabel>
              <TextField
                fullWidth
                name="email"
                type="email"
                placeholder="user@example.com"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                disabled={loading}
                sx={inputSx}
              />
            </Box>

            <Box>
              <FieldLabel>Телефон</FieldLabel>
              <TextField
                fullWidth
                name="phone"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
                disabled={loading}
                placeholder="+7 (999) 123-45-67"
                sx={inputSx}
              />
            </Box>

            <Box>
              <FieldLabel required={!isEdit}>{isEdit ? 'Новый пароль' : 'Пароль'}</FieldLabel>
              <TextField
                fullWidth
                name="password"
                type="password"
                placeholder="••••••••"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                disabled={loading}
                sx={inputSx}
              />
              {isEdit && (
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: '4px' }}>
                  Оставьте пустым, если не хотите менять пароль
                </Typography>
              )}
            </Box>

            <Box>
              <FieldLabel>Подтверждение пароля</FieldLabel>
              <TextField
                fullWidth
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                disabled={loading}
                sx={inputSx}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{ 
              textTransform: 'none', 
              color: '#6B7280',
              fontSize: '0.875rem',
              '&:hover': { bgcolor: '#F3F4F6' }
            }}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />}
            sx={{
              textTransform: 'none',
              bgcolor: '#4F46E5',
              height: 40,
              px: 2,
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(79,70,229,0.2)',
              '&:hover': { 
                bgcolor: '#4338CA',
                boxShadow: '0 4px 6px rgba(79,70,229,0.25)'
              }
            }}
          >
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserDialog;
