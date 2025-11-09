import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// material-ui
import {
  Grid,
  Typography,
  Card,
  CardContent,
  Divider,
  Button,
  Chip,
  Box,
  Avatar,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  Menu,
  MenuItem
} from '@mui/material';
import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconMapPin,
  IconBuilding,
  IconEdit,
  IconFileText,
  IconClock,
  IconFileDescription,
  IconTrash
} from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import ProjectDialog from './ProjectDialog';
import CreateEstimateDialog from '../estimates/CreateEstimateDialog';
import StatusChangeMenu from './StatusChangeMenu';
import FinancialSummaryChart from './FinancialSummaryChart';
import { getStatusColor, getStatusText, formatDate } from './utils';
import { emptyProject } from './mockData';
import { projectsAPI } from 'api/projects';
import { estimatesAPI } from 'api/estimatesAPI';

// ==============================|| PROJECT DASHBOARD ||============================== //

const ProjectDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProject, setCurrentProject] = useState(emptyProject);
  const [openEstimateDialog, setOpenEstimateDialog] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // State для меню статуса сметы
  const [estimateStatusMenu, setEstimateStatusMenu] = useState(null);
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  // Статусы смет
  const estimateStatuses = [
    { value: 'draft', label: 'Черновик', color: 'default' },
    { value: 'approved', label: 'Утверждена', color: 'success' },
    { value: 'in_progress', label: 'В работе', color: 'primary' }
  ];
  
  // Получить цвет статуса сметы
  const getEstimateStatusColor = (status) => {
    const statusObj = estimateStatuses.find(s => s.value === status);
    return statusObj?.color || 'default';
  };
  
  // Получить текст статуса сметы
  const getEstimateStatusLabel = (status) => {
    const statusObj = estimateStatuses.find(s => s.value === status);
    return statusObj?.label || status || 'Черновик';
  };

  // Загружаем проект из API
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await projectsAPI.getById(id);
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(err.message || 'Ошибка при загрузке проекта');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProject();
    }
  }, [id]);

  // Функция для перезагрузки данных проекта (без spinner)
  const refreshProject = async () => {
    try {
      const data = await projectsAPI.getById(id);
      setProject(data);
      console.log('✅ Project data refreshed, progress:', data.progress);
    } catch (err) {
      console.error('Error refreshing project:', err);
    }
  };

  // Автоматическое обновление данных проекта каждые 3 секунды
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(() => {
      refreshProject();
    }, 3000); // Обновляем каждые 3 секунды

    return () => clearInterval(interval);
  }, [id]);

  // Загружаем команду проекта из API
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const data = await projectsAPI.getTeam(id);
        setTeamMembers(data);
      } catch (err) {
        console.error('Error fetching team:', err);
        // Оставляем пустой массив при ошибке
        setTeamMembers([]);
      }
    };

    if (id) {
      fetchTeam();
    }
  }, [id]);

  // Загружаем список смет проекта
  useEffect(() => {
    const fetchEstimates = async () => {
      if (!id) return;
      
      try {
        const data = await estimatesAPI.getByProjectId(id);
        setEstimates(data || []);
      } catch (err) {
        console.error('Error loading estimates:', err);
        setEstimates([]);
      }
    };

    fetchEstimates();
  }, [id]);

  // Открыть модалку для редактирования
  const handleOpenEdit = (project) => {
    setCurrentProject({ ...project });
    setOpenDialog(true);
  };

  // Закрыть модалку
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentProject(emptyProject);
  };

  // Сохранить проект (используем API)
  const handleSaveProject = async (updatedProject) => {
    try {
      const saved = await projectsAPI.update(updatedProject.id, updatedProject);
      setProject(saved);
      handleCloseDialog();
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.message || 'Ошибка при сохранении проекта');
    }
  };

  // Удалить проект из модалки (используем API)
  const handleDeleteFromDialog = async () => {
    if (currentProject.id && window.confirm('Вы уверены, что хотите удалить этот проект?')) {
      try {
        await projectsAPI.delete(currentProject.id);
        navigate('/app/projects');
        handleCloseDialog();
      } catch (err) {
        console.error('Error deleting project:', err);
        setError(err.message || 'Ошибка при удалении проекта');
      }
    }
  };

  // Изменить поле проекта
  const handleFieldChange = (field, value) => {
    setCurrentProject({ ...currentProject, [field]: value });
  };

  // Открыть диалог создания сметы
  const handleOpenCreateEstimate = () => {
    setOpenEstimateDialog(true);
  };

  // Закрыть диалог создания сметы
  const handleCloseEstimateDialog = () => {
    setOpenEstimateDialog(false);
  };

  // Сохранить новую смету
  const handleSaveEstimate = async (estimateData) => {
    try {
      // Создать смету через API
      const newEstimate = await estimatesAPI.create(id, estimateData);
      
      console.log('Estimate created successfully:', newEstimate);
      
      // Переходим к просмотру созданной сметы
      navigate(`/app/projects/${id}/estimates/${newEstimate.id}`, {
        state: { 
          estimateData: newEstimate, 
          projectName: project?.name 
        }
      });
    } catch (error) {
      console.error('Failed to create estimate:', error);
      // Пробрасываем ошибку обратно в диалог для отображения
      throw error;
    }
  };

  // Удалить смету
  const handleDeleteEstimate = async (estimateId, e) => {
    // Предотвращаем переход к смете при клике на кнопку удаления
    e.stopPropagation();
    
    if (!window.confirm('Вы уверены, что хотите удалить эту смету? Все данные сметы, включая параметры объекта и проемы, будут удалены без возможности восстановления.')) {
      return;
    }

    try {
      await estimatesAPI.delete(estimateId);
      
      // Обновляем список смет, удаляя удаленную смету
      setEstimates(prevEstimates => prevEstimates.filter(est => est.id !== estimateId));
      
      console.log('Estimate deleted successfully:', estimateId);
    } catch (error) {
      console.error('Failed to delete estimate:', error);
      alert('Ошибка при удалении сметы: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  // Обработчик изменения статуса проекта
  const handleStatusChange = async (newStatus) => {
    try {
      setStatusLoading(true);
      
      const response = await projectsAPI.updateStatus(id, newStatus);
      
      // Обновляем локальное состояние проекта
      setProject(prevProject => ({
        ...prevProject,
        status: newStatus
      }));
      
      setSnackbar({
        open: true,
        message: `Статус проекта изменён на "${getStatusText(newStatus)}"`,
        severity: 'success'
      });
      
      console.log('Project status updated:', response);
    } catch (error) {
      console.error('Failed to update project status:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при изменении статуса: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    } finally {
      setStatusLoading(false);
    }
  };

  // Закрыть snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Открыть меню смены статуса сметы
  const handleOpenEstimateStatusMenu = (event, estimate) => {
    event.stopPropagation();
    setEstimateStatusMenu(event.currentTarget);
    setSelectedEstimate(estimate);
  };
  
  // Закрыть меню статуса сметы
  const handleCloseEstimateStatusMenu = () => {
    setEstimateStatusMenu(null);
    setSelectedEstimate(null);
  };
  
  // Изменить статус сметы
  const handleChangeEstimateStatus = async (newStatus) => {
    if (!selectedEstimate) return;
    
    try {
      await estimatesAPI.update(selectedEstimate.id, { status: newStatus });
      
      // Обновляем локальное состояние
      setEstimates(prevEstimates => 
        prevEstimates.map(est => 
          est.id === selectedEstimate.id 
            ? { ...est, status: newStatus }
            : est
        )
      );
      
      setSnackbar({
        open: true,
        message: `Статус сметы изменён на "${getEstimateStatusLabel(newStatus)}"`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to update estimate status:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при изменении статуса сметы',
        severity: 'error'
      });
    } finally {
      handleCloseEstimateStatusMenu();
    }
  };

  // Loading state
  if (loading) {
    return (
      <MainCard>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  // Error state
  if (error) {
    return (
      <MainCard>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/app/projects')}>
          Вернуться к списку
        </Button>
      </MainCard>
    );
  }

  // Not found state
  if (!project) {
    return (
      <MainCard>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Проект не найден
        </Alert>
        <Button variant="contained" onClick={() => navigate('/app/projects')}>
          Вернуться к списку
        </Button>
      </MainCard>
    );
  }

  // Вычисление дней до завершения
  const getDaysRemaining = () => {
    const today = new Date();
    const endDate = new Date(project.endDate);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  // Данные команды и активностей загружаются из API в useEffect выше

  return (
    <MainCard
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/app/projects')} color="primary">
            <IconArrowLeft />
          </IconButton>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <IconBriefcase size={24} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h2">{project.objectName}</Typography>
            <Typography variant="body2" color="text.secondary">
              ID проекта: #{project.id}
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<IconFileText />}
            onClick={handleOpenCreateEstimate}
            sx={{ mr: 1 }}
          >
            Создать смету
          </Button>
          <Button variant="contained" color="primary" startIcon={<IconEdit />} onClick={() => handleOpenEdit(project)}>
            Редактировать
          </Button>
        </Box>
      }
    >
      {/* Статус и основная информация */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'primary.light' }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <Box>
                  <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                    Статус проекта
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <StatusChangeMenu 
                      currentStatus={project.status}
                      onStatusChange={handleStatusChange}
                      loading={statusLoading}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box>
                  <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                    Прогресс выполнения
                  </Typography>
                  <Typography variant="h3" color="primary.dark">
                    {project.progress}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconClock size={20} />
                  <Box>
                    <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                      Осталось дней
                    </Typography>
                    <Typography variant="h4" color={daysRemaining < 30 ? 'error.main' : 'primary.dark'}>
                      {daysRemaining > 0 ? daysRemaining : 'Просрочен'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconCalendar size={20} />
                  <Box>
                    <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                      Дата окончания
                    </Typography>
                    <Typography variant="body1" color="primary.dark" fontWeight={500}>
                      {formatDate(project.endDate)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Основной контент: левая колонка (информация + список) и правая колонка (график) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Левая колонка */}
        <Grid item xs={12} lg={6}>
          {/* Информация о проекте */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconBuilding size={20} />
                <Typography variant="h5">Информация о проекте</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Заказчик
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {project.client}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Подрядчик
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {project.contractor}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Адрес объекта
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <IconMapPin size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {project.address}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Дата начала
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(project.startDate)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Дата окончания
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(project.endDate)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Список смет */}
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Typography variant="h5" gutterBottom>
                Список смет
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>№</TableCell>
                      <TableCell sx={{ py: 1 }}>Название</TableCell>
                      <TableCell sx={{ py: 1 }}>Дата</TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>Статус</TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estimates.length > 0 ? (
                      estimates.map((estimate, index) => (
                        <TableRow 
                          key={estimate.id}
                          hover
                          sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                          onClick={() => navigate(`/app/projects/${id}/estimates/${estimate.id}`)}
                        >
                          <TableCell sx={{ py: 1.5 }}>{index + 1}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{estimate.name}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{formatDate(estimate.created_at)}</TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <Chip 
                              label={getEstimateStatusLabel(estimate.status || 'draft')} 
                              size="small" 
                              color={getEstimateStatusColor(estimate.status || 'draft')}
                              onClick={(e) => handleOpenEstimateStatusMenu(e, estimate)}
                              sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => handleDeleteEstimate(estimate.id, e)}
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: 'error.lighter' 
                                } 
                              }}
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Смет пока нет
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Правая колонка - Финансовая сводка */}
        <Grid item xs={12} lg={6}>
          <FinancialSummaryChart projectId={project?.id} estimates={estimates} />
        </Grid>
      </Grid>

      {/* Модальное окно редактирования проекта */}
      <ProjectDialog
        open={openDialog}
        editMode={true}
        project={currentProject}
        onClose={handleCloseDialog}
        onSave={handleSaveProject}
        onDelete={handleDeleteFromDialog}
        onChange={handleFieldChange}
      />

      {/* Диалог создания сметы */}
      <CreateEstimateDialog
        open={openEstimateDialog}
        onClose={handleCloseEstimateDialog}
        onSave={handleSaveEstimate}
        projectName={project?.name}
        projectId={id}
      />

      {/* Меню смены статуса сметы */}
      <Menu
        anchorEl={estimateStatusMenu}
        open={Boolean(estimateStatusMenu)}
        onClose={handleCloseEstimateStatusMenu}
      >
        {estimateStatuses.map((status) => (
          <MenuItem 
            key={status.value} 
            onClick={() => handleChangeEstimateStatus(status.value)}
            selected={selectedEstimate?.status === status.value}
          >
            <Chip 
              label={status.label} 
              size="small" 
              color={status.color}
              sx={{ minWidth: 100 }}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainCard>
  );
};

export default ProjectDashboard;
