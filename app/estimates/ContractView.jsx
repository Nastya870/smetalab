import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Box,
  Typography,
  Paper,
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
  Tab,
  Grid,
  TextField
} from '@mui/material';
import {
  IconFileText,
  IconDownload,
  IconTrash,
  IconEye,
  IconRefresh,
  IconUser,
  IconBuilding,
  IconFileInvoice,
  IconPlus,
  IconCalendar,
  IconCurrencyRubel,
  IconPhone,
  IconMapPin,
  IconId,
  IconHash,
  IconInfoCircle,
  IconFileDescription,
  IconClipboardList,
  IconReceipt
} from '@tabler/icons-react';

// Цветовая палитра (единая для всех компонентов)
const colors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  green: '#10B981',
  greenDark: '#059669',
  greenLight: '#D1FAE5',
  purple: '#8B5CF6',
  purpleDark: '#7C3AED',
  purpleLight: '#EDE9FE',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  headerBg: '#F3F4F6',
  cardBg: '#F9FAFB'
};

// Components
import CounterpartySelectorDialog from 'shared/ui/contracts/CounterpartySelectorDialog';

// API
import contractsAPI from 'api/contracts';

// ==============================|| CONTRACT VIEW (ДОГОВОР) ||============================== //

const ContractView = ({ estimateId, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  
  // Модальные окна
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  // Загрузка договора при монтировании
  useEffect(() => {
    loadContract();
  }, [estimateId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await contractsAPI.getContractByEstimate(estimateId);
      setContract(data);
      
    } catch (err) {
      console.error('Error loading contract:', err);
      setError('Не удалось загрузить договор');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSelector = () => {
    setSelectorOpen(true);
  };

  const handleCounterpartiesSelected = async ({ customer, contractor }) => {
    try {
      setGenerating(true);
      setError(null);

      const result = await contractsAPI.generateContract({
        estimateId,
        projectId,
        customerId: customer.id,
        contractorId: contractor.id
      });
      
      setContract(result);
      
    } catch (err) {
      console.error('Error generating contract:', err);
      setError('Не удалось сгенерировать договор');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetails = () => {
    setDetailModalOpen(true);
    setCurrentTab(0);
  };

  const handleDownloadDOCX = async () => {
    try {
      const blob = await contractsAPI.getContractDOCX(contract.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Договор_${contract.contract_number}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading DOCX:', err);
      setError('Не удалось скачать договор');
    }
  };

  const handleDeleteContract = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить договор?')) {
      return;
    }

    try {
      await contractsAPI.deleteContract(contract.id);
      setContract(null);
      
    } catch (err) {
      console.error('Error deleting contract:', err);
      setError('Не удалось удалить договор');
    }
  };

  const getStatusStyles = (status) => {
    const styles = {
      draft: { 
        bgcolor: colors.headerBg, 
        color: '#6B7280',
        label: 'Черновик'
      },
      active: { 
        bgcolor: colors.greenLight, 
        color: colors.greenDark,
        label: 'Действующий'
      },
      completed: { 
        bgcolor: colors.primaryLight, 
        color: colors.primary,
        label: 'Выполнен'
      },
      cancelled: { 
        bgcolor: colors.errorLight, 
        color: colors.error,
        label: 'Отменён'
      }
    };
    return styles[status] || styles.draft;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  // Рендер пустого состояния (нет договора)
  if (!loading && !contract) {
    return (
      <Box>
        {/* Шапка страницы */}
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
              <IconFileText size={26} color={colors.primary} />
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
                Договор
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ color: colors.textSecondary, mt: 0.5 }}
              >
                Формирование договора подряда
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Пустое состояние */}
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
          }}
        >
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
            <IconFileText size={40} color="#9CA3AF" />
          </Box>
          <Typography 
            variant="h5" 
            sx={{ fontWeight: 600, color: '#374151', mb: 1 }}
          >
            Договор не создан
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ color: colors.textSecondary, maxWidth: 450, mx: 'auto', mb: 3 }}
          >
            Для создания договора необходимо выбрать стороны: Заказчика (физическое лицо) и Подрядчика (юридическое лицо)
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconPlus size={20} />}
            onClick={handleOpenSelector}
            disabled={generating}
            sx={{
              bgcolor: colors.primary,
              color: '#fff',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              height: 48,
              borderRadius: '12px',
              textTransform: 'none',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
              '&:hover': {
                bgcolor: colors.primaryDark,
                boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
              },
              '&:disabled': { bgcolor: '#C7D2FE' }
            }}
          >
            {generating ? 'Создание договора...' : 'Создать договор'}
          </Button>
        </Paper>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mt: 2, borderRadius: '10px' }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Диалог выбора контрагентов */}
        <CounterpartySelectorDialog
          open={selectorOpen}
          onClose={() => setSelectorOpen(false)}
          onSelect={handleCounterpartiesSelected}
        />
      </Box>
    );
  }

  // Рендер загрузки
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  const statusStyles = getStatusStyles(contract.status);

  // Рендер договора
  return (
    <Box>
      {/* ═══════════════════════════════════════════════════════════════════
          ШАПКА ДОГОВОРА
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
            <IconFileText size={26} color={colors.primary} />
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
              Договор № {contract.contract_number}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                label={statusStyles.label}
                size="small"
                sx={{
                  bgcolor: statusStyles.bgcolor,
                  color: statusStyles.color,
                  fontWeight: 600,
                  height: 24,
                  fontSize: '0.75rem'
                }}
              />
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                • от {formatDate(contract.contract_date)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Кнопки действий */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<IconRefresh size={18} />}
            onClick={loadContract}
            sx={{
              borderColor: colors.border,
              color: colors.textSecondary,
              fontWeight: 500,
              px: 2,
              height: 48,
              borderRadius: '12px',
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

          <Button
            variant="outlined"
            startIcon={<IconEye size={18} />}
            onClick={handleViewDetails}
            sx={{
              borderColor: colors.border,
              color: colors.textSecondary,
              fontWeight: 500,
              px: 2,
              height: 48,
              borderRadius: '12px',
              textTransform: 'none',
              '&:hover': {
                borderColor: colors.primary,
                color: colors.primary,
                bgcolor: colors.primaryLight,
              }
            }}
          >
            Просмотр
          </Button>

          <Button
            variant="contained"
            startIcon={<IconDownload size={18} />}
            onClick={handleDownloadDOCX}
            sx={{
              bgcolor: colors.primary,
              color: '#fff',
              fontWeight: 600,
              px: 2.5,
              height: 48,
              borderRadius: '12px',
              textTransform: 'none',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
              '&:hover': {
                bgcolor: colors.primaryDark,
                boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
              }
            }}
          >
            Скачать DOCX
          </Button>

          <Tooltip title="Удалить договор">
            <IconButton 
              onClick={handleDeleteContract}
              sx={{ 
                color: colors.textSecondary,
                width: 48,
                height: 48,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                '&:hover': { 
                  color: colors.error,
                  bgcolor: colors.errorLight,
                  borderColor: colors.error
                }
              }}
            >
              <IconTrash size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ═══════════════════════════════════════════════════════════════════
          КАРТОЧКИ СТОРОН ДОГОВОРА
      ═══════════════════════════════════════════════════════════════════ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Карточка Заказчика */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              height: '100%'
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
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
                <IconUser size={22} color={colors.primary} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Заказчик (Сторона-1)
                </Typography>
              </Box>
            </Stack>

            {contract.customer ? (
              <Stack spacing={2}>
                <Typography 
                  variant="h5" 
                  sx={{ fontWeight: 600, color: colors.textPrimary }}
                >
                  {contract.customer.full_name || 'Не указан'}
                </Typography>
                
                <Divider sx={{ borderColor: colors.border }} />
                
                {/* Паспортные данные */}
                {(contract.customer.passportSeries || contract.customer.passportNumber) ? (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconId size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        Паспорт
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        {contract.customer.passportSeries} {contract.customer.passportNumber}
                        {contract.customer.passportIssuedByCode && (
                          <Typography component="span" sx={{ color: colors.textSecondary, ml: 1 }}>
                            (код: {contract.customer.passportIssuedByCode})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconInfoCircle size={16} color="#9CA3AF" />
                    <Typography variant="body2" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                      Паспортные данные отсутствуют
                    </Typography>
                  </Stack>
                )}
                
                {/* Адрес */}
                {contract.customer.registration_address ? (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconMapPin size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        Адрес регистрации
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        {contract.customer.registration_address}
                      </Typography>
                    </Box>
                  </Stack>
                ) : null}
                
                {/* Телефон */}
                {contract.customer.phone && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconPhone size={18} color={colors.textSecondary} />
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        Телефон
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        {contract.customer.phone}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <IconInfoCircle size={16} color="#9CA3AF" />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                  Данные заказчика не заполнены
                </Typography>
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Карточка Подрядчика */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              height: '100%'
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: colors.purpleLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconBuilding size={22} color={colors.purple} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Подрядчик (Сторона-2)
                </Typography>
              </Box>
            </Stack>

            {contract.contractor ? (
              <Stack spacing={2}>
                <Typography 
                  variant="h5" 
                  sx={{ fontWeight: 600, color: colors.textPrimary }}
                >
                  {contract.contractor.company_name || 'Не указан'}
                </Typography>
                
                <Divider sx={{ borderColor: colors.border }} />
                
                {/* ИНН / ОГРН */}
                {(contract.contractor.inn || contract.contractor.ogrn) ? (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconHash size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        Реквизиты
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        ИНН: {contract.contractor.inn || '—'} • ОГРН: {contract.contractor.ogrn || '—'}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconInfoCircle size={16} color="#9CA3AF" />
                    <Typography variant="body2" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                      Реквизиты подрядчика не заполнены
                    </Typography>
                  </Stack>
                )}
                
                {/* Адрес */}
                {contract.contractor.legal_address ? (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconMapPin size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        Юридический адрес
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        {contract.contractor.legal_address}
                      </Typography>
                    </Box>
                  </Stack>
                ) : null}
                
                {/* Телефон */}
                {contract.contractor.phone && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconPhone size={18} color={colors.textSecondary} />
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        Телефон
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        {contract.contractor.phone}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <IconInfoCircle size={16} color="#9CA3AF" />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                  Данные подрядчика не заполнены
                </Typography>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ═══════════════════════════════════════════════════════════════════
          ИТОГОВАЯ ПАНЕЛЬ (СТОИМОСТЬ / ДАТА / СТАТУС)
      ═══════════════════════════════════════════════════════════════════ */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          bgcolor: colors.cardBg
        }}
      >
        <Grid container spacing={3}>
          {/* Общая стоимость */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: colors.greenLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconCurrencyRubel size={24} color={colors.green} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
                  Общая стоимость работ
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: colors.green }}>
                  {formatAmount(contract.total_amount)}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Дата заключения */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: colors.primaryLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconCalendar size={24} color={colors.primary} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
                  Дата заключения
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                  {formatDate(contract.contract_date)}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Статус */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: statusStyles.bgcolor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconFileText size={24} color={statusStyles.color} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
                  Статус договора
                </Typography>
                <Chip
                  label={statusStyles.label}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: statusStyles.bgcolor,
                    color: statusStyles.color,
                    fontWeight: 600,
                    height: 28,
                    fontSize: '0.8125rem'
                  }}
                />
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════════
          МОДАЛЬНОЕ ОКНО ПРОСМОТРА ДЕТАЛЕЙ
      ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: colors.primaryLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconFileInvoice size={24} color={colors.primary} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                  Договор № {contract.contract_number}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  от {formatDate(contract.contract_date)}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={statusStyles.label}
              size="small"
              sx={{
                bgcolor: statusStyles.bgcolor,
                color: statusStyles.color,
                fontWeight: 600,
                height: 28
              }}
            />
          </Stack>

          {/* Вкладки */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
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
              <Tab label="Детали" icon={<IconFileDescription size={18} />} iconPosition="start" />
              <Tab label="Превью договора" icon={<IconEye size={18} />} iconPosition="start" />
              <Tab label="Приложения" icon={<IconClipboardList size={18} />} iconPosition="start" />
            </Tabs>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Вкладка 1: Детали */}
          {currentTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Основная информация */}
                <Grid size={12}>
                  <Paper 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: '12px',
                      bgcolor: colors.cardBg,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: colors.textSecondary, fontWeight: 600, mb: 2 }}>
                      Основная информация
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          Номер договора
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {contract.contract_number}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          Дата договора
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {formatDate(contract.contract_date)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          Общая стоимость
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: colors.green }}>
                          {formatAmount(contract.total_amount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Стороны договора */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: '12px',
                      border: `1px solid ${colors.border}`,
                      height: '100%'
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <IconUser size={18} color={colors.primary} />
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary, fontWeight: 600 }}>
                        Заказчик
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                      {contract.customer?.full_name || '—'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: '12px',
                      border: `1px solid ${colors.border}`,
                      height: '100%'
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <IconBuilding size={18} color={colors.purple} />
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary, fontWeight: 600 }}>
                        Подрядчик
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                      {contract.contractor?.company_name || '—'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Вкладка 2: Превью договора */}
          {currentTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Alert 
                severity="info" 
                sx={{ mb: 2, borderRadius: '10px' }}
                icon={<IconInfoCircle size={20} />}
              >
                Превью договора с автозаполненными данными будет отображаться здесь после реализации backend
              </Alert>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  minHeight: 400, 
                  bgcolor: colors.cardBg,
                  borderRadius: '12px',
                  borderColor: colors.border
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {JSON.stringify(contract.template_data, null, 2)}
                  </pre>
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Вкладка 3: Приложения */}
          {currentTab === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.textPrimary, mb: 2 }}>
                Приложения к договору
              </Typography>
              <Stack spacing={2}>
                {[
                  { num: 1, title: 'Смета на работы и материал', desc: 'Ссылается на текущую смету проекта', icon: <IconReceipt size={20} color={colors.primary} /> },
                  { num: 2, title: 'График производства работ', desc: 'Ссылается на график проекта (этапы оплаты)', icon: <IconCalendar size={20} color={colors.purple} /> },
                  { num: 3, title: 'Акт приемки работ (КС-2, КС-3)', desc: 'Формы для приемки выполненных работ', icon: <IconClipboardList size={20} color={colors.green} /> },
                  { num: 4, title: 'Акт приема-передачи объекта', desc: 'Акт передачи объекта с указанием дефектов', icon: <IconFileDescription size={20} color={colors.warning} /> }
                ].map((item) => (
                  <Paper 
                    key={item.num}
                    sx={{ 
                      p: 2.5, 
                      borderRadius: '12px',
                      border: `1px solid ${colors.border}`,
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: colors.primary,
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.1)'
                      }
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          bgcolor: colors.cardBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          Приложение №{item.num} — {item.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                          {item.desc}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2.5, borderTop: `1px solid ${colors.border}` }}>
          <Button 
            onClick={() => setDetailModalOpen(false)}
            sx={{ 
              color: '#7B8794',
              fontWeight: 500,
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
            }}
          >
            Закрыть
          </Button>
          <Button
            variant="contained"
            startIcon={<IconDownload size={18} />}
            onClick={handleDownloadDOCX}
            sx={{
              bgcolor: colors.primary,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              px: 3,
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
              '&:hover': { bgcolor: colors.primaryDark }
            }}
          >
            Скачать DOCX
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Диалог выбора контрагентов */}
      <CounterpartySelectorDialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleCounterpartiesSelected}
      />
    </Box>
  );
};

ContractView.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default ContractView;
