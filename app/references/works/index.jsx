import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import debounce from 'lodash.debounce';
import InfiniteScroll from 'react-infinite-scroll-component';

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
  
  // 🚀 NEW: Infinite Scroll state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 50; // Загружаем по 50 записей за раз
  
  // 🔧 Ref для сохранения позиции скролла
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Debounced поиск (обновляет searchTerm через 300ms после последнего ввода)
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
      // При изменении поискового запроса - перезагружаем с сервера
      if (value.trim()) {
        setWorks([]);
        setPage(1);
        fetchWorks(1, true, value.trim());
      } else {
        // Если очистили поиск - загружаем обычные данные
        setWorks([]);
        setPage(1);
        fetchWorks(1, true);
      }
    }, 300),
    [globalFilter]
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

  // 🚀 Загрузка первой страницы при изменении фильтра
  useEffect(() => {
    // Сбрасываем состояние при изменении фильтра
    setWorks([]);
    setPage(1);
    setHasMore(true);
    setTotalRecords(0);
    setSearchTerm(''); // Очищаем поиск при смене фильтра
    fetchWorks(1, true); // true = сброс данных
  }, [globalFilter]);

  // 🚀 Функция загрузки работ с пагинацией и поиском
  const fetchWorks = async (pageNumber = 1, resetData = false, search = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pageNumber,
        pageSize: search ? 1000 : PAGE_SIZE, // При поиске загружаем больше результатов
      };
      
      if (globalFilter === 'global') params.isGlobal = 'true';
      if (globalFilter === 'tenant') params.isGlobal = 'false';
      if (search) params.search = search; // Серверный поиск по всей БД
      
      const response = await worksAPI.getAll(params);
      
      // Обработка response
      const newWorks = response.data || (Array.isArray(response) ? response : []);
      const total = response.total || response.count || newWorks.length;
      
      setTotalRecords(total);
      
      if (resetData) {
        // Полная замена данных (при смене фильтра)
        setWorks(newWorks);
        setHasMore(newWorks.length < total);
      } else {
        // Добавление к существующим (infinite scroll)
        setWorks(prev => {
          const updated = [...prev, ...newWorks];
          setHasMore(updated.length < total);
          return updated;
        });
      }
      
    } catch (err) {
      console.error('Error loading works:', err);
      setError('Ошибка загрузки данных. Проверьте подключение к серверу.');
      showSnackbar('Ошибка загрузки работ', 'error');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Загрузка следующей страницы для Infinite Scroll
  const loadMoreWorks = () => {
    if (!loading && hasMore) {
      // 🔧 Сохраняем текущую позицию скролла перед загрузкой
      if (scrollContainerRef.current) {
        scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      }
      
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWorks(nextPage, false);
    }
  };
  
  // 🔧 Восстанавливаем позицию скролла после добавления новых данных
  useEffect(() => {
    if (scrollContainerRef.current && scrollPositionRef.current > 0) {
      // Небольшая задержка чтобы DOM успел обновиться
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 50);
    }
  }, [works.length]); // Срабатывает когда длина массива изменяется

  // Показать уведомление
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Закрыть уведомление
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Отображаемые работы (фильтрация теперь на сервере через params.search)
  // Для совместимости оставляем переменную filteredWorks, но она просто = works
  const filteredWorks = works;

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
    <Box sx={{ bgcolor: '#F3F4F6', height: '100vh', p: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}
      >
      {/* Шапка */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1F2937' }} data-testid="works-title">
          Виды работ
        </Typography>
      </Box>

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
      <Box sx={{ mb: 2 }}>
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
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 44,
              bgcolor: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '0.875rem',
              '& fieldset': { borderColor: '#E5E7EB' },
              '&:hover fieldset': { borderColor: '#D1D5DB' },
              '&.Mui-focused fieldset': { borderColor: '#6366F1' }
            },
            '& .MuiInputBase-input': {
              color: '#374151',
              '&::placeholder': { color: '#9CA3AF', opacity: 1 }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} style={{ color: '#9CA3AF' }} />
              </InputAdornment>
            )
          }}
        />
        
        {/* Фильтр по типу (глобальный/тенантный) - отступ 16px */}
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
            {/* Toggle Switch - фиолетовый стиль, высота 36px */}
            <Tooltip 
              title={globalFilter === 'global' ? 'Глобальные работы' : 'Мои работы'}
              arrow
              placement="top"
            >
              <Box
                onClick={() => setGlobalFilter(globalFilter === 'global' ? 'tenant' : 'global')}
                sx={{
                  position: 'relative',
                  width: 80,
                  height: 36,
                  bgcolor: '#F3E8FF',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: '#EDE9FE'
                  }
                }}
              >
                {/* Переключатель - активный */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 2,
                    left: globalFilter === 'global' ? 2 : 'calc(50% - 2px)',
                    width: 'calc(50% - 2px)',
                    height: 32,
                    bgcolor: '#EDE9FE',
                    borderRadius: '4px',
                    transition: 'left 0.2s ease',
                    border: '1px solid #C4B5FD'
                  }}
                />
                
                {/* Иконки */}
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
                    zIndex: 1
                  }}
                >
                  <IconWorld 
                    size={16} 
                    style={{ 
                      color: globalFilter === 'global' ? '#5B21B6' : '#6B7280',
                      fontWeight: globalFilter === 'global' ? 500 : 400
                    }} 
                  />
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
                    zIndex: 1
                  }}
                >
                  <IconBuilding 
                    size={16} 
                    style={{ 
                      color: globalFilter === 'tenant' ? '#5B21B6' : '#6B7280',
                      fontWeight: globalFilter === 'tenant' ? 500 : 400
                    }} 
                  />
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
                sx={{
                  textTransform: 'none',
                  height: 36,
                  borderColor: '#E5E7EB',
                  color: '#4B5563',
                  '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' }
                }}
              >
                Импорт
              </Button>
              <Button 
                variant="contained" 
                size="small"
                startIcon={<IconPlus size={16} />} 
                onClick={handleOpenCreate}
                sx={{
                  textTransform: 'none',
                  height: 36,
                  bgcolor: '#6366F1',
                  '&:hover': { bgcolor: '#4F46E5' }
                }}
              >
                Добавить
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Статистика - отступ 16px сверху, 24px снизу до таблицы */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
          {searchTerm ? `Найдено: ${filteredWorks.length}` : `Загружено: ${works.length} из ${totalRecords}`}
        </Typography>
      </Box>

      {/* Таблица работ или карточки - занимает оставшееся пространство */}
      <Box sx={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {filteredWorks.length > 0 ? (
        isMobile ? (
          // 🚀 Infinite Scroll для мобильных
          <Box id="works-mobile-container" sx={{ flex: 1, overflow: 'auto' }}>
            <InfiniteScroll
              dataLength={filteredWorks.length}
              next={loadMoreWorks}
              hasMore={hasMore}
              loader={
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  py: 1,
                  bgcolor: 'rgba(249, 250, 251, 0.7)',
                  borderTop: '1px solid #E5E7EB'
                }}>
                  <CircularProgress size={18} thickness={4} sx={{ color: '#3B82F6' }} />
                  <Typography sx={{ ml: 1.5, fontSize: '0.8125rem', color: '#6B7280' }}>
                    Загрузка...
                  </Typography>
                </Box>
              }
              endMessage={
                <Typography sx={{ textAlign: 'center', py: 2, color: '#9CA3AF', fontSize: '0.875rem' }}>
                  {searchTerm ? `Найдено: ${filteredWorks.length}` : `Загружено всё (${filteredWorks.length} из ${totalRecords})`}
                </Typography>
              }
              scrollableTarget="works-mobile-container"
              scrollThreshold={0.9}
            >
            {filteredWorks.map((work, index) => {
              const hierarchyParts = [work.phase, work.section, work.subsection].filter(Boolean);
              const hierarchyText = hierarchyParts.length > 0 ? hierarchyParts.join(' → ') : null;
              
              return (
                <Box key={work.id} sx={{ mb: 2 }}>
                  <Card sx={{ width: '100%', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5, wordBreak: 'break-word', color: '#374151' }}>
                              {work.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>
                              Код: {work.code}
                            </Typography>
                          </Box>
                          {work.isGlobal && (
                            <IconWorld size={14} style={{ color: '#9CA3AF' }} />
                          )}
                        </Box>
                        
                        {hierarchyText && (
                          <Box sx={{ bgcolor: '#F9FAFB', px: 1.5, py: 0.75, borderRadius: 1 }}>
                            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              {hierarchyText}
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }} display="block">
                              Ед. изм.
                            </Typography>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                              {work.unit}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }} display="block">
                              Базовая цена
                            </Typography>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
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
                            onClick={() => handleOpenEdit(work)}
                            sx={{ color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteWork(work.id)}
                            sx={{ color: '#EF4444', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </InfiniteScroll>
          </Box>
        ) : (
          // Таблица для десктопа
          <Paper 
            id="works-table-container"
            ref={scrollContainerRef}
            elevation={0} 
            sx={{ 
              border: '1px solid #E5E7EB', 
              borderRadius: '8px', 
              height: '100%', 
              overflow: 'auto'
            }}
          >
            <InfiniteScroll
              dataLength={filteredWorks.length}
              next={loadMoreWorks}
              hasMore={hasMore}
              loader={
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  py: 1,
                  bgcolor: 'rgba(249, 250, 251, 0.7)', // Светло-серый полупрозрачный
                  borderTop: '1px solid #E5E7EB'
                }}>
                  <CircularProgress size={18} thickness={4} sx={{ color: '#3B82F6' }} />
                  <Typography sx={{ ml: 1.5, fontSize: '0.8125rem', color: '#6B7280' }}>
                    Загрузка...
                  </Typography>
                </Box>
              }
              endMessage={
                filteredWorks.length > 0 ? (
                  <Box sx={{ textAlign: 'center', py: 2, color: '#9CA3AF', fontSize: '0.875rem' }}>
                    {searchTerm ? `Найдено: ${filteredWorks.length}` : `Все данные загружены (${filteredWorks.length} из ${totalRecords})`}
                  </Box>
                ) : null
              }
              scrollableTarget="works-table-container"
              scrollThreshold={0.9}
            >
              <TableContainer>
                <Table sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ width: '120px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, pl: 2.5, borderBottom: '1px solid #E5E7EB' }}>
                        Код
                      </TableCell>
                      <TableCell sx={{ width: 'auto', minWidth: '300px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Наименование
                      </TableCell>
                      <TableCell align="center" sx={{ width: '100px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Ед. изм.
                      </TableCell>
                      <TableCell align="right" sx={{ width: '150px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Базовая цена
                      </TableCell>
                      <TableCell align="center" sx={{ width: '100px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, pr: 2.5, borderBottom: '1px solid #E5E7EB' }}>
                        Действия
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredWorks.map((work) => {
                      // Формируем строку иерархии
                      const hierarchyParts = [work.phase, work.section, work.subsection].filter(Boolean);
                      const hierarchyText = hierarchyParts.length > 0 ? hierarchyParts.join(' → ') : null;
                      
                      return (
                        <TableRow key={work.id} sx={{ '&:hover': { bgcolor: '#F3F4F6' } }}>
                          <TableCell sx={{ width: '120px', py: 1.25, pl: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                              {work.code}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: 'auto', minWidth: '300px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Tooltip title={work.is_global ? 'Глобальная работа' : 'Работа компании'}>
                                {work.is_global ? (
                                  <IconWorld size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                                ) : (
                                  <IconBuilding size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                                )}
                              </Tooltip>
                              <Box sx={{ overflow: 'hidden' }}>
                                <Typography sx={{ fontSize: '0.8125rem', color: '#374151', wordBreak: 'break-word' }}>{work.name}</Typography>
                                {hierarchyText && (
                                  <Typography 
                                    sx={{ 
                                      color: '#6B7280',
                                      fontSize: '0.75rem',
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
                          <TableCell align="center" sx={{ width: '100px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                            <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>{work.unit}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ width: '150px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                              {formatPrice(work.base_price || work.basePrice)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ width: '100px', py: 1.25, pr: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleOpenEdit(work)}
                                sx={{ width: 28, height: 28, color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                              >
                                <IconEdit size={16} />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteWork(work.id)}
                                sx={{ width: 28, height: 28, color: '#EF4444', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                              >
                                <IconTrash size={16} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </InfiniteScroll>
        </Paper>
        )
      ) : works.length === 0 ? (
        <EmptyState onCreateClick={handleOpenCreate} />
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: '#6B7280' }}>
            Ничего не найдено
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF', mt: 0.5 }}>
            Попробуйте изменить критерии поиска
          </Typography>
        </Box>
      )}
      </Box>

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
      </Paper>
    </Box>
  );
};

export default WorksReferencePage;
