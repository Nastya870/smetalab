import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Checkbox,
  Divider,
  TextField,
  IconButton
} from '@mui/material';
import {
  IconListDetails,
  IconClipboardCheck,
  IconDeviceFloppy,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
  IconFileInvoice,
  IconAlertTriangle,
  IconTrendingUp,
  IconTrendingDown
} from '@tabler/icons-react';

// API
import estimatesAPI from 'api/estimates';
import { projectsAPI } from 'api/projects';

// ==============================|| SPECIALIST ESTIMATE (ВЫПОЛНЕНИЕ) ||============================== //

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

// ✅ ОПТИМИЗАЦИЯ: Отдельный компонент с локальным стейтом для устранения лага при вводе
const QuantityInput = React.memo(({ value, onChange }) => {
  const [localValue, setLocalValue] = React.useState(value);

  // Синхронизируем с внешним значением при его изменении извне
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    // Сравниваем числовые значения, чтобы избежать ложных срабатываний (строка vs число)
    const numValue = localValue === '' ? 0 : parseFloat(localValue);
    const prevValue = value === '' ? 0 : parseFloat(value);

    if (numValue !== prevValue) {
      onChange(localValue);
    }
  };

  return (
    <TextField
      type="number"
      value={localValue || ''}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      size="small"
      inputProps={{
        min: 0,
        step: 0.01,
        style: {
          textAlign: 'right',
          fontSize: '0.875rem',
          padding: '6px 8px',
          color: colors.green,
          MozAppearance: 'textfield' // Firefox
        }
      }}
      sx={{
        width: '90px',
        // Убираем стрелки у number input
        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
          WebkitAppearance: 'none',
          margin: 0
        },
        '& .MuiOutlinedInput-root': {
          bgcolor: '#fff',
          borderRadius: '8px',
          '& fieldset': {
            borderColor: colors.border
          },
          '&:hover fieldset': {
            borderColor: colors.green
          },
          '&.Mui-focused fieldset': {
            borderColor: colors.green
          }
        }
      }}
    />
  );
});

// ✅ ОПТИМИЗАЦИЯ: Мемоизированный чекбокс для устранения лага при клике
const CompletionCheckbox = React.memo(({ checked, onChange }) => {
  return (
    <Checkbox
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      sx={{
        color: colors.green,
        '&.Mui-checked': { color: colors.green },
        p: 0.5
      }}
      size="small"
    />
  );
});

// ✅ ОПТИМИЗАЦИЯ: Мемоизированная строка таблицы
const WorkRow = React.memo(({
  work,
  sectionIndex,
  workIndex,
  onCompletedChange,
  onQuantityChange,
  formatCurrency,
  getVarianceType,
  colors
}) => {
  const varianceType = getVarianceType(work.planTotal, work.actualTotal);
  const isHighlighted = varianceType === 'over' || varianceType === 'under';

  return (
    <TableRow
      sx={{
        bgcolor: work.completed
          ? colors.greenLight
          : (workIndex % 2 === 0 ? '#fff' : '#FAFAFA'),
        '&:hover': {
          bgcolor: work.completed ? '#A7F3D0' : colors.cardBg
        },
        transition: 'background-color 0.15s',
        '& td': {
          py: 0.75,
          borderBottom: `1px solid ${colors.border}`
        },
        ...(isHighlighted && work.actualTotal > 0 && {
          borderLeft: `3px solid ${varianceType === 'over' ? colors.error : colors.warning}`
        })
      }}
    >
      <TableCell align="center">
        <CompletionCheckbox
          checked={work.completed}
          onChange={(checked) => onCompletedChange(sectionIndex, workIndex, checked)}
        />
      </TableCell>

      <TableCell align="center">
        {work.actNumber ? (
          <Chip
            label={work.actNumber}
            size="small"
            sx={{
              bgcolor: colors.primaryLight,
              color: colors.primary,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22
            }}
          />
        ) : (
          <Typography variant="caption" sx={{ color: '#D1D5DB' }}>—</Typography>
        )}
      </TableCell>

      <TableCell>
        <Typography variant="caption" sx={{ fontWeight: 500, color: colors.primary, fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {work.code}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="caption" sx={{ color: '#374151', fontSize: '0.75rem' }}>
          {work.name}
        </Typography>
      </TableCell>

      <TableCell align="center">
        <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
          {work.unit}
        </Typography>
      </TableCell>

      <TableCell align="right" sx={{ borderLeft: `2px solid ${colors.border}` }}>
        <Typography variant="caption" sx={{ fontWeight: 500, color: '#374151', fontSize: '0.75rem' }}>
          {work.planQuantity.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
        </Typography>
      </TableCell>

      <TableCell align="right">
        <Typography variant="caption" sx={{ color: '#374151', fontSize: '0.75rem' }}>
          {formatCurrency(work.clientPrice)}
        </Typography>
      </TableCell>

      <TableCell align="right">
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#1F2937', fontSize: '0.75rem' }}>
          {formatCurrency(work.planTotal)}
        </Typography>
      </TableCell>

      <TableCell align="right" sx={{ borderLeft: `2px solid ${colors.green}` }}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500, color: colors.green }}>
          {formatCurrency(work.basePrice)}
        </Typography>
      </TableCell>

      <TableCell align="right" sx={{ p: 0.5 }}>
        <QuantityInput
          value={work.actualQuantity}
          onChange={(newValue) => onQuantityChange(sectionIndex, workIndex, newValue)}
        />
      </TableCell>

      <TableCell align="right">
        <Typography variant="caption" sx={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: colors.green,
          bgcolor: work.actualTotal > 0 ? colors.greenLight : 'transparent',
          px: 1, py: 0.5, borderRadius: '6px', display: 'inline-block'
        }}>
          {formatCurrency(work.actualTotal)}
        </Typography>
      </TableCell>
    </TableRow>
  );
});

// Получить склонение слова "работа"
const getWorksLabel = (count) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${count} работ`;
  if (lastDigit === 1) return `${count} работа`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} работы`;
  return `${count} работ`;
};

// Определить, есть ли отклонение факта от плана
const getVarianceType = (plan, fact) => {
  if (fact === 0) return 'none';
  if (plan === 0) return fact > 0 ? 'over' : 'none';

  const ratio = fact / plan;
  if (ratio > 1.1) return 'over'; // Перерасход более 10%
  if (ratio < 0.9) return 'under'; // Выполнено менее 90%
  return 'normal';
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ru-RU');
};

const SpecialistEstimate = ({ estimateId, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [specialistData, setSpecialistData] = useState([]);
  const [estimateGenerated, setEstimateGenerated] = useState(false);
  const [estimateMetadata, setEstimateMetadata] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // ✅ Ручное сохранение: отслеживаем несохранённые изменения
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const changedItemsRef = useRef(new Set());

  // ✅ ОПТИМИЗАЦИЯ: Расширенный useMemo для итогов разделов и общих итогов
  const processedData = useMemo(() => {
    let grandPlan = 0;
    let grandActual = 0;

    const sections = specialistData.map(section => {
      const sectionPlan = section.works.reduce((sum, w) => sum + w.planTotal, 0);
      const sectionActual = section.works.reduce((sum, w) => sum + w.actualTotal, 0);

      grandPlan += sectionPlan;
      grandActual += sectionActual;

      return {
        ...section,
        sectionPlanTotal: sectionPlan,
        sectionActualTotal: sectionActual
      };
    });

    return {
      sections,
      totalPlanAmount: grandPlan,
      totalActualAmount: grandActual,
      difference: grandPlan - grandActual
    };
  }, [specialistData]);

  const { sections, totalPlanAmount, totalActualAmount, difference } = processedData;

  // Инициализация развёрнутых секций при загрузке
  useEffect(() => {
    if (sections.length > 0) {
      const initialExpanded = {};
      sections.forEach((_, index) => {
        initialExpanded[index] = true;
      });
      setExpandedSections(initialExpanded);
    }
  }, [sections.length]);

  // Переключение сворачивания секции
  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  // Функция для сохранения изменений в БД (ручное сохранение)
  const handleManualSave = async () => {
    try {
      // Если нет изменений — не делаем запрос
      if (changedItemsRef.current.size === 0) {
        return;
      }

      setSaving(true);

      // Собираем только ИЗМЕНЁННЫЕ записи
      const completions = [];
      const changedIds = changedItemsRef.current;

      specialistData.forEach(section => {
        section.works.forEach(work => {
          if (changedIds.has(work.id)) {
            completions.push({
              estimateItemId: work.id,
              completed: work.completed || false,
              actualQuantity: work.actualQuantity || 0,
              actualTotal: work.actualTotal || 0,
              notes: null
            });
          }
        });
      });

      if (completions.length > 0) {
        console.log(`✅ Сохранение ${completions.length} изменённых записей`);
        await estimatesAPI.batchSaveWorkCompletions(estimateId, completions);

        // Очищаем список изменённых после успешного сохранения
        changedItemsRef.current = new Set();
        setHasUnsavedChanges(false);

        // Рассчитываем прогресс проекта
        if (projectId) {
          projectsAPI.calculateProgress(projectId).catch(err => {
            console.error('⚠️ Error calculating progress:', err);
          });
        }
      }
    } catch (err) {
      console.error('❌ Error saving work completions:', err);
      setError('Не удалось сохранить данные о выполненных работах');
    } finally {
      setSaving(false);
    }
  };

  // Обработчик изменения чекбокса выполнения работы
  const handleCompletedChange = React.useCallback((sectionIndex, workIndex, checked) => {
    setSpecialistData(prevData => {
      const newData = [...prevData];
      const section = { ...newData[sectionIndex] };
      const works = [...section.works];
      const work = { ...works[workIndex] };

      work.completed = checked;

      // Если работа отмечена как выполненная, автоматически заполняем фактическое количество
      if (checked && work.actualQuantity === 0) {
        work.actualQuantity = work.planQuantity;
        work.actualTotal = work.actualQuantity * work.basePrice;
      }

      works[workIndex] = work;
      section.works = works;
      newData[sectionIndex] = section;

      // Отмечаем эту работу как изменённую
      changedItemsRef.current.add(work.id);
      setHasUnsavedChanges(true);

      return newData;
    });
  }, []);

  // Обработчик изменения фактического количества
  const handleActualQuantityChange = React.useCallback((sectionIndex, workIndex, value) => {
    setSpecialistData(prevData => {
      const newData = [...prevData];
      const section = { ...newData[sectionIndex] };
      const works = [...section.works];
      const work = { ...works[workIndex] };

      // Парсим значение
      const quantity = value === '' ? 0 : parseFloat(value);

      if (!isNaN(quantity) && quantity >= 0) {
        work.actualQuantity = quantity;
        work.actualTotal = quantity * work.basePrice;

        works[workIndex] = work;
        section.works = works;
        newData[sectionIndex] = section;

        // Отмечаем эту работу как изменённую
        changedItemsRef.current.add(work.id);
        setHasUnsavedChanges(true);
      }

      return newData;
    });
  }, []);

  // ✅ Централизованная функция обработки данных сметы
  const processEstimateItems = (items, completionsMap) => {
    const groupedData = {};

    items.forEach((item) => {
      const sectionKey = item.phase || item.section || 'Без раздела';

      if (!groupedData[sectionKey]) {
        groupedData[sectionKey] = {
          section: sectionKey,
          works: []
        };
      }

      // Базовая цена теперь приходит с сервера через JOIN
      const basePrice = item.work_base_price || item.unit_price;
      const clientPrice = item.unit_price;
      const completion = completionsMap.get(item.id);

      groupedData[sectionKey].works.push({
        id: item.id || `work-${Date.now()}-${Math.random()}`,
        code: item.code,
        name: item.name,
        unit: item.unit,
        planQuantity: item.quantity,
        clientPrice: clientPrice,
        planTotal: item.quantity * clientPrice,
        basePrice: basePrice,
        completed: completion?.completed || false,
        actualQuantity: completion?.actual_quantity || 0,
        actualTotal: (completion?.actual_quantity || 0) * basePrice,
        actNumber: completion?.act_number || null,
        actType: completion?.act_type || null
      });
    });

    return Object.values(groupedData);
  };

  // Загрузка сметы специалиста при монтировании
  useEffect(() => {
    const loadSpecialistEstimate = async () => {
      if (!estimateId) return;

      try {
        setLoading(true);
        setError(null);

        // Параллельные запросы
        const [estimate, completionsResponse] = await Promise.all([
          estimatesAPI.getById(estimateId),
          estimatesAPI.getWorkCompletions(estimateId).catch(() => ({ success: false, data: [] }))
        ]);

        const completionsMap = new Map();
        if (completionsResponse.success && completionsResponse.data) {
          completionsResponse.data.forEach(c => completionsMap.set(c.estimate_item_id, c));
        }

        if (estimate && estimate.items && estimate.items.length > 0) {
          setEstimateMetadata({
            name: estimate.name,
            estimateNumber: estimate.estimate_number,
            estimateDate: estimate.estimate_date,
            status: estimate.status
          });

          const sections = processEstimateItems(estimate.items, completionsMap);
          setSpecialistData(sections);
          setEstimateGenerated(true);
        }
      } catch (err) {
        console.error('Ошибка загрузки сметы специалиста:', err);
        setError('Не удалось загрузить смету');
      } finally {
        setLoading(false);
      }
    };

    loadSpecialistEstimate();
  }, [estimateId]);

  const handleGenerateEstimate = async () => {
    if (!estimateId) {
      setError('Не указан ID сметы');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [estimate, completionsResponse] = await Promise.all([
        estimatesAPI.getById(estimateId),
        estimatesAPI.getWorkCompletions(estimateId).catch(() => ({ success: false, data: [] }))
      ]);

      const completionsMap = new Map();
      if (completionsResponse.success && completionsResponse.data) {
        completionsResponse.data.forEach(c => completionsMap.set(c.estimate_item_id, c));
      }

      if (estimate && estimate.items && estimate.items.length > 0) {
        setEstimateMetadata({
          name: estimate.name,
          estimateNumber: estimate.estimate_number,
          estimateDate: estimate.estimate_date,
          status: estimate.status
        });

        const sectionsData = processEstimateItems(estimate.items, completionsMap);
        setSpecialistData(sectionsData);
        setEstimateGenerated(true);
      }
    } catch (err) {
      console.error('Ошибка формирования сметы специалиста:', err);
      setError(err.response?.data?.message || 'Не удалось сформировать смету');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshEstimate = async () => {
    handleGenerateEstimate();
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
            <IconClipboardCheck size={18} color={colors.primary} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: colors.textPrimary,
                fontSize: '1rem'
              }}
            >
              Выполнение работ
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: colors.textSecondary, lineHeight: 1 }}
            >
              Сравнение плановых и фактических объёмов
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          {/* Кнопка ручного сохранения */}
          {estimateGenerated && (
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconDeviceFloppy size={16} />}
              onClick={handleManualSave}
              disabled={saving || !hasUnsavedChanges}
              sx={{
                bgcolor: hasUnsavedChanges ? colors.green : '#9CA3AF',
                color: '#fff',
                fontWeight: 600,
                px: 2,
                py: 0.5,
                height: 32,
                fontSize: '0.8125rem',
                borderRadius: '8px',
                textTransform: 'none',
                boxShadow: hasUnsavedChanges ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: hasUnsavedChanges ? colors.greenDark : '#9CA3AF',
                },
                '&:disabled': { bgcolor: '#D1D5DB', color: '#9CA3AF' }
              }}
            >
              {saving ? 'Сохранение...' : (hasUnsavedChanges ? 'Сохранить' : 'Сохранено')}
            </Button>
          )}

          {estimateGenerated && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconRefresh size={16} />}
              onClick={handleRefreshEstimate}
              disabled={loading}
              sx={{
                borderColor: colors.border,
                color: colors.textSecondary,
                fontWeight: 600,
                px: 2,
                py: 0.5,
                height: 32,
                fontSize: '0.8125rem',
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': {
                  borderColor: colors.primary,
                  color: colors.primary,
                  bgcolor: colors.primaryLight
                },
                '&:disabled': { borderColor: '#E5E7EB', color: '#D1D5DB' }
              }}
            >
              Обновить
            </Button>
          )}

          {!estimateGenerated && !loading && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<IconDeviceFloppy size={20} />}
              onClick={handleGenerateEstimate}
              disabled={loading || !estimateId}
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
              Сформировать выполнение
            </Button>
          )}
        </Stack>
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
              Загрузка данных о выполнении...
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
        {!loading && !estimateGenerated && (
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
              <IconFileInvoice size={40} color={colors.primary} style={{ opacity: 0.7 }} />
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 600, color: '#374151', mb: 1 }}
            >
              Выполнение ещё не сформировано
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: colors.textSecondary, mb: 4, maxWidth: 400, mx: 'auto' }}
            >
              Нажмите кнопку «Сформировать выполнение» для создания таблицы с плановыми и фактическими данными
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<IconDeviceFloppy size={22} />}
              onClick={handleGenerateEstimate}
              disabled={loading || !estimateId}
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
              Сформировать выполнение
            </Button>
          </Paper>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
          СФОРМИРОВАННОЕ ВЫПОЛНЕНИЕ
      ═══════════════════════════════════════════════════════════════════ */}
        {!loading && estimateGenerated && (
          <>
            {/* ─────────────────────────────────────────────────────────────────
              КАРТОЧКА С ИНФОРМАЦИЕЙ О СМЕТЕ
          ───────────────────────────────────────────────────────────────── */}
            {estimateMetadata && (
              <Paper
                sx={{
                  p: 1.5,
                  mb: 1,
                  bgcolor: colors.cardBg,
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  flexShrink: 0
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Название проекта
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                      {estimateMetadata.name}
                    </Typography>
                  </Box>
                  {estimateMetadata.estimateNumber && (
                    <Box>
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        Номер сметы
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                        {estimateMetadata.estimateNumber}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Дата
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                      {formatDate(estimateMetadata.estimateDate)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* ─────────────────────────────────────────────────────────────────
              РАЗДЕЛЫ ВЫПОЛНЕНИЯ
          ───────────────────────────────────────────────────────────────── */}
            {sections.map((sectionData, sectionIndex) => (
              <Paper
                key={sectionIndex}
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
                {/* ═══ Заголовок раздела (кликабельный) ═══ */}
                <Box
                  onClick={() => toggleSection(sectionIndex)}
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    bgcolor: '#fff',
                    borderBottom: expandedSections[sectionIndex] ? `1px solid ${colors.border}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: '#FAFAFA' }
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <IconButton size="small" sx={{ p: 0.5, color: colors.textSecondary }}>
                        {expandedSections[sectionIndex] ? (
                          <IconChevronDown size={20} />
                        ) : (
                          <IconChevronRight size={20} />
                        )}
                      </IconButton>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: '#1F2937', fontSize: '0.875rem' }}
                      >
                        Раздел: {sectionData.section}
                      </Typography>
                    </Stack>
                    <Chip
                      label={getWorksLabel(sectionData.works.length)}
                      size="small"
                      sx={{
                        bgcolor: colors.primaryLight,
                        color: colors.primary,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 22,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  </Stack>
                </Box>

                {/* ═══ Содержимое раздела (сворачиваемое) ═══ */}
                <Collapse in={expandedSections[sectionIndex]}>
                  {sectionData.works.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#fff' }}>
                      <IconFileInvoice size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 1 }}>
                        Нет работ в этом разделе
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {/* ═══ Таблица работ ═══ */}
                      <Box sx={{ overflowX: 'auto', bgcolor: '#fff' }}>
                        <Table size="small" sx={{ minWidth: 1000 }}>
                          <TableHead>
                            {/* Первый уровень — секции */}
                            <TableRow>
                              <TableCell
                                align="center"
                                rowSpan={2}
                                sx={{
                                  width: 56,
                                  fontWeight: 600,
                                  bgcolor: colors.headerBg,
                                  color: '#374151',
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
                                }}
                              >
                                ✓
                              </TableCell>
                              <TableCell
                                align="center"
                                rowSpan={2}
                                sx={{
                                  width: 80,
                                  fontWeight: 600,
                                  bgcolor: colors.headerBg,
                                  color: '#374151',
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
                                }}
                              >
                                В акте
                              </TableCell>
                              <TableCell
                                rowSpan={2}
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
                                rowSpan={2}
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
                                rowSpan={2}
                                align="center"
                                sx={{
                                  width: 70,
                                  fontWeight: 600,
                                  bgcolor: colors.headerBg,
                                  color: '#374151',
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
                                }}
                              >
                                Ед.
                              </TableCell>

                              {/* Секция «План (Заказчик)» */}
                              <TableCell
                                align="center"
                                colSpan={3}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.875rem',
                                  bgcolor: colors.headerBg,
                                  color: colors.textPrimary,
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important',
                                  borderLeft: `2px solid ${colors.border}`
                                }}
                              >
                                План (Заказчик)
                              </TableCell>

                              {/* Секция «Факт (Специалист)» */}
                              <TableCell
                                align="center"
                                colSpan={3}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.875rem',
                                  bgcolor: colors.greenLight,
                                  color: colors.greenDark,
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important',
                                  borderLeft: `2px solid ${colors.green}`
                                }}
                              >
                                Факт (Специалист)
                              </TableCell>
                            </TableRow>

                            {/* Второй уровень — колонки */}
                            <TableRow>
                              {/* План */}
                              <TableCell
                                align="right"
                                sx={{
                                  width: 90,
                                  fontWeight: 600,
                                  bgcolor: colors.headerBg,
                                  color: '#374151',
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important',
                                  borderLeft: `2px solid ${colors.border}`
                                }}
                              >
                                Кол-во
                              </TableCell>
                              <TableCell
                                align="right"
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
                                Цена
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
                                Сумма
                              </TableCell>

                              {/* Факт */}
                              <TableCell
                                align="right"
                                sx={{
                                  width: 100,
                                  fontWeight: 600,
                                  bgcolor: colors.greenLight,
                                  color: colors.greenDark,
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important',
                                  borderLeft: `2px solid ${colors.green}`
                                }}
                              >
                                Баз.цена
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  width: 100,
                                  fontWeight: 600,
                                  bgcolor: colors.greenLight,
                                  color: colors.greenDark,
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
                                }}
                              >
                                Факт.кол-во
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  width: 120,
                                  fontWeight: 600,
                                  bgcolor: colors.greenLight,
                                  color: colors.greenDark,
                                  py: 0.5,
                                  borderBottom: `1px solid ${colors.border}`,
                                  fontSize: '10px !important',
                                  lineHeight: '1.2 !important'
                                }}
                              >
                                Факт.сумма
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sectionData.works.map((work, workIndex) => (
                              <WorkRow
                                key={work.id || workIndex}
                                work={work}
                                sectionIndex={sectionIndex}
                                workIndex={workIndex}
                                onCompletedChange={handleCompletedChange}
                                onQuantityChange={handleActualQuantityChange}
                                formatCurrency={formatCurrency}
                                getVarianceType={getVarianceType}
                                colors={colors}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </Box>

                      {/* ═══ Итого по разделу ═══ */}
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.75,
                          bgcolor: colors.totalBg,
                          borderTop: `1px solid ${colors.border}`
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={2}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.65rem' }}>
                            Итого по разделу
                          </Typography>

                          <Stack direction="row" spacing={3} alignItems="center">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>План:</Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1F2937', fontSize: '0.85rem' }}>
                                {formatCurrency(sectionData.sectionPlanTotal)}
                              </Typography>
                            </Stack>

                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>Факт:</Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors.green, fontSize: '0.85rem' }}>
                                {formatCurrency(sectionData.sectionActualTotal)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </Box>
                    </>
                  )}
                </Collapse>
              </Paper>
            ))}

            {/* ─────────────────────────────────────────────────────────────────
              ИТОГИ ВЫПОЛНЕНИЯ
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
                {/* Left Side: Title + Main Totals */}
                <Stack direction="row" alignItems="center" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconListDetails size={18} color={colors.primary} />
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: colors.textSecondary }}>
                      Итоги выполнения
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, mr: 0.5 }}>План:</Typography>
                      <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {formatCurrency(totalPlanAmount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, mr: 0.5 }}>Факт:</Typography>
                      <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600, color: colors.green, fontSize: '0.85rem' }}>
                        {formatCurrency(totalActualAmount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>

                {/* Right Side: Savings + Percent */}
                <Stack direction="row" alignItems="center" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {difference >= 0 ? <IconTrendingUp size={16} color={colors.green} /> : <IconTrendingDown size={16} color={colors.error} />}
                    <Box>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, mr: 0.5 }}>
                        {difference >= 0 ? 'Экономия:' : 'Перерасход:'}
                      </Typography>
                      <Typography variant="subtitle2" component="span" sx={{ fontWeight: 700, color: difference >= 0 ? colors.green : colors.error, fontSize: '0.85rem' }}>
                        {formatCurrency(Math.abs(difference))}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, mr: 0.5 }}>Выполнено:</Typography>
                    <Typography variant="subtitle2" component="span" sx={{ fontWeight: 700, color: colors.primary, fontSize: '0.85rem' }}>
                      {totalPlanAmount > 0 ? ((totalActualAmount / totalPlanAmount) * 100).toFixed(1) : 0}%
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
};

SpecialistEstimate.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default SpecialistEstimate;
