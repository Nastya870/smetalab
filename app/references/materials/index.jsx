import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import debounce from 'lodash.debounce';
import InfiniteScroll from 'react-infinite-scroll-component';

// material-ui
import {
  Grid,
  Typography,
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
  FormControlLabel,
  Switch,
  Stack,
  CircularProgress,
  Alert,
  Snackbar,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Card,
  CardContent,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconExternalLink, IconWorld, IconBuilding, IconUpload } from '@tabler/icons-react';

// project imports
import EmptyState from './EmptyState';
import { emptyMaterial } from './mockData';
import materialsAPI from 'api/materials';
import ImportDialog from './ImportDialog';
import { fullTextSearch, highlightMatches } from 'shared/lib/utils/fullTextSearch';

// Code Splitting: Lazy load MaterialDialog (загружается только при открытии)
const MaterialDialog = lazy(() => import('./MaterialDialog'));

// Компонент подсветки совпадений в тексте
const HighlightText = ({ text, query }) => {
  if (!query || query.trim().length === 0) {
    return <>{text}</>;
  }
  
  const parts = highlightMatches(text, query);
  
  return (
    <>
      {parts.map((part, index) => (
        part.match ? (
          <Box 
            key={index} 
            component="span" 
            sx={{ 
              bgcolor: '#FEF3C7', 
              color: '#92400E',
              borderRadius: '2px',
              px: 0.25
            }}
          >
            {part.text}
          </Box>
        ) : (
          <span key={index}>{part.text}</span>
        )
      ))}
    </>
  );
};

// ==============================|| MATERIALS REFERENCE PAGE ||============================== //

const MaterialsReferencePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(emptyMaterial);
  const [searchInput, setSearchInput] = useState(''); // Для input (мгновенно)
  const [searchTerm, setSearchTerm] = useState(''); // Для фильтрации (debounced)
  // Восстанавливаем фильтр из localStorage или используем 'global' по умолчанию
  const [globalFilter, setGlobalFilter] = useState(() => {
    return localStorage.getItem('materialsGlobalFilter') || 'global';
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Пагинация для Infinite Scroll
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 50;
  
  // Управление видимостью колонок
  const [showImageColumn, setShowImageColumn] = useState(true);
  const [showSupplierColumn, setShowSupplierColumn] = useState(true);

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
    localStorage.setItem('materialsGlobalFilter', globalFilter);
  }, [globalFilter]);

  // Загрузка материалов из API с пагинацией
  useEffect(() => {
    fetchMaterials(1, true); // Первая загрузка
  }, [globalFilter]); // Перезагружаем при изменении фильтра

  const fetchMaterials = async (pageNumber = 1, resetData = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pageNumber,
        pageSize: PAGE_SIZE
      };
      if (globalFilter === 'global') params.isGlobal = 'true';
      if (globalFilter === 'tenant') params.isGlobal = 'false';
      
      const response = await materialsAPI.getAll(params);
      
      // ✅ Функция нормализации snake_case → camelCase
      const normalizeMaterial = (mat) => ({
        ...mat,
        productUrl: mat.product_url || mat.productUrl,
        showImage: mat.show_image !== undefined ? mat.show_image : mat.showImage,
        isGlobal: mat.is_global !== undefined ? mat.is_global : mat.isGlobal,
        autoCalculate: mat.auto_calculate !== undefined ? mat.auto_calculate : mat.autoCalculate
      });
      
      // Обработка response
      let newMaterials = [];
      if (response.data) {
        newMaterials = response.data.map(normalizeMaterial);
      } else {
        // Fallback для старого формата API
        const data = Array.isArray(response) ? response : [];
        newMaterials = data.map(normalizeMaterial);
      }
      
      // Получаем общее количество
      const total = response.total || response.count || newMaterials.length;
      setTotalRecords(total);
      
      // Добавляем или заменяем данные
      if (resetData) {
        setMaterials(newMaterials);
        setPage(1);
      } else {
        setMaterials(prev => [...prev, ...newMaterials]);
        setPage(pageNumber);
      }
      
      // Проверяем, есть ли еще данные
      const totalLoaded = resetData ? newMaterials.length : materials.length + newMaterials.length;
      setHasMore(totalLoaded < total);
      
    } catch (err) {
      console.error('Error loading materials:', err);
      setError('Не удалось загрузить материалы. Проверьте подключение к серверу.');
      showSnackbar('Ошибка загрузки материалов', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Функция для загрузки следующей страницы (Infinite Scroll)
  const loadMoreMaterials = () => {
    if (!loading && hasMore) {
      fetchMaterials(page + 1, false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Мемоизированная фильтрация материалов с полнотекстовым поиском
  // Поддерживает поиск по нескольким словам одновременно
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials; // Если поиск пустой, возвращаем все материалы
    
    // Используем полнотекстовый поиск по всем полям
    return fullTextSearch(materials, searchTerm, ['name', 'sku', 'unit', 'supplier', 'category']);
  }, [materials, searchTerm]);

  // Мемоизированные обработчики (стабильные функции, не пересоздаются при каждом рендере)
  const handleOpenCreate = useCallback(() => {
    setEditMode(false);
    setCurrentMaterial(emptyMaterial);
    setOpenDialog(true);
  }, []);

  const handleOpenEdit = useCallback((material) => {
    setEditMode(true);
    setCurrentMaterial({ ...material });
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setCurrentMaterial(emptyMaterial);
  }, []);

  // Сохранить материал (OPTIMISTIC UI)
  const handleSaveMaterial = async () => {
    try {
      if (editMode) {
        // OPTIMISTIC UPDATE: обновляем UI мгновенно
        const previousMaterials = [...materials]; // Backup для rollback
        const optimisticUpdate = { ...currentMaterial, _optimistic: true };
        
        setMaterials(materials.map((m) => (m.id === currentMaterial.id ? optimisticUpdate : m)));
        showSnackbar('Материал обновляется...', 'info');
        handleCloseDialog();
        
        try {
          // Реальный API call
          const updated = await materialsAPI.update(currentMaterial.id, currentMaterial);
          
          // Заменяем optimistic на реальные данные
          setMaterials(prev => prev.map((m) => (m.id === updated.id ? updated : m)));
          showSnackbar('Материал успешно обновлен', 'success');
        } catch (err) {
          // ROLLBACK: восстанавливаем предыдущее состояние
          setMaterials(previousMaterials);
          console.error('Error updating material:', err);
          showSnackbar(err.response?.data?.message || 'Ошибка при обновлении материала', 'error');
          throw err;
        }
      } else {
        // OPTIMISTIC CREATE: добавляем материал мгновенно с временным ID
        const optimisticMaterial = {
          ...currentMaterial,
          id: `temp-${Date.now()}`, // Временный ID
          _optimistic: true // Флаг для UI (можем показать skeleton/loading состояние)
        };
        
        // Мгновенно обновляем UI
        setMaterials([optimisticMaterial, ...materials]);
        showSnackbar('Материал создается...', 'info');
        handleCloseDialog();
        
        try {
          // Отправляем реальный запрос
          const created = await materialsAPI.create(currentMaterial);
          
          // Заменяем optimistic на реальный
          setMaterials(prev => prev.map(m => 
            m.id === optimisticMaterial.id ? created : m
          ));
          showSnackbar('Материал успешно создан', 'success');
          
          // Обновляем totalRecords для pagination
          setTotalRecords(prev => prev + 1);
        } catch (err) {
          // ROLLBACK: удаляем optimistic материал при ошибке
          setMaterials(prev => prev.filter(m => m.id !== optimisticMaterial.id));
          console.error('Error creating material:', err);
          showSnackbar(err.response?.data?.message || 'Ошибка при создании материала', 'error');
          throw err; // Re-throw для внешнего catch
        }
      }
    } catch (err) {
      console.error('Error saving material:', err);
      // Ошибка уже обработана в блоке create
      if (editMode) {
        showSnackbar(err.response?.data?.message || 'Ошибка при сохранении материала', 'error');
      }
    }
  };

  // Удалить материал (OPTIMISTIC DELETE)
  const handleDeleteMaterial = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот материал?')) {
      // OPTIMISTIC DELETE: удаляем мгновенно из UI
      const deletedMaterial = materials.find(m => m.id === id);
      const previousMaterials = [...materials]; // Backup для rollback
      
      setMaterials(materials.filter((m) => m.id !== id));
      showSnackbar('Материал удаляется...', 'info');
      
      // Обновляем totalRecords для pagination
      setTotalRecords(prev => Math.max(0, prev - 1));
      
      try {
        // Реальный API call
        await materialsAPI.delete(id);
        showSnackbar('Материал успешно удален', 'success');
      } catch (err) {
        // ROLLBACK: восстанавливаем удаленный материал
        setMaterials(previousMaterials);
        setTotalRecords(prev => prev + 1); // Восстанавливаем count
        console.error('Error deleting material:', err);
        showSnackbar(err.response?.data?.message || 'Ошибка при удалении материала', 'error');
      }
    }
  };

  // Удалить материал из модалки (OPTIMISTIC DELETE)
  const handleDeleteFromDialog = async () => {
    if (currentMaterial.id && window.confirm('Вы уверены, что хотите удалить этот материал?')) {
      const deletedId = currentMaterial.id;
      const previousMaterials = [...materials]; // Backup для rollback
      
      // OPTIMISTIC DELETE: удаляем мгновенно
      setMaterials(materials.filter((m) => m.id !== deletedId));
      showSnackbar('Материал удаляется...', 'info');
      handleCloseDialog();
      
      // Обновляем totalRecords
      setTotalRecords(prev => Math.max(0, prev - 1));
      
      try {
        // Реальный API call
        await materialsAPI.delete(deletedId);
        showSnackbar('Материал успешно удален', 'success');
      } catch (err) {
        // ROLLBACK: восстанавливаем
        setMaterials(previousMaterials);
        setTotalRecords(prev => prev + 1);
        console.error('Error deleting material:', err);
        showSnackbar(err.response?.data?.message || 'Ошибка при удалении материала', 'error');
      }
    }
  };

  // Изменить поле материала
  const handleFieldChange = (field, value) => {
    setCurrentMaterial({ ...currentMaterial, [field]: value });
  };

  // Открыть диалог импорта
  const [openImportDialog, setOpenImportDialog] = useState(false);
  
  const handleOpenImport = () => {
    setOpenImportDialog(true);
  };

  const handleCloseImport = () => {
    setOpenImportDialog(false);
  };

  const handleImportSuccess = () => {
    fetchMaterials(); // Перезагрузить список материалов
    showSnackbar('Материалы успешно импортированы', 'success');
  };

  // Форматирование цены
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ bgcolor: '#F3F4F6', minHeight: '100vh', p: 3 }}>
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        </Paper>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ bgcolor: '#F3F4F6', minHeight: '100vh', p: 3 }}>
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={fetchMaterials} size="small">
            Повторить попытку
          </Button>
        </Paper>
      </Box>
    );
  }

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
        <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1F2937' }} data-testid="materials-title">
          Строительные материалы
        </Typography>
      </Box>

      {/* Поиск и фильтр */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Поиск по названию, коду, поставщику или единице измерения..."
          value={searchInput}
          onChange={(e) => {
            const value = e.target.value;
            setSearchInput(value);
            debouncedSearch(value);
          }}
          data-testid="materials-search"
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
              title={globalFilter === 'global' ? 'Глобальные материалы' : 'Мои материалы'}
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
                data-testid="materials-import-btn"
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
                data-testid="materials-add-btn"
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
        
        {/* Переключатели видимости колонок */}
        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showImageColumn}
                onChange={(e) => setShowImageColumn(e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366F1' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6366F1' }
                }}
              />
            }
            label={<Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>Показывать изображения</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showSupplierColumn}
                onChange={(e) => setShowSupplierColumn(e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366F1' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6366F1' }
                }}
              />
            }
            label={<Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>Показывать поставщика</Typography>}
          />
        </Stack>
      </Box>

      {/* Статистика - отступ 16px сверху, 24px снизу до таблицы */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
          {searchTerm ? `Найдено: ${filteredMaterials.length}` : `Загружено: ${materials.length} из ${totalRecords}`} • Категорий: {new Set(materials.map((m) => m.category)).size}
        </Typography>
      </Box>

      {/* Таблица материалов или карточки - занимает оставшееся пространство */}
      <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {filteredMaterials.length > 0 ? (
        isMobile ? (
          // Infinite Scroll карточный вид для мобильных
          <InfiniteScroll
            dataLength={filteredMaterials.length}
            next={searchTerm ? () => {} : loadMoreMaterials}
            hasMore={!searchTerm && hasMore}
            loader={
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            }
            endMessage={
              !searchTerm && filteredMaterials.length > 0 ? (
                <Box sx={{ textAlign: 'center', py: 2, color: '#9CA3AF', fontSize: '0.875rem' }}>
                  Все данные загружены ({filteredMaterials.length} из {totalRecords})
                </Box>
              ) : null
            }
            style={{ overflow: 'visible' }}
          >
            {filteredMaterials.map((material) => (
              <Box key={material.id} sx={{ mb: 1.5 }}>
                <Card sx={{ width: '100%', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2, pb: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {/* Изображение слева */}
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          flexShrink: 0,
                          borderRadius: 1,
                          overflow: 'hidden',
                          bgcolor: '#F9FAFB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {material.image ? (
                          <Box
                            component="img"
                            src={material.image}
                            alt={material.name}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                            Нет фото
                          </Typography>
                        )}
                      </Box>

                      {/* Контент справа */}
                      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* Заголовок с бейджем */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151', mb: 0.25, wordBreak: 'break-word', lineHeight: 1.3 }}>
                              <HighlightText text={material.name} query={searchTerm} />
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              <HighlightText text={material.sku} query={searchTerm} />
                            </Typography>
                          </Box>
                          {material.isGlobal && (
                            <IconWorld size={14} style={{ color: '#9CA3AF' }} />
                          )}
                        </Box>
                        
                        {/* Компактная сетка параметров */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: 1.5, alignItems: 'center', mt: 'auto' }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Ед. изм:</Typography>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', ml: 0.5, display: 'inline' }}>
                              {material.unit}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Вес:</Typography>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', ml: 0.5, display: 'inline' }}>
                              {material.weight} кг
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
                              {material.price != null && !isNaN(Number(material.price)) 
                                ? formatPrice(Number(material.price)) 
                                : '—'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Поставщик (если есть) */}
                        {showSupplierColumn && material.supplier && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              Поставщик: <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>{material.supplier}</Typography>
                            </Typography>
                          </Box>
                        )}

                        {/* Действия */}
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mt: 1 }}>
                          {material.productUrl && (
                            <IconButton 
                              size="small" 
                              onClick={() => window.open(material.productUrl, '_blank')}
                              sx={{ color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                            >
                              <IconExternalLink size={16} />
                            </IconButton>
                          )}
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenEdit(material)}
                            sx={{ color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteMaterial(material.id)}
                            sx={{ color: '#EF4444', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </InfiniteScroll>
        ) : (
          // Таблица для десктопа
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
            <InfiniteScroll
              dataLength={filteredMaterials.length}
              next={searchTerm ? () => {} : loadMoreMaterials}
              hasMore={!searchTerm && hasMore}
              loader={
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              }
              endMessage={
                !searchTerm && filteredMaterials.length > 0 ? (
                  <Box sx={{ textAlign: 'center', py: 2, color: '#9CA3AF', fontSize: '0.875rem' }}>
                    Все данные загружены ({filteredMaterials.length} из {totalRecords})
                  </Box>
                ) : null
              }
              style={{ overflow: 'visible' }}
            >
              <TableContainer>
                <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ width: '100px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, pl: 2, borderBottom: '1px solid #E5E7EB' }}>
                        Артикул
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Наименование
                      </TableCell>
                      {showImageColumn && (
                        <TableCell align="center" sx={{ width: '60px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                          Фото
                        </TableCell>
                      )}
                      <TableCell align="center" sx={{ width: '60px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Ед.
                      </TableCell>
                      <TableCell align="right" sx={{ width: '90px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Цена
                      </TableCell>
                      {showSupplierColumn && (
                        <TableCell sx={{ width: '100px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                          Поставщик
                        </TableCell>
                      )}
                      <TableCell align="center" sx={{ width: '70px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Вес
                      </TableCell>
                      <TableCell sx={{ width: '100px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Категория
                      </TableCell>
                      <TableCell align="center" sx={{ width: '90px', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, pr: 2, borderBottom: '1px solid #E5E7EB' }}>
                        Действия
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMaterials.map((material) => (
                      <TableRow key={material.id} sx={{ '&:hover': { bgcolor: '#F3F4F6' } }}>
                        <TableCell sx={{ width: '100px', py: 1.25, pl: 2, borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <HighlightText text={material.sku} query={searchTerm} />
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Tooltip title={material.isGlobal ? 'Глобальный материал' : 'Материал компании'}>
                              {material.isGlobal ? (
                                <IconWorld size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                              ) : (
                                <IconBuilding size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                              )}
                            </Tooltip>
                            <Typography sx={{ fontSize: '0.8125rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <HighlightText text={material.name} query={searchTerm} />
                            </Typography>
                            {material._optimistic && (
                              <Chip
                                label="Сохраняется..."
                                size="small"
                                color="warning"
                                sx={{ animation: 'pulse 1.5s infinite' }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        {showImageColumn && (
                          <TableCell align="center" sx={{ width: '60px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                            {material.showImage && material.image ? (
                              <Box
                                component="img"
                                src={material.image}
                                alt={material.name}
                                sx={{
                                  width: 35,
                                  height: 35,
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  border: '1px solid #E5E7EB'
                                }}
                              />
                            ) : (
                              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                —
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="center" sx={{ width: '60px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>{material.unit}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ width: '90px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                            {formatPrice(material.price)}
                          </Typography>
                        </TableCell>
                        {showSupplierColumn && (
                          <TableCell sx={{ width: '100px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                            <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{material.supplier}</Typography>
                          </TableCell>
                        )}
                        <TableCell align="center" sx={{ width: '70px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>{material.weight}</Typography>
                        </TableCell>
                        <TableCell sx={{ width: '100px', py: 1.25, borderBottom: '1px solid #F3F4F6' }}>
                          <Chip 
                            label={material.category} 
                            size="small" 
                            sx={{ 
                              height: 22, 
                              fontSize: '0.625rem', 
                              bgcolor: '#F3F4F6', 
                              color: '#6B7280',
                              border: '1px solid #E5E7EB',
                              maxWidth: '100%',
                              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                            }} 
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ width: '90px', py: 1.25, pr: 2, borderBottom: '1px solid #F3F4F6' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            {material.productUrl && (
                              <IconButton
                                size="small"
                                href={material.productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ width: 26, height: 26, color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                              >
                                <IconExternalLink size={14} />
                              </IconButton>
                            )}
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenEdit(material)}
                              sx={{ width: 26, height: 26, color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                            >
                              <IconEdit size={14} />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteMaterial(material.id)}
                              sx={{ width: 26, height: 26, color: '#EF4444', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                            >
                              <IconTrash size={14} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </InfiniteScroll>
        </Paper>
        )
      ) : materials.length === 0 ? (
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

      {/* Модальное окно создания/редактирования материала (Code Splitting) */}
      {openDialog && (
        <Suspense fallback={<CircularProgress />}>
          <MaterialDialog
            open={openDialog}
            editMode={editMode}
            material={currentMaterial}
            onClose={handleCloseDialog}
            onSave={handleSaveMaterial}
            onDelete={handleDeleteFromDialog}
            onChange={handleFieldChange}
          />
        </Suspense>
      )}

      {/* Диалог импорта материалов */}
      <ImportDialog
        open={openImportDialog}
        onClose={handleCloseImport}
        onSuccess={handleImportSuccess}
        isGlobal={globalFilter === 'global'}
      />

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
      </Paper>
    </Box>
  );
};

export default MaterialsReferencePage;
