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
  IconFileText
} from '@tabler/icons-react';

// API
import workCompletionActsAPI from 'api/workCompletionActs';

// Components
import FormKS2View from 'shared/ui/forms/FormKS2View';
import FormKS3View from 'shared/ui/forms/FormKS3View';

// ==============================|| WORK COMPLETION ACTS (АКТЫ ВЫПОЛНЕННЫХ РАБОТ) ||============================== //

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
    return actType === 'client' ? <IconBuilding size={16} /> : <IconUser size={16} />;
  };

  const getActTypeColor = (actType) => {
    return actType === 'client' ? 'primary' : 'secondary';
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

  const getStatusColor = (status) => {
    const statusColors = {
      draft: 'default',      // Серый
      pending: 'warning',    // Оранжевый
      approved: 'success',   // Зеленый
      paid: 'info'          // Синий
    };
    return statusColors[status] || 'default';
  };

  return (
    <Box>
      {/* Заголовок и кнопки генерации */}
      <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <IconFileCheck size={24} />
              <Typography variant="h5">Акты выполненных работ</Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<IconRefresh size={18} />}
              onClick={loadActs}
              disabled={loading}
              size="small"
            >
              Обновить
            </Button>
          </Box>

          <Divider />

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<IconBuilding size={18} />}
              onClick={() => handleGenerateAct('client')}
              disabled={generating || loading}
            >
              Сформировать акт для Заказчика
            </Button>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<IconUser size={18} />}
              onClick={() => handleGenerateAct('specialist')}
              disabled={generating || loading}
            >
              Сформировать акт для Специалиста
            </Button>

            <Button
              variant="outlined"
              startIcon={<IconFileInvoice size={18} />}
              onClick={() => handleGenerateAct('both')}
              disabled={generating || loading}
            >
              Сформировать оба акта
            </Button>
          </Stack>

          {generating && (
            <Alert severity="info" icon={<CircularProgress size={20} />}>
              Формирование акта...
            </Alert>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Таблица актов */}
      <Paper sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading && acts.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        ) : acts.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              Акты еще не сформированы. Нажмите кнопку выше для генерации.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
            <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold' }}>
                  Номер акта
                </TableCell>
                <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold' }}>
                  Тип
                </TableCell>
                <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold' }}>
                  Дата
                </TableCell>
                <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold' }} align="right">
                  Кол-во работ
                </TableCell>
                <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold' }} align="right">
                  Сумма
                </TableCell>
                <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold' }}>
                  Статус
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {acts.map((act) => (
                <TableRow key={act.id} hover>
                  <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {act.actNumber}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                    <Chip
                      icon={getActTypeIcon(act.actType)}
                      label={getActTypeLabel(act.actType)}
                      color={getActTypeColor(act.actType)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                    {formatDate(act.actDate)}
                  </TableCell>
                  <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }} align="right">
                    {act.workCount || 0}
                  </TableCell>
                  <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }} align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(act.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                    <Chip
                      label={getStatusLabel(act.status)}
                      color={getStatusColor(act.status)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Просмотр деталей">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewDetails(act.id)}
                        >
                          <IconEye size={18} />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Скачать PDF">
                        <IconButton size="small" color="info">
                          <IconDownload size={18} />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Удалить">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteAct(act.id)}
                        >
                          <IconTrash size={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Box>
        )}
      </Paper>

      {/* Модальное окно с деталями акта */}
      <Dialog
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <IconFileCheck size={24} />
              <Typography variant="h6">
                Акт выполненных работ
              </Typography>
            </Box>
            {selectedAct && (
              <Chip
                icon={getActTypeIcon(selectedAct.actType)}
                label={getActTypeLabel(selectedAct.actType)}
                color={getActTypeColor(selectedAct.actType)}
              />
            )}
          </Box>
          
          {/* Вкладки */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Детали акта" icon={<IconFileCheck size={18} />} iconPosition="start" />
              <Tab label="КС-2" icon={<IconFileText size={18} />} iconPosition="start" />
              <Tab label="КС-3" icon={<IconFileInvoice size={18} />} iconPosition="start" />
            </Tabs>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {detailLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : selectedAct ? (
            <>
              {/* Вкладка 0: Детали акта */}
              {currentTab === 0 && (
                <Stack spacing={3}>
                  {/* Шапка акта */}
                  <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Stack spacing={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Номер акта:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                          {selectedAct.actNumber}
                        </Typography>
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Дата:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(selectedAct.actDate)}
                        </Typography>
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Статус:
                        </Typography>
                        <Chip
                          label={getStatusLabel(selectedAct.status)}
                          color={getStatusColor(selectedAct.status)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Stack>
                  </Paper>

                  {/* Таблица работ (сгруппированная по разделам) */}
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold', width: '60px' }}>
                          Код
                        </TableCell>
                        <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold' }}>
                          Наименование работы
                        </TableCell>
                        <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold', width: '80px' }}>
                          Ед. изм.
                        </TableCell>
                        <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold', width: '100px' }} align="right">
                          Кол-во
                        </TableCell>
                        <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider', fontWeight: 'bold', width: '120px' }} align="right">
                          Цена
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '140px' }} align="right">
                          Стоимость
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedAct.items && Array.isArray(selectedAct.items) && selectedAct.items.map((item, index) => (
                        <React.Fragment key={item.id || index}>
                          {/* Строка раздела (если есть) */}
                          {item.isSection && (
                            <TableRow sx={{ bgcolor: 'action.selected' }}>
                              <TableCell colSpan={6} sx={{ fontWeight: 'bold', py: 1 }}>
                                {item.sectionName}
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {/* Строка работы */}
                          {!item.isSection && (
                            <TableRow hover>
                              <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                                <Typography variant="body2" fontFamily="monospace">
                                  {item.workCode}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                                {item.workName}
                              </TableCell>
                              <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                                {item.unit}
                              </TableCell>
                              <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }} align="right">
                                {item.actualQuantity ? parseFloat(item.actualQuantity).toFixed(2) : '0.00'}
                              </TableCell>
                              <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }} align="right">
                                {formatCurrency(item.unitPrice)}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600}>
                                  {formatCurrency(item.totalPrice)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                      
                      {/* Итоговая строка */}
                      <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                        <TableCell colSpan={5} align="right" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          ИТОГО:
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" color="primary">
                            {formatCurrency(selectedAct.totalAmount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Stack>
              )}
              
              {/* Вкладка 1: КС-2 */}
              {currentTab === 1 && (
                <Box>
                  {ks2Loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <FormKS2View data={ks2Data} />
                  )}
                </Box>
              )}
              
              {/* Вкладка 2: КС-3 */}
              {currentTab === 2 && (
                <Box>
                  {ks3Loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <FormKS3View data={ks3Data} />
                  )}
                </Box>
              )}
            </>
          ) : null}
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Box>
            <Button onClick={handleCloseDetailModal} variant="outlined">
              Закрыть
            </Button>
          </Box>
          
          <Stack direction="row" spacing={1}>
            {/* Кнопки смены статуса */}
            {selectedAct && selectedAct.status === 'draft' && (
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={() => handleChangeStatus('pending')}
              >
                Отправить на согласование
              </Button>
            )}
            
            {selectedAct && selectedAct.status === 'pending' && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => handleChangeStatus('draft')}
                >
                  Вернуть в черновик
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => handleChangeStatus('approved')}
                >
                  Согласовать
                </Button>
              </>
            )}
            
            {selectedAct && selectedAct.status === 'approved' && (
              <Button
                variant="contained"
                color="info"
                size="small"
                onClick={() => handleChangeStatus('paid')}
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
                >
                  Печать КС-2
                </Button>
                <Button
                  variant="contained"
                  startIcon={<IconDownload size={18} />}
                  disabled={!ks2Data}
                  onClick={handleDownloadKS2PDF}
                >
                  Скачать КС-2 PDF
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
                >
                  Печать КС-3
                </Button>
                <Button
                  variant="contained"
                  startIcon={<IconDownload size={18} />}
                  disabled={!ks3Data}
                  onClick={handleDownloadKS3PDF}
                >
                  Скачать КС-3 PDF
                </Button>
              </>
            )}
            
            {currentTab === 0 && (
              <Button
                variant="contained"
                startIcon={<IconDownload size={18} />}
                disabled={!selectedAct}
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
