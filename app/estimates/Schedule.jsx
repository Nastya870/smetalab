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
  Alert
} from '@mui/material';
import { IconCalendarStats, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';

// API
import schedulesAPI from 'api/schedules';

// ==============================|| SCHEDULE (ГРАФИК) ||============================== //

const Schedule = ({ estimateId, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);

  const totalAmount = scheduleData.reduce((sum, phase) => sum + phase.phaseTotal, 0);

  // Загрузка существующего графика при монтировании
  useEffect(() => {
    const loadSchedule = async () => {
      if (!estimateId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await schedulesAPI.getByEstimateId(estimateId);
        
        if (response.schedule && response.schedule.length > 0) {
          setScheduleData(response.schedule);
          setScheduleGenerated(true);
        }
      } catch (err) {
        // Если график не найден (404), это не ошибка - просто еще не создан
        if (err.response?.status === 404) {
          console.log('График еще не создан');
        } else {
          console.error('Ошибка загрузки графика:', err);
          setError('Не удалось загрузить график');
        }
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [estimateId]);

  const handleGenerateSchedule = async () => {
    if (!estimateId || !projectId) {
      setError('Не указан ID сметы или проекта');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await schedulesAPI.generateSchedule(estimateId, projectId);
      
      if (response.schedule) {
        setScheduleData(response.schedule);
        setScheduleGenerated(true);
      }
    } catch (err) {
      console.error('Ошибка формирования графика:', err);
      setError(err.response?.data?.message || 'Не удалось сформировать график');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSchedule = async () => {
    if (!estimateId || !projectId) {
      setError('Не указан ID сметы или проекта');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Перегенерируем график (старый будет удален и создан новый)
      const response = await schedulesAPI.generateSchedule(estimateId, projectId);
      
      if (response.schedule) {
        setScheduleData(response.schedule);
        setScheduleGenerated(true);
      }
    } catch (err) {
      console.error('Ошибка обновления графика:', err);
      setError(err.response?.data?.message || 'Не удалось обновить график');
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

  return (
    <Box>
      {/* Шапка */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={500}>
            График производства работ
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Работы сгруппированы по фазам выполнения
          </Typography>
        </Box>
        
        {scheduleGenerated && (
          <Button
            variant="outlined"
            startIcon={<IconRefresh />}
            onClick={handleRefreshSchedule}
            disabled={loading}
          >
            Обновить график
          </Button>
        )}
        
        {!scheduleGenerated && (
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy />}
            onClick={handleGenerateSchedule}
            disabled={loading || !estimateId || !projectId}
          >
            Сформировать график
          </Button>
        )}
      </Stack>

      {/* Индикатор загрузки */}
      {loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Формирование графика...
          </Typography>
        </Paper>
      )}

      {/* Ошибка */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !scheduleGenerated ? (
        // Заглушка до формирования графика
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <IconCalendarStats size={64} style={{ opacity: 0.2 }} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            График еще не сформирован
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Нажмите кнопку "Сформировать график" для создания графика работ на основе сметы
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy />}
            onClick={handleGenerateSchedule}
            disabled={loading || !estimateId || !projectId}
          >
            Сформировать график
          </Button>
        </Paper>
      ) : (
        // Сформированный график
        <>
          {scheduleData.map((phaseData, phaseIndex) => (
            <Paper key={phaseIndex} sx={{ mb: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              {/* Заголовок фазы */}
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.lighter', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                    Фаза {phaseIndex + 1}: {phaseData.phase}
                  </Typography>
                  <Chip
                    label={`${phaseData.works.length} работ`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Stack>
              </Box>

              {/* Таблица работ */}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 80, fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Код
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Наименование работы
                    </TableCell>
                    <TableCell align="center" sx={{ width: 100, fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Ед. изм.
                    </TableCell>
                    <TableCell align="right" sx={{ width: 120, fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Количество
                    </TableCell>
                    <TableCell align="right" sx={{ width: 140, fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Цена
                    </TableCell>
                    <TableCell align="right" sx={{ width: 160, fontWeight: 600, bgcolor: 'action.hover' }}>
                      Сумма
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {phaseData.works.map((work, workIndex) => (
                    <TableRow
                      key={workIndex}
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" fontWeight={500} color="secondary">
                          {work.code}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                        <Typography variant="body2">{work.name}</Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary">
                          {work.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {work.quantity.toLocaleString('ru-RU', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                        <Typography variant="body2">
                          {formatCurrency(work.price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(work.total)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Итого по фазе */}
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'warning.lighter', borderTop: '2px solid', borderColor: 'warning.main' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={600}>
                    Итого по фазе "{phaseData.phase}"
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="warning.dark">
                    {formatCurrency(phaseData.phaseTotal)}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          ))}

          {/* Общие итоги */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Итоговая информация по графику
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Stack spacing={1.5}>
              {scheduleData.map((phase, index) => (
                <Stack key={index} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Фаза {index + 1}: {phase.phase}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatCurrency(phase.phaseTotal)}
                  </Typography>
                </Stack>
              ))}
              
              <Divider sx={{ my: 1.5 }} />
              
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  ИТОГО ПО ГРАФИКУ
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {formatCurrency(totalAmount)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
};

Schedule.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default Schedule;
