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
  Collapse,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  IconCalendarStats,
  IconDeviceFloppy,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
  IconListDetails,
  IconUpload,
  IconDownload
} from '@tabler/icons-react';

// API
import schedulesAPI from 'api/schedules';
import ImportDialog from 'shared/ui/components/ImportDialog';
import { useNotifications } from 'contexts/NotificationsContext';

// ==============================|| SCHEDULE (ГРАФИК) ||============================== //

// Цветовая палитра
const colors = {
  primary: '#4F46E5',        // Фиолетовый основной
  primaryLight: '#EEF2FF',   // Светло-фиолетовый фон
  primaryDark: '#3730A3',    // Тёмно-фиолетовый
  headerBg: '#F3F4F6',       // Фон шапки таблицы
  cardBg: '#F9FAFB',         // Фон карточки фазы
  totalBg: '#EEF2FF',        // Фон итогов фазы
  border: '#E5E7EB',         // Цвет границ
  textSecondary: '#6B7280',  // Вторичный текст
  hoverRow: '#F9FAFB',       // Hover строки
};

const Schedule = ({ estimateId, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [exportingCSV, setExportingCSV] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);

  const { success, error: showError, info } = useNotifications();

  const totalAmount = scheduleData.reduce((sum, phase) => sum + phase.phaseTotal, 0);
  const totalWorks = scheduleData.reduce((sum, phase) => sum + phase.works.length, 0);

  // Инициализация развёрнутых фаз при загрузке данных
  useEffect(() => {
    if (scheduleData.length > 0) {
      const initialExpanded = {};
      scheduleData.forEach((_, index) => {
        initialExpanded[index] = true; // По умолчанию все развёрнуты
      });
      setExpandedPhases(initialExpanded);
    }
  }, [scheduleData]);

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
          // График ещё не создан
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

  const handleExportCSV = async () => {
    if (!estimateId) return;
    try {
      setExportingCSV(true);
      info('Подготовка файла экспорта...');
      await schedulesAPI.exportSchedule(estimateId);
      success('Файл экспорта успешно сформирован');
    } catch (err) {
      console.error('Export error:', err);
      showError('Ошибка при экспорте графика', err.message);
    } finally {
      setExportingCSV(false);
    }
  };

  const handleImportCSV = () => {
    setOpenImportDialog(true);
  };

  const handleImportSuccess = () => {
    // Перезагружаем данные графика
    const loadSchedule = async () => {
      try {
        setLoading(true);
        const response = await schedulesAPI.getByEstimateId(estimateId);
        if (response.schedule && response.schedule.length > 0) {
          setScheduleData(response.schedule);
          setScheduleGenerated(true);
        }
        success('График успешно импортирован');
      } catch (err) {
        console.error('Error reloading schedule:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  };

  const togglePhase = (phaseIndex) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseIndex]: !prev[phaseIndex]
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Получить склонение слова "работа"
  const getWorksLabel = (count) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${count} работ`;
    if (lastDigit === 1) return `${count} работа`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} работы`;
    return `${count} работ`;
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
        sx={{ mb: 4 }}
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
            <IconCalendarStats size={26} color={colors.primary} />
          </Box>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                color: '#111827',
                fontSize: { xs: '1.5rem', sm: '1.75rem' }
              }}
            >
              График производства работ
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: colors.textSecondary,
                mt: 0.5
              }}
            >
              Работы сгруппированы по фазам выполнения
            </Typography>
          </Box>
        </Stack>

        {scheduleGenerated && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="medium"
              startIcon={exportingCSV ? <CircularProgress size={20} /> : <IconDownload size={20} />}
              onClick={handleExportCSV}
              disabled={loading || exportingCSV}
              sx={{
                borderColor: colors.border,
                color: '#4B5563',
                fontWeight: 600,
                px: 2,
                py: 1,
                borderRadius: '10px',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#D1D5DB',
                  bgcolor: '#F9FAFB',
                }
              }}
            >
              Экспорт CSV
            </Button>

            <Button
              variant="outlined"
              size="medium"
              startIcon={<IconUpload size={20} />}
              onClick={handleImportCSV}
              disabled={loading}
              sx={{
                borderColor: colors.border,
                color: '#4B5563',
                fontWeight: 600,
                px: 2,
                py: 1,
                borderRadius: '10px',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#D1D5DB',
                  bgcolor: '#F9FAFB',
                }
              }}
            >
              Импорт CSV
            </Button>

            <Button
              variant="contained"
              size="medium"
              startIcon={<IconRefresh size={20} />}
              onClick={handleRefreshSchedule}
              disabled={loading}
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
                '&:disabled': {
                  bgcolor: '#C7D2FE',
                }
              }}
            >
              Обновить график
            </Button>
          </Stack>
        )}

        {!scheduleGenerated && !loading && (
          <Button
            variant="contained"
            size="medium"
            startIcon={<IconDeviceFloppy size={20} />}
            onClick={handleGenerateSchedule}
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
              '&:disabled': {
                bgcolor: '#C7D2FE',
              }
            }}
          >
            Сформировать график
          </Button>
        )}
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
            Формирование графика...
          </Typography>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          СООБЩЕНИЕ ОБ ОШИБКЕ
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
          ЗАГЛУШКА (ГРАФИК НЕ СФОРМИРОВАН)
      ═══════════════════════════════════════════════════════════════════ */}
      {!loading && !scheduleGenerated && (
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
            <IconCalendarStats size={40} color={colors.primary} style={{ opacity: 0.7 }} />
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: '#374151',
              mb: 1
            }}
          >
            График ещё не сформирован
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: colors.textSecondary,
              mb: 4,
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            Нажмите кнопку «Сформировать график» для создания графика работ на основе сметы
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<IconDeviceFloppy size={22} />}
            onClick={handleGenerateSchedule}
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
            Сформировать график
          </Button>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          СФОРМИРОВАННЫЙ ГРАФИК
      ═══════════════════════════════════════════════════════════════════ */}
      {!loading && scheduleGenerated && scheduleData.length > 0 && (
        <>
          {/* ─────────────────────────────────────────────────────────────────
              ФАЗЫ РАБОТ
          ───────────────────────────────────────────────────────────────── */}
          {scheduleData.map((phaseData, phaseIndex) => (
            <Paper
              key={phaseIndex}
              sx={{
                mb: 3,
                overflow: 'hidden',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                bgcolor: colors.cardBg,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {/* ═══ Заголовок фазы (кликабельный) ═══ */}
              <Box
                onClick={() => togglePhase(phaseIndex)}
                sx={{
                  px: 2.5,
                  py: 2,
                  bgcolor: '#fff',
                  borderBottom: expandedPhases[phaseIndex] ? `1px solid ${colors.border}` : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: '#FAFAFA'
                  }
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.5,
                        color: colors.textSecondary
                      }}
                    >
                      {expandedPhases[phaseIndex] ? (
                        <IconChevronDown size={20} />
                      ) : (
                        <IconChevronRight size={20} />
                      )}
                    </IconButton>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: '#1F2937',
                        fontSize: '1rem'
                      }}
                    >
                      Фаза {phaseIndex + 1}: {phaseData.phase}
                    </Typography>
                  </Stack>
                  <Chip
                    label={getWorksLabel(phaseData.works.length)}
                    size="small"
                    sx={{
                      bgcolor: colors.primaryLight,
                      color: colors.primary,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 26,
                      '& .MuiChip-label': { px: 1.5 }
                    }}
                  />
                </Stack>
              </Box>

              {/* ═══ Содержимое фазы (сворачиваемое) ═══ */}
              <Collapse in={expandedPhases[phaseIndex]}>
                {phaseData.works.length === 0 ? (
                  /* Плейсхолдер — нет работ */
                  <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#fff' }}>
                    <IconListDetails size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: colors.textSecondary, mt: 1 }}
                    >
                      Нет работ в этой фазе
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* ═══ Таблица работ ═══ */}
                    <Box sx={{ overflowX: 'auto', bgcolor: '#fff' }}>
                      <Table size="medium" sx={{ minWidth: 700 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                width: 90,
                                fontWeight: 600,
                                bgcolor: colors.headerBg,
                                color: '#374151',
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
                              }}
                            >
                              Код
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 600,
                                bgcolor: colors.headerBg,
                                color: '#374151',
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
                              }}
                            >
                              Наименование работы
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                width: 100,
                                fontWeight: 600,
                                bgcolor: colors.headerBg,
                                color: '#374151',
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
                              }}
                            >
                              Ед. изм.
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                width: 120,
                                fontWeight: 600,
                                bgcolor: colors.headerBg,
                                color: '#374151',
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
                              }}
                            >
                              Кол-во
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                width: 140,
                                fontWeight: 600,
                                bgcolor: colors.headerBg,
                                color: '#374151',
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
                              }}
                            >
                              Цена
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                width: 160,
                                fontWeight: 600,
                                bgcolor: colors.headerBg,
                                color: '#374151',
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
                              }}
                            >
                              Сумма
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {phaseData.works.map((work, workIndex) => (
                            <TableRow
                              key={workIndex}
                              sx={{
                                bgcolor: workIndex % 2 === 0 ? '#fff' : '#FAFAFA',
                                '&:hover': {
                                  bgcolor: colors.hoverRow,
                                  '& td': { bgcolor: 'transparent' }
                                },
                                transition: 'background-color 0.15s',
                                '& td': {
                                  py: 1.5,
                                  borderBottom: `1px solid ${colors.border}`
                                }
                              }}
                            >
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: colors.primary,
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {work.code}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ color: '#374151' }}>
                                  {work.name}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography
                                  variant="body2"
                                  sx={{ color: colors.textSecondary }}
                                >
                                  {work.unit}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                                  {work.quantity.toLocaleString('ru-RU', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2
                                  })}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ color: '#374151' }}>
                                  {formatCurrency(work.price)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600, color: '#1F2937' }}
                                >
                                  {formatCurrency(work.total)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>

                    {/* ═══ Итого по фазе ═══ */}
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        bgcolor: colors.totalBg,
                        borderTop: `1px solid ${colors.border}`
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: '#374151' }}
                        >
                          Итого по фазе «{phaseData.phase}»
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: colors.primary
                          }}
                        >
                          {formatCurrency(phaseData.phaseTotal)}
                        </Typography>
                      </Stack>
                    </Box>
                  </>
                )}
              </Collapse>
            </Paper>
          ))}

          {/* ─────────────────────────────────────────────────────────────────
              ИТОГОВАЯ ИНФОРМАЦИЯ ПО ГРАФИКУ
          ───────────────────────────────────────────────────────────────── */}
          <Paper
            sx={{
              p: 3,
              mt: 4,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              bgcolor: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: colors.primaryLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconListDetails size={20} color={colors.primary} />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: '#1F2937' }}
              >
                Итоговая информация по графику
              </Typography>
            </Stack>

            <Box
              sx={{
                bgcolor: colors.cardBg,
                borderRadius: '10px',
                p: 2,
                border: `1px solid ${colors.border}`
              }}
            >
              <Stack spacing={1.5}>
                {scheduleData.map((phase, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      py: 0.75,
                      borderBottom: index < scheduleData.length - 1 ? `1px dashed ${colors.border}` : 'none'
                    }}
                  >
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                      Фаза {index + 1}: {phase.phase}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 500, color: '#374151' }}
                    >
                      {formatCurrency(phase.phaseTotal)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Итоговая сумма */}
            <Box
              sx={{
                mt: 2.5,
                pt: 2.5,
                borderTop: `2px solid ${colors.primary}`
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: '#1F2937' }}
                  >
                    ИТОГО ПО ГРАФИКУ
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                    {scheduleData.length} {scheduleData.length === 1 ? 'фаза' : scheduleData.length < 5 ? 'фазы' : 'фаз'} • {getWorksLabel(totalWorks)}
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: colors.primary,
                    fontSize: { xs: '1.5rem', sm: '1.75rem' }
                  }}
                >
                  {formatCurrency(totalAmount)}
                </Typography>
              </Stack>
            </Box>
          </Paper>
        </>
      )}
      {/* ✅ Диалог импорта графика */}
      <ImportDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        onImport={(file, options) => schedulesAPI.importSchedule(estimateId, file, options.mode)}
        onSuccess={handleImportSuccess}
        title="Импорт графика из CSV"
        description="📄 Загрузите CSV файл с графиком работ. Обязательные поля: Фаза, Наименование, Кол-во, Цена. Дополнительные: Код, Ед изм."
      />
    </Box>
  );
};

Schedule.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default Schedule;
