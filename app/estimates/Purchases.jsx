import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Autocomplete,
  Chip,
  Collapse
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { 
  IconShoppingCart, 
  IconDeviceFloppy, 
  IconRefresh, 
  IconPhoto, 
  IconShoppingCartPlus, 
  IconPlus,
  IconCheck,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconPackage,
  IconEdit,
  IconTrash,
  IconSearch
} from '@tabler/icons-react';

// API
import * as purchasesAPI from 'api/purchases';
import * as globalPurchasesAPI from 'api/globalPurchases';
import materialsAPI from 'api/materials';

// ==============================|| PURCHASES (ЗАКУПКИ) ||============================== //

// Цветовая палитра
const colors = {
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',
  green: '#10B981',
  greenLight: '#D1FAE5',
  greenDark: '#059669',
  headerBg: '#F3F4F6',
  cardBg: '#F9FAFB',
  totalBg: '#EEF2FF',
  summaryBg: '#F5F3FF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
};

const Purchases = ({ estimateId, projectId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [purchasesData, setPurchasesData] = useState([]);
  const [purchasesGenerated, setPurchasesGenerated] = useState(false);
  
  // Диалог добавления в общие закупки
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState({
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  // Диалог добавления материала "Отдельный чек"
  const [addExtraMaterialDialogOpen, setAddExtraMaterialDialogOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [extraMaterialForm, setExtraMaterialForm] = useState({
    material: null,
    quantity: '',
    purchasePrice: ''
  });

  const totalAmount = purchasesData.reduce((sum, material) => sum + material.total, 0);
  const totalActualAmount = purchasesData.reduce((sum, material) => sum + (material.actualTotalPrice || 0), 0);
  
  // Статистика по материалам
  const regularMaterials = purchasesData.filter(m => !m.isExtraCharge);
  const extraMaterials = purchasesData.filter(m => m.isExtraCharge);
  
  // Получить статус закупки материала
  const getPurchaseStatus = (material) => {
    const remainder = material.quantity - (material.purchasedQuantity || 0);
    if (remainder === 0) return 'complete';
    if (remainder < 0) return 'over';
    if (material.purchasedQuantity > 0) return 'partial';
    return 'none';
  };

  // Загрузка существующих закупок при монтировании
  useEffect(() => {
    const loadPurchases = async () => {
      if (!estimateId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await purchasesAPI.getByEstimateId(estimateId);
        
        if (response.purchases && response.purchases.length > 0) {
          setPurchasesData(response.purchases);
          setPurchasesGenerated(true);
        }
      } catch (err) {
        // Если закупки не найдены (404), это не ошибка - просто еще не созданы
        if (err.response?.status !== 404) {
          console.error('Ошибка загрузки закупок:', err);
          setError('Не удалось загрузить закупки');
        }
      } finally {
        setLoading(false);
      }
    };

    loadPurchases();
  }, [estimateId]);

  const handleGeneratePurchases = async () => {
    if (!estimateId || !projectId) {
      setError('Не указан ID сметы или проекта');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await purchasesAPI.generatePurchases(estimateId, projectId);
      
      if (response.purchases) {
        setPurchasesData(response.purchases);
        setPurchasesGenerated(true);
      }
    } catch (err) {
      console.error('Ошибка формирования закупок:', err);
      setError(err.response?.data?.message || 'Не удалось сформировать закупки');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPurchases = async () => {
    if (!estimateId || !projectId) {
      setError('Не указан ID сметы или проекта');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Перегенерируем закупки (старые будут удалены и созданы новые)
      const response = await purchasesAPI.generatePurchases(estimateId, projectId);
      
      if (response.purchases) {
        setPurchasesData(response.purchases);
        setPurchasesGenerated(true);
      }
    } catch (err) {
      console.error('Ошибка обновления закупок:', err);
      setError(err.response?.data?.message || 'Не удалось обновить закупки');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Открыть диалог добавления в общие закупки
  const handleOpenAddDialog = (material) => {
    const remainder = material.quantity - (material.purchasedQuantity || 0);
    
    setSelectedMaterial(material);
    setPurchaseForm({
      quantity: remainder > 0 ? remainder.toString() : '0',
      purchasePrice: material.price.toString(),
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    setAddDialogOpen(true);
  };

  // Закрыть диалог
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setSelectedMaterial(null);
    setPurchaseForm({
      quantity: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
  };

  // Добавить в общие закупки
  const handleAddToGlobalPurchases = async () => {
    if (!selectedMaterial || !estimateId || !projectId) return;

    try {
      setSubmitting(true);
      setError(null);

      const purchaseData = {
        projectId,
        estimateId,
        materialId: selectedMaterial.materialId,
        quantity: parseFloat(purchaseForm.quantity),
        purchasePrice: parseFloat(purchaseForm.purchasePrice),
        purchaseDate: purchaseForm.purchaseDate,
        sourcePurchaseId: selectedMaterial.id, // ID записи в таблице purchases
        isExtraCharge: selectedMaterial.isExtraCharge || false // Передаем флаг О/Ч если есть
      };

      await globalPurchasesAPI.createGlobalPurchase(purchaseData);

      handleCloseAddDialog();
      
      // Перезагружаем закупки, чтобы обновить purchased_quantity
      const response = await purchasesAPI.getByEstimateId(estimateId);
      if (response.purchases) {
        setPurchasesData(response.purchases);
      }
      
      // Показываем уведомление об успехе
      const messageType = selectedMaterial.isExtraCharge ? 'О/Ч материал' : 'Материал';
      alert(`${messageType} успешно добавлен в общие закупки!`);

    } catch (err) {
      console.error('Ошибка добавления в общие закупки:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Не удалось добавить в общие закупки');
    } finally {
      setSubmitting(false);
    }
  };

  // Открыть диалог добавления "отдельного чека"
  const handleOpenExtraMaterialDialog = async () => {
    setExtraMaterialForm({
      material: null,
      quantity: '',
      purchasePrice: ''
    });
    setAddExtraMaterialDialogOpen(true);

    // Загружаем материалы только при открытии диалога
    if (materials.length === 0) {
      try {
        setLoadingMaterials(true);
        const materialsData = await materialsAPI.getAll({ 
          pageSize: 50000 // Загружаем все материалы (до 50K)
        });
        setMaterials(materialsData || []);
      } catch (err) {
        console.error('Ошибка загрузки материалов:', err);
        setError('Не удалось загрузить материалы');
      } finally {
        setLoadingMaterials(false);
      }
    }
  };

  // Закрыть диалог "отдельного чека"
  const handleCloseExtraMaterialDialog = () => {
    setAddExtraMaterialDialogOpen(false);
    setExtraMaterialForm({
      material: null,
      quantity: '',
      purchasePrice: ''
    });
  };

  // Добавить материал "отдельный чек"
  const handleAddExtraMaterial = async () => {
    if (!extraMaterialForm.material || !estimateId || !projectId) return;

    try {
      setSubmitting(true);
      setError(null);

      // Добавляем ТОЛЬКО в закупки проекта (таблица purchases)
      // В глобальные закупки будет добавлено через кнопку "В закупку" 🛒
      await purchasesAPI.createExtraCharge({
        estimateId,
        projectId,
        materialId: extraMaterialForm.material.id,
        quantity: parseFloat(extraMaterialForm.quantity),
        price: parseFloat(extraMaterialForm.purchasePrice),
        isExtraCharge: true
      });

      handleCloseExtraMaterialDialog();
      
      // Перезагружаем закупки для отображения нового О/Ч материала
      const response = await purchasesAPI.getByEstimateId(estimateId);
      if (response.purchases) {
        setPurchasesData(response.purchases);
      }
      
      // Показываем уведомление об успехе
      alert('Материал О/Ч успешно добавлен в закупки проекта! Используйте кнопку 🛒 для добавления в глобальные закупки.');

    } catch (err) {
      console.error('Ошибка добавления отдельного чека:', err);
      console.error('Детали ошибки:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Не удалось добавить материал');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* ═══════════════════════════════════════════════════════════════════
          ШАПКА СТРАНИЦЫ
      ═══════════════════════════════════════════════════════════════════ */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: colors.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconPackage size={26} color={colors.primary} />
          </Box>
          <Box>
            <Typography 
              variant="h4" 
              component="h1"
              sx={{ 
                fontWeight: 700, 
                color: colors.textPrimary,
                fontSize: { xs: '1.5rem', sm: '1.75rem' }
              }}
            >
              Закупки
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: colors.textSecondary, mt: 0.5 }}
            >
              Материалы, сгруппированные и суммированные по всей смете
            </Typography>
          </Box>
        </Stack>
        
        <Stack direction="row" spacing={2}>
          {purchasesGenerated && (
            <>
              <Button
                variant="contained"
                size="medium"
                startIcon={<IconPlus size={20} />}
                onClick={handleOpenExtraMaterialDialog}
                sx={{
                  bgcolor: colors.primary,
                  color: '#fff',
                  fontWeight: 600,
                  px: 2.5,
                  py: 1,
                  borderRadius: '10px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                  '&:hover': {
                    bgcolor: colors.primaryDark,
                    boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
                  }
                }}
              >
                Добавить материал (О/Ч)
              </Button>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<IconRefresh size={20} />}
                onClick={handleRefreshPurchases}
                disabled={loading}
                sx={{
                  borderColor: colors.primary,
                  color: colors.primary,
                  fontWeight: 600,
                  px: 2.5,
                  py: 1,
                  borderRadius: '10px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: colors.primaryDark,
                    bgcolor: colors.primaryLight,
                  }
                }}
              >
                Обновить закупки
              </Button>
            </>
          )}
          
          {!purchasesGenerated && !loading && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<IconDeviceFloppy size={20} />}
              onClick={handleGeneratePurchases}
              disabled={loading || !estimateId || !projectId}
              sx={{
                bgcolor: colors.primary,
                color: '#fff',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: '10px',
                textTransform: 'none',
                boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                '&:hover': {
                  bgcolor: colors.primaryDark,
                  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
                },
                '&:disabled': { bgcolor: '#C7D2FE' }
              }}
            >
              Сформировать закупки
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ═══════════════════════════════════════════════════════════════════
          ИНДИКАТОР ЗАГРУЗКИ
      ═══════════════════════════════════════════════════════════════════ */}
      {loading && (
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: '16px',
            border: `1px solid ${colors.border}`
          }}
        >
          <CircularProgress sx={{ color: colors.primary }} />
          <Typography variant="body1" sx={{ color: colors.textSecondary, mt: 2 }}>
            Формирование закупок...
          </Typography>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ОШИБКА
      ═══════════════════════════════════════════════════════════════════ */}
      {error && !loading && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: '12px',
            '& .MuiAlert-icon': { alignItems: 'center' }
          }}
        >
          {error}
        </Alert>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ЗАГЛУШКА (НЕ СФОРМИРОВАНО)
      ═══════════════════════════════════════════════════════════════════ */}
      {!loading && !purchasesGenerated && (
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            bgcolor: '#FAFAFA'
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              bgcolor: colors.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <IconShoppingCart size={40} color={colors.primary} style={{ opacity: 0.7 }} />
          </Box>
          <Typography 
            variant="h5" 
            sx={{ fontWeight: 600, color: '#374151', mb: 1 }}
          >
            Закупки ещё не сформированы
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: colors.textSecondary, mb: 4, maxWidth: 400, mx: 'auto' }}
          >
            Нажмите кнопку «Сформировать закупки» для создания списка материалов на основе сметы
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<IconDeviceFloppy size={22} />}
            onClick={handleGeneratePurchases}
            disabled={loading || !estimateId || !projectId}
            sx={{
              bgcolor: colors.primary,
              color: '#fff',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: '12px',
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
              '&:hover': {
                bgcolor: colors.primaryDark,
                boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
              }
            }}
          >
            Сформировать закупки
          </Button>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          СФОРМИРОВАННЫЕ ЗАКУПКИ
      ═══════════════════════════════════════════════════════════════════ */}
      {!loading && purchasesGenerated && (
        <>
          <Paper 
            sx={{ 
              overflow: 'hidden',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            {/* Таблица материалов */}
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="medium" sx={{ minWidth: 1100 }}>
                <TableHead>
                  {/* Первый уровень шапки */}
                  <TableRow>
                    <TableCell 
                      rowSpan={2} 
                      sx={{ 
                        width: 100, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Артикул
                    </TableCell>
                    <TableCell 
                      rowSpan={2} 
                      sx={{ 
                        minWidth: 200, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Наименование материала
                    </TableCell>
                    <TableCell 
                      rowSpan={2} 
                      align="center" 
                      sx={{ 
                        width: 60, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Фото
                    </TableCell>
                    <TableCell 
                      rowSpan={2} 
                      align="center" 
                      sx={{ 
                        width: 70, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Ед.
                    </TableCell>
                    <TableCell 
                      rowSpan={2} 
                      align="right" 
                      sx={{ 
                        width: 80, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Нужно
                    </TableCell>
                    <TableCell 
                      rowSpan={2} 
                      align="right" 
                      sx={{ 
                        width: 90, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Закуплено
                    </TableCell>
                    <TableCell 
                      rowSpan={2} 
                      align="right" 
                      sx={{ 
                        width: 90, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <Tooltip title="Остаток = Нужно − Закуплено" arrow>
                        <span style={{ cursor: 'help', borderBottom: '1px dashed #9CA3AF' }}>
                          Остаток
                        </span>
                      </Tooltip>
                    </TableCell>
                    
                    {/* Секция «ПЛАН (СМЕТА)» */}
                    <TableCell 
                      colSpan={2} 
                      align="center"
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.875rem',
                        bgcolor: colors.headerBg,
                        color: colors.textPrimary,
                        py: 1,
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft: `2px solid ${colors.border}`
                      }}
                    >
                      ПЛАН (смета)
                    </TableCell>
                    
                    {/* Секция «ФАКТ (ЗАКУПКИ)» */}
                    <TableCell 
                      colSpan={2} 
                      align="center"
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.875rem',
                        bgcolor: colors.greenLight,
                        color: colors.greenDark,
                        py: 1,
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft: `2px solid ${colors.green}`
                      }}
                    >
                      ФАКТ (закупки)
                    </TableCell>
                    
                    <TableCell 
                      rowSpan={2} 
                      align="center" 
                      sx={{ 
                        width: 80, 
                        fontWeight: 700,
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Действия
                    </TableCell>
                  </TableRow>
                  
                  {/* Второй уровень шапки */}
                  <TableRow>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        width: 120, 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.25,
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft: `2px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Цена ₽/ед
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        width: 120, 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.25,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Сумма
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        width: 120, 
                        fontWeight: 700, 
                        bgcolor: colors.greenLight,
                        color: colors.greenDark,
                        py: 1.25,
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft: `2px solid ${colors.green}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Цена ₽/ед
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        width: 120, 
                        fontWeight: 700, 
                        bgcolor: colors.greenLight,
                        color: colors.greenDark,
                        py: 1.25,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      Сумма
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Основные материалы */}
                  {regularMaterials.map((material, index) => {
                    const status = getPurchaseStatus(material);
                    const remainder = material.quantity - (material.purchasedQuantity || 0);
                    
                    return (
                      <TableRow
                        key={`regular-${index}`}
                        sx={{
                          bgcolor: index % 2 === 0 ? '#fff' : '#FAFAFA',
                          '&:hover': { bgcolor: colors.cardBg },
                          transition: 'background-color 0.15s',
                          '& td': {
                            py: 1.5,
                            borderBottom: `1px solid ${colors.border}`
                          },
                          ...(status === 'over' && {
                            borderLeft: `3px solid ${colors.error}`
                          })
                        }}
                      >
                        {/* Артикул */}
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500, 
                              color: colors.primary,
                              fontFamily: 'monospace'
                            }}
                          >
                            {material.sku || '-'}
                          </Typography>
                        </TableCell>
                        
                        {/* Наименование */}
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {status === 'complete' && (
                              <IconCheck size={16} color={colors.green} />
                            )}
                            {status === 'partial' && (
                              <IconAlertTriangle size={16} color={colors.warning} />
                            )}
                            {status === 'over' && (
                              <IconAlertTriangle size={16} color={colors.error} />
                            )}
                            <Typography variant="body2" sx={{ color: '#374151' }}>
                              {material.name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        
                        {/* Фото */}
                        <TableCell align="center">
                          {material.image ? (
                            <Tooltip title="Нажмите для увеличения">
                              <Avatar
                                src={material.image}
                                alt={material.name}
                                variant="rounded"
                                sx={{ 
                                  width: 36, 
                                  height: 36,
                                  border: `1px solid ${colors.border}`,
                                  margin: '0 auto',
                                  cursor: 'pointer',
                                  '&:hover': { opacity: 0.8 }
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Avatar
                              variant="rounded"
                              sx={{ 
                                width: 36, 
                                height: 36,
                                bgcolor: '#F3F4F6',
                                margin: '0 auto'
                              }}
                            >
                              <IconPhoto size={16} color="#9CA3AF" />
                            </Avatar>
                          )}
                        </TableCell>
                        
                        {/* Ед. изм. */}
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                            {material.unit}
                          </Typography>
                        </TableCell>
                        
                        {/* Нужно */}
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                            {material.quantity.toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        
                        {/* Закуплено */}
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600, 
                              color: material.purchasedQuantity > 0 ? colors.green : colors.textSecondary
                            }}
                          >
                            {(material.purchasedQuantity || 0).toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        
                        {/* Остаток */}
                        <TableCell 
                          align="right"
                          sx={{
                            bgcolor: status === 'complete' ? colors.greenLight : 
                                    status === 'over' ? colors.errorLight : 
                                    status === 'partial' ? colors.warningLight : 'transparent'
                          }}
                        >
                          {status === 'complete' ? (
                            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                              <IconCheck size={16} color={colors.green} />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: colors.green }}>
                                Закуплено
                              </Typography>
                            </Stack>
                          ) : status === 'none' ? (
                            <Typography variant="body2" sx={{ color: '#9CA3AF', textAlign: 'right' }}>
                              —
                            </Typography>
                          ) : (
                            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                              <IconAlertTriangle 
                                size={16} 
                                color={status === 'over' ? colors.error : colors.warning} 
                              />
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600, 
                                  color: status === 'over' ? colors.error : colors.warning
                                }}
                              >
                                {remainder.toLocaleString('ru-RU', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                })}
                              </Typography>
                            </Stack>
                          )}
                        </TableCell>
                        
                        {/* ПЛАН: Цена */}
                        <TableCell 
                          align="right"
                          sx={{ borderLeft: `2px solid ${colors.border}` }}
                        >
                          <Typography variant="body2" sx={{ color: '#374151' }}>
                            {formatCurrency(material.price)}
                          </Typography>
                        </TableCell>
                        
                        {/* ПЛАН: Сумма */}
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937' }}>
                            {formatCurrency(material.total)}
                          </Typography>
                        </TableCell>
                        
                        {/* ФАКТ: Цена */}
                        <TableCell 
                          align="right"
                          sx={{ borderLeft: `2px solid ${colors.green}` }}
                        >
                          {material.avgPurchasePrice ? (
                            <Typography 
                              variant="body2"
                              sx={{ 
                                fontWeight: 500, 
                                color: colors.green
                              }}
                            >
                              {formatCurrency(material.avgPurchasePrice)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#D1D5DB' }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        
                        {/* ФАКТ: Сумма */}
                        <TableCell align="right">
                          {material.actualTotalPrice > 0 ? (
                            <Typography 
                              variant="body2" 
                              sx={{ fontWeight: 700, color: colors.green }}
                            >
                              {formatCurrency(material.actualTotalPrice)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#D1D5DB' }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        
                        {/* Действия */}
                        <TableCell 
                          align="center"
                          sx={{
                            '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.04)' }
                          }}
                        >
                          <Tooltip title="Добавить в общие закупки">
                            <IconButton
                              size="medium"
                              onClick={() => handleOpenAddDialog(material)}
                              sx={{ 
                                color: colors.textSecondary,
                                transition: 'all 0.2s ease',
                                '&:hover': { 
                                  color: colors.primary,
                                  bgcolor: alpha(colors.primary, 0.12),
                                  transform: 'scale(1.05)'
                                }
                              }}
                            >
                              <IconShoppingCartPlus size={24} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Разделитель для О/Ч материалов */}
                  {extraMaterials.length > 0 && (
                    <>
                      <TableRow>
                        <TableCell 
                          colSpan={13} 
                          sx={{ 
                            bgcolor: colors.warningLight, 
                            borderTop: `2px solid ${colors.warning}`,
                            py: 1.5 
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Chip 
                              label="О/Ч" 
                              size="small" 
                              sx={{ 
                                bgcolor: colors.warning, 
                                color: '#fff',
                                fontWeight: 600
                              }} 
                            />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#92400E' }}>
                              Отдельные чеки (не учтены в смете) — {extraMaterials.length} позиций
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* О/Ч материалы */}
                      {extraMaterials.map((material, index) => {
                        const status = getPurchaseStatus(material);
                        const remainder = material.quantity - (material.purchasedQuantity || 0);
                        
                        return (
                          <TableRow
                            key={`extra-${index}`}
                            sx={{
                              bgcolor: alpha(colors.warning, 0.08),
                              '&:hover': { bgcolor: alpha(colors.warning, 0.15) },
                              transition: 'background-color 0.15s',
                              '& td': {
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
                              }
                            }}
                          >
                            {/* Артикул */}
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Chip 
                                  label="О/Ч" 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: colors.warning, 
                                    color: '#fff',
                                    fontSize: '0.65rem',
                                    height: 18,
                                    fontWeight: 600
                                  }} 
                                />
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 500, 
                                    color: colors.primary,
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {material.sku || '-'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            
                            {/* Наименование */}
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                                {material.name}
                              </Typography>
                            </TableCell>
                            
                            {/* Фото */}
                            <TableCell align="center">
                              {material.image ? (
                                <Avatar
                                  src={material.image}
                                  alt={material.name}
                                  variant="rounded"
                                  sx={{ 
                                    width: 36, 
                                    height: 36,
                                    border: `2px solid ${colors.warning}`,
                                    margin: '0 auto'
                                  }}
                                />
                              ) : (
                                <Avatar
                                  variant="rounded"
                                  sx={{ 
                                    width: 36, 
                                    height: 36,
                                    bgcolor: colors.warning,
                                    color: '#fff',
                                    margin: '0 auto'
                                  }}
                                >
                                  <IconPhoto size={16} />
                                </Avatar>
                              )}
                            </TableCell>
                            
                            {/* Ед. изм. */}
                            <TableCell align="center">
                              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                                {material.unit}
                              </Typography>
                            </TableCell>
                            
                            {/* Нужно */}
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                                {material.quantity.toLocaleString('ru-RU', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                })}
                              </Typography>
                            </TableCell>
                            
                            {/* Закуплено */}
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600, 
                                  color: material.purchasedQuantity > 0 ? colors.green : colors.textSecondary
                                }}
                              >
                                {(material.purchasedQuantity || 0).toLocaleString('ru-RU', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                })}
                              </Typography>
                            </TableCell>
                            
                            {/* Остаток */}
                            <TableCell 
                              align="right"
                              sx={{
                                bgcolor: status === 'complete' ? colors.greenLight : 
                                        status === 'over' ? colors.errorLight : 
                                        alpha(colors.warning, 0.2)
                              }}
                            >
                              {status === 'complete' ? (
                                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                                  <IconCheck size={16} color={colors.green} />
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: colors.green }}>
                                    Закуплено
                                  </Typography>
                                </Stack>
                              ) : status === 'none' ? (
                                <Typography variant="body2" sx={{ color: '#9CA3AF', textAlign: 'right' }}>
                                  —
                                </Typography>
                              ) : (
                                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                                  <IconAlertTriangle 
                                    size={16} 
                                    color={status === 'over' ? colors.error : '#92400E'} 
                                  />
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 600, 
                                      color: status === 'over' ? colors.error : '#92400E'
                                    }}
                                  >
                                    {remainder.toLocaleString('ru-RU', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2
                                    })}
                                  </Typography>
                                </Stack>
                              )}
                            </TableCell>
                            
                            {/* ПЛАН: Цена */}
                            <TableCell 
                              align="right"
                              sx={{ 
                                borderLeft: `2px solid ${colors.border}`,
                                bgcolor: alpha(colors.warning, 0.05)
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#92400E' }}>
                                {formatCurrency(material.price)}
                              </Typography>
                            </TableCell>
                            
                            {/* ПЛАН: Сумма */}
                            <TableCell 
                              align="right"
                              sx={{ bgcolor: alpha(colors.warning, 0.05) }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#92400E' }}>
                                {formatCurrency(material.total)}
                              </Typography>
                            </TableCell>
                            
                            {/* ФАКТ: Цена */}
                            <TableCell 
                              align="right"
                              sx={{ 
                                borderLeft: `2px solid ${colors.green}`,
                                bgcolor: alpha(colors.warning, 0.05)
                              }}
                            >
                              {material.avgPurchasePrice ? (
                                <Typography 
                                  variant="body2"
                                  sx={{ fontWeight: 500, color: colors.green }}
                                >
                                  {formatCurrency(material.avgPurchasePrice)}
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ color: '#D1D5DB' }}>
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            
                            {/* ФАКТ: Сумма */}
                            <TableCell 
                              align="right"
                              sx={{ bgcolor: alpha(colors.warning, 0.05) }}
                            >
                              {material.actualTotalPrice > 0 ? (
                                <Typography 
                                  variant="body2" 
                                  sx={{ fontWeight: 700, color: colors.green }}
                                >
                                  {formatCurrency(material.actualTotalPrice)}
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ color: '#D1D5DB' }}>
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            
                            {/* Действия */}
                            <TableCell 
                              align="center"
                              sx={{
                                '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.06)' }
                              }}
                            >
                              <Tooltip title="Добавить в общие закупки">
                                <IconButton
                                  size="medium"
                                  onClick={() => handleOpenAddDialog(material)}
                                  sx={{ 
                                    color: colors.textSecondary,
                                    transition: 'all 0.2s ease',
                                    '&:hover': { 
                                      color: colors.warning,
                                      bgcolor: alpha(colors.warning, 0.15),
                                      transform: 'scale(1.05)'
                                    }
                                  }}
                                >
                                  <IconShoppingCartPlus size={24} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>

          {/* ─────────────────────────────────────────────────────────────────
              КОМПАКТНЫЙ БЛОК ИТОГОВ
          ───────────────────────────────────────────────────────────────── */}
          <Paper 
            sx={{ 
              p: 2, 
              mt: 2,
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              bgcolor: '#FAFAFA'
            }}
          >
            {/* Заголовок и статусы в одной строке */}
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={1.5}
              sx={{ mb: 1.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconPackage size={18} color={colors.primary} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151' }}>
                  Итоги закупок
                </Typography>
              </Stack>
              
              {/* Статусы компактно */}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip 
                  icon={<IconCheck size={14} />}
                  label={`${regularMaterials.filter(m => getPurchaseStatus(m) === 'complete').length}`}
                  size="small"
                  sx={{ 
                    bgcolor: colors.greenLight, 
                    color: colors.greenDark,
                    height: 26,
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': { color: colors.green }
                  }}
                />
                <Chip 
                  icon={<IconAlertTriangle size={14} />}
                  label={`${regularMaterials.filter(m => getPurchaseStatus(m) === 'partial').length}`}
                  size="small"
                  sx={{ 
                    bgcolor: colors.warningLight, 
                    color: '#92400E',
                    height: 26,
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': { color: colors.warning }
                  }}
                />
                <Chip 
                  label={`${regularMaterials.filter(m => getPurchaseStatus(m) === 'none').length}`}
                  size="small"
                  sx={{ 
                    bgcolor: '#E5E7EB', 
                    color: '#6B7280',
                    height: 26,
                    fontSize: '0.75rem'
                  }}
                />
                {extraMaterials.length > 0 && (
                  <Chip 
                    label={`О/Ч: ${extraMaterials.length}`}
                    size="small"
                    sx={{ 
                      bgcolor: colors.warningLight, 
                      color: '#92400E',
                      height: 26,
                      fontSize: '0.75rem'
                    }}
                  />
                )}
              </Stack>
            </Stack>
            
            {/* 3 суммы в одну строку */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={1.5}
              divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />}
            >
              {/* План */}
              <Box sx={{ flex: 1, textAlign: { xs: 'left', sm: 'center' }, py: 1 }}>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  План (смета)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                  {formatCurrency(totalAmount)}
                </Typography>
              </Box>
              
              {/* Осталось */}
              <Box 
                sx={{ 
                  flex: 1, 
                  textAlign: { xs: 'left', sm: 'center' }, 
                  py: 1,
                  px: 2,
                  bgcolor: totalAmount - totalActualAmount >= 0 ? '#FEF3C7' : '#FEE2E2',
                  borderRadius: '8px',
                  border: `1px solid ${totalAmount - totalActualAmount >= 0 ? '#F59E0B' : colors.error}`
                }}
              >
                <Typography variant="caption" sx={{ color: totalAmount - totalActualAmount >= 0 ? '#92400E' : '#991B1B' }}>
                  {totalAmount - totalActualAmount >= 0 ? 'Осталось' : 'Перерасход'}
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ fontWeight: 700, color: totalAmount - totalActualAmount >= 0 ? '#D97706' : '#DC2626' }}
                >
                  {formatCurrency(Math.abs(totalAmount - totalActualAmount))}
                </Typography>
              </Box>
              
              {/* Факт */}
              <Box 
                sx={{ 
                  flex: 1, 
                  textAlign: { xs: 'left', sm: 'center' }, 
                  py: 1,
                  px: 2,
                  bgcolor: colors.greenLight,
                  borderRadius: '8px'
                }}
              >
                <Typography variant="caption" sx={{ color: colors.greenDark }}>
                  Закуплено (факт)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: colors.green }}>
                  {formatCurrency(totalActualAmount)}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </>
      )}

      {/* Диалог добавления в общие закупки */}
      <Dialog open={addDialogOpen} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {selectedMaterial?.isExtraCharge && (
              <Chip label="О/Ч" color="warning" size="small" />
            )}
            <Typography variant="h6">Добавить в общие закупки</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedMaterial && (
            <Stack spacing={3} sx={{ mt: 2 }}>
              {selectedMaterial.isExtraCharge && (
                <Alert severity="warning" icon={<Chip label="О/Ч" color="warning" size="small" />}>
                  <strong>Отдельный чек</strong> — материал не учтен в смете. Клиент доплачивает отдельно.
                </Alert>
              )}

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Материал
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedMaterial.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Артикул: {selectedMaterial.sku || '-'}
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Stack direction="row" spacing={3} justifyContent="space-around">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Нужно всего
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedMaterial.quantity.toLocaleString('ru-RU')} {selectedMaterial.unit}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Уже закуплено
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="info.main">
                      {(selectedMaterial.purchasedQuantity || 0).toLocaleString('ru-RU')} {selectedMaterial.unit}
                    </Typography>
                  </Box>
                  <Box>
                    {(() => {
                      const remainder = selectedMaterial.quantity - (selectedMaterial.purchasedQuantity || 0);
                      const isOverspent = remainder < 0;
                      
                      return (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            {isOverspent ? 'Перерасход' : 'Осталось закупить'}
                          </Typography>
                          <Typography 
                            variant="h6" 
                            fontWeight={600} 
                            color={isOverspent ? 'error.main' : 'warning.main'}
                          >
                            {isOverspent && '⚠️ '}
                            {Math.abs(remainder).toLocaleString('ru-RU')} {selectedMaterial.unit}
                          </Typography>
                        </>
                      );
                    })()}
                  </Box>
                </Stack>
              </Box>

              {(() => {
                const remainder = selectedMaterial.quantity - (selectedMaterial.purchasedQuantity || 0);
                const isOverspent = remainder < 0;
                
                if (isOverspent) {
                  return (
                    <Alert severity="warning" icon={<span>⚠️</span>}>
                      <strong>Перерасход материала:</strong> Закуплено на {Math.abs(remainder).toLocaleString('ru-RU')} {selectedMaterial.unit} больше чем в смете. 
                      Это количество будет включено в список для доп. оплаты клиенту.
                    </Alert>
                  );
                }
                return null;
              })()}

              <TextField
                label="Количество"
                type="number"
                fullWidth
                value={purchaseForm.quantity}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                inputProps={{ 
                  min: 0, 
                  step: 0.01
                }}
                helperText={(() => {
                  const remainder = selectedMaterial.quantity - (selectedMaterial.purchasedQuantity || 0);
                  if (remainder > 0) {
                    return `Ед. изм.: ${selectedMaterial.unit}. Осталось: ${remainder.toLocaleString('ru-RU')} (можно закупить больше)`;
                  } else if (remainder < 0) {
                    return `Ед. изм.: ${selectedMaterial.unit}. Перерасход: ${Math.abs(remainder).toLocaleString('ru-RU')}`;
                  } else {
                    return `Ед. изм.: ${selectedMaterial.unit}. Закуплено полностью (можно закупить дополнительно)`;
                  }
                })()}
              />

              <TextField
                label="Фактическая цена закупки"
                type="number"
                fullWidth
                value={purchaseForm.purchasePrice}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePrice: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Реальная цена, по которой купили материал"
              />

              <TextField
                label="Дата закупки"
                type="date"
                fullWidth
                value={purchaseForm.purchaseDate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              {error && (
                <Alert severity="error">{error}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={submitting}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleAddToGlobalPurchases}
            disabled={submitting || !purchaseForm.quantity || !purchaseForm.purchasePrice}
            startIcon={submitting ? <CircularProgress size={16} /> : <IconShoppingCartPlus />}
          >
            {submitting ? 'Добавление...' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог добавления материала "Отдельный чек" */}
      <Dialog 
        open={addExtraMaterialDialogOpen} 
        onClose={handleCloseExtraMaterialDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1F2937' }}>
            Добавить материал (отдельный чек)
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ px: 4, pb: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* 1️⃣ Современный информер */}
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'rgba(79, 70, 229, 0.06)', 
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5
              }}
            >
              <Box sx={{ color: colors.primary, mt: 0.25 }}>💡</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                  Отдельный чек
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.25 }}>
                  Материал не учтён в смете. Оплачивается клиентом отдельно.
                </Typography>
              </Box>
            </Box>

            {loadingMaterials ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress sx={{ color: colors.primary }} size={32} />
                <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 2 }}>
                  Загрузка материалов...
                </Typography>
              </Box>
            ) : (
              /* 3️⃣ Обновлённое поле поиска */
              <Autocomplete
                options={materials}
                getOptionLabel={(option) => option.name}
                value={extraMaterialForm.material}
                onChange={(e, newValue) => {
                  setExtraMaterialForm({ 
                    ...extraMaterialForm, 
                    material: newValue,
                    purchasePrice: newValue?.price?.toString() || ''
                  });
                }}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) return options.slice(0, 100);
                  
                  const searchLower = inputValue.toLowerCase();
                  const filtered = options.filter(option => 
                    option.name.toLowerCase().includes(searchLower) ||
                    (option.sku && option.sku.toLowerCase().includes(searchLower)) ||
                    (option.category && option.category.toLowerCase().includes(searchLower))
                  );
                  
                  return filtered.slice(0, 100);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Поиск по названию, артикулу или категории..."
                    required
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <Box sx={{ color: colors.primary, display: 'flex', ml: 0.5, mr: 1 }}>
                            <IconSearch size={20} />
                          </Box>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      sx: {
                        height: 48,
                        borderRadius: '10px',
                        bgcolor: '#fff',
                        '& fieldset': {
                          borderColor: '#D8DFE8'
                        },
                        '&:hover fieldset': {
                          borderColor: '#B0BAC9 !important'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: `${colors.primary} !important`,
                          borderWidth: '2px'
                        }
                      }
                    }}
                    sx={{
                      '& .MuiInputBase-input::placeholder': {
                        color: '#9CA3AF',
                        opacity: 1
                      }
                    }}
                    helperText={
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                        Доступно материалов: {materials.length}
                      </Typography>
                    }
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Stack direction="row" spacing={2} alignItems="center" width="100%">
                      {option.image ? (
                        <Avatar
                          src={option.image}
                          alt={option.name}
                          variant="rounded"
                          sx={{ width: 44, height: 44, border: '1px solid #E5E7EB' }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{ width: 44, height: 44, bgcolor: '#F3F4F6' }}
                        >
                          <IconPhoto size={18} color="#9CA3AF" />
                        </Avatar>
                      )}
                      <Box flex={1}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                          {option.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                            {option.sku || 'Без артикула'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#D1D5DB' }}>•</Typography>
                          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                            {option.category}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#D1D5DB' }}>•</Typography>
                          <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 600 }}>
                            {formatCurrency(option.price)} / {option.unit}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </li>
                )}
                noOptionsText="Материалы не найдены"
                loading={loadingMaterials}
                disabled={loadingMaterials}
              />
            )}

            {extraMaterialForm.material && (
              <>
                {/* Карточка выбранного материала */}
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: '#F9FAFB', 
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB'
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    {extraMaterialForm.material.image ? (
                      <Avatar
                        src={extraMaterialForm.material.image}
                        alt={extraMaterialForm.material.name}
                        variant="rounded"
                        sx={{ width: 56, height: 56, border: '1px solid #E5E7EB' }}
                      />
                    ) : (
                      <Avatar
                        variant="rounded"
                        sx={{ width: 56, height: 56, bgcolor: '#F3F4F6' }}
                      >
                        <IconPhoto size={22} color="#9CA3AF" />
                      </Avatar>
                    )}
                    <Box flex={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1F2937' }}>
                        {extraMaterialForm.material.name}
                      </Typography>
                      <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" sx={{ color: '#6B7280', bgcolor: '#F3F4F6', px: 1, py: 0.25, borderRadius: '4px' }}>
                          {extraMaterialForm.material.sku || 'Без артикула'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.primary, bgcolor: colors.primaryLight, px: 1, py: 0.25, borderRadius: '4px' }}>
                          {extraMaterialForm.material.category}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.green, bgcolor: colors.greenLight, px: 1, py: 0.25, borderRadius: '4px', fontWeight: 600 }}>
                          {formatCurrency(extraMaterialForm.material.price)} / {extraMaterialForm.material.unit}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>

                {/* Поля ввода со стилизацией */}
                <TextField
                  label="Количество"
                  type="number"
                  fullWidth
                  value={extraMaterialForm.quantity}
                  onChange={(e) => setExtraMaterialForm({ ...extraMaterialForm, quantity: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText={
                    <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                      Единица измерения: {extraMaterialForm.material.unit}
                    </Typography>
                  }
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '& fieldset': { borderColor: '#D8DFE8' },
                      '&:hover fieldset': { borderColor: '#B0BAC9' },
                      '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: '2px' }
                    }
                  }}
                />

                <TextField
                  label="Фактическая цена закупки"
                  type="number"
                  fullWidth
                  value={extraMaterialForm.purchasePrice}
                  onChange={(e) => setExtraMaterialForm({ ...extraMaterialForm, purchasePrice: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText={
                    <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                      Базовая цена: {formatCurrency(extraMaterialForm.material.price)} за {extraMaterialForm.material.unit}
                    </Typography>
                  }
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '& fieldset': { borderColor: '#D8DFE8' },
                      '&:hover fieldset': { borderColor: '#B0BAC9' },
                      '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: '2px' }
                    }
                  }}
                />

                {/* Итоговая сумма */}
                {extraMaterialForm.quantity && extraMaterialForm.purchasePrice && (
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: colors.greenLight, 
                      borderRadius: '10px',
                      border: `1px solid ${colors.green}`
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 500, color: colors.greenDark }}>
                        Итоговая сумма:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: colors.green }}>
                        {formatCurrency(parseFloat(extraMaterialForm.quantity) * parseFloat(extraMaterialForm.purchasePrice))}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </>
            )}

            {error && (
              <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>
            )}
          </Stack>
        </DialogContent>
        
        {/* 4️⃣ 5️⃣ 6️⃣ Обновлённые кнопки */}
        <DialogActions sx={{ px: 4, py: 2.5, gap: 1.5 }}>
          <Button 
            onClick={handleCloseExtraMaterialDialog} 
            disabled={submitting}
            sx={{ 
              color: '#7B8794',
              fontWeight: 500,
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleAddExtraMaterial}
            disabled={submitting || !extraMaterialForm.material || !extraMaterialForm.quantity || !extraMaterialForm.purchasePrice}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <IconPlus size={18} />}
            sx={{
              bgcolor: colors.primary,
              color: '#fff',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: '10px',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
              '&:hover': {
                bgcolor: colors.primaryDark,
                boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
              },
              '&:disabled': {
                bgcolor: '#C7D2FE',
                color: '#fff'
              }
            }}
          >
            {submitting ? 'Добавление...' : 'Добавить материал'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

Purchases.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default Purchases;
