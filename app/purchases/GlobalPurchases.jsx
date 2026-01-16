import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';

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
  TableFooter,
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypeXls,
  IconFileTypePdf,
  IconFilter,
  IconChevronLeft,
  IconChevronRight,
  IconUpload
} from '@tabler/icons-react';

// API
import * as globalPurchasesAPI from 'api/globalPurchases';
import projectsAPI from 'api/projects';

// utils
import { formatCurrency } from 'utils/formatters';
import { exportToCSV, exportToExcel, exportToPDF } from 'utils/purchasesExport';
import ImportDialog from 'shared/ui/components/ImportDialog';
import { useNotifications } from 'contexts/NotificationsContext';

// Стили для кастомного DatePicker
const datePickerSlotProps = {
  textField: {
    size: 'small',
    fullWidth: true,
    sx: {
      '& .MuiOutlinedInput-root': {
        height: 38,
        bgcolor: '#F9FAFB',
        borderRadius: '6px',
        '& fieldset': { borderColor: '#E5E7EB' },
        '&:hover fieldset': { borderColor: '#D1D5DB' }
      },
      '& .MuiInputLabel-root': { fontSize: '0.8125rem' }
    }
  },
  popper: {
    sx: {
      '& .MuiPaper-root': {
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        mt: 0.5
      },
      '& .MuiPickersCalendarHeader-root': {
        py: 1,
        px: 1.5,
        '& .MuiPickersCalendarHeader-label': {
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#374151'
        }
      },
      '& .MuiPickersArrowSwitcher-root': {
        gap: '8px',
        '& .MuiIconButton-root': {
          width: 28,
          height: 28,
          color: '#6B7280',
          '&:hover': {
            bgcolor: '#F3F4F6',
            color: '#4B5563'
          }
        },
        '& .MuiSvgIcon-root': {
          fontSize: '1rem'
        }
      },
      '& .MuiDayCalendar-weekDayLabel': {
        fontSize: '0.6875rem',
        color: '#9CA3AF',
        fontWeight: 500
      },
      '& .MuiPickersDay-root': {
        fontSize: '0.8125rem',
        color: '#374151',
        '&.Mui-selected': {
          bgcolor: '#4F46E5',
          color: '#fff',
          borderRadius: '6px',
          '&:hover': {
            bgcolor: '#4338CA'
          }
        },
        '&:hover': {
          bgcolor: '#F3F4F6'
        }
      },
      '& .MuiPickersDay-today': {
        border: '1px solid #E5E7EB',
        borderRadius: '6px'
      },
      '& .MuiPickersCalendarHeader-switchViewButton': {
        color: '#6B7280',
        '&:hover': { bgcolor: '#F3F4F6' }
      },
      '& .MuiDialogActions-root': {
        p: 1,
        '& .MuiButton-root': {
          bgcolor: '#F3F4F6',
          color: '#4B5563',
          px: 1,
          py: 0.5,
          borderRadius: '6px',
          fontSize: '0.75rem',
          textTransform: 'none',
          '&:hover': {
            bgcolor: '#E5E7EB'
          }
        }
      }
    }
  },
  actionBar: {
    actions: ['clear', 'today']
  }
};

// ==============================|| GLOBAL PURCHASES ||============================== //

const GlobalPurchases = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [exportingServerCSV, setExportingServerCSV] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);

  const { success, info, error: showError } = useNotifications();

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

  const handleExportServerCSV = async () => {
    try {
      setExportingServerCSV(true);
      info('Подготовка файла экспорта...');
      await globalPurchasesAPI.exportGlobalPurchases(filters);
      success('Файл экспорта успешно сформирован');
    } catch (err) {
      console.error('Export error:', err);
      showError('Ошибка при экспорте закупок', err.message);
    } finally {
      setExportingServerCSV(false);
      handleExportMenuClose();
    }
  };

  const handleImportCSV = () => {
    setOpenImportDialog(true);
  };

  const handleImportSuccess = () => {
    loadPurchases();
    success('Закупки успешно импортированы');
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

  // Вычисляем общую сумму из закупок
  const totalSpent = purchases.reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);

  return (
    <Box>
      {/* Меню экспорта */}
      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={handleExportCSV}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconFileTypeCsv size={18} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>CSV</Typography>
              <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem' }}>
                Для Excel, Google Sheets
              </Typography>
            </Box>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleExportExcel}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconFileTypeXls size={18} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>Excel (XLS)</Typography>
              <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem' }}>
                С форматированием
              </Typography>
            </Box>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleExportPDF}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconFileTypePdf size={18} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>PDF</Typography>
              <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem' }}>
                Для печати
              </Typography>
            </Box>
          </Stack>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExportServerCSV} disabled={exportingServerCSV}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {exportingServerCSV ? <CircularProgress size={18} /> : <IconFileTypeCsv size={18} color="#4F46E5" />}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', color: '#4F46E5' }}>CSV (Сервер)</Typography>
              <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.6875rem' }}>
                Полный экспорт с сервера
              </Typography>
            </Box>
          </Stack>
        </MenuItem>
      </Menu>

      {/* Ошибка */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {/* Единый белый контейнер */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          pt: 3,
          pb: 4,
          px: 4,
          border: '1px solid #E5E7EB'
        }}
      >
        {/* 1. Заголовок раздела */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.25rem' }}>
            Общие закупки
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<IconDownload size={16} />}
              onClick={handleExportMenuOpen}
              disabled={loading || purchases.length === 0}
              sx={{
                height: 36,
                fontSize: '0.8125rem',
                textTransform: 'none',
                bgcolor: '#6366F1',
                borderRadius: '8px',
                '&:hover': { bgcolor: '#4F46E5' }
              }}
            >
              Экспорт
            </Button>
            <Button
              variant="outlined"
              startIcon={<IconUpload size={16} />}
              onClick={handleImportCSV}
              disabled={loading}
              sx={{
                height: 36,
                fontSize: '0.8125rem',
                textTransform: 'none',
                borderColor: '#E5E7EB',
                color: '#6B7280',
                borderRadius: '8px',
                '&:hover': {
                  bgcolor: '#F9FAFB',
                  borderColor: '#D1D5DB'
                }
              }}
            >
              Импорт CSV
            </Button>
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                width: 36,
                height: 36,
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                color: '#6B7280',
                '&:hover': {
                  bgcolor: '#F9FAFB',
                  borderColor: '#D1D5DB'
                }
              }}
            >
              <IconRefresh size={18} />
            </IconButton>
          </Stack>
        </Stack>

        {/* 2. Фильтры (без внешнего блока) */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <IconFilter size={14} style={{ color: '#9CA3AF' }} />
              <Typography sx={{ fontWeight: 500, fontSize: '0.875rem', color: '#6B7280' }}>
                Фильтры
              </Typography>
            </Stack>

            {(filters.projectId || filters.dateFrom || filters.dateTo) && (
              <Button
                size="small"
                variant="text"
                onClick={() => setFilters({ projectId: '', dateFrom: '', dateTo: '' })}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  color: '#EF4444',
                  '&:hover': { bgcolor: '#FEF2F2' }
                }}
              >
                ✕ Сбросить
              </Button>
            )}
          </Stack>

          <Grid container spacing={3} columnSpacing={3}>
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
                SelectProps={{ displayEmpty: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 38,
                    bgcolor: '#F9FAFB',
                    borderRadius: '6px',
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#D1D5DB' }
                  },
                  '& .MuiInputLabel-root': { fontSize: '0.8125rem' }
                }}
              >
                <MenuItem value="">
                  <em style={{ color: '#9CA3AF' }}>Все проекты</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{project.name}</Typography>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DatePicker
                label="Период с"
                value={filters.dateFrom ? dayjs(filters.dateFrom) : null}
                onChange={(newValue) => handleFilterChange('dateFrom', newValue ? newValue.format('YYYY-MM-DD') : '')}
                format="DD.MM.YYYY"
                slotProps={datePickerSlotProps}
                localeText={{
                  clearButtonLabel: 'Удалить',
                  todayButtonLabel: 'Сегодня'
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DatePicker
                label="Период по"
                value={filters.dateTo ? dayjs(filters.dateTo) : null}
                onChange={(newValue) => handleFilterChange('dateTo', newValue ? newValue.format('YYYY-MM-DD') : '')}
                format="DD.MM.YYYY"
                slotProps={datePickerSlotProps}
                localeText={{
                  clearButtonLabel: 'Удалить',
                  todayButtonLabel: 'Сегодня'
                }}
              />
            </Grid>
          </Grid>

          {/* Активные фильтры (чипы) */}
          {(filters.projectId || filters.dateFrom || filters.dateTo) && (
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }} flexWrap="wrap" gap={0.5}>
              {filters.projectId && (
                <Chip
                  label={`Проект: ${projects.find(p => p.id === filters.projectId)?.name || 'Выбран'}`}
                  onDelete={() => handleFilterChange('projectId', '')}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.6875rem',
                    bgcolor: '#EEF2FF',
                    color: '#4F46E5',
                    '& .MuiChip-deleteIcon': { color: '#818CF8', '&:hover': { color: '#4F46E5' } }
                  }}
                />
              )}
              {filters.dateFrom && (
                <Chip
                  label={`С: ${new Date(filters.dateFrom).toLocaleDateString('ru-RU')}`}
                  onDelete={() => handleFilterChange('dateFrom', '')}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.6875rem',
                    bgcolor: '#F0F9FF',
                    color: '#0369A1',
                    '& .MuiChip-deleteIcon': { color: '#7DD3FC', '&:hover': { color: '#0369A1' } }
                  }}
                />
              )}
              {filters.dateTo && (
                <Chip
                  label={`По: ${new Date(filters.dateTo).toLocaleDateString('ru-RU')}`}
                  onDelete={() => handleFilterChange('dateTo', '')}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.6875rem',
                    bgcolor: '#F0F9FF',
                    color: '#0369A1',
                    '& .MuiChip-deleteIcon': { color: '#7DD3FC', '&:hover': { color: '#0369A1' } }
                  }}
                />
              )}
            </Stack>
          )}
        </Box>

        {/* Разделитель */}
        <Divider sx={{ mt: 4, mb: 4, borderColor: 'rgba(0, 0, 0, 0.08)' }} />

        {/* 3. Подзаголовок списка */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9375rem' }}>
            Список закупок
          </Typography>
          <Typography sx={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>
            {filters.dateFrom && filters.dateTo ? (
              <>Период: {formatDate(filters.dateFrom)} — {formatDate(filters.dateTo)} • Найдено: {purchases.length}</>
            ) : filters.dateFrom ? (
              <>С {formatDate(filters.dateFrom)} • Найдено: {purchases.length}</>
            ) : filters.dateTo ? (
              <>По {formatDate(filters.dateTo)} • Найдено: {purchases.length}</>
            ) : (
              <>Все периоды • Найдено: {purchases.length}</>
            )}
          </Typography>
        </Box>

        {/* 4. Таблица закупок */}
        <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress size={32} />
            </Box>
          ) : purchases.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#6B7280', fontWeight: 500, fontSize: '0.9375rem' }}>
                Закупок пока нет
              </Typography>
              <Typography sx={{ color: '#9CA3AF', mt: 0.5, fontSize: '0.8125rem' }}>
                Добавляйте закупки через кнопку "В закупку" в разделе "Закупки" смет
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>Смета</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>Материал</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, width: 56, borderBottom: '1px solid #E5E7EB' }}>Фото</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>Кол-во</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>Ед.</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>Цена</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>Сумма</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', py: 1.25, width: 80, borderBottom: '1px solid #E5E7EB' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const groupedPurchases = purchases.reduce((acc, purchase) => {
                      const projectName = purchase.project_name || 'Без проекта';
                      if (!acc[projectName]) {
                        acc[projectName] = { projectId: purchase.project_id, purchases: [], total: 0 };
                      }
                      acc[projectName].purchases.push(purchase);
                      acc[projectName].total += parseFloat(purchase.total_price || 0);
                      return acc;
                    }, {});

                    return Object.entries(groupedPurchases).map(([projectName, data], groupIndex) => (
                      <React.Fragment key={projectName}>
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            sx={{
                              bgcolor: '#F3F4F6',
                              borderLeft: '3px solid #6366F1',
                              py: 1,
                              borderBottom: '1px solid #E5E7EB'
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Box
                                  sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '4px',
                                    bgcolor: '#6366F1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700
                                  }}
                                >
                                  {groupIndex + 1}
                                </Box>
                                <Typography sx={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem' }}>
                                  {projectName}
                                </Typography>
                                <Chip
                                  label={`${data.purchases.length} поз.`}
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.75rem', bgcolor: '#F3F4F6', color: '#6B7280', fontWeight: 500, border: '1px solid #E5E7EB' }}
                                />
                              </Stack>
                            </Stack>
                          </TableCell>
                        </TableRow>

                        {data.purchases.map((purchase) => (
                          <TableRow
                            key={purchase.id}
                            hover
                            sx={{
                              '&:hover': { bgcolor: '#FAFAFA' },
                              '& .MuiTableCell-root': { verticalAlign: 'middle' }
                            }}
                          >
                            <TableCell sx={{ py: 1, maxWidth: 160, borderBottom: '1px solid #F3F4F6' }}>
                              <Typography noWrap sx={{ fontSize: '0.8125rem', color: '#4B5563' }}>
                                {purchase.estimate_name || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1, minWidth: 200, borderBottom: '1px solid #F3F4F6' }}>
                              <Stack direction="row" alignItems="center" spacing={0.75}>
                                {purchase.is_extra_charge && (
                                  <Chip
                                    label="О/Ч"
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.5625rem', bgcolor: '#FEF3C7', color: '#92400E' }}
                                  />
                                )}
                                <Box>
                                  <Typography sx={{ fontWeight: 500, fontSize: '0.8125rem', color: '#374151' }}>
                                    {purchase.material_name}
                                  </Typography>
                                  {purchase.material_sku && (
                                    <Typography sx={{ color: '#9CA3AF', fontSize: '0.6875rem', lineHeight: 1.2, display: 'block' }}>
                                      Арт: {purchase.material_sku}
                                    </Typography>
                                  )}
                                  {/* Иерархические категории */}
                                  <Box sx={{ mt: 0.5 }}>

                                    {purchase.category_full_path ? (
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, alignItems: 'center' }}>
                                        {purchase.category_full_path.split(' / ').map((part, idx, arr) => (
                                          <React.Fragment key={idx}>
                                            <Typography sx={{ fontSize: '0.65rem', color: idx === arr.length - 1 ? '#4F46E5' : '#9CA3AF', fontWeight: idx === arr.length - 1 ? 500 : 400 }}>
                                              {part}
                                            </Typography>
                                            {idx < arr.length - 1 && (
                                              <Typography sx={{ fontSize: '0.65rem', color: '#D1D5DB' }}>›</Typography>
                                            )}
                                          </React.Fragment>
                                        ))}
                                      </Box>
                                    ) : (
                                      <Typography sx={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                                        {purchase.category || '—'}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '4px',
                                  border: '1px solid #E5E7EB',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: '#F9FAFB'
                                }}
                              >
                                {purchase.material_image ? (
                                  <img
                                    src={purchase.material_image}
                                    alt={purchase.material_name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  />
                                ) : (
                                  <Typography sx={{ color: '#D1D5DB', fontSize: '0.625rem' }}>—</Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#374151' }}>
                                {parseFloat(purchase.quantity).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                              <Typography sx={{ color: '#6B7280', fontSize: '0.8125rem' }}>
                                {purchase.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                              <Typography sx={{ fontSize: '0.8125rem', color: '#4B5563' }}>
                                {formatCurrency(purchase.purchase_price)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#059669' }}>
                                {formatCurrency(purchase.total_price)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditDialog(purchase)}
                                  title="Редактировать"
                                  sx={{ width: 28, height: 28, color: '#6B7280', '&:hover': { bgcolor: '#F3F4F6', color: '#4B5563' } }}
                                >
                                  <IconEdit size={16} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(purchase.id)}
                                  title="Удалить"
                                  sx={{ width: 28, height: 28, color: '#EF4444', '&:hover': { bgcolor: '#FEF2F2', color: '#DC2626' } }}
                                >
                                  <IconTrash size={16} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ));
                  })()}
                </TableBody>

                {/* Footer с итогом */}
                {purchases.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="right"
                        sx={{ bgcolor: '#F9FAFB', borderTop: '2px solid rgba(0,0,0,0.07)', pt: 2.5, pb: 2 }}
                      >
                        <Typography sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                          Итого по всем проектам:
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ bgcolor: '#F9FAFB', borderTop: '2px solid rgba(0,0,0,0.07)', pt: 2.5, pb: 2 }}
                      >
                        <Typography sx={{ fontWeight: 700, color: '#059669', fontSize: '1rem' }}>
                          {formatCurrency(totalSpent)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#F9FAFB', borderTop: '2px solid rgba(0,0,0,0.07)', pt: 2.5, pb: 2 }} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </Box>
          )}
        </Box>
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

      {/* ✅ Диалог импорта закупок */}
      <ImportDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        onImport={globalPurchasesAPI.importGlobalPurchases}
        onSuccess={handleImportSuccess}
        title="Импорт закупок из CSV"
        description="📄 Загрузите CSV файл с закупками. Обязательные поля: Проект, Смета, Материал, Кол-во, Цена. Дополнительные: Артикул, Ед изм, Дата."
      />
    </Box>
  );
};

export default GlobalPurchases;
