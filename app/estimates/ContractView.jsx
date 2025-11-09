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
  IconPlus
} from '@tabler/icons-react';

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return 'Черновик';
      case 'active':
        return 'Действующий';
      case 'completed':
        return 'Выполнен';
      case 'cancelled':
        return 'Отменен';
      default:
        return status;
    }
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
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <IconFileText size={64} stroke={1.5} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h4" gutterBottom>
            Договор не создан
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Для создания договора необходимо выбрать стороны: Заказчика (физическое лицо) и Подрядчика (юридическое лицо)
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<IconPlus />}
            onClick={handleOpenSelector}
            disabled={generating}
          >
            {generating ? 'Создание договора...' : 'Создать договор'}
          </Button>
        </Paper>

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
  }

  // Рендер загрузки
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Рендер договора
  return (
    <Box>
      {/* Заголовок и кнопки действий */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h3" gutterBottom>
              Договор № {contract.contract_number}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={getStatusLabel(contract.status)}
                color={getStatusColor(contract.status)}
                size="small"
              />
              <Typography variant="body2" color="textSecondary">
                от {formatDate(contract.contract_date)}
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
              <Tooltip title="Обновить">
                <IconButton onClick={loadContract} color="primary">
                  <IconRefresh />
                </IconButton>
              </Tooltip>

              <Button
                variant="outlined"
                startIcon={<IconEye />}
                onClick={handleViewDetails}
              >
                Просмотр
              </Button>

              <Button
                variant="contained"
                startIcon={<IconDownload />}
                onClick={handleDownloadDOCX}
                color="primary"
              >
                Скачать DOCX
              </Button>

              <Tooltip title="Удалить">
                <IconButton onClick={handleDeleteContract} color="error">
                  <IconTrash />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Информация о договоре */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Информация о договоре
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          {/* Заказчик */}
          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconUser size={20} />
                <Typography variant="subtitle2" color="textSecondary">
                  ЗАКАЗЧИК (Сторона-1)
                </Typography>
              </Stack>
              <Typography variant="h5">
                {contract.customer?.full_name || 'Не указан'}
              </Typography>
              {contract.customer && (
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Паспорт: {contract.customer.passportSeries} {contract.customer.passportNumber} (код: {contract.customer.passportIssuedByCode || 'не указан'})
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Адрес: {contract.customer.registration_address}
                  </Typography>
                  {contract.customer.phone && (
                    <Typography variant="body2" color="textSecondary">
                      Тел: {contract.customer.phone}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Подрядчик */}
          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconBuilding size={20} />
                <Typography variant="subtitle2" color="textSecondary">
                  ПОДРЯДЧИК (Сторона-2)
                </Typography>
              </Stack>
              <Typography variant="h5">
                {contract.contractor?.company_name || 'Не указан'}
              </Typography>
              {contract.contractor && (
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    ИНН: {contract.contractor.inn} • ОГРН: {contract.contractor.ogrn}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Адрес: {contract.contractor.legal_address}
                  </Typography>
                  {contract.contractor.phone && (
                    <Typography variant="body2" color="textSecondary">
                      Тел: {contract.contractor.phone}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Финансовая информация */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Общая стоимость работ
            </Typography>
            <Typography variant="h4" color="primary">
              {formatAmount(contract.total_amount)}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Дата заключения
            </Typography>
            <Typography variant="h5">
              {formatDate(contract.contract_date)}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Статус
            </Typography>
            <Chip
              label={getStatusLabel(contract.status)}
              color={getStatusColor(contract.status)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Модальное окно просмотра деталей */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconFileInvoice />
            <Typography variant="h3">
              Договор № {contract.contract_number}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab label="Детали" />
            <Tab label="Превью договора" />
            <Tab label="Приложения" />
          </Tabs>

          {/* Вкладка 1: Детали */}
          {currentTab === 0 && (
            <Box sx={{ py: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h4" gutterBottom>
                    Основная информация
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Номер договора"
                    value={contract.contract_number}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Дата договора"
                    value={formatDate(contract.contract_date)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Общая стоимость"
                    value={formatAmount(contract.total_amount)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
                    Стороны договора
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Заказчик
                  </Typography>
                  <Typography variant="body1">
                    {contract.customer?.full_name}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Подрядчик
                  </Typography>
                  <Typography variant="body1">
                    {contract.contractor?.company_name}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Вкладка 2: Превью договора */}
          {currentTab === 1 && (
            <Box sx={{ py: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Превью договора с автозаполненными данными будет отображаться здесь после реализации backend
              </Alert>
              <Paper variant="outlined" sx={{ p: 3, minHeight: 400, bgcolor: 'background.default' }}>
                <Typography variant="body2" color="textSecondary">
                  {/* Здесь будет рендериться превью договора */}
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {JSON.stringify(contract.template_data, null, 2)}
                  </pre>
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Вкладка 3: Приложения */}
          {currentTab === 2 && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h5" gutterBottom>
                Приложения к договору
              </Typography>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Приложение №1 - Смета на работы и материал
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Ссылается на текущую смету проекта
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Приложение №2 - График производства работ
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Ссылается на график проекта (этапы оплаты)
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Приложение №3 - Акт приемки работ (КС-2, КС-3)
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Формы для приемки выполненных работ
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Приложение №4 - Акт приема-передачи объекта
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Акт передачи объекта с указанием дефектов
                  </Typography>
                </Paper>
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailModalOpen(false)}>
            Закрыть
          </Button>
          <Button
            variant="contained"
            startIcon={<IconDownload />}
            onClick={handleDownloadDOCX}
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
