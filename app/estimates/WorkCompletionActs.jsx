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
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  IconFileCheck,
  IconFileInvoice,
  IconDownload,
  IconTrash,
  IconEye,
  IconRefresh,
  IconUser,
  IconBuilding,
  IconPrinter,
  IconFileText,
  IconHash,
  IconCalendar,
  IconListNumbers,
  IconCurrencyRubel,
  IconTag,
  IconDotsVertical,
  IconFilePlus,
  IconCopy,
  IconPencil,
  IconFileOff
} from '@tabler/icons-react';

// API
import workCompletionActsAPI from 'api/workCompletionActs';

// Components
import FormKS2View from 'shared/ui/forms/FormKS2View';
import FormKS3View from 'shared/ui/forms/FormKS3View';

// ==============================|| WORK COMPLETION ACTS (АКТЫ ВЫПОЛНЕННЫХ РАБОТ) ||============================== //

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
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
};

const WorkCompletionActs = ({ estimateId, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [acts, setActs] = useState([]);
  const [selectedAct, setSelectedAct] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [ks2Data, setKs2Data] = useState(null);
  const [ks3Data, setKs3Data] = useState(null);
  const [ks2Loading, setKs2Loading] = useState(false);
  const [ks3Loading, setKs3Loading] = useState(false);

  // Загрузка актов при монтировании
  useEffect(() => {
    loadActs();
  }, [estimateId]);

  const loadActs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workCompletionActsAPI.getActsByEstimate(estimateId);
      
      // ✅ Проверяем, что data - это массив
      if (Array.isArray(data)) {
        setActs(data);
      } else {
setActs([]);
      }
    } catch (err) {
      console.error('Error loading acts:', err);
      setError('Не удалось загрузить акты выполненных работ');
      setActs([]); // ✅ Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAct = async (actType) => {
    try {
      setGenerating(true);
      setError(null);
      
      const result = await workCompletionActsAPI.generateActs({
        estimateId,
        projectId,
        actType
      });
      
      // Перезагрузка списка актов
      await loadActs();
    } catch (err) {
      console.error('Error generating act:', err);
      
      // Проверяем, если это ошибка отсутствия выполненных работ
      const errorMessage = err.response?.data?.error || err.response?.data?.message;
      
      if (errorMessage && errorMessage.includes('Выберите выполненные работы')) {
        setError(errorMessage);
      } else {
        setError('Не удалось сгенерировать акт');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetails = async (actId) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const actDetails = await workCompletionActsAPI.getActById(actId);
      
      // ✅ API возвращает { act: {...}, items: [...], groupedItems: {...} }
      // Объединяем act с items для удобного использования в компоненте
      setSelectedAct({
        ...actDetails.act,
        items: actDetails.items,
        groupedItems: actDetails.groupedItems
      });
    } catch (err) {
      console.error('Error loading act details:', err);
      setError('Не удалось загрузить детали акта');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteAct = async (actId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот акт?')) {
      return;
    }

    try {
      setLoading(true);
      await workCompletionActsAPI.deleteAct(actId);
      await loadActs();
    } catch (err) {
      console.error('Error deleting act:', err);
      setError('Не удалось удалить акт');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedAct(null);
    setCurrentTab(0);
    setKs2Data(null);
    setKs3Data(null);
  };

  const handleTabChange = async (event, newValue) => {
    setCurrentTab(newValue);
// Загружаем данные КС-2 при переходе на вкладку 1
    if (newValue === 1 && !ks2Data && selectedAct?.id) {
await loadKS2Data(selectedAct.id);
    }
    
    // Загружаем данные КС-3 при переходе на вкладку 2
    if (newValue === 2 && !ks3Data && selectedAct?.id) {
await loadKS3Data(selectedAct.id);
    }
  };

  const loadKS2Data = async (actId) => {
    if (!actId) {
      console.error('[WorkCompletionActs] Cannot load KS-2: actId is undefined');
      setError('ID акта не определен');
      return;
    }

    try {
      setKs2Loading(true);
      setError(null); // Очищаем предыдущие ошибки
const data = await workCompletionActsAPI.getFormKS2(actId);
if (data) {
        setKs2Data(data);
      } else {
setError('Форма КС-2 не содержит данных');
      }
    } catch (err) {
      console.error('[WorkCompletionActs] Error loading KS-2 data:', err);
      console.error('[WorkCompletionActs] Error details:', err.response?.data || err.message);
      setError(`Не удалось загрузить данные формы КС-2: ${err.response?.data?.error || err.message}`);
    } finally {
      setKs2Loading(false);
    }
  };

  const loadKS3Data = async (actId) => {
    if (!actId) {
      console.error('[WorkCompletionActs] Cannot load KS-3: actId is undefined');
      setError('ID акта не определен');
      return;
    }

    try {
      setKs3Loading(true);
      setError(null); // Очищаем предыдущие ошибки
const data = await workCompletionActsAPI.getFormKS3(actId);
if (data) {
        setKs3Data(data);
      } else {
setError('Форма КС-3 не содержит данных');
      }
    } catch (err) {
      console.error('[WorkCompletionActs] Error loading KS-3 data:', err);
      console.error('[WorkCompletionActs] Error details:', err.response?.data || err.message);
      setError(`Не удалось загрузить данные формы КС-3: ${err.response?.data?.error || err.message}`);
    } finally {
      setKs3Loading(false);
    }
  };

  const handleDownloadKS2PDF = () => {
    if (!ks2Data) {
      setError('Данные КС-2 не загружены');
      return;
    }
    
    try {
      const filename = `КС-2_${ks2Data.actNumber || 'АКТ'}_${ks2Data.actDate || ''}.pdf`;
      generateKS2PDF(ks2Data, filename);
    } catch (err) {
      console.error('Error generating KS-2 PDF:', err);
      setError('Ошибка при генерации PDF');
    }
  };

  const handleDownloadKS3PDF = () => {
    if (!ks3Data) {
      setError('Данные КС-3 не загружены');
      return;
    }
    
    try {
      const filename = `КС-3_${ks3Data.actNumber || 'АКТ'}_${ks3Data.actDate || ''}.pdf`;
      generateKS3PDF(ks3Data, filename);
    } catch (err) {
      console.error('Error generating KS-3 PDF:', err);
      setError('Ошибка при генерации PDF');
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (!selectedAct) return;
    
    try {
      setDetailLoading(true);
      await workCompletionActsAPI.updateActStatus(selectedAct.id, newStatus);
      
      // Обновляем локальный state
      setSelectedAct(prev => ({
        ...prev,
        status: newStatus
      }));
      
      // Обновляем список актов
      await loadActs();
      
    } catch (err) {
      console.error('Error updating act status:', err);
      setError('Не удалось обновить статус акта');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getActTypeLabel = (actType) => {
    return actType === 'client' ? 'Заказчик' : 'Специалист';
  };

  const getActTypeIcon = (actType) => {
    return actType === 'client' ? <IconBuilding size={14} /> : <IconUser size={14} />;
  };

  const getActTypeStyles = (actType) => {
    if (actType === 'client') {
      return {
        bgcolor: colors.primaryLight,
        color: colors.primary,
        borderColor: colors.primary
      };
    }
    return {
      bgcolor: colors.purpleLight,
      color: colors.purple,
      borderColor: colors.purple
    };
  };

  // Функции для работы со статусами
  const getStatusLabel = (status) => {
    const statusLabels = {
      draft: 'Черновик',
      pending: 'На согласовании',
      approved: 'Согласован',
      paid: 'Оплачен'
    };
    return statusLabels[status] || status;
  };

  const getStatusStyles = (status) => {
    const styles = {
      draft: { bgcolor: '#F3F4F6', color: '#6B7280', icon: <IconPencil size={14} /> },
      pending: { bgcolor: colors.warningLight, color: '#92400E', icon: <IconRefresh size={14} /> },
      approved: { bgcolor: colors.greenLight, color: colors.greenDark, icon: <IconFileCheck size={14} /> },
      paid: { bgcolor: colors.primaryLight, color: colors.primary, icon: <IconCurrencyRubel size={14} /> }
    };
    return styles[status] || styles.draft;
  };

  // Вычисление итогов
  const totalActsCount = acts.length;
  const totalAmount = acts.reduce((sum, act) => sum + (parseFloat(act.totalAmount) || 0), 0);

  return (
    <Box>
      {/* ═══════════════════════════════════════════════════════════════════
          ШАПКА СТРАНИЦЫ
      ═══════════════════════════════════════════════════════════════════ */}
      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', md: 'center' }}
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
            <IconFileCheck size={26} color={colors.primary} />
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
              Акты выполненных работ
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: colors.textSecondary, mt: 0.5 }}
            >
              Сформированные акты заказчика и специалиста
            </Typography>
          </Box>
        </Stack>
        
        {/* Кнопка обновления */}
        <Button
          variant="outlined"
          startIcon={<IconRefresh size={18} />}
          onClick={loadActs}
          disabled={loading}
          sx={{
            borderColor: colors.border,
            color: colors.textSecondary,
            fontWeight: 500,
            px: 2.5,
            py: 1,
            borderRadius: '10px',
            textTransform: 'none',
            '&:hover': {
              borderColor: colors.primary,
              color: colors.primary,
              bgcolor: colors.primaryLight,
            }
          }}
        >
          Обновить
        </Button>
      </Stack>

      {/* ═══════════════════════════════════════════════════════════════════
          ПАНЕЛЬ ДЕЙСТВИЙ
      ═══════════════════════════════════════════════════════════════════ */}
      <Paper 
        sx={{ 
          p: 2.5, 
          mb: 3, 
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          bgcolor: '#fff'
        }}
      >
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          {/* Кнопка: Акт для Заказчика */}
          <Button
            variant="contained"
            startIcon={<IconBuilding size={20} />}
            onClick={() => handleGenerateAct('client')}
            disabled={generating || loading}
            sx={{
              bgcolor: colors.primary,
              color: '#fff',
              fontWeight: 600,
              px: 3,
              py: 1.25,
              height: 48,
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
            Акт для заказчика
          </Button>

          {/* Кнопка: Акт для Специалиста */}
          <Button
            variant="contained"
            startIcon={<IconUser size={20} />}
            onClick={() => handleGenerateAct('specialist')}
            disabled={generating || loading}
            sx={{
              bgcolor: colors.purple,
              color: '#fff',
              fontWeight: 600,
              px: 3,
              py: 1.25,
              height: 48,
              borderRadius: '10px',
              textTransform: 'none',
              boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.39)',
              '&:hover': {
                bgcolor: '#7C3AED',
                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.45)',
              },
              '&:disabled': { bgcolor: '#DDD6FE' }
            }}
          >
            Акт для специалиста
          </Button>

          {/* Кнопка: Оба акта */}
          <Button
            variant="outlined"
            startIcon={<IconCopy size={20} />}
            onClick={() => handleGenerateAct('both')}
            disabled={generating || loading}
            sx={{
              borderColor: colors.primary,
              color: colors.primary,
              fontWeight: 600,
              px: 3,
              py: 1.25,
              height: 48,
              borderRadius: '10px',
              textTransform: 'none',
              '&:hover': {
                borderColor: colors.primaryDark,
                bgcolor: colors.primaryLight,
              }
            }}
          >
            Сформировать оба
          </Button>
        </Stack>

        {generating && (
          <Alert 
            severity="info" 
            icon={<CircularProgress size={18} sx={{ color: colors.primary }} />}
            sx={{ mt: 2, borderRadius: '10px' }}
          >
            Формирование акта...
          </Alert>
        )}

        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ mt: 2, borderRadius: '10px' }}
          >
            {error}
          </Alert>
        )}
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════════
          ТАБЛИЦА АКТОВ
      ═══════════════════════════════════════════════════════════════════ */}
      <Paper 
        sx={{ 
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        {loading && acts.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={6}>
            <CircularProgress sx={{ color: colors.primary }} />
          </Box>
        ) : acts.length === 0 ? (
          /* Пустое состояние */
          <Box p={6} textAlign="center">
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                bgcolor: colors.headerBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <IconFileOff size={40} color="#9CA3AF" />
            </Box>
            <Typography 
              variant="h6" 
              sx={{ fontWeight: 600, color: '#374151', mb: 1 }}
            >
              Пока нет сформированных актов
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: colors.textSecondary, maxWidth: 400, mx: 'auto' }}
            >
              Нажмите кнопку выше, чтобы создать первый акт выполненных работ
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <IconHash size={16} color="#9CA3AF" />
                        <span>Номер акта</span>
                      </Stack>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <IconUser size={16} color="#9CA3AF" />
                        <span>Тип</span>
                      </Stack>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <IconCalendar size={16} color="#9CA3AF" />
                        <span>Дата</span>
                      </Stack>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.75}>
                        <IconListNumbers size={16} color="#9CA3AF" />
                        <span>Работ</span>
                      </Stack>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.75}>
                        <IconCurrencyRubel size={16} color="#9CA3AF" />
                        <span>Сумма</span>
                      </Stack>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <IconTag size={16} color="#9CA3AF" />
                        <span>Статус</span>
                      </Stack>
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: colors.headerBg,
                        color: '#4B5563',
                        py: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '0.8125rem',
                        width: 130
                      }}
                    >
                      Действия
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {acts.map((act, index) => {
                    const typeStyles = getActTypeStyles(act.actType);
                    const statusStyles = getStatusStyles(act.status);
                    
                    return (
                      <TableRow 
                        key={act.id} 
                        sx={{
                          bgcolor: index % 2 === 0 ? '#fff' : '#FAFAFA',
                          '&:hover': { bgcolor: colors.cardBg },
                          transition: 'background-color 0.15s',
                          '& td': {
                            py: 1.5,
                            borderBottom: `1px solid ${colors.border}`
                          }
                        }}
                      >
                        {/* Номер акта */}
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600, 
                              color: colors.primary,
                              fontFamily: 'monospace'
                            }}
                          >
                            {act.actNumber}
                          </Typography>
                        </TableCell>
                        
                        {/* Тип */}
                        <TableCell>
                          <Chip
                            icon={getActTypeIcon(act.actType)}
                            label={getActTypeLabel(act.actType)}
                            size="small"
                            sx={{
                              ...typeStyles,
                              fontWeight: 500,
                              height: 28,
                              '& .MuiChip-icon': { 
                                color: typeStyles.color,
                                ml: 0.5
                              }
                            }}
                          />
                        </TableCell>
                        
                        {/* Дата */}
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#374151' }}>
                            {formatDate(act.actDate)}
                          </Typography>
                        </TableCell>
                        
                        {/* Кол-во работ */}
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                            {act.workCount || 0}
                          </Typography>
                        </TableCell>
                        
                        {/* Сумма */}
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: colors.green }}>
                            {formatCurrency(act.totalAmount)}
                          </Typography>
                        </TableCell>
                        
                        {/* Статус */}
                        <TableCell>
                          <Chip
                            icon={statusStyles.icon}
                            label={getStatusLabel(act.status)}
                            size="small"
                            sx={{
                              bgcolor: statusStyles.bgcolor,
                              color: statusStyles.color,
                              fontWeight: 500,
                              height: 28,
                              '& .MuiChip-icon': { 
                                color: statusStyles.color,
                                ml: 0.5
                              }
                            }}
                          />
                        </TableCell>
                        
                        {/* Действия */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Просмотр">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(act.id)}
                                sx={{ 
                                  color: colors.textSecondary,
                                  transition: 'all 0.2s',
                                  '&:hover': { 
                                    color: colors.primary,
                                    bgcolor: colors.primaryLight
                                  }
                                }}
                              >
                                <IconEye size={20} />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Скачать PDF">
                              <IconButton 
                                size="small"
                                sx={{ 
                                  color: colors.textSecondary,
                                  transition: 'all 0.2s',
                                  '&:hover': { 
                                    color: colors.green,
                                    bgcolor: colors.greenLight
                                  }
                                }}
                              >
                                <IconDownload size={20} />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Удалить">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteAct(act.id)}
                                sx={{ 
                                  color: colors.textSecondary,
                                  transition: 'all 0.2s',
                                  '&:hover': { 
                                    color: colors.error,
                                    bgcolor: colors.errorLight
                                  }
                                }}
                              >
                                <IconTrash size={20} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
            
            {/* Итоговая строка */}
            <Box 
              sx={{ 
                px: 2.5, 
                py: 2, 
                bgcolor: colors.cardBg,
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                Всего актов: <strong style={{ color: colors.textPrimary }}>{totalActsCount} шт.</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                Общая сумма: <strong style={{ color: colors.green, fontSize: '1rem' }}>{formatCurrency(totalAmount)}</strong>
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════════
          МОДАЛЬНОЕ ОКНО С ДЕТАЛЯМИ АКТА
      ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: colors.primaryLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconFileCheck size={22} color={colors.primary} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1F2937' }}>
                Акт выполненных работ
              </Typography>
            </Stack>
            {selectedAct && (
              <Chip
                icon={getActTypeIcon(selectedAct.actType)}
                label={getActTypeLabel(selectedAct.actType)}
                size="small"
                sx={{
                  ...getActTypeStyles(selectedAct.actType),
                  fontWeight: 500,
                  height: 28,
                  '& .MuiChip-icon': { 
                    color: getActTypeStyles(selectedAct.actType).color,
                    ml: 0.5
                  }
                }}
              />
            )}
          </Stack>
          
          {/* Вкладки */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  minHeight: 48
                },
                '& .Mui-selected': {
                  color: colors.primary
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: colors.primary
                }
              }}
            >
              <Tab label="Детали акта" icon={<IconFileCheck size={18} />} iconPosition="start" />
              <Tab label="КС-2" icon={<IconFileText size={18} />} iconPosition="start" />
              <Tab label="КС-3" icon={<IconFileInvoice size={18} />} iconPosition="start" />
            </Tabs>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {detailLoading ? (
            <Box display="flex" justifyContent="center" p={6}>
              <CircularProgress sx={{ color: colors.primary }} />
            </Box>
          ) : selectedAct ? (
            <>
              {/* Вкладка 0: Детали акта */}
              {currentTab === 0 && (
                <Box sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    {/* Шапка акта */}
                    <Box 
                      sx={{ 
                        p: 2.5, 
                        bgcolor: colors.cardBg, 
                        borderRadius: '12px',
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        spacing={3}
                        divider={<Divider orientation="vertical" flexItem />}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Номер акта
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace', color: colors.primary }}>
                            {selectedAct.actNumber}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Дата
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>
                            {formatDate(selectedAct.actDate)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Статус
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              icon={getStatusStyles(selectedAct.status).icon}
                              label={getStatusLabel(selectedAct.status)}
                              size="small"
                              sx={{
                                bgcolor: getStatusStyles(selectedAct.status).bgcolor,
                                color: getStatusStyles(selectedAct.status).color,
                                fontWeight: 500,
                                '& .MuiChip-icon': { 
                                  color: getStatusStyles(selectedAct.status).color
                                }
                              }}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </Box>

                    {/* Таблица работ */}
                    <Paper 
                      sx={{ 
                        borderRadius: '12px', 
                        border: `1px solid ${colors.border}`,
                        overflow: 'hidden'
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: colors.headerBg, color: '#4B5563', width: 80 }}>
                              Код
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: colors.headerBg, color: '#4B5563' }}>
                              Наименование работы
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: colors.headerBg, color: '#4B5563', width: 80 }}>
                              Ед. изм.
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: colors.headerBg, color: '#4B5563', width: 100 }} align="right">
                              Кол-во
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: colors.headerBg, color: '#4B5563', width: 120 }} align="right">
                              Цена
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: colors.headerBg, color: '#4B5563', width: 140 }} align="right">
                              Стоимость
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedAct.items && Array.isArray(selectedAct.items) && selectedAct.items.map((item, index) => (
                            <React.Fragment key={item.id || index}>
                              {/* Строка раздела */}
                              {item.isSection && (
                                <TableRow sx={{ bgcolor: colors.primaryLight }}>
                                  <TableCell colSpan={6} sx={{ fontWeight: 600, py: 1, color: colors.primary }}>
                                    {item.sectionName}
                                  </TableCell>
                                </TableRow>
                              )}
                              
                              {/* Строка работы */}
                              {!item.isSection && (
                                <TableRow 
                                  sx={{
                                    '&:hover': { bgcolor: colors.cardBg },
                                    '& td': { borderBottom: `1px solid ${colors.border}` }
                                  }}
                                >
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: colors.textSecondary }}>
                                      {item.workCode}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>
                                      {item.workName}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                                      {item.unit}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {item.actualQuantity ? parseFloat(item.actualQuantity).toFixed(2) : '0.00'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ color: '#374151' }}>
                                      {formatCurrency(item.unitPrice)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: colors.green }}>
                                      {formatCurrency(item.totalPrice)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                          
                          {/* Итоговая строка */}
                          <TableRow sx={{ bgcolor: colors.greenLight }}>
                            <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, fontSize: '0.9375rem', color: colors.greenDark }}>
                              ИТОГО:
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="h6" sx={{ fontWeight: 700, color: colors.green }}>
                                {formatCurrency(selectedAct.totalAmount)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Paper>
                  </Stack>
                </Box>
              )}
              
              {/* Вкладка 1: КС-2 */}
              {currentTab === 1 && (
                <Box sx={{ p: 3 }}>
                  {ks2Loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                      <CircularProgress sx={{ color: colors.primary }} />
                    </Box>
                  ) : (
                    <FormKS2View data={ks2Data} />
                  )}
                </Box>
              )}
              
              {/* Вкладка 2: КС-3 */}
              {currentTab === 2 && (
                <Box sx={{ p: 3 }}>
                  {ks3Loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                      <CircularProgress sx={{ color: colors.primary }} />
                    </Box>
                  ) : (
                    <FormKS3View data={ks3Data} />
                  )}
                </Box>
              )}
            </>
          ) : null}
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2.5, borderTop: `1px solid ${colors.border}` }}>
          <Button 
            onClick={handleCloseDetailModal} 
            sx={{ 
              color: '#7B8794',
              fontWeight: 500,
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
            }}
          >
            Закрыть
          </Button>
          
          <Stack direction="row" spacing={1.5}>
            {/* Кнопки смены статуса */}
            {selectedAct && selectedAct.status === 'draft' && (
              <Button
                variant="contained"
                size="small"
                onClick={() => handleChangeStatus('pending')}
                sx={{
                  bgcolor: colors.warning,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  '&:hover': { bgcolor: '#D97706' }
                }}
              >
                На согласование
              </Button>
            )}
            
            {selectedAct && selectedAct.status === 'pending' && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleChangeStatus('draft')}
                  sx={{
                    borderColor: colors.error,
                    color: colors.error,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: colors.errorLight }
                  }}
                >
                  В черновик
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleChangeStatus('approved')}
                  sx={{
                    bgcolor: colors.green,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: colors.greenDark }
                  }}
                >
                  Согласовать
                </Button>
              </>
            )}
            
            {selectedAct && selectedAct.status === 'approved' && (
              <Button
                variant="contained"
                size="small"
                onClick={() => handleChangeStatus('paid')}
                sx={{
                  bgcolor: colors.primary,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  '&:hover': { bgcolor: colors.primaryDark }
                }}
              >
                Отметить оплаченным
              </Button>
            )}
            
            {/* Кнопки для КС-2 и КС-3 */}
            {currentTab === 1 && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<IconPrinter size={18} />}
                  disabled={!ks2Data}
                  onClick={() => window.print()}
                  sx={{
                    borderColor: colors.border,
                    color: colors.textSecondary,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': { borderColor: colors.primary, color: colors.primary }
                  }}
                >
                  Печать
                </Button>
                <Button
                  variant="contained"
                  startIcon={<IconDownload size={18} />}
                  disabled={!ks2Data}
                  onClick={handleDownloadKS2PDF}
                  sx={{
                    bgcolor: colors.primary,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                    '&:hover': { bgcolor: colors.primaryDark }
                  }}
                >
                  Скачать КС-2
                </Button>
              </>
            )}
            
            {currentTab === 2 && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<IconPrinter size={18} />}
                  disabled={!ks3Data}
                  onClick={() => window.print()}
                  sx={{
                    borderColor: colors.border,
                    color: colors.textSecondary,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': { borderColor: colors.primary, color: colors.primary }
                  }}
                >
                  Печать
                </Button>
                <Button
                  variant="contained"
                  startIcon={<IconDownload size={18} />}
                  disabled={!ks3Data}
                  onClick={handleDownloadKS3PDF}
                  sx={{
                    bgcolor: colors.primary,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                    '&:hover': { bgcolor: colors.primaryDark }
                  }}
                >
                  Скачать КС-3
                </Button>
              </>
            )}
            
            {currentTab === 0 && (
              <Button
                variant="contained"
                startIcon={<IconDownload size={18} />}
                disabled={!selectedAct}
                sx={{
                  bgcolor: colors.primary,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                  '&:hover': { bgcolor: colors.primaryDark }
                }}
              >
                Скачать PDF
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

WorkCompletionActs.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default WorkCompletionActs;
