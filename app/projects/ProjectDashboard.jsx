import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconMapPin,
  IconEdit,
  IconFileText,
  IconClock,
  IconTrash,
  IconCheck,
  IconProgress,
  IconBuilding
} from '@tabler/icons-react';

// project imports
import ProjectDialog from './ProjectDialog';
import CreateEstimateDialog from '../estimates/CreateEstimateDialog';
import StatusChangeMenu from './StatusChangeMenu';
import FinancialSummaryChart from './FinancialSummaryChart';
import { getStatusText, formatDate } from './utils';
import { emptyProject } from './mockData';
import { projectsAPI } from 'api/projects';
import { estimatesAPI } from 'api/estimatesAPI';
import { useProjectDashboard } from 'hooks/useProjectDashboard';

const ProjectDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
    project, 
    estimates, 
    financialSummary,
    isLoading: loading, 
    error: loadError,
    refresh 
  } = useProjectDashboard(id);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProject, setCurrentProject] = useState(emptyProject);
  const [openEstimateDialog, setOpenEstimateDialog] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [estimateStatusMenu, setEstimateStatusMenu] = useState(null);
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  const estimateStatuses = [
    { value: 'draft', label: 'Черновик', color: '#6B7280', bg: '#F3F4F6' },
    { value: 'approved', label: 'Утверждена', color: '#16A34A', bg: '#E6FCEB' },
    { value: 'in_progress', label: 'В работе', color: '#4F46E5', bg: '#EEF2FF' }
  ];
  
  const getEstimateStatusStyle = (status) => {
    const s = estimateStatuses.find(st => st.value === status) || estimateStatuses[0];
    return { color: s.color, bg: s.bg, label: s.label };
  };

  const handleOpenEdit = (proj) => {
    setCurrentProject({ ...proj });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentProject(emptyProject);
  };

  const handleSaveProject = async () => {
    try {
      await projectsAPI.update(currentProject.id, currentProject);
      refresh();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Ошибка при сохранении', severity: 'error' });
    }
  };

  const handleDeleteFromDialog = async () => {
    if (currentProject.id && window.confirm('Удалить проект?')) {
      try {
        await projectsAPI.delete(currentProject.id);
        navigate('/app/projects');
      } catch (err) {
        setSnackbar({ open: true, message: err.message || 'Ошибка при удалении', severity: 'error' });
      }
    }
  };

  const handleFieldChange = (field, value) => {
    setCurrentProject({ ...currentProject, [field]: value });
  };

  const handleOpenCreateEstimate = () => setOpenEstimateDialog(true);
  const handleCloseEstimateDialog = () => setOpenEstimateDialog(false);

  const handleSaveEstimate = async (estimateData) => {
    const newEstimate = await estimatesAPI.create(id, estimateData);
    navigate(`/app/projects/${id}/estimates/${newEstimate.id}`, {
      state: { estimateData: newEstimate, projectName: project?.name }
    });
    return newEstimate;
  };

  const handleDeleteEstimate = async (estimateId, e) => {
    e.stopPropagation();
    if (!window.confirm('Удалить смету?')) return;
    try {
      await estimatesAPI.delete(estimateId);
      refresh();
      setSnackbar({ open: true, message: 'Смета удалена', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Ошибка удаления', severity: 'error' });
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusLoading(true);
      await projectsAPI.updateStatus(id, newStatus);
      refresh();
      setSnackbar({ open: true, message: `Статус: ${getStatusText(newStatus)}`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Ошибка изменения статуса', severity: 'error' });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOpenEstimateStatusMenu = (event, estimate) => {
    event.stopPropagation();
    setEstimateStatusMenu(event.currentTarget);
    setSelectedEstimate(estimate);
  };
  
  const handleCloseEstimateStatusMenu = () => {
    setEstimateStatusMenu(null);
    setSelectedEstimate(null);
  };
  
  const handleChangeEstimateStatus = async (newStatus) => {
    if (!selectedEstimate) return;
    try {
      await estimatesAPI.update(selectedEstimate.id, { status: newStatus });
      refresh();
      setSnackbar({ open: true, message: 'Статус сметы изменён', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Ошибка изменения статуса', severity: 'error' });
    } finally {
      handleCloseEstimateStatusMenu();
    }
  };

  const getDaysRemaining = () => {
    if (!project?.endDate) return null;
    const today = new Date();
    const endDate = new Date(project.endDate);
    return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: '#F3F4F6', minHeight: 'calc(100vh - 88px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress size={28} sx={{ color: '#6B7280' }} />
      </Box>
    );
  }

  if (loadError || !project) {
    return (
      <Box sx={{ bgcolor: '#F3F4F6', minHeight: 'calc(100vh - 88px)', p: 3 }}>
        <Alert severity={loadError ? 'error' : 'warning'} sx={{ mb: 2 }}>
          {loadError?.message || 'Проект не найден'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/app/projects')} size="small">
          К списку проектов
        </Button>
      </Box>
    );
  }

  const daysRemaining = getDaysRemaining();

  const metrics = [
    { icon: IconCheck, label: 'Статус', isStatus: true },
    { icon: IconProgress, label: 'Прогресс', value: `${project.progress || 0}%` },
    { icon: IconClock, label: 'Осталось дней', value: daysRemaining !== null ? (daysRemaining > 0 ? daysRemaining : 'Просрочен') : '—', alert: daysRemaining !== null && daysRemaining < 30 && daysRemaining > 0 },
    { icon: IconCalendar, label: 'Дата окончания', value: formatDate(project.endDate) || '—' }
  ];

  return (
    <Box sx={{ bgcolor: '#F3F4F6', minHeight: 'calc(100vh - 88px)', p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/app/projects')} size="small" sx={{ color: '#6B7280', '&:hover': { bgcolor: '#E5E7EB' } }}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconBriefcase size={18} color="#4F46E5" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{project.objectName}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>ID: {project.id?.slice(0, 8)}...</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="contained" startIcon={<IconFileText size={16} />} onClick={handleOpenCreateEstimate}
            sx={{ textTransform: 'none', fontSize: '0.875rem', fontWeight: 500, height: 38, bgcolor: '#4F46E5', borderRadius: '8px', px: 2, '&:hover': { bgcolor: '#4338CA' } }}>
            Создать смету
          </Button>
          <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={() => handleOpenEdit(project)}
            sx={{ textTransform: 'none', fontSize: '0.875rem', fontWeight: 500, height: 38, color: '#374151', borderColor: '#E5E7EB', borderRadius: '8px', px: 2, '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' } }}>
            Редактировать
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {metrics.map((metric, idx) => (
          <Grid key={idx} size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <metric.icon size={16} stroke={1.5} color="#6B7280" />
                <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>{metric.label}</Typography>
              </Box>
              {metric.isStatus ? (
                <StatusChangeMenu currentStatus={project.status} onStatusChange={handleStatusChange} loading={statusLoading} />
              ) : (
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: metric.alert ? '#EF4444' : '#111827' }}>{metric.value}</Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <IconBuilding size={16} stroke={1.5} color="#6B7280" />
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#1F2937' }}>Информация о проекте</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Заказчик</Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{project.client || '—'}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Подрядчик</Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{project.contractor || '—'}</Typography>
                </Box>
              </Grid>
              <Grid size={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Адрес объекта</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <IconMapPin size={14} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{project.address || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Дата начала</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{formatDate(project.startDate) || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Дата окончания</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{formatDate(project.endDate) || '—'}</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <IconFileText size={16} stroke={1.5} color="#6B7280" />
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#1F2937' }}>Список смет</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', ml: 'auto' }}>{estimates.length} смет</Typography>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ py: 1, fontSize: '0.6875rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>№</TableCell>
                    <TableCell sx={{ py: 1, fontSize: '0.6875rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Название</TableCell>
                    <TableCell sx={{ py: 1, fontSize: '0.6875rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Дата</TableCell>
                    <TableCell align="center" sx={{ py: 1, fontSize: '0.6875rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Статус</TableCell>
                    <TableCell align="center" sx={{ py: 1, borderBottom: '1px solid #E5E7EB', width: 50 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimates.length > 0 ? estimates.map((estimate, index) => {
                    const statusStyle = getEstimateStatusStyle(estimate.status || 'draft');
                    return (
                      <TableRow key={estimate.id} hover sx={{ cursor: 'pointer', '&:last-child td': { border: 0 }, '&:hover': { bgcolor: '#F9FAFB' } }}
                        onClick={() => navigate(`/app/projects/${id}/estimates/${estimate.id}`)}>
                        <TableCell sx={{ py: 1.5, fontSize: '0.8125rem', color: '#6B7280', verticalAlign: 'middle' }}>{index + 1}</TableCell>
                        <TableCell sx={{ py: 1.5, fontSize: '0.875rem', color: '#111827', fontWeight: 500, verticalAlign: 'middle' }}>{estimate.name}</TableCell>
                        <TableCell sx={{ py: 1.5, fontSize: '0.8125rem', color: '#6B7280', verticalAlign: 'middle' }}>{formatDate(estimate.created_at)}</TableCell>
                        <TableCell align="center" sx={{ py: 1.5, verticalAlign: 'middle' }}>
                          <Box onClick={(e) => handleOpenEstimateStatusMenu(e, estimate)}
                            sx={{ display: 'inline-flex', px: 1, py: 0.375, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, bgcolor: statusStyle.bg, color: statusStyle.color, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                            {statusStyle.label}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5, verticalAlign: 'middle' }}>
                          <IconButton size="small" onClick={(e) => handleDeleteEstimate(estimate.id, e)}
                            sx={{ color: '#9CA3AF', p: 0.5, opacity: 0.5, lineHeight: 1, '&:hover': { color: '#EF4444', bgcolor: '#FEF2F2', opacity: 1 } }}>
                            <IconTrash size={14} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Смет пока нет</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <FinancialSummaryChart financialSummary={financialSummary} isLoading={loading} />
        </Grid>
      </Grid>

      <ProjectDialog open={openDialog} editMode={true} project={currentProject} onClose={handleCloseDialog} onSave={handleSaveProject} onDelete={handleDeleteFromDialog} onChange={handleFieldChange} />
      <CreateEstimateDialog open={openEstimateDialog} onClose={handleCloseEstimateDialog} onSave={handleSaveEstimate} projectName={project?.name} projectId={id} />

      <Menu anchorEl={estimateStatusMenu} open={Boolean(estimateStatusMenu)} onClose={handleCloseEstimateStatusMenu} disableRestoreFocus
        PaperProps={{ sx: { borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', minWidth: 140 } }}>
        {estimateStatuses.map((status) => (
          <MenuItem key={status.value} onClick={() => handleChangeEstimateStatus(status.value)} selected={selectedEstimate?.status === status.value} sx={{ py: 1, fontSize: '0.875rem' }}>
            <Box sx={{ px: 1, py: 0.25, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, bgcolor: status.bg, color: status.color }}>{status.label}</Box>
          </MenuItem>
        ))}
      </Menu>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ borderRadius: '8px' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectDashboard;
