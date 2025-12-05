import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

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
  Typography,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box
} from '@mui/material';
import {
  IconDeviceFloppy,
  IconX
} from '@tabler/icons-react';

// project imports
import estimateTemplatesAPI from 'shared/lib/api/estimateTemplates';
import estimatesAPI from 'shared/lib/api/estimatesAPI';

// ==============================|| CREATE ESTIMATE DIALOG ||============================== //

const CreateEstimateDialog = ({ open, onClose, onSave, projectName, projectId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Template selection
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await estimateTemplatesAPI.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

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
        status: 'draft', // Новая смета всегда создается в статусе "Черновик"
        templateId: useTemplate ? selectedTemplate : null // Передаем ID шаблона если выбран
      };

      // Если выбран шаблон, сначала создаем смету БЕЗ навигации
      if (useTemplate && selectedTemplate) {
        console.log('🔄 Creating estimate with template...');
        
        // Создаём смету напрямую через API (без навигации)
        const newEstimate = await estimatesAPI.create(projectId, apiData);
        console.log('✅ Estimate created:', newEstimate.id);
        
        // Применяем шаблон
        try {
          console.log('🚀 Applying template', selectedTemplate, 'to estimate', newEstimate.id);
          const result = await estimateTemplatesAPI.applyTemplate(selectedTemplate, newEstimate.id);
          console.log('✅ Template applied successfully:', result);
        } catch (templateError) {
          console.error('❌ Error applying template:', templateError);
          console.error('Template error details:', templateError.response?.data);
        }
        
        // Закрываем диалог
        handleClose();
        
        // Переходим к смете напрямую
        console.log('🔄 Navigating to estimate:', newEstimate.id);
        navigate(`/app/projects/${projectId}/estimates/${newEstimate.id}`);
      } else {
        // Обычное создание без шаблона - onSave обработает всё
        const newEstimate = await onSave(apiData);
        console.log('✅ Estimate created without template:', newEstimate);
        
        // Закрыть диалог после успешного создания
        handleClose();
      }
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
    setUseTemplate(false);
    setSelectedTemplate('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? handleClose : undefined} 
      maxWidth="sm" 
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          m: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : 'calc(100% - 64px)'
        }
      }}
    >
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
          {/* Checkbox для использования шаблона - ПЕРВЫМ */}
          {templates.length > 0 && (
            <>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useTemplate}
                      onChange={(e) => {
                        setUseTemplate(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedTemplate('');
                        }
                      }}
                      disabled={loadingTemplates}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Создать из шаблона</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Выберите готовый шаблон с работами и материалами
                      </Typography>
                    </Box>
                  }
                />
              </Grid>

              {/* Выбор шаблона */}
              {useTemplate && (
                <Grid size={12}>
                  <FormControl fullWidth>
                    <InputLabel>Выберите шаблон</InputLabel>
                    <Select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      label="Выберите шаблон"
                    >
                      {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          <Box>
                            <Typography variant="body2">{template.name}</Typography>
                            {template.category && (
                              <Typography variant="caption" color="text.secondary">
                                {template.category} • Работ: {template.works_count || 0} • Материалов: {template.materials_count || 0}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Разделитель */}
              <Grid size={12}>
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 1 }} />
              </Grid>
            </>
          )}

          {/* Наименование сметы */}
          <Grid size={12}>
            <TextField
              fullWidth
              label="Наименование сметы *"
              value={formData.name}
              onChange={handleChange('name')}
              error={Boolean(errors.name)}
              helperText={errors.name || 'Например: Смета на строительные работы'}
              autoFocus={!useTemplate}
            />
          </Grid>

          {/* Описание */}
          <Grid size={12}>
            <TextField
              fullWidth
              label="Описание"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={2}
              helperText="Краткое описание сметы (необязательно)"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} startIcon={<IconX />} disabled={loading} size="small">
          Отмена
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          startIcon={loading ? <CircularProgress size={20} /> : <IconDeviceFloppy />}
          disabled={loading}
          size="small"
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
