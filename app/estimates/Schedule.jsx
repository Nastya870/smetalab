import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Papa from 'papaparse';

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
  Divider,
  IconButton
} from '@mui/material';
import {
  IconCalendarStats,
  IconDeviceFloppy,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
  IconListDetails,
  IconClipboardCheck,
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

  // Загрузка существующего графика
  const loadSchedule = React.useCallback(async () => {
    if (!estimateId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await schedulesAPI.getByEstimateId(estimateId);

      if (response.schedule) {
        setScheduleData(response.schedule || []);
        setScheduleGenerated(response.schedule?.length > 0);
      }
    } catch (err) {
      // Если график не найден (404), это не ошибка - просто еще не создан
      if (err.response?.status === 404) {
        setScheduleData([]);
        setScheduleGenerated(false);
      } else {
        console.error('Ошибка загрузки графика:', err);
        setError('Не удалось загрузить график');
      }
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  // Загрузка существующего графика при монтировании
  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

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

  const processImportSchedule = async (file, options, setProgress) => {
    if (!estimateId || !projectId) {
      showError('Не указан ID сметы или проекта');
      return;
    }

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (parseResult) => {
          try {
            const rows = parseResult.data;
            if (rows.length === 0) return reject(new Error('Файл пуст'));

            const fieldMapping = {
              'Фаза': 'phase',
              'Код': 'workCode',
              'Артикул': 'workCode',
              'Наименование': 'workName',
              'Название': 'workName',
              'Ед. изм.': 'unit',
              'Ед.изм.': 'unit',
              'Единица': 'unit',
              'Кол-во': 'quantity',
              'Количество': 'quantity',
              'Цена': 'unitPrice',
              'Стоимость': 'unitPrice',
              'Сумма': 'totalPrice',
              'Итого': 'totalPrice',
              'Позиция': 'positionNumber',
              'Дата начала': 'startDate',
              'Начало': 'startDate',
              'Дата окончания': 'endDate',
              'Окончание': 'endDate'
            };

            const schedulesToImport = rows.map(row => {
              const normalized = {};
              const lowerCaseRow = {};
              Object.keys(row).forEach(k => {
                lowerCaseRow[k.trim().toLowerCase()] = row[k];
              });

              Object.keys(fieldMapping).forEach(rHeader => {
                const lHeader = rHeader.toLowerCase();
                if (lowerCaseRow[lHeader] !== undefined) {
                  normalized[fieldMapping[rHeader]] = lowerCaseRow[lHeader];
                }
              });

              return {
                ...normalized,
                quantity: parseFloat(String(normalized.quantity || '0').replace(/,/g, '.').replace(/\s/g, '')) || 0,
                unitPrice: parseFloat(String(normalized.unitPrice || '0').replace(/,/g, '.').replace(/\s/g, '')) || 0,
                totalPrice: parseFloat(String(normalized.totalPrice || '0').replace(/,/g, '.').replace(/\s/g, '')) || 0,
                positionNumber: parseInt(normalized.positionNumber) || 0
              };
            });

            const total = schedulesToImport.length;
            const CHUNK_SIZE = 500;
            let finalResult = { successCount: 0 };

            for (let i = 0; i < total; i += CHUNK_SIZE) {
              const chunk = schedulesToImport.slice(i, i + CHUNK_SIZE);

              // В режиме 'replace' удаляем старые записи только при первой итерации
              const currentMode = (options.mode === 'replace' && i === 0) ? 'replace' : 'add';

              const result = await schedulesAPI.bulkImport(estimateId, {
                schedules: chunk,
                mode: currentMode,
                projectId
              });

              finalResult.successCount += (result.successCount || 0);

              if (setProgress) {
                setProgress({ current: Math.min(i + CHUNK_SIZE, total), total });
              }
            }

            // Явно возвращаем успех для диалога
            resolve({ ...finalResult, success: true });
          } catch (err) {
            console.error('Import processing error:', err);
            reject(err);
          }
        },
        error: (err) => reject(err)
      });
    });
  };

  const handleImportSuccess = async () => {
    // Перезагружаем данные графика
    await loadSchedule();
    success('График успешно импортирован');
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
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ═══════════════════════════════════════════════════════════════════
          ШАПКА СТРАНИЦЫ
      ═══════════════════════════════════════════════════════════════════ */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 1, flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: colors.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconCalendarStats size={18} color={colors.primary} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: '#111827',
                fontSize: '1rem'
              }}
            >
              График производства работ
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: colors.textSecondary,
                lineHeight: 1
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
              size="small"
              startIcon={exportingCSV ? <CircularProgress size={16} /> : <IconDownload size={16} />}
              onClick={handleExportCSV}
              disabled={loading || exportingCSV}
              sx={{
                borderColor: colors.border,
                color: '#4B5563',
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                textTransform: 'none',
                height: 32,
                fontSize: '0.8125rem',
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
              size="small"
              startIcon={<IconRefresh size={16} />}
              onClick={handleRefreshSchedule}
              disabled={loading}
              sx={{
                bgcolor: colors.primary,
                color: '#fff',
                fontWeight: 600,
                px: 2,
                py: 0.5,
                height: 32,
                fontSize: '0.8125rem',
                borderRadius: '8px',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: colors.primaryDark,
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
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
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
                  mb: 1,
                  overflow: 'hidden',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  bgcolor: colors.cardBg,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  flexShrink: 0
                }}
              >
                {/* ═══ Заголовок фазы (кликабельный) ═══ */}
                <Box
                  onClick={() => togglePhase(phaseIndex)}
                  sx={{
                    px: 1.5,
                    py: 1,
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
                        <Table size="small" sx={{ minWidth: 700 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  width: 90,
                                  fontWeight: 600,
                                  bgcolor: colors.headerBg,
                                  color: '#374151',
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
                                }}
                              >
                                Код
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: colors.headerBg,
                                  color: '#374151',
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
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
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
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
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
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
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
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
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
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
                                    py: 0.75,
                                    borderBottom: `1px solid ${colors.border}`
                                  }
                                }}
                              >
                                <TableCell>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 500,
                                      color: colors.primary,
                                      fontFamily: 'monospace',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {work.code}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" sx={{ color: '#374151', fontSize: '0.75rem' }}>
                                    {work.name}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography
                                    variant="caption"
                                    sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}
                                  >
                                    {work.unit}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="caption" sx={{ fontWeight: 500, color: '#374151', fontSize: '0.75rem' }}>
                                    {work.quantity.toLocaleString('ru-RU', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2
                                    })}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="caption" sx={{ color: '#374151', fontSize: '0.75rem' }}>
                                    {formatCurrency(work.price)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: '#1F2937', fontSize: '0.75rem' }}
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

            {/* ─────────────────────────────────────────────────────────────────
              КОМПАКТНЫЙ ПОДВАЛ (как в Purchases)
           ───────────────────────────────────────────────────────────────── */}
            <Paper
              elevation={3}
              sx={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                mt: 'auto',
                p: 1,
                borderTop: `1px solid ${colors.border}`,
                bgcolor: '#fff',
                borderRadius: 0
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
                sx={{ maxWidth: '100%', overflowX: 'auto' }}
              >
                <Stack direction="row" alignItems="center" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconListDetails size={18} color={colors.primary} />
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: colors.textSecondary }}>
                      Итого по графику
                    </Typography>
                  </Stack>

                  <Box>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, mr: 0.5 }}>
                      Структура:
                    </Typography>
                    <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                      {scheduleData.length} {scheduleData.length === 1 ? 'фаза' : scheduleData.length < 5 ? 'фазы' : 'фаз'} • {getWorksLabel(totalWorks)}
                    </Typography>
                  </Box>
                </Stack>

                <Box>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, mr: 1 }}>
                    К оплате:
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    component="span"
                    sx={{ fontWeight: 700, color: colors.primary, fontSize: '0.9rem' }}
                  >
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </>
        )}
        {/* ✅ Диалог импорта графика */}
        <ImportDialog
          open={openImportDialog}
          onClose={() => setOpenImportDialog(false)}
          onImport={processImportSchedule}
          onSuccess={handleImportSuccess}
          title="Импорт графика работ"
          description="📄 Загрузите CSV файл с графиком работ. Обязательные поля: Фаза, Наименование, Кол-во, Цена. Дополнительные: Код, Дата начала, Дата окончания."
        />
      </Box>
    </Box>
  );
};

Schedule.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default Schedule;
