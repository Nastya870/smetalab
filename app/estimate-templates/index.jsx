import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import {
  Grid,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconTemplate,
  IconFileDescription,
  IconCategory
} from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import estimateTemplatesAPI from 'shared/lib/api/estimateTemplates';
import TemplateFormDialog from './TemplateFormDialog';
import { useNotifications } from 'contexts/NotificationsContext';

// ==============================|| ESTIMATE TEMPLATES PAGE ||============================== //

const EstimateTemplatesPage = () => {
  const navigate = useNavigate();

  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { success, error: showError, info } = useNotifications();
  
  // Dialogs
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Загрузка данных
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await estimateTemplatesAPI.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Ошибка при загрузке шаблонов');
      showError('Ошибка при загрузке шаблонов');
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация шаблонов по поиску
  const filteredTemplates = templates.filter((template) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      template.name?.toLowerCase().includes(search) ||
      template.description?.toLowerCase().includes(search) ||
      template.category?.toLowerCase().includes(search)
    );
  });

  // Handlers
  const handleAddTemplate = () => {
    // Для создания шаблона нужна существующая смета
    // Редирект на страницу смет или показать сообщение
    info('Для создания шаблона откройте смету и нажмите "Сохранить как шаблон"');
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setOpenFormDialog(true);
  };

  const handleDeleteClick = (template) => {
    setSelectedTemplate(template);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await estimateTemplatesAPI.deleteTemplate(selectedTemplate.id);
      success('Шаблон успешно удален', selectedTemplate.name);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('Ошибка при удалении шаблона');
    } finally {
      setOpenDeleteDialog(false);
      setSelectedTemplate(null);
    }
  };

  const handleFormSave = async (formData) => {
    try {
      if (selectedTemplate) {
        // Update
        await estimateTemplatesAPI.updateTemplate(selectedTemplate.id, formData);
        success('Шаблон успешно обновлен', formData.name);
      }
      fetchTemplates();
      setOpenFormDialog(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Ошибка при сохранении шаблона', error.response?.data?.message);
    }
  };

  const handleViewTemplate = async (templateId) => {
    // Можно открыть детальную информацию или список работ/материалов
    try {
      const response = await estimateTemplatesAPI.getTemplateById(templateId);
      console.log('Template details:', response.data);
      // TODO: Открыть модальное окно с деталями или перейти на страницу просмотра
      info('Просмотр шаблона (TODO)');
    } catch (error) {
      console.error('Error fetching template details:', error);
      showError('Ошибка при загрузке деталей шаблона');
    }
  };

  // Empty state
  if (!loading && templates.length === 0 && !searchTerm) {
    return (
      <MainCard title="Шаблоны смет">
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <IconTemplate size={64} color="#ccc" />
          <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
            У вас пока нет шаблонов
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Создайте смету, а затем сохраните её как шаблон для быстрого использования
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconPlus />}
            onClick={() => navigate('/projects')}
          >
            Перейти к проектам
          </Button>
        </Box>
      </MainCard>
    );
  }

  return (
    <>
      <MainCard
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconTemplate size={24} />
            <Typography variant="h3">Шаблоны смет</Typography>
          </Box>
        }
      >
        {/* Search and filters */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Поиск по названию, описанию или категории..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Templates grid */}
        {!loading && (
          <>
            {filteredTemplates.length === 0 ? (
              <Alert severity="info">
                {searchTerm
                  ? 'Шаблоны не найдены. Попробуйте изменить поисковый запрос.'
                  : 'Шаблоны отсутствуют'}
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {filteredTemplates.map((template) => (
                  <Grid item xs={12} sm={6} md={4} key={template.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 3,
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        <Stack spacing={2}>
                          {/* Category badge */}
                          {template.category && (
                            <Chip
                              label={template.category}
                              size="small"
                              color="primary"
                              sx={{ width: 'fit-content' }}
                            />
                          )}

                          {/* Title */}
                          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                            {template.name}
                          </Typography>

                          {/* Description */}
                          {template.description ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                minHeight: '60px',
                                lineHeight: 1.5
                              }}
                            >
                              {template.description}
                            </Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              color="text.disabled"
                              sx={{ fontStyle: 'italic', minHeight: '60px' }}
                            >
                              Без описания
                            </Typography>
                          )}

                          {/* Stats - компактно */}
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 2,
                              pt: 1,
                              borderTop: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              <strong>Работ:</strong> {template.works_count || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Материалов:</strong> {template.materials_count || 0}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                        <Typography variant="caption" color="text.disabled">
                          {new Date(template.created_at).toLocaleDateString('ru-RU')}
                        </Typography>
                        <Box>
                          <Tooltip title="Редактировать">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTemplate(template);
                              }}
                            >
                              <IconEdit size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(template);
                              }}
                            >
                              <IconTrash size={18} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </MainCard>

      {/* Edit Template Dialog */}
      {openFormDialog && (
        <TemplateFormDialog
          open={openFormDialog}
          template={selectedTemplate}
          onClose={() => {
            setOpenFormDialog(false);
            setSelectedTemplate(null);
          }}
          onSave={handleFormSave}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Удалить шаблон?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы действительно хотите удалить шаблон "{selectedTemplate?.name}"?
            <br />
            Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Отмена</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EstimateTemplatesPage;
