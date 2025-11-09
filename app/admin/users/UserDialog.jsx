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

// project imports
import { createUser, updateUser } from 'api/users';

// ==============================|| USER CREATE/EDIT DIALOG ||============================== //

const UserDialog = ({ open, user, onClose, onSave }) => {
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>{isEdit ? 'Редактирование пользователя' : 'Создание пользователя'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Полное имя *"
                name="fullName"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email *"
                name="email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Телефон"
                name="phone"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
                disabled={loading}
                placeholder="+7 (999) 123-45-67"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={isEdit ? 'Новый пароль (оставьте пустым, если не меняете)' : 'Пароль *'}
                name="password"
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Подтверждение пароля"
                name="confirmPassword"
                type="password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                disabled={loading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} />}
          >
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserDialog;
