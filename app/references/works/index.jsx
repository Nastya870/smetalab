import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import debounce from 'lodash.debounce';
import { TableVirtuoso } from 'react-virtuoso';

// material-ui
import {
  Grid,
  Typography,
  Divider,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Tooltip
} from '@mui/material';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconWorld, IconBuilding, IconDownload, IconUpload } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import EmptyState from './EmptyState';
import { emptyWork } from './mockData';
import worksAPI from 'api/works';
import worksImportExportAPI from 'api/worksImportExport';
import ImportDialog from './ImportDialog';
import { fullTextSearch } from 'shared/lib/utils/fullTextSearch';

// Code Splitting: Lazy load WorkDialog (загружается только при открытии)
const WorkDialog = lazy(() => import('./WorkDialog'));

// ==============================|| WORKS REFERENCE PAGE ||============================== //

const WorksReferencePage = () => {
  // State
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWork, setCurrentWork] = useState(emptyWork);
  const [searchInput, setSearchInput] = useState(''); // Для input (мгновенно)
  const [searchTerm, setSearchTerm] = useState(''); // Для фильтрации (debounced)
  const [globalFilter, setGlobalFilter] = useState('all'); // 'all' | 'global' | 'tenant'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openImportDialog, setOpenImportDialog] = useState(false);

  // Debounced поиск (обновляет searchTerm через 300ms после последнего ввода)
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Очистка debounce при размонтировании
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Загрузка данных из API при монтировании
  useEffect(() => {
    fetchWorks();
  }, [globalFilter]); // Перезагружаем при изменении фильтра

  // Функция загрузки работ
  const fetchWorks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        pageSize: 20000 // Загружаем все записи для виртуализации (увеличено для поддержки больших баз)
      };
      if (globalFilter === 'global') params.isGlobal = 'true';
      if (globalFilter === 'tenant') params.isGlobal = 'false';
      
      const response = await worksAPI.getAll(params);
      
      // Обработка response
      if (response.data) {
        setWorks(response.data);
      } else {
        // Fallback для старого формата API
        setWorks(Array.isArray(response) ? response : []);
      }
    } catch (err) {
      console.error('Error loading works:', err);
      setError('Ошибка загрузки данных. Проверьте подключение к серверу.');
      showSnackbar('Ошибка загрузки работ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Показать уведомление
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Закрыть уведомление
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Мемоизированная фильтрация работ с полнотекстовым поиском
  // Поддерживает поиск по нескольким словам одновременно
  const filteredWorks = useMemo(() => {
    if (!searchTerm) return works; // Если поиск пустой, возвращаем все работы
    
    // Используем полнотекстовый поиск по всем полям
    return fullTextSearch(works, searchTerm, ['name', 'code', 'unit', 'category']);
  }, [works, searchTerm]);

  // Мемоизированные обработчики (стабильные функции, не пересоздаются при каждом рендере)
  const handleOpenCreate = useCallback(() => {
    setEditMode(false);
    setCurrentWork(emptyWork);
    setOpenDialog(true);
  }, []);

  const handleOpenEdit = useCallback((work) => {
    setEditMode(true);
    setCurrentWork({ ...work });
    setOpenDialog(true);
  }, []);

  // Закрыть модалку
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setCurrentWork(emptyWork);
  }, []);

  // Сохранить работу (OPTIMISTIC UI)
  const handleSaveWork = async () => {
    try {
      if (editMode) {
        // OPTIMISTIC UPDATE: обновляем UI мгновенно
        const previousWorks = [...works]; // Backup для rollback
        const optimisticUpdate = { ...currentWork, _optimistic: true };
        
        setWorks(works.map((w) => (w.id === currentWork.id ? optimisticUpdate : w)));
        showSnackbar('Работа обновляется...', 'info');
        handleCloseDialog();
        
        try {
          // Реальный API call
          const updated = await worksAPI.update(currentWork.id, {
            code: currentWork.code,
            name: currentWork.name,
            category: currentWork.category,
            unit: currentWork.unit,
            basePrice: currentWork.basePrice,
            phase: currentWork.phase || null,
            section: currentWork.section || null,
            subsection: currentWork.subsection || null
          });
          
          // Заменяем optimistic на реальные данные
          setWorks(prev => prev.map((w) => (w.id === updated.id ? updated : w)));
          showSnackbar('Работа успешно обновлена', 'success');
        } catch (err) {
          // ROLLBACK: восстанавливаем предыдущее состояние
          setWorks(previousWorks);
          console.error('Error updating work:', err);
          showSnackbar(err.response?.data?.message || 'Ошибка при обновлении работы', 'error');
          throw err;
        }
      } else {
        // OPTIMISTIC CREATE: добавляем работу мгновенно с временным ID
        const optimisticWork = {
          ...currentWork,
          id: `temp-${Date.now()}`, // Временный ID
          _optimistic: true
        };
        
        // Мгновенно обновляем UI
        setWorks([optimisticWork, ...works]);
        showSnackbar('Работа создается...', 'info');
        handleCloseDialog();
        
        try {
          // Отправляем реальный запрос
          const created = await worksAPI.create({
            code: currentWork.code,
            name: currentWork.name,
            category: currentWork.category,
            unit: currentWork.unit,
            basePrice: currentWork.basePrice,
            phase: currentWork.phase || null,
            section: currentWork.section || null,
            subsection: currentWork.subsection || null
          });
          
          // Заменяем optimistic на реальный
          setWorks(prev => prev.map(w => 
            w.id === optimisticWork.id ? created : w
          ));
          showSnackbar('Работа успешно создана', 'success');
          
          // Обновляем totalRecords для pagination
          setTotalRecords(prev => prev + 1);
        } catch (err) {
          // ROLLBACK: удаляем optimistic работу при ошибке
          setWorks(prev => prev.filter(w => w.id !== optimisticWork.id));
          console.error('Error creating work:', err);
          showSnackbar(err.response?.data?.message || 'Ошибка при создании работы', 'error');
          throw err;
        }
      }
    } catch (err) {
      console.error('Error saving work:', err);
      // Ошибка уже обработана в блоках create/update
      if (!editMode) {
        // Для create ошибка уже показана
      }
    }
  };

  // Удалить работу (OPTIMISTIC DELETE)
  const handleDeleteWork = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту работу?')) {
      // OPTIMISTIC DELETE: удаляем мгновенно из UI
      const deletedWork = works.find(w => w.id === id);
      const previousWorks = [...works]; // Backup для rollback
      
      setWorks(works.filter((w) => w.id !== id));
      showSnackbar('Работа удаляется...', 'info');
      
      // Обновляем totalRecords для pagination
      setTotalRecords(prev => Math.max(0, prev - 1));
      
      try {
        // Реальный API call
        await worksAPI.delete(id);
        showSnackbar('Работа успешно удалена', 'success');
      } catch (err) {
        // ROLLBACK: восстанавливаем удаленную работу
        setWorks(previousWorks);
        setTotalRecords(prev => prev + 1); // Восстанавливаем count
        console.error('Error deleting work:', err);
        showSnackbar(err.response?.data?.message || 'Ошибка удаления работы', 'error');
      }
    }
  };

  // Удалить работу из модалки (OPTIMISTIC DELETE)
  const handleDeleteFromDialog = async () => {
    if (currentWork.id && window.confirm('Вы уверены, что хотите удалить эту работу?')) {
      const deletedId = currentWork.id;
      const previousWorks = [...works]; // Backup для rollback
      
      // OPTIMISTIC DELETE: удаляем мгновенно
      setWorks(works.filter((w) => w.id !== deletedId));
      showSnackbar('Работа удаляется...', 'info');
      handleCloseDialog();
      
      // Обновляем totalRecords
      setTotalRecords(prev => Math.max(0, prev - 1));
      
      try {
        // Реальный API call
        await worksAPI.delete(deletedId);
        showSnackbar('Работа успешно удалена', 'success');
      } catch (err) {
        // ROLLBACK: восстанавливаем
        setWorks(previousWorks);
        setTotalRecords(prev => prev + 1);
        console.error('Error deleting work:', err);
        showSnackbar(err.response?.data?.message || 'Ошибка удаления работы', 'error');
      }
    }
  };

  // Изменить поле работы
  const handleFieldChange = (field, value) => {
    setCurrentWork({ ...currentWork, [field]: value });
  };

  // Открыть диалог импорта
  const handleOpenImport = () => {
    setOpenImportDialog(true);
  };

  // Закрыть диалог импорта
  const handleCloseImport = () => {
    setOpenImportDialog(false);
  };

  // Успешный импорт
  const handleImportSuccess = () => {
    fetchWorks(); // Перезагрузить список работ
    showSnackbar('Работы успешно импортированы', 'success');
  };

  // Форматирование цены
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <MainCard title="Справочник работ">
      {/* Шапка с кнопкой добавления */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h3" color="textPrimary">
          Виды работ
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="outlined" 
            startIcon={<IconUpload />} 
            onClick={handleOpenImport}
          >
            Импорт
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<IconPlus />} 
            onClick={handleOpenCreate}
          >
            Добавить работу
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Ошибка загрузки */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Индикатор загрузки */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Контент */}
      {!loading && (
        <>

      {/* Поиск и фильтр */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Поиск по названию, коду или единице измерения..."
          value={searchInput}
          onChange={(e) => {
            const value = e.target.value;
            setSearchInput(value);
            debouncedSearch(value);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch />
              </InputAdornment>
            )
          }}
        />
        
        {/* Фильтр по типу (глобальный/тенантный) */}
        <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Тип работ:
          </Typography>
          <ToggleButtonGroup
            value={globalFilter}
            exclusive
            onChange={(e, newValue) => newValue && setGlobalFilter(newValue)}
            size="small"
          >
            <ToggleButton value="all">
              Все
            </ToggleButton>
            <ToggleButton value="global">
              <IconWorld size={18} style={{ marginRight: 4 }} />
              Глобальные
            </ToggleButton>
            <ToggleButton value="tenant">
              <IconBuilding size={18} style={{ marginRight: 4 }} />
              Мои
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, bgcolor: 'primary.light', textAlign: 'center' }}>
            <Typography variant="h2" color="primary.dark">
              {works.length}
            </Typography>
            <Typography variant="body2" color="primary.dark">
              Всего работ
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, bgcolor: 'success.light', textAlign: 'center' }}>
            <Typography variant="h2" color="success.dark">
              {new Set(works.map((w) => w.category)).size}
            </Typography>
            <Typography variant="body2" color="success.dark">
              Категорий
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, bgcolor: 'warning.light', textAlign: 'center' }}>
            <Typography variant="h2" color="warning.dark">
              {formatPrice(works.reduce((sum, w) => sum + w.basePrice, 0) / works.length)}
            </Typography>
            <Typography variant="body2" color="warning.dark">
              Средняя базовая цена
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Таблица работ */}
      {filteredWorks.length > 0 ? (
        <Paper>
        <TableVirtuoso
          data={filteredWorks}
          style={{ height: 600 }}
          components={{
            Scroller: React.forwardRef((props, ref) => (
              <TableContainer {...props} ref={ref} sx={{ overflowX: 'auto', maxWidth: '100%' }} />
            )),
            Table: (props) => <Table {...props} sx={{ tableLayout: 'fixed' }} />,
            TableHead: TableHead,
            TableRow: TableRow,
            TableBody: TableBody,
          }}
          fixedHeaderContent={() => (
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell sx={{ width: '120px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Код
                </Typography>
              </TableCell>
              <TableCell sx={{ width: 'auto', minWidth: '300px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Наименование
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ width: '100px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Ед. изм.
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ width: '150px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Базовая цена
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ width: '120px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Действия
                </Typography>
              </TableCell>
            </TableRow>
          )}
          itemContent={(index, work) => {
            // Формируем строку иерархии
            const hierarchyParts = [work.phase, work.section, work.subsection].filter(Boolean);
            const hierarchyText = hierarchyParts.length > 0 ? hierarchyParts.join(' → ') : null;
            
            return (
              <>
                <TableCell sx={{ width: '120px' }}>
                  <Typography variant="body2" fontWeight={500}>
                    {work.code}
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: 'auto', minWidth: '300px' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Tooltip title={work.is_global ? 'Глобальная работа' : 'Работа компании'}>
                      {work.is_global ? (
                        <IconWorld size={16} style={{ color: '#1976d2', flexShrink: 0 }} />
                      ) : (
                        <IconBuilding size={16} style={{ color: '#757575', flexShrink: 0 }} />
                      )}
                    </Tooltip>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{work.name}</Typography>
                      {hierarchyText && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'success.main',
                            fontSize: '0.7rem',
                            fontStyle: 'italic',
                            display: 'block',
                            mt: 0.25
                          }}
                        >
                          {hierarchyText}
                        </Typography>
                      )}
                      {work._optimistic && (
                        <Chip
                          label="Сохраняется..."
                          size="small"
                          color="warning"
                          sx={{ animation: 'pulse 1.5s infinite', mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ width: '100px' }}>
                  <Typography variant="body2">{work.unit}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ width: '150px' }}>
                  <Typography variant="body1" fontWeight={500}>
                    {formatPrice(work.base_price || work.basePrice)}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ width: '120px' }}>
                  <IconButton size="small" color="primary" onClick={() => handleOpenEdit(work)}>
                    <IconEdit size={18} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteWork(work.id)}>
                    <IconTrash size={18} />
                  </IconButton>
                </TableCell>
              </>
            );
          }}
          />
        </Paper>
      ) : works.length === 0 ? (
        <EmptyState onCreateClick={handleOpenCreate} />
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h4" color="text.secondary">
            Ничего не найдено
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Попробуйте изменить критерии поиска
          </Typography>
        </Box>
      )}

      {/* Модальное окно создания/редактирования работы (Code Splitting) */}
      {openDialog && (
        <Suspense fallback={<CircularProgress />}>
          <WorkDialog
            open={openDialog}
            editMode={editMode}
            work={currentWork}
            onClose={handleCloseDialog}
            onSave={handleSaveWork}
            onDelete={handleDeleteFromDialog}
            onChange={handleFieldChange}
          />
        </Suspense>
      )}

      {/* Диалог импорта */}
      <ImportDialog
        open={openImportDialog}
        onClose={handleCloseImport}
        onSuccess={handleImportSuccess}
        isGlobal={globalFilter === 'global'}
      />
      </>
      )}

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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

export default WorksReferencePage;
