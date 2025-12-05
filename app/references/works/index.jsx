import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import debounce from 'lodash.debounce';
import { TableVirtuoso, Virtuoso } from 'react-virtuoso';

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
  Tooltip,
  Card,
  CardContent,
  useMediaQuery,
  useTheme
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWork, setCurrentWork] = useState(emptyWork);
  const [searchInput, setSearchInput] = useState(''); // Для input (мгновенно)
  const [searchTerm, setSearchTerm] = useState(''); // Для фильтрации (debounced)
  // Восстанавливаем фильтр из localStorage или используем 'global' по умолчанию
  const [globalFilter, setGlobalFilter] = useState(() => {
    return localStorage.getItem('worksGlobalFilter') || 'global';
  });
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

  // Сохранение фильтра в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('worksGlobalFilter', globalFilter);
  }, [globalFilter]);

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
    
    // Используем полнотекстовый поиск по всем полям (включая иерархию)
    return fullTextSearch(works, searchTerm, ['name', 'code', 'unit', 'phase', 'section', 'subsection']);
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
    <MainCard title="Справочник работ" data-testid="works-page">
      {/* Шапка */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" color="textPrimary" data-testid="works-title">
          Виды работ
        </Typography>
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
          data-testid="works-search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch />
              </InputAdornment>
            )
          }}
        />
        
        {/* Фильтр по типу (глобальный/тенантный) */}
        <Stack 
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 2 }}
          sx={{ 
            mt: 2, 
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Stack 
            direction="row"
            spacing={2}
            sx={{ 
              alignItems: 'center',
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            {/* iOS-style Toggle Switch - только иконки */}
            <Tooltip 
              title={globalFilter === 'global' ? 'Глобальные работы' : 'Мои работы'}
              arrow
              placement="top"
            >
              <Box
                onClick={() => setGlobalFilter(globalFilter === 'global' ? 'tenant' : 'global')}
                sx={{
                  position: 'relative',
                  width: { xs: 80, sm: 90 },
                  height: 36,
                  bgcolor: 'rgba(33, 150, 243, 0.3)',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 1,
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-1px)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                    boxShadow: 1
                  }
                }}
              >
                {/* Белый круг-переключатель */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 3,
                    left: globalFilter === 'global' ? 3 : 'calc(50% - 3px)',
                    width: 'calc(50% - 3px)',
                    height: 30,
                    bgcolor: 'white',
                    borderRadius: '15px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                />
                
                {/* Иконки на фоне */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: globalFilter === 'global' ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none'
                  }}
                >
                  <IconWorld size={18} color="#000" />
                </Box>
                
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '50%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: globalFilter === 'tenant' ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none'
                  }}
                >
                  <IconBuilding size={18} color="#000" />
                </Box>
              </Box>
            </Tooltip>
          </Stack>

          {/* Кнопки управления - только для тенантного справочника */}
          {globalFilter === 'tenant' && (
            <Stack direction="row" spacing={1}>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<IconUpload size={16} />} 
                onClick={handleOpenImport}
              >
                Импорт
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                size="small"
                startIcon={<IconPlus size={16} />} 
                onClick={handleOpenCreate}
              >
                Добавить
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Статистика */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
          <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.primary' }}>
            Всего работ — <strong>{works.length}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Таблица работ или карточки */}
      {filteredWorks.length > 0 ? (
        isMobile ? (
          // Виртуализированный карточный вид для мобильных
          <Virtuoso
            style={{ height: '600px' }}
            data={filteredWorks}
            itemContent={(index, work) => {
              const hierarchyParts = [work.phase, work.section, work.subsection].filter(Boolean);
              const hierarchyText = hierarchyParts.length > 0 ? hierarchyParts.join(' → ') : null;
              
              return (
                <Box sx={{ mb: 2 }}>
                  <Card sx={{ width: '100%' }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5, wordBreak: 'break-word' }}>
                              {work.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Код: {work.code}
                            </Typography>
                          </Box>
                          {work.isGlobal && (
                            <Chip 
                              icon={<IconWorld size={14} />} 
                              label="Общая" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                        
                        {hierarchyText && (
                          <Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {hierarchyText}
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Ед. изм.
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {work.unit}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Базовая цена
                            </Typography>
                            <Typography variant="h6" color="primary.main" fontWeight={600}>
                              {work.basePrice != null && !isNaN(Number(work.basePrice))
                                ? formatPrice(Number(work.basePrice))
                                : '—'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Действия */}
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mt: 1 }}>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleOpenEdit(work)}
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteWork(work.id)}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              );
            }}
          />
        ) : (
          // Таблица для десктопа
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
        )
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
