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
  Grid
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { IconShoppingCart, IconDeviceFloppy, IconRefresh, IconPhoto, IconShoppingCartPlus, IconPlus } from '@tabler/icons-react';

// API
import * as purchasesAPI from 'api/purchases';
import * as globalPurchasesAPI from 'api/globalPurchases';
import materialsAPI from 'api/materials'; // Default export

// ==============================|| PURCHASES (ЗАКУПКИ) ||============================== //

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
      {/* Шапка */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={500}>
            Список материалов для закупки
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Материалы сгруппированы и суммированы по всей смете
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          {purchasesGenerated && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<IconPlus />}
                onClick={handleOpenExtraMaterialDialog}
              >
                Добавить материал (О/Ч)
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconRefresh />}
                onClick={handleRefreshPurchases}
                disabled={loading}
              >
                Обновить закупки
              </Button>
            </>
          )}
          
          {!purchasesGenerated && (
            <Button
              variant="contained"
              startIcon={<IconDeviceFloppy />}
              onClick={handleGeneratePurchases}
              disabled={loading || !estimateId || !projectId}
            >
              Сформировать закупки
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Индикатор загрузки */}
      {loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Формирование закупок...
          </Typography>
        </Paper>
      )}

      {/* Ошибка */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !purchasesGenerated ? (
        // Заглушка до формирования закупок
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <IconShoppingCart size={64} style={{ opacity: 0.2 }} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Закупки еще не сформированы
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Нажмите кнопку "Сформировать закупки" для создания списка материалов на основе сметы
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy />}
            onClick={handleGeneratePurchases}
            disabled={loading || !estimateId || !projectId}
          >
            Сформировать закупки
          </Button>
        </Paper>
      ) : (
        // Сформированные закупки
        <>
          <Paper sx={{ overflowX: 'auto', maxWidth: '100%' }}>
            {/* Таблица материалов */}
            <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 800 }}>
              <TableHead>
                {/* Первый уровень шапки */}
                <TableRow>
                  <TableCell rowSpan={2} sx={{ width: '100px', fontWeight: 600 }}>
                    Артикул
                  </TableCell>
                  <TableCell rowSpan={2} sx={{ width: 'auto', minWidth: '200px', fontWeight: 600 }}>
                    Наименование материала
                  </TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ width: '80px', fontWeight: 600 }}>
                    Изобр.
                  </TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ width: '80px', fontWeight: 600 }}>
                    Ед. изм.
                  </TableCell>
                  <TableCell rowSpan={2} align="right" sx={{ width: '90px', fontWeight: 600 }}>
                    Нужно
                  </TableCell>
                  <TableCell rowSpan={2} align="right" sx={{ width: '90px', fontWeight: 600 }}>
                    Закуплено
                  </TableCell>
                  <TableCell rowSpan={2} align="right" sx={{ width: '90px', fontWeight: 600 }}>
                    Остаток
                  </TableCell>
                  <TableCell 
                    colSpan={2} 
                    align="center" 
                    sx={{ 
                      width: '220px',
                      fontWeight: 600, 
                      bgcolor: 'primary.lighter'
                    }}
                  >
                    ПЛАН (смета)
                  </TableCell>
                  <TableCell 
                    colSpan={2} 
                    align="center" 
                    sx={{ 
                      width: '220px',
                      fontWeight: 600, 
                      bgcolor: 'success.lighter'
                    }}
                  >
                    ФАКТ (закупки)
                  </TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ width: '80px', fontWeight: 600 }}>
                    Действия
                  </TableCell>
                </TableRow>
                
                {/* Второй уровень шапки */}
                <TableRow>
                  <TableCell align="right" sx={{ width: '110px', fontWeight: 600, bgcolor: 'primary.lighter' }}>
                    Цена ₽/ед
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      width: '110px', 
                      fontWeight: 600, 
                      bgcolor: 'primary.lighter'
                    }}
                  >
                    Сумма
                  </TableCell>
                  <TableCell align="right" sx={{ width: '110px', fontWeight: 600, bgcolor: 'success.lighter' }}>
                    Цена ₽/ед
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      width: '110px', 
                      fontWeight: 600, 
                      bgcolor: 'success.lighter'
                    }}
                  >
                    Сумма
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Основные материалы */}
                {purchasesData.filter(m => !m.isExtraCharge).map((material, index) => (
                  <TableRow
                    key={`regular-${index}`}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} color="primary">
                        {material.sku || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{material.name}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {material.image ? (
                        <Avatar
                          src={material.image}
                          alt={material.name}
                          variant="rounded"
                          sx={{ 
                            width: 28, 
                            height: 28,
                            border: '1px solid',
                            borderColor: 'divider',
                            margin: '0 auto'
                          }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{ 
                            width: 28, 
                            height: 28,
                            bgcolor: 'action.selected',
                            margin: '0 auto'
                          }}
                        >
                          <IconPhoto size={14} style={{ opacity: 0.3 }} />
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {material.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {material.quantity.toLocaleString('ru-RU', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="info.main">
                        {(material.purchasedQuantity || 0).toLocaleString('ru-RU', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {(() => {
                        const remainder = material.quantity - (material.purchasedQuantity || 0);
                        const isOverspent = remainder < 0; // Перерасход (ушли в минус)
                        const isPending = remainder > 0;   // Еще нужно закупить
                        const isComplete = remainder === 0; // Закуплено точно
                        
                        return (
                          <Typography 
                            variant="body2" 
                            fontWeight={600} 
                            color={isOverspent ? 'error.main' : (isPending ? 'warning.main' : 'success.main')}
                          >
                            {isOverspent && '⚠️ '}
                            {remainder.toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        );
                      })()}
                    </TableCell>
                    {/* ПЛАН: Цена за ед. */}
                    <TableCell align="right" sx={{ bgcolor: 'primary.lighter' }}>
                      <Typography variant="body2">
                        {formatCurrency(material.price)}
                      </Typography>
                    </TableCell>
                    {/* ПЛАН: Сумма */}
                    <TableCell align="right" sx={{ bgcolor: 'primary.lighter' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(material.total)}
                      </Typography>
                    </TableCell>
                    {/* ФАКТ: Цена за ед. */}
                    <TableCell align="right" sx={{ bgcolor: 'success.lighter' }}>
                      {material.avgPurchasePrice ? (
                        <Typography 
                          variant="body2"
                          color={material.avgPurchasePrice < material.price ? 'success.dark' : material.avgPurchasePrice > material.price ? 'error.main' : 'text.primary'}
                          fontWeight={material.avgPurchasePrice !== material.price ? 600 : 400}
                        >
                          {formatCurrency(material.avgPurchasePrice)}
                          {material.avgPurchasePrice < material.price && ' ✓'}
                          {material.avgPurchasePrice > material.price && ' ⚠'}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    {/* ФАКТ: Сумма */}
                    <TableCell align="right" sx={{ bgcolor: 'success.lighter' }}>
                      {material.actualTotalPrice > 0 ? (
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          color={material.actualTotalPrice < material.total ? 'success.dark' : material.actualTotalPrice > material.total ? 'error.main' : 'text.primary'}
                        >
                          {formatCurrency(material.actualTotalPrice)}
                          {material.actualTotalPrice < material.total && ' ✓'}
                          {material.actualTotalPrice > material.total && ' ⚠'}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Добавить в общие закупки">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenAddDialog(material)}
                          >
                            <IconShoppingCartPlus size={20} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Разделитель для О/Ч материалов */}
                {purchasesData.filter(m => m.isExtraCharge).length > 0 && (
                  <>
                    <TableRow>
                      <TableCell colSpan={13} sx={{ bgcolor: 'warning.lighter', borderTop: '2px solid', borderColor: 'warning.main', py: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip label="О/Ч" color="warning" size="small" />
                          <Typography variant="subtitle2" fontWeight={600} color="warning.dark">
                            Отдельные чеки (не учтены в смете)
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>

                    {/* О/Ч материалы */}
                    {purchasesData.filter(m => m.isExtraCharge).map((material, index) => (
                      <TableRow
                        key={`extra-${index}`}
                        sx={{
                          bgcolor: 'warning.lighter',
                          '&:hover': { bgcolor: 'warning.light' },
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip label="О/Ч" color="warning" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                            <Typography variant="body2" fontWeight={500} color="primary">
                              {material.sku || '-'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{material.name}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          {material.image ? (
                            <Avatar
                              src={material.image}
                              alt={material.name}
                              variant="rounded"
                              sx={{ 
                                width: 28, 
                                height: 28,
                                border: '1px solid',
                                borderColor: 'warning.main',
                                margin: '0 auto'
                              }}
                            />
                          ) : (
                            <Avatar
                              variant="rounded"
                              sx={{ 
                                width: 28, 
                                height: 28,
                                bgcolor: 'warning.main',
                                color: 'white',
                                margin: '0 auto'
                              }}
                            >
                              <IconPhoto size={14} />
                            </Avatar>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            {material.unit}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {material.quantity.toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="info.main">
                            {(material.purchasedQuantity || 0).toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            const remainder = material.quantity - (material.purchasedQuantity || 0);
                            const isOverspent = remainder < 0; // Перерасход (ушли в минус)
                            const isPending = remainder > 0;   // Еще нужно закупить
                            const isComplete = remainder === 0; // Закуплено точно
                            
                            return (
                              <Typography 
                                variant="body2" 
                                fontWeight={600} 
                                color={isOverspent ? 'error.main' : (isPending ? 'warning.dark' : 'success.main')}
                              >
                                {isOverspent && '⚠️ '}
                                {remainder.toLocaleString('ru-RU', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                })}
                              </Typography>
                            );
                          })()}
                        </TableCell>

                        {/* ПЛАН: Цена за ед. */}
                        <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.warning.lighter, 0.3) }}>
                          <Typography variant="body2" fontWeight={600}>
                            {formatCurrency(material.price)}
                          </Typography>
                        </TableCell>

                        {/* ПЛАН: Сумма */}
                        <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.warning.lighter, 0.3) }}>
                          <Typography variant="body2" fontWeight={700} color="warning.dark">
                            {formatCurrency(material.total)}
                          </Typography>
                        </TableCell>

                        {/* ФАКТ: Цена за ед. */}
                        <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.warning.lighter, 0.2) }}>
                          {material.avgPurchasePrice ? (
                            <Typography 
                              variant="body2"
                              color={material.avgPurchasePrice < material.price ? 'success.dark' : 
                                     material.avgPurchasePrice > material.price ? 'error.main' : 'warning.dark'}
                              fontWeight={material.avgPurchasePrice !== material.price ? 600 : 400}
                            >
                              {formatCurrency(material.avgPurchasePrice)}
                              {material.avgPurchasePrice < material.price && ' ✓'}
                              {material.avgPurchasePrice > material.price && ' ⚠'}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>

                        {/* ФАКТ: Сумма */}
                        <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.warning.lighter, 0.2) }}>
                          {material.actualTotalPrice > 0 ? (
                            <Typography 
                              variant="body2" fontWeight={700}
                              color={material.actualTotalPrice < material.total ? 'success.dark' : 
                                     material.actualTotalPrice > material.total ? 'error.main' : 'warning.dark'}
                            >
                              {formatCurrency(material.actualTotalPrice)}
                              {material.actualTotalPrice < material.total && ' ✓'}
                              {material.actualTotalPrice > material.total && ' ⚠'}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        
                        <TableCell align="center">
                          <Tooltip title="Добавить в общие закупки">
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleOpenAddDialog(material)}
                              >
                                <IconShoppingCartPlus size={20} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>

            {/* Итого */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'success.lighter', borderTop: '2px solid', borderColor: 'success.main' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600}>
                  ИТОГО ПО СМЕТЕ
                </Typography>
                <Typography variant="h6" fontWeight={600} color="success.dark">
                  {formatCurrency(totalAmount)}
                </Typography>
              </Stack>
            </Box>
          </Paper>

          {/* Итоговая сумма закупок */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                ИТОГО ЗАКУПЛЕННО
              </Typography>
              <Typography variant="h5" fontWeight={700} color="primary">
                {formatCurrency(totalActualAmount)}
              </Typography>
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
      <Dialog open={addExtraMaterialDialogOpen} onClose={handleCloseExtraMaterialDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconPlus size={24} />
            <Typography variant="h5">Добавить материал (Отдельный чек)</Typography>
          </Stack>
        </DialogTitle>
        
        <Divider />
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info" icon={<Chip label="О/Ч" color="warning" size="small" />}>
              <strong>Отдельный чек</strong> — материал, не учтенный в смете. Клиент будет доплачивать отдельно.
            </Alert>

            {loadingMaterials ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Загрузка материалов...
                </Typography>
              </Box>
            ) : (
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
                  if (!inputValue) return options.slice(0, 100); // Показываем первые 100 без поиска
                  
                  const searchLower = inputValue.toLowerCase();
                  const filtered = options.filter(option => 
                    option.name.toLowerCase().includes(searchLower) ||
                    (option.sku && option.sku.toLowerCase().includes(searchLower)) ||
                    (option.category && option.category.toLowerCase().includes(searchLower))
                  );
                  
                  // Ограничиваем результаты для производительности
                  return filtered.slice(0, 100);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="🔍 Поиск материала"
                    placeholder="Введите название, артикул или категорию"
                    required
                    helperText={`Начните вводить для поиска. Доступно материалов: ${materials.length}`}
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
                          sx={{ width: 48, height: 48, border: '1px solid #e0e0e0' }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{ width: 48, height: 48, bgcolor: 'action.selected' }}
                        >
                          <IconPhoto size={20} style={{ opacity: 0.3 }} />
                        </Avatar>
                      )}
                      <Box flex={1}>
                        <Typography variant="body1" fontWeight={500}>
                          {option.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {option.sku || 'Без артикула'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.category}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="primary.main" fontWeight={600}>
                            {formatCurrency(option.price)} / {option.unit}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </li>
                )}
                noOptionsText="Материалы не найдены. Попробуйте изменить запрос."
                loading={loadingMaterials}
                disabled={loadingMaterials}
              />
            )}

            {extraMaterialForm.material && (
              <>
                <Divider />
                
                {/* Карточка выбранного материала */}
                <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {extraMaterialForm.material.image ? (
                      <Avatar
                        src={extraMaterialForm.material.image}
                        alt={extraMaterialForm.material.name}
                        variant="rounded"
                        sx={{ width: 64, height: 64, border: '1px solid #e0e0e0' }}
                      />
                    ) : (
                      <Avatar
                        variant="rounded"
                        sx={{ width: 64, height: 64, bgcolor: 'action.selected' }}
                      >
                        <IconPhoto size={24} style={{ opacity: 0.3 }} />
                      </Avatar>
                    )}
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={600}>
                        {extraMaterialForm.material.name}
                      </Typography>
                      <Stack direction="row" spacing={2} mt={0.5}>
                        <Chip label={extraMaterialForm.material.sku || 'Без артикула'} size="small" variant="outlined" />
                        <Chip label={extraMaterialForm.material.category} size="small" color="primary" variant="outlined" />
                        <Chip label={`${formatCurrency(extraMaterialForm.material.price)} / ${extraMaterialForm.material.unit}`} size="small" color="success" />
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>

                <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1, border: '2px solid', borderColor: 'warning.main' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip label="О/Ч" color="warning" size="small" />
                    <Typography variant="body2" fontWeight={500}>
                      Материал не учтен в смете — требуется доплата от клиента
                    </Typography>
                  </Stack>
                </Box>

                <TextField
                  label="Количество"
                  type="number"
                  fullWidth
                  value={extraMaterialForm.quantity}
                  onChange={(e) => setExtraMaterialForm({ ...extraMaterialForm, quantity: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText={`Единица измерения: ${extraMaterialForm.material.unit}`}
                  required
                />

                <TextField
                  label="Фактическая цена закупки"
                  type="number"
                  fullWidth
                  value={extraMaterialForm.purchasePrice}
                  onChange={(e) => setExtraMaterialForm({ ...extraMaterialForm, purchasePrice: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText={`Базовая цена: ${formatCurrency(extraMaterialForm.material.price)} за ${extraMaterialForm.material.unit}`}
                  required
                />

                {/* Итоговая сумма */}
                {extraMaterialForm.quantity && extraMaterialForm.purchasePrice && (
                  <Paper sx={{ p: 2, bgcolor: 'success.lighter', border: '1px solid', borderColor: 'success.main' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" fontWeight={600}>
                        Итоговая сумма закупки:
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="success.dark">
                        {formatCurrency(parseFloat(extraMaterialForm.quantity) * parseFloat(extraMaterialForm.purchasePrice))}
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </>
            )}

            {error && (
              <Alert severity="error">{error}</Alert>
            )}
          </Stack>
        </DialogContent>
        
        <Divider />
        
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseExtraMaterialDialog} disabled={submitting} size="small">
            Отмена
          </Button>
          <Button
            variant="contained"
            color="warning"
            size="small"
            onClick={handleAddExtraMaterial}
            disabled={submitting || !extraMaterialForm.material || !extraMaterialForm.quantity || !extraMaterialForm.purchasePrice}
            startIcon={submitting ? <CircularProgress size={20} /> : <IconPlus />}
          >
            {submitting ? 'Добавление...' : 'Добавить в закупки (О/Ч)'}
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
