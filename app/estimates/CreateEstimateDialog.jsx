import { useState } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Typography
} from '@mui/material';
import {
  IconDeviceFloppy,
  IconX
} from '@tabler/icons-react';

// ==============================|| CREATE ESTIMATE DIALOG ||============================== //

const CreateEstimateDialog = ({ open, onClose, onSave, projectName, projectId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    // Очистить ошибку при изменении
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ''
      });
    }
    // Очистить общую ошибку
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите наименование сметы';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Подготовка данных для API
      const apiData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        estimateType: 'строительство', // Тип по умолчанию
        status: 'draft' // Новая смета всегда создается в статусе "Черновик"
      };

      // Вызов onSave с данными (ProjectDashboard обработает API запрос)
      await onSave(apiData);
      
      // Закрыть диалог после успешного создания
      handleClose();
    } catch (error) {
      console.error('Error creating estimate:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Не удалось создать смету. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: ''
    });
    setErrors({});
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={!loading ? handleClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>
        Создание новой сметы
        {projectName && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            Проект: {projectName}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          {/* Наименование сметы - на всю строку */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Наименование сметы *"
              value={formData.name}
              onChange={handleChange('name')}
              error={Boolean(errors.name)}
              helperText={errors.name || 'Например: Смета на строительные работы'}
              autoFocus
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} startIcon={<IconX />} disabled={loading}>
          Отмена
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          startIcon={loading ? <CircularProgress size={20} /> : <IconDeviceFloppy />}
          disabled={loading}
        >
          {loading ? 'Создание...' : 'Создать смету'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CreateEstimateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  projectName: PropTypes.string,
  projectId: PropTypes.string
};

export default CreateEstimateDialog;
