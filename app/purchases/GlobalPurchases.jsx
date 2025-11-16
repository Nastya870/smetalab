import React, { useState, useEffect } from 'react';

// material-ui
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Menu
} from '@mui/material';
import { 
  IconRefresh, 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconCalendar,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypeXls,
  IconFileTypePdf
} from '@tabler/icons-react';

// API
import * as globalPurchasesAPI from 'api/globalPurchases';
import projectsAPI from 'api/projects';

// utils
import { formatCurrency } from 'utils/formatters';
import { exportToCSV, exportToExcel, exportToPDF } from 'utils/purchasesExport';

// ==============================|| GLOBAL PURCHASES ||============================== //

const GlobalPurchases = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  
  // Состояния для диалога редактирования
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editFormData, setEditFormData] = useState({
    quantity: '',
    purchasePrice: '',
    purchaseDate: ''
  });
  
  // Фильтры
  const [filters, setFilters] = useState({
    projectId: '',
    dateFrom: '',
    dateTo: ''
  });

  // Загрузка проектов для фильтра
  useEffect(() => {
    const loadProjects = async () => {
      try {
const response = await projectsAPI.getAll();
// projectsAPI.getAll() возвращает { data: [...], pagination: {...} }
        const projectsList = response.data || response.projects || [];
setProjects(projectsList);
      } catch (err) {
        console.error('❌ Ошибка загрузки проектов:', err);
      }
    };
    loadProjects();
  }, []);

  // Загрузка закупок
  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await globalPurchasesAPI.getAllGlobalPurchases(filters);
      setPurchases(response.purchases || []);

      // Загрузка статистики
      const statsResponse = await globalPurchasesAPI.getStatistics(filters);
      setStatistics(statsResponse.statistics);

    } catch (err) {
      console.error('❌ Ошибка загрузки закупок:', err);
      console.error('   Детали:', err.response?.data);
      setError('Не удалось загрузить закупки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [filters.projectId, filters.dateFrom, filters.dateTo]); // Явные зависимости

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    loadPurchases();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить эту закупку?')) return;

    try {
      await globalPurchasesAPI.deleteGlobalPurchase(id);
      loadPurchases(); // Обновляем список
    } catch (err) {
      console.error('Ошибка удаления закупки:', err);
      setError('Не удалось удалить закупку');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  // Обработчики экспорта
  const handleExportMenuOpen = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  const handleExportCSV = () => {
    exportToCSV(purchases, filters);
    handleExportMenuClose();
  };

  const handleExportExcel = () => {
    exportToExcel(purchases, statistics, filters);
    handleExportMenuClose();
  };

  const handleExportPDF = () => {
    exportToPDF(purchases, statistics, filters);
    handleExportMenuClose();
  };

  // Обработчики редактирования
  const handleOpenEditDialog = (purchase) => {
    setEditingPurchase(purchase);
    setEditFormData({
      quantity: purchase.quantity,
      purchasePrice: purchase.purchase_price,
      purchaseDate: purchase.purchase_date
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingPurchase(null);
    setEditFormData({
      quantity: '',
      purchasePrice: '',
      purchaseDate: ''
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      
      // Валидация
      const quantity = parseFloat(editFormData.quantity);
      const purchasePrice = parseFloat(editFormData.purchasePrice);
      
      if (isNaN(quantity) || quantity <= 0) {
        setError('Количество должно быть больше 0');
        return;
      }
      
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        setError('Цена не может быть отрицательной');
        return;
      }
await globalPurchasesAPI.updateGlobalPurchase(editingPurchase.id, {
        quantity,
        purchasePrice,
        purchaseDate: editFormData.purchaseDate
      });

      // Обновляем список закупок
      await loadPurchases();
      
      handleCloseEditDialog();
      
    } catch (err) {
      console.error('❌ Ошибка обновления закупки:', err);
      setError('Не удалось обновить закупку');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Заголовок */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h3">Общие закупки</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<IconDownload />}
            onClick={handleExportMenuOpen}
            disabled={loading || purchases.length === 0}
          >
            Экспорт
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconRefresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Обновить
          </Button>
        </Stack>
      </Stack>

      {/* Меню экспорта */}
      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={handleExportCSV}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconFileTypeCsv size={20} />
            <Box>
              <Typography variant="body2" fontWeight={500}>CSV</Typography>
              <Typography variant="caption" color="text.secondary">
                Для Excel, Google Sheets
              </Typography>
            </Box>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleExportExcel}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconFileTypeXls size={20} />
            <Box>
              <Typography variant="body2" fontWeight={500}>Excel (XLS)</Typography>
              <Typography variant="caption" color="text.secondary">
                С форматированием и группировкой
              </Typography>
            </Box>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleExportPDF}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconFileTypePdf size={20} />
            <Box>
              <Typography variant="body2" fontWeight={500}>PDF</Typography>
              <Typography variant="caption" color="text.secondary">
                Для печати и отправки
              </Typography>
            </Box>
          </Stack>
        </MenuItem>
      </Menu>

      {/* Статистика */}
      {statistics && (
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {statistics.totalPurchases}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Всего закупок
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {statistics.uniqueMaterials}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Уникальных материалов
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {statistics.projectsCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Проектов
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {formatCurrency(statistics.totalSpent)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Общая сумма
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Фильтры */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 2.5, 
          mb: 3, 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'primary.lighter',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconCalendar size={20} style={{ color: 'var(--mui-palette-primary-main)' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Фильтры
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Найдено закупок: {purchases.length}
                </Typography>
              </Box>
            </Stack>
            
            {(filters.projectId || filters.dateFrom || filters.dateTo) && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => setFilters({ projectId: '', dateFrom: '', dateTo: '' })}
                sx={{ textTransform: 'none' }}
              >
                ✕ Сбросить фильтры
              </Button>
            )}
          </Stack>
          
          <Divider />
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Проект"
                value={filters.projectId}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                size="small"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                SelectProps={{
                  displayEmpty: true
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.default',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em style={{ color: '#999' }}>Все проекты</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main'
                        }}
                      />
                      <Typography variant="body2">{project.name}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="date"
                fullWidth
                label="Период с"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.default',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }
                }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="date"
                fullWidth
                label="Период по"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.default',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }
                }}
              />
            </Grid>
          </Grid>
          
          {/* Активные фильтры (чипы) */}
          {(filters.projectId || filters.dateFrom || filters.dateTo) && (
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {filters.projectId && (
                <Chip
                  label={`Проект: ${projects.find(p => p.id === filters.projectId)?.name || 'Выбран'}`}
                  onDelete={() => handleFilterChange('projectId', '')}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              )}
              {filters.dateFrom && (
                <Chip
                  label={`С: ${new Date(filters.dateFrom).toLocaleDateString('ru-RU')}`}
                  onDelete={() => handleFilterChange('dateFrom', '')}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              )}
              {filters.dateTo && (
                <Chip
                  label={`По: ${new Date(filters.dateTo).toLocaleDateString('ru-RU')}`}
                  onDelete={() => handleFilterChange('dateTo', '')}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Ошибка */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Заголовок ведомости с датами */}
      {!loading && purchases.length > 0 && (
        <Paper sx={{ p: 3, mb: 2, bgcolor: 'primary.lighter' }}>
          <Typography variant="h5" fontWeight={600} textAlign="center">
            {filters.dateFrom && filters.dateTo ? (
              <>
                Ведомость закупки материалов от {formatDate(filters.dateFrom)} по {formatDate(filters.dateTo)}
              </>
            ) : filters.dateFrom ? (
              <>
                Ведомость закупки материалов от {formatDate(filters.dateFrom)}
              </>
            ) : filters.dateTo ? (
              <>
                Ведомость закупки материалов по {formatDate(filters.dateTo)}
              </>
            ) : (
              <>
                Ведомость закупки материалов (все периоды)
              </>
            )}
          </Typography>
        </Paper>
      )}

      {/* Таблица закупок */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress />
          </Box>
        ) : purchases.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Закупок пока нет
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Добавляйте закупки через кнопку "В закупку" в разделе "Закупки" смет
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Смета</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Материал</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 60 }}>Фото</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Количество</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ед.изм.</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Цена закупки</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Сумма</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  // Группируем закупки по проектам
                  const groupedPurchases = purchases.reduce((acc, purchase) => {
                    const projectName = purchase.project_name || 'Без проекта';
                    if (!acc[projectName]) {
                      acc[projectName] = {
                        projectId: purchase.project_id,
                        purchases: [],
                        total: 0
                      };
                    }
                    acc[projectName].purchases.push(purchase);
                    acc[projectName].total += parseFloat(purchase.total_price || 0);
                    return acc;
                  }, {});

                  // Рендерим группы
                  return Object.entries(groupedPurchases).map(([projectName, data], groupIndex) => (
                    <React.Fragment key={projectName}>
                      {/* Заголовок группы (проект) */}
                      <TableRow>
                        <TableCell 
                          colSpan={8} 
                          sx={{ 
                            bgcolor: 'action.hover',
                            borderLeft: '4px solid',
                            borderLeftColor: 'primary.main',
                            py: 1.5
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 1.5,
                                  bgcolor: 'primary.main',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontWeight: 700
                                }}
                              >
                                {groupIndex + 1}
                              </Box>
                              <Typography variant="h6" fontWeight={600}>
                                {projectName}
                              </Typography>
                              <Chip 
                                label={`${data.purchases.length} ${data.purchases.length === 1 ? 'закупка' : 'закупок'}`} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </Stack>
                            <Typography variant="h6" fontWeight={700} color="primary.main">
                              Итого: {formatCurrency(data.total)}
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* Закупки проекта */}
                      {data.purchases.map((purchase, index) => (
                        <TableRow 
                          key={purchase.id} 
                          hover
                          sx={{
                            '&:last-of-type': groupIndex < Object.keys(groupedPurchases).length - 1 ? {
                              borderBottom: '2px solid',
                              borderBottomColor: 'divider'
                            } : {}
                          }}
                        >
                          <TableCell sx={{ width: 180 }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                              {purchase.estimate_name || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 250 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {purchase.is_extra_charge && (
                                <Chip label="О/Ч" color="warning" size="small" />
                              )}
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {purchase.material_name}
                                </Typography>
                                {purchase.material_sku && (
                                  <Typography variant="caption" color="text.secondary">
                                    Арт: {purchase.material_sku}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Avatar
                              src={purchase.material_image}
                              alt={purchase.material_name}
                              variant="rounded"
                              sx={{ width: 36, height: 36, border: '1px solid', borderColor: 'divider' }}
                            >
                              {!purchase.material_image && <IconPhoto size={16} />}
                            </Avatar>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {parseFloat(purchase.quantity).toLocaleString('ru-RU', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {purchase.unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(purchase.purchase_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {formatCurrency(purchase.total_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenEditDialog(purchase)}
                                title="Редактировать"
                              >
                                <IconEdit size={18} />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(purchase.id)}
                                title="Удалить"
                              >
                                <IconTrash size={18} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ));
                })()}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Диалог редактирования закупки */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconEdit size={24} />
            <Box>
              <Typography variant="h4">Редактирование закупки</Typography>
              {editingPurchase && (
                <Typography variant="caption" color="text.secondary">
                  {editingPurchase.material_name}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Информация о материале */}
            {editingPurchase && (
              <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar
                        src={editingPurchase.material_image}
                        alt={editingPurchase.material_name}
                        variant="rounded"
                        sx={{ width: 60, height: 60 }}
                      />
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {editingPurchase.material_name}
                        </Typography>
                        {editingPurchase.material_sku && (
                          <Typography variant="caption" color="text.secondary">
                            Артикул: {editingPurchase.material_sku}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          Ед. изм.: {editingPurchase.unit}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Проект
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {editingPurchase.project_name}
                    </Typography>
                  </Grid>
                  
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Смета
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {editingPurchase.estimate_name}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Alert severity="info" icon={<span>ℹ️</span>}>
              <Typography variant="body2">
                <strong>Обратите внимание:</strong>
              </Typography>
              <Typography variant="caption" component="div">
                • При изменении <strong>количества</strong> автоматически обновится статистика закупок в разделе "Закупки" проекта
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Цена закупки</strong> влияет только на сумму в глобальных закупках (не влияет на плановую цену в смете)
              </Typography>
            </Alert>

            {/* Поле количества */}
            <TextField
              fullWidth
              label="Количество"
              type="number"
              value={editFormData.quantity}
              onChange={(e) => handleEditFormChange('quantity', e.target.value)}
              inputProps={{ 
                min: 0.01, 
                step: 0.01 
              }}
              helperText={editingPurchase && `Ед. изм.: ${editingPurchase.unit}`}
              required
            />

            {/* Поле цены закупки */}
            <TextField
              fullWidth
              label="Цена закупки (фактическая)"
              type="number"
              value={editFormData.purchasePrice}
              onChange={(e) => handleEditFormChange('purchasePrice', e.target.value)}
              inputProps={{ 
                min: 0, 
                step: 0.01 
              }}
              helperText="Реальная цена закупки из чека"
              required
            />

            {/* Поле даты закупки */}
            <TextField
              fullWidth
              label="Дата закупки"
              type="date"
              value={editFormData.purchaseDate}
              onChange={(e) => handleEditFormChange('purchaseDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            {/* Предпросмотр суммы */}
            {editFormData.quantity && editFormData.purchasePrice && (
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Новая сумма закупки:
                  </Typography>
                  <Typography variant="h5" color="success.main" fontWeight={700}>
                    {formatCurrency(
                      parseFloat(editFormData.quantity || 0) * parseFloat(editFormData.purchasePrice || 0)
                    )}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Было:
                  </Typography>
                  <Typography variant="caption">
                    {editingPurchase && formatCurrency(editingPurchase.total_price)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Разница:
                  </Typography>
                  <Typography 
                    variant="caption"
                    color={
                      (parseFloat(editFormData.quantity || 0) * parseFloat(editFormData.purchasePrice || 0)) - 
                      (editingPurchase?.total_price || 0) > 0 
                        ? 'error.main' 
                        : 'success.main'
                    }
                  >
                    {editingPurchase && formatCurrency(
                      (parseFloat(editFormData.quantity || 0) * parseFloat(editFormData.purchasePrice || 0)) - 
                      editingPurchase.total_price
                    )}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveEdit}
            disabled={loading || !editFormData.quantity || !editFormData.purchasePrice}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GlobalPurchases;
