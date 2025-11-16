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
  CardActions,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconExternalLink, IconWorld, IconBuilding, IconUpload } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import EmptyState from './EmptyState';
import { emptyMaterial } from './mockData';
import materialsAPI from 'api/materials';
import ImportDialog from './ImportDialog';
import { fullTextSearch } from 'shared/lib/utils/fullTextSearch';

// Code Splitting: Lazy load MaterialDialog (загружается только при открытии)
const MaterialDialog = lazy(() => import('./MaterialDialog'));

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
  const [globalFilter, setGlobalFilter] = useState('all'); // 'all' | 'global' | 'tenant'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
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

  // Загрузка материалов из API
  useEffect(() => {
    fetchMaterials();
  }, [globalFilter]); // Перезагружаем при изменении фильтра

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        pageSize: 50000 // Загружаем все записи для виртуализации (максимум 50K материалов)
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
      if (response.data) {
        setMaterials(response.data.map(normalizeMaterial));
      } else {
        // Fallback для старого формата API
        const data = Array.isArray(response) ? response : [];
        setMaterials(data.map(normalizeMaterial));
      }
    } catch (err) {
      console.error('Error loading materials:', err);
      setError('Не удалось загрузить материалы. Проверьте подключение к серверу.');
      showSnackbar('Ошибка загрузки материалов', 'error');
    } finally {
      setLoading(false);
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
      <MainCard title="Справочник материалов">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  // Error state
  if (error) {
    return (
      <MainCard title="Справочник материалов">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchMaterials}>
          Повторить попытку
        </Button>
      </MainCard>
    );
  }

  return (
    <MainCard title="Справочник материалов">
      {/* Шапка с кнопками */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h3" color="textPrimary">
          Строительные материалы
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
            Добавить материал
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Поиск и фильтр */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Поиск по названию, коду, поставщику или единице измерения..."
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
            Тип материалов:
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
        
        {/* Переключатели видимости колонок */}
        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showImageColumn}
                onChange={(e) => setShowImageColumn(e.target.checked)}
                color="primary"
              />
            }
            label="Показывать изображения"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showSupplierColumn}
                onChange={(e) => setShowSupplierColumn(e.target.checked)}
                color="primary"
              />
            }
            label="Показывать поставщика"
          />
        </Stack>
      </Box>

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Paper sx={{ p: 2, bgcolor: 'primary.light', textAlign: 'center' }}>
            <Typography variant="h2" color="primary.dark">
              {materials.length}
            </Typography>
            <Typography variant="body2" color="primary.dark">
              Всего материалов
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Paper sx={{ p: 2, bgcolor: 'success.light', textAlign: 'center' }}>
            <Typography variant="h2" color="success.dark">
              {new Set(materials.map((m) => m.category)).size}
            </Typography>
            <Typography variant="body2" color="success.dark">
              Категорий
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Paper sx={{ p: 2, bgcolor: 'warning.light', textAlign: 'center' }}>
            <Typography variant="h2" color="warning.dark">
              {new Set(materials.map((m) => m.supplier)).size}
            </Typography>
            <Typography variant="body2" color="warning.dark">
              Поставщиков
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Paper sx={{ p: 2, bgcolor: 'secondary.light', textAlign: 'center' }}>
            <Typography variant="h2" color="secondary.dark">
              {formatPrice(materials.reduce((sum, m) => sum + m.price, 0) / materials.length)}
            </Typography>
            <Typography variant="body2" color="secondary.dark">
              Средняя цена
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Таблица материалов или карточки */}
      {filteredMaterials.length > 0 ? (
        isMobile ? (
          // Виртуализированный карточный вид для мобильных
          <Virtuoso
            style={{ height: '600px' }}
            data={filteredMaterials}
            itemContent={(index, material) => (
              <Box sx={{ mb: 2 }}>
                <Card sx={{ width: '100%' }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ mb: 0.5, wordBreak: 'break-word' }}>
                            {material.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {material.sku}
                          </Typography>
                        </Box>
                        {material.isGlobal && (
                          <Chip 
                            icon={<IconWorld size={14} />} 
                            label="Общий" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Divider />
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Категория</Typography>
                          <Typography variant="body2">{material.category}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Ед. изм.</Typography>
                          <Typography variant="body2">{material.unit}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Цена</Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {formatPrice(material.price)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Вес</Typography>
                          <Typography variant="body2">{material.weight} кг</Typography>
                        </Box>
                        {showSupplierColumn && (
                          <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography variant="caption" color="text.secondary">Поставщик</Typography>
                            <Typography variant="body2">{material.supplier}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    {material.productUrl && (
                      <IconButton 
                        size="small" 
                        color="info"
                        onClick={() => window.open(material.productUrl, '_blank')}
                      >
                        <IconExternalLink size={18} />
                      </IconButton>
                    )}
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenEdit(material)}
                    >
                      <IconEdit size={18} />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteMaterial(material.id)}
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </CardActions>
                </Card>
              </Box>
            )}
          />
        ) : (
          // Таблица для десктопа
          <Paper>
          <TableVirtuoso
            data={filteredMaterials}
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
              <TableCell sx={{ width: '130px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Артикул (SKU)
                </Typography>
              </TableCell>
              <TableCell sx={{ width: 'auto', minWidth: '400px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Наименование
                </Typography>
              </TableCell>
              {showImageColumn && (
                <TableCell align="center" sx={{ width: '100px' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Изображение
                  </Typography>
                </TableCell>
              )}
              <TableCell align="center" sx={{ width: '100px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Ед. изм.
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ width: '130px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Цена
                </Typography>
              </TableCell>
              {showSupplierColumn && (
                <TableCell sx={{ width: '150px' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Поставщик
                  </Typography>
                </TableCell>
              )}
              <TableCell align="center" sx={{ width: '100px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Вес/ед.
                </Typography>
              </TableCell>
              <TableCell sx={{ width: '150px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Категория
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ width: '60px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  URL
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ width: '100px' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Действия
                </Typography>
              </TableCell>
            </TableRow>
          )}
          itemContent={(index, material) => (
                <>
                  <TableCell sx={{ width: '130px' }}>
                    <Typography variant="body2" fontWeight={500}>
                      {material.sku}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 'auto', minWidth: '400px' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Tooltip title={material.isGlobal ? 'Глобальный материал' : 'Материал компании'}>
                        {material.isGlobal ? (
                          <IconWorld size={16} style={{ color: '#1976d2', flexShrink: 0 }} />
                        ) : (
                          <IconBuilding size={16} style={{ color: '#757575', flexShrink: 0 }} />
                        )}
                      </Tooltip>
                      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{material.name}</Typography>
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
                    <TableCell align="center" sx={{ width: '100px' }}>
                      {material.showImage && material.image ? (
                        <Box
                          component="img"
                          src={material.image}
                          alt={material.name}
                          sx={{
                            width: 35,
                            height: 35,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Нет фото
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  <TableCell align="center" sx={{ width: '100px' }}>
                    <Typography variant="body2">{material.unit}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ width: '130px' }}>
                    <Typography variant="body1" fontWeight={500}>
                      {formatPrice(material.price)}
                    </Typography>
                  </TableCell>
                  {showSupplierColumn && (
                    <TableCell sx={{ width: '150px' }}>
                      <Typography variant="body2">{material.supplier}</Typography>
                    </TableCell>
                  )}
                  <TableCell align="center" sx={{ width: '100px' }}>
                    <Typography variant="body2">{material.weight} кг</Typography>
                  </TableCell>
                  <TableCell sx={{ width: '150px' }}>
                    <Chip label={material.category} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="center" sx={{ width: '60px' }}>
                    {material.productUrl ? (
                      <IconButton
                        size="small"
                        color="info"
                        href={material.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconExternalLink size={18} />
                      </IconButton>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ width: '100px' }}>
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(material)}>
                      <IconEdit size={18} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteMaterial(material.id)}>
                      <IconTrash size={18} />
                    </IconButton>
                  </TableCell>
                </>
              )}
            />
        </Paper>
        )
      ) : materials.length === 0 ? (
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
    </MainCard>
  );
};

export default MaterialsReferencePage;
