import React, { useState, useEffect } from 'react';

// material-ui
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack
} from '@mui/material';

// ==============================|| TEMPLATE FORM DIALOG ||============================== //

const TemplateFormDialog = ({ open, template, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ''
  });

  const [errors, setErrors] = useState({});

  // Заполняем форму при открытии (для редактирования)
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: ''
      });
    }
    setErrors({});
  }, [template, open]);

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {template ? 'Редактировать шаблон' : 'Новый шаблон'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Название шаблона"
            value={formData.name}
            onChange={handleChange('name')}
            error={Boolean(errors.name)}
            helperText={errors.name || 'Например: "Шаблон: Ремонт квартиры"'}
            fullWidth
            required
          />

          <TextField
            label="Описание"
            value={formData.description}
            onChange={handleChange('description')}
            multiline
            rows={3}
            helperText="Краткое описание шаблона (необязательно)"
            fullWidth
          />

          <TextField
            label="Категория"
            value={formData.category}
            onChange={handleChange('category')}
            helperText='Например: "Квартиры", "Офисы", "Торговые центры"'
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">Отмена</Button>
        <Button onClick={handleSubmit} variant="contained" size="small">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateFormDialog;
