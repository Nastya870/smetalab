import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';

// material-ui
import {
  Grid,
  Typography,
  Divider,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  TablePagination,
  InputAdornment
} from '@mui/material';
import { IconPlus, IconSearch } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import ProjectCard from './ProjectCard';
// Code Splitting: ProjectDialog загружается только при открытии
const ProjectDialog = lazy(() => import('./ProjectDialog'));
import ProjectStatsCard from './ProjectStatsCard';
import EmptyState from './EmptyState';

// utils and API
import { formatCurrency } from './utils';
import { emptyProject } from './mockData';
import { projectsAPI } from 'api/projects';
import useAuth from 'hooks/useAuth';

// ==============================|| PROJECTS PAGE ||============================== //

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { tenant } = useAuth(); // Получаем данные нашей компании

  // State: Data
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    planning: 0,
    approval: 0,
    inProgress: 0,
    rejected: 0,
    completed: 0,
    totalBudget: 0
  });

  // State: UI Controls
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProject, setCurrentProject] = useState(emptyProject);

  // State: Search & Filters (Phase 1: Debounce)
  const [searchInput, setSearchInput] = useState(''); // Для input (мгновенный)
  const [searchTerm, setSearchTerm] = useState(''); // Для API (debounced)
  const [statusFilter, setStatusFilter] = useState(''); // all|planning|active|completed|on_hold

  // State: Pagination (Phase 2)
  const [page, setPage] = useState(0); // MUI uses 0-based
  const [rowsPerPage, setRowsPerPage] = useState(12); // 12 карточек на странице (3x4 grid)
  const [totalRecords, setTotalRecords] = useState(0);

  // State: Loading & Errors
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Debounced Search (Phase 1: Quick Win - 300ms delay)
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearchTerm(value);
        setPage(0); // Сбросить на первую страницу при новом поиске
      }, 300),
    []
  );

  useEffect(() => {
    return () => debouncedSearch.cancel(); // Cleanup
  }, [debouncedSearch]);

  // Snackbar helper (Phase 1: Error handling)
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar({ ...snackbar, open: false });
  }, [snackbar]);

  // Fetch Projects (Phase 1: API Integration + Phase 2: Pagination)
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1, // Backend uses 1-based pagination
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter || undefined, // Не отправляем пустую строку
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };

      const response = await projectsAPI.getAll(params);
      setProjects(response.data || []);
      setTotalRecords(response.pagination?.totalItems || 0);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showSnackbar(error.response?.data?.message || 'Ошибка загрузки проектов', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, showSnackbar]);

  // Fetch Statistics (Phase 1: API Integration)
  const fetchStats = useCallback(async () => {
    try {
      const response = await projectsAPI.getStats();
      setStats({
        total: response.data?.total || 0,
        planning: response.data?.planning || 0,
        approval: response.data?.approval || 0,
        inProgress: response.data?.inProgress || 0,
        rejected: response.data?.rejected || 0,
        completed: response.data?.completed || 0,
        totalBudget: response.data?.totalBudget || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Не показываем snackbar для stats - не критично
    }
  }, []);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handlers (Phase 1: useCallback для мемоизации)
  const handleOpenCreate = useCallback(() => {
    setEditMode(false);
    // Автозаполнение подрядчика нашей компанией
    setCurrentProject({
      ...emptyProject,
      contractor: tenant?.name || ''
    });
    setOpenDialog(true);
  }, [tenant]);

  const handleOpenEdit = useCallback((project) => {
    setEditMode(true);
    setCurrentProject({ ...project });
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setCurrentProject(emptyProject);
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setCurrentProject((prev) => ({ ...prev, [field]: value }));
  }, []);

  // PHASE 3: OPTIMISTIC CREATE/UPDATE
  const handleSaveProject = async () => {
    try {
      if (editMode) {
        // ========== OPTIMISTIC UPDATE ==========
        const previousProjects = [...projects]; // Backup для rollback
        const optimisticUpdate = { ...currentProject, _optimistic: true };

        setProjects(projects.map((p) => (p.id === currentProject.id ? optimisticUpdate : p)));
        showSnackbar('Проект обновляется...', 'info');
        handleCloseDialog();

        try {
          await projectsAPI.update(currentProject.id, currentProject);

          // Обновляем со свежими данными с сервера
          await fetchProjects();
          await fetchStats();
          showSnackbar('Проект успешно обновлен', 'success');
        } catch (err) {
          // ROLLBACK: восстанавливаем предыдущее состояние
          setProjects(previousProjects);
          console.error('Error updating project:', err);
          showSnackbar(err.response?.data?.message || 'Ошибка при обновлении проекта', 'error');
          throw err;
        }
      } else {
        // ========== OPTIMISTIC CREATE ==========
        const optimisticProject = {
          ...currentProject,
          id: `temp-${Date.now()}`, // Временный ID
          name: currentProject.objectName || currentProject.name,
          _optimistic: true // Флаг для визуальной индикации
        };

        // Мгновенно добавляем в UI
        setProjects([optimisticProject, ...projects]);
        showSnackbar('Проект создается...', 'info');
        handleCloseDialog();

        try {
          await projectsAPI.create(currentProject);

          // Обновляем список со свежими данными
          await fetchProjects();
          await fetchStats();
          showSnackbar('Проект успешно создан', 'success');
        } catch (err) {
          // ROLLBACK: удаляем optimistic проект при ошибке
          setProjects((prev) => prev.filter((p) => p.id !== optimisticProject.id));
          console.error('Error creating project:', err);
          showSnackbar(err.response?.data?.message || 'Ошибка при создании проекта', 'error');
          throw err;
        }
      }
    } catch (error) {
      // Ошибка уже обработана выше
    }
  };

  // PHASE 3: OPTIMISTIC DELETE
  const handleDeleteProject = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот проект?')) {
      const previousProjects = [...projects]; // Backup
      const previousTotal = totalRecords;

      // Мгновенно удаляем из UI
      setProjects(projects.filter((p) => p.id !== id));
      setTotalRecords((prev) => Math.max(0, prev - 1));
      showSnackbar('Проект удаляется...', 'info');

      try {
        await projectsAPI.delete(id);
        await fetchStats(); // Обновляем статистику
        showSnackbar('Проект успешно удален', 'success');
      } catch (err) {
        // ROLLBACK: восстанавливаем удаленный проект
        setProjects(previousProjects);
        setTotalRecords(previousTotal);
        console.error('Error deleting project:', err);
        showSnackbar(err.response?.data?.message || 'Ошибка при удалении проекта', 'error');
      }
    }
  };

  const handleDeleteFromDialog = () => {
    if (currentProject.id) {
      handleCloseDialog();
      handleDeleteProject(currentProject.id);
    }
  };

  const handleOpenProject = useCallback(
    (project) => {
      navigate(`/app/projects/${project.id}`);
    },
    [navigate]
  );

  // Pagination handlers (Phase 2)
  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Сбросить на первую страницу
  }, []);

  return (
    <MainCard title="Проекты">
      {/* Шапка с кнопкой добавления */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h3" color="textPrimary">
          Управление проектами
        </Typography>
        <Button variant="contained" color="primary" startIcon={<IconPlus />} size="large" onClick={handleOpenCreate}>
          Создать проект
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Статистика - компактная в одну строку */}
      <Box sx={{ mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <ProjectStatsCard title="Всего проектов" value={stats.total} bgcolor="primary.light" color="primary.dark" />
        <ProjectStatsCard title="Планирование" value={stats.planning} bgcolor="warning.light" color="warning.dark" />
        <ProjectStatsCard title="Согласование" value={stats.approval} bgcolor="info.light" color="info.dark" />
        <ProjectStatsCard title="В работе" value={stats.inProgress} bgcolor="secondary.light" color="secondary.dark" />
        <ProjectStatsCard title="Отказ" value={stats.rejected} bgcolor="error.light" color="error.dark" />
        <ProjectStatsCard title="Завершено" value={stats.completed} bgcolor="success.light" color="success.dark" />
      </Box>

      {/* Поиск и фильтры (Phase 1 + Phase 2) */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search с debounce */}
        <TextField
          sx={{ flex: '1 1 300px' }}
          placeholder="Поиск по названию, объекту, заказчику, подрядчику, адресу..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            debouncedSearch(e.target.value);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={20} />
              </InputAdornment>
            )
          }}
        />

        {/* Фильтр по статусу */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            value={statusFilter}
            label="Статус"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="planning">Планирование</MenuItem>
            <MenuItem value="approval">Согласование</MenuItem>
            <MenuItem value="in_progress">В работе</MenuItem>
            <MenuItem value="rejected">Отказ</MenuItem>
            <MenuItem value="completed">Завершено</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Список проектов с loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : projects.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={project.id}>
                <ProjectCard
                  project={project}
                  onOpen={handleOpenProject}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteProject}
                  // Phase 3: Optimistic UI visual feedback
                  sx={{
                    opacity: project._optimistic ? 0.6 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                  optimistic={project._optimistic}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination (Phase 2) */}
          {totalRecords > rowsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <TablePagination
                component="div"
                count={totalRecords}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[12, 24, 48]}
                labelRowsPerPage="Проектов на странице:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count !== -1 ? count : `более ${to}`}`}
              />
            </Box>
          )}
        </>
      ) : (
        <EmptyState onCreateClick={handleOpenCreate} />
      )}

      {/* Модальное окно создания/редактирования проекта (Phase 2: Code Splitting) */}
      {openDialog && (
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          }
        >
          <ProjectDialog
            open={openDialog}
            editMode={editMode}
            project={currentProject}
            onClose={handleCloseDialog}
            onSave={handleSaveProject}
            onDelete={handleDeleteFromDialog}
            onChange={handleFieldChange}
          />
        </Suspense>
      )}

      {/* Snackbar для уведомлений (Phase 1 + Phase 3) */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainCard>
  );
};

export default ProjectsPage;
