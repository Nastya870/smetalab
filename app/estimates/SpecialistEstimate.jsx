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
  Checkbox,
  TextField,
  IconButton
} from '@mui/material';
import { 
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
import worksAPI from 'api/works';
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

const SpecialistEstimate = ({ estimateId, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [specialistData, setSpecialistData] = useState([]);
  const [estimateGenerated, setEstimateGenerated] = useState(false);
  const [estimateMetadata, setEstimateMetadata] = useState(null);
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Итоги: План vs Факт
  const totalPlanAmount = specialistData.reduce((sum, section) => 
    sum + section.works.reduce((workSum, work) => workSum + work.planTotal, 0), 0
  );
  const totalActualAmount = specialistData.reduce((sum, section) => 
    sum + section.works.reduce((workSum, work) => workSum + work.actualTotal, 0), 0
  );
  const difference = totalPlanAmount - totalActualAmount;

  // Инициализация развёрнутых секций при загрузке
  useEffect(() => {
    if (specialistData.length > 0) {
      const initialExpanded = {};
      specialistData.forEach((_, index) => {
        initialExpanded[index] = true;
      });
      setExpandedSections(initialExpanded);
    }
  }, [specialistData.length]);

  // Переключение сворачивания секции
  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
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

  // Определить, есть ли отклонение факта от плана
  const getVarianceType = (plan, fact) => {
    if (fact === 0) return 'none';
    const ratio = fact / plan;
    if (ratio > 1.1) return 'over'; // Перерасход более 10%
    if (ratio < 0.9) return 'under'; // Выполнено менее 90%
    return 'normal';
  };

  // Функция для сохранения изменений в БД (с debounce)
  const saveWorkCompletions = async (data) => {
try {
      setSaving(true);
      
      // Собираем все записи о выполнении работ
      const completions = [];
      
      data.forEach(section => {
        section.works.forEach(work => {
          // Сохраняем ВСЕ работы (в том числе с completed=false)
          // чтобы правильно отслеживать как увеличение, так и уменьшение прогресса
          completions.push({
            estimateItemId: work.id,
            completed: work.completed || false,
            actualQuantity: work.actualQuantity || 0,
            actualTotal: work.actualTotal || 0,
            notes: null
          });
        });
      });

      if (completions.length > 0) {
        await estimatesAPI.batchSaveWorkCompletions(estimateId, completions);
// Автоматически рассчитываем прогресс проекта после сохранения
        if (projectId) {
          try {
const progressData = await projectsAPI.calculateProgress(projectId);
} catch (progressError) {
            console.error('⚠️ Error calculating progress:', progressError);
            // Не показываем ошибку пользователю, это второстепенная операция
          }
        } else {
}
      }
    } catch (err) {
      console.error('❌ Error saving work completions:', err);
      setError('Не удалось сохранить данные о выполненных работах');
    } finally {
      setSaving(false);
    }
  };

  // Debounced save (сохраняем через 1 секунду после последнего изменения)
  const debouncedSave = (data) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(() => {
      saveWorkCompletions(data);
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  // Обработчик изменения чекбокса выполнения работы
  const handleCompletedChange = (sectionIndex, workIndex, checked) => {
    setSpecialistData(prevData => {
      const newData = [...prevData];
      const work = newData[sectionIndex].works[workIndex];
      
      work.completed = checked;
      
      // Если работа отмечена как выполненная, автоматически заполняем фактическое количество
      if (checked && work.actualQuantity === 0) {
        work.actualQuantity = work.quantity;
        work.actualTotal = work.actualQuantity * work.basePrice;
      }
      
      // Автосохранение
      debouncedSave(newData);
      
      return newData;
    });
  };

  // Обработчик изменения фактического количества
  const handleActualQuantityChange = (sectionIndex, workIndex, value) => {
    setSpecialistData(prevData => {
      const newData = [...prevData];
      const work = newData[sectionIndex].works[workIndex];
      
      // Парсим значение
      const quantity = value === '' ? 0 : parseFloat(value);
      
      if (!isNaN(quantity) && quantity >= 0) {
        work.actualQuantity = quantity;
        work.actualTotal = quantity * work.basePrice;
        
        // Автосохранение
        debouncedSave(newData);
      }
      
      return newData;
    });
  };

  // Загрузка сметы специалиста при монтировании
  useEffect(() => {
    const loadSpecialistEstimate = async () => {
      if (!estimateId) return;

      try {
        setLoading(true);
        setError(null);
        
        // Загружаем смету из БД
        const estimate = await estimatesAPI.getById(estimateId);
        
        // Загружаем сохраненные данные о выполнении работ
        let completionsMap = new Map();
        try {
          const completionsResponse = await estimatesAPI.getWorkCompletions(estimateId);
          if (completionsResponse.success && completionsResponse.data) {
            completionsResponse.data.forEach(completion => {
              completionsMap.set(completion.estimate_item_id, completion);
            });
}
        } catch (err) {
}
        
        if (estimate && estimate.items && estimate.items.length > 0) {
          // Сохраняем метаданные
          setEstimateMetadata({
            name: estimate.name,
            estimateNumber: estimate.estimate_number,
            estimateDate: estimate.estimate_date,
            status: estimate.status
          });

          // Получаем workIds всех работ в смете
          const workIds = estimate.items
            .filter(item => item.work_id)
            .map(item => item.work_id);
// Загружаем базовые цены работ из справочника
          const basePricesMap = new Map();
          
          if (workIds.length > 0) {
            try {
              // Загружаем работы пакетом
              const worksResponse = await worksAPI.getAll({ pageSize: 10000 });
              const works = worksResponse.data || worksResponse;
              
              // Создаем Map для быстрого поиска
              works.forEach(work => {
                basePricesMap.set(work.id.toString(), work.base_price || 0);
              });
} catch (err) {
}
          }

          // Группируем по фазам/разделам (используем phase или section)
          const groupedData = {};
          
          estimate.items.forEach((item) => {
            const sectionKey = item.phase || item.section || 'Без раздела';
            
            if (!groupedData[sectionKey]) {
              groupedData[sectionKey] = {
                section: sectionKey,
                works: []
              };
            }

            // Получаем БАЗОВУЮ цену из справочника работ
            const basePrice = item.work_id 
              ? (basePricesMap.get(item.work_id.toString()) || item.unit_price)
              : item.unit_price;

            // Цена клиента - из сметы (с учетом коэффициента)
            const clientPrice = item.unit_price;
// Получаем сохраненные данные о выполнении для этой работы
            const completion = completionsMap.get(item.id);

            // Добавляем работу с полными данными (план + факт)
            groupedData[sectionKey].works.push({
              id: item.id || `work-${Date.now()}-${Math.random()}`,
              code: item.code,
              name: item.name,
              unit: item.unit,
              // План (для клиента)
              planQuantity: item.quantity, // Плановое количество
              clientPrice: clientPrice, // Цена клиента (с коэффициентом)
              planTotal: item.quantity * clientPrice, // Сумма по цене клиента
              // Базовые данные (для специалиста)
              basePrice: basePrice, // Базовая цена ИЗ СПРАВОЧНИКА
              // Факт (выполненные работы)
              completed: completion?.completed || false,
              actualQuantity: completion?.actual_quantity || 0,
              actualTotal: (completion?.actual_quantity || 0) * basePrice, // Факт × базовая цена
              // ⭐ Информация об акте
              actNumber: completion?.act_number || null,
              actType: completion?.act_type || null
            });
          });

          // Преобразуем в массив и добавляем итоги
          const sections = Object.values(groupedData).map(section => ({
            ...section,
            sectionPlanTotal: section.works.reduce((sum, work) => sum + work.planTotal, 0),
            sectionActualTotal: section.works.reduce((sum, work) => sum + work.actualTotal, 0)
          }));

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
    
    // Очистка таймаута при размонтировании
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [estimateId]);

  const handleGenerateEstimate = async () => {
    if (!estimateId) {
      setError('Не указан ID сметы');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Загружаем смету из БД
      const estimate = await estimatesAPI.getById(estimateId);
      
      // Загружаем сохраненные данные о выполнении работ
      let completionsMap = new Map();
      try {
        const completionsResponse = await estimatesAPI.getWorkCompletions(estimateId);
        if (completionsResponse.success && completionsResponse.data) {
          completionsResponse.data.forEach(completion => {
            completionsMap.set(completion.estimate_item_id, completion);
          });
}
      } catch (err) {
}
      
      if (estimate && estimate.items && estimate.items.length > 0) {
        // Сохраняем метаданные
        setEstimateMetadata({
          name: estimate.name,
          estimateNumber: estimate.estimate_number,
          estimateDate: estimate.estimate_date,
          status: estimate.status
        });

        // Получаем workIds всех работ в смете
        const workIds = estimate.items
          .filter(item => item.work_id)
          .map(item => item.work_id);
// Загружаем базовые цены работ из справочника
        const basePricesMap = new Map();
        
        if (workIds.length > 0) {
          try {
            // Загружаем работы пакетом
            const worksResponse = await worksAPI.getAll({ pageSize: 10000 });
            const works = worksResponse.data || worksResponse;
            
            // Создаем Map для быстрого поиска
            works.forEach(work => {
              basePricesMap.set(work.id.toString(), work.base_price || 0);
            });
} catch (err) {
}
        }

        // Группируем по фазам/разделам
        const groupedData = {};
        
        estimate.items.forEach((item) => {
          const sectionKey = item.phase || item.section || 'Без раздела';
          
          if (!groupedData[sectionKey]) {
            groupedData[sectionKey] = {
              section: sectionKey,
              works: []
            };
          }

          // Получаем БАЗОВУЮ цену из справочника работ
          const basePrice = item.work_id 
            ? (basePricesMap.get(item.work_id.toString()) || item.unit_price)
            : item.unit_price;

          // Цена клиента - из сметы (с учетом коэффициента)
          const clientPrice = item.unit_price;

          // Получаем сохраненные данные о выполнении для этой работы
          const completion = completionsMap.get(item.id);

          groupedData[sectionKey].works.push({
            id: item.id || `work-${Date.now()}-${Math.random()}`,
            code: item.code,
            name: item.name,
            unit: item.unit,
            // План (для клиента)
            planQuantity: item.quantity,
            clientPrice: clientPrice,
            planTotal: item.quantity * clientPrice,
            // Базовые данные (для специалиста)
            basePrice: basePrice,
            // Факт (выполненные работы)
            completed: completion?.completed || false,
            actualQuantity: completion?.actual_quantity || 0,
            actualTotal: (completion?.actual_quantity || 0) * basePrice,
            // ⭐ Информация об акте
            actNumber: completion?.act_number || null,
            actType: completion?.act_type || null
          });
        });

        const sections = Object.values(groupedData).map(section => ({
          ...section,
          sectionPlanTotal: section.works.reduce((sum, work) => sum + work.planTotal, 0),
          sectionActualTotal: section.works.reduce((sum, work) => sum + work.actualTotal, 0)
        }));

        setSpecialistData(sections);
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
            <IconClipboardCheck size={26} color={colors.primary} />
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
              Выполнение работ
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: colors.textSecondary, mt: 0.5 }}
            >
              Сравнение плановых и фактических объёмов
            </Typography>
          </Box>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Индикатор автосохранения */}
          {saving && (
            <Chip
              icon={<CircularProgress size={14} sx={{ color: colors.primary }} />}
              label="Сохранение..."
              size="small"
              sx={{
                bgcolor: colors.primaryLight,
                color: colors.primary,
                fontWeight: 500,
                '& .MuiChip-icon': { color: colors.primary }
              }}
            />
          )}
          
          {estimateGenerated && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<IconRefresh size={20} />}
              onClick={handleRefreshEstimate}
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
                '&:disabled': { bgcolor: '#C7D2FE' }
              }}
            >
              Обновить выполнение
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
                p: 2.5, 
                mb: 3, 
                bgcolor: colors.cardBg,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`
              }}
            >
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={3} 
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
          {specialistData.map((sectionData, sectionIndex) => (
            <Paper 
              key={sectionIndex} 
              sx={{ 
                mb: 3, 
                overflow: 'hidden',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                bgcolor: colors.cardBg,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {/* ═══ Заголовок раздела (кликабельный) ═══ */}
              <Box 
                onClick={() => toggleSection(sectionIndex)}
                sx={{ 
                  px: 2.5, 
                  py: 2, 
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
                      variant="subtitle1" 
                      sx={{ fontWeight: 700, color: '#1F2937', fontSize: '1rem' }}
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
                      fontSize: '0.75rem',
                      height: 26,
                      '& .MuiChip-label': { px: 1.5 }
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
                      <Table size="medium" sx={{ minWidth: 1000 }}>
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
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1.5,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`,
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`,
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`,
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`,
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`
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
                                py: 1,
                                borderBottom: `1px solid ${colors.border}`
                              }}
                            >
                              Факт.сумма
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sectionData.works.map((work, workIndex) => {
                            const varianceType = getVarianceType(work.planTotal, work.actualTotal);
                            const isHighlighted = varianceType === 'over' || varianceType === 'under';
                            
                            return (
                              <TableRow
                                key={work.id || workIndex}
                                sx={{
                                  bgcolor: work.completed 
                                    ? colors.greenLight 
                                    : (workIndex % 2 === 0 ? '#fff' : '#FAFAFA'),
                                  '&:hover': { 
                                    bgcolor: work.completed ? '#A7F3D0' : colors.cardBg 
                                  },
                                  transition: 'background-color 0.15s',
                                  '& td': {
                                    py: 1.5,
                                    borderBottom: `1px solid ${colors.border}`
                                  },
                                  ...(isHighlighted && work.actualTotal > 0 && {
                                    borderLeft: `3px solid ${varianceType === 'over' ? colors.error : colors.warning}`
                                  })
                                }}
                              >
                                {/* Чекбокс выполнения */}
                                <TableCell align="center">
                                  <Checkbox
                                    checked={work.completed}
                                    onChange={(e) => handleCompletedChange(sectionIndex, workIndex, e.target.checked)}
                                    sx={{
                                      color: colors.green,
                                      '&.Mui-checked': { color: colors.green },
                                      p: 0.5
                                    }}
                                    size="small"
                                  />
                                </TableCell>
                                
                                {/* В акте */}
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
                                    <Typography variant="caption" sx={{ color: '#D1D5DB' }}>
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                
                                {/* Код */}
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
                                
                                {/* Наименование */}
                                <TableCell>
                                  <Typography variant="body2" sx={{ color: '#374151' }}>
                                    {work.name}
                                  </Typography>
                                </TableCell>
                                
                                {/* Ед. изм. */}
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                                    {work.unit}
                                  </Typography>
                                </TableCell>
                                
                                {/* ═══ ПЛАН (ЗАКАЗЧИК) ═══ */}
                                <TableCell 
                                  align="right"
                                  sx={{ borderLeft: `2px solid ${colors.border}` }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                                    {work.planQuantity.toLocaleString('ru-RU', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 3
                                    })}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ color: '#374151' }}>
                                    {formatCurrency(work.clientPrice)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937' }}>
                                    {formatCurrency(work.planTotal)}
                                  </Typography>
                                </TableCell>
                                
                                {/* ═══ ФАКТ (СПЕЦИАЛИСТ) ═══ */}
                                <TableCell 
                                  align="right"
                                  sx={{ borderLeft: `2px solid ${colors.green}` }}
                                >
                                  <Typography 
                                    variant="body2" 
                                    sx={{ fontWeight: 500, color: colors.green }}
                                  >
                                    {formatCurrency(work.basePrice)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ p: 0.5 }}>
                                  <TextField
                                    type="number"
                                    value={work.actualQuantity || ''}
                                    onChange={(e) => handleActualQuantityChange(sectionIndex, workIndex, e.target.value)}
                                    size="small"
                                    inputProps={{ 
                                      min: 0,
                                      step: 0.01,
                                      style: { 
                                        textAlign: 'right', 
                                        fontSize: '0.875rem', 
                                        padding: '6px 8px',
                                        color: colors.green
                                      }
                                    }}
                                    sx={{
                                      width: '90px',
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
                                </TableCell>
                                <TableCell align="right">
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 700,
                                      color: colors.green,
                                      bgcolor: work.actualTotal > 0 ? colors.greenLight : 'transparent',
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: '6px',
                                      display: 'inline-block'
                                    }}
                                  >
                                    {formatCurrency(work.actualTotal)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    {/* ═══ Итого по разделу ═══ */}
                    <Box 
                      sx={{ 
                        px: 2.5, 
                        py: 2, 
                        bgcolor: colors.totalBg,
                        borderTop: `1px solid ${colors.border}`
                      }}
                    >
                      <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        justifyContent="space-between" 
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={2}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                          Итого по разделу «{sectionData.section}»
                        </Typography>
                        <Stack direction="row" spacing={4} alignItems="center">
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                              План
                            </Typography>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ fontWeight: 700, color: '#1F2937' }}
                            >
                              {formatCurrency(sectionData.sectionPlanTotal)}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                              Факт
                            </Typography>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ fontWeight: 700, color: colors.green }}
                            >
                              {formatCurrency(sectionData.sectionActualTotal)}
                            </Typography>
                          </Box>
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
          <Paper 
            sx={{ 
              p: 3, 
              mt: 4,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              bgcolor: colors.summaryBg,
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
                <IconClipboardCheck size={20} color={colors.primary} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1F2937' }}>
                Итоги выполнения
              </Typography>
            </Stack>
            
            {/* Итоги по разделам */}
            <Box 
              sx={{ 
                bgcolor: '#fff', 
                borderRadius: '10px', 
                p: 2,
                border: `1px solid ${colors.border}`,
                mb: 2
              }}
            >
              <Stack spacing={1.5}>
                {specialistData.map((section, index) => (
                  <Stack 
                    key={index} 
                    direction="row" 
                    justifyContent="space-between" 
                    alignItems="center"
                    sx={{ 
                      py: 1,
                      borderBottom: index < specialistData.length - 1 ? `1px dashed ${colors.border}` : 'none'
                    }}
                  >
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                      Раздел: {section.section}
                    </Typography>
                    <Stack direction="row" spacing={3}>
                      <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          План
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#374151' }}>
                          {formatCurrency(section.sectionPlanTotal)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          Факт
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: colors.green }}>
                          {formatCurrency(section.sectionActualTotal)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Box>
            
            {/* Общий итог */}
            <Box 
              sx={{ 
                bgcolor: '#fff',
                borderRadius: '10px', 
                p: 2,
                border: `2px solid ${colors.primary}`
              }}
            >
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                justifyContent="space-between" 
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1F2937' }}>
                  ИТОГО ПО СМЕТЕ
                </Typography>
                <Stack direction="row" spacing={4}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      План (клиент)
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ fontWeight: 700, color: colors.textPrimary }}
                    >
                      {formatCurrency(totalPlanAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Факт (базовые)
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ fontWeight: 700, color: colors.green }}
                    >
                      {formatCurrency(totalActualAmount)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>
            
            {/* Экономия / Перерасход */}
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: difference >= 0 ? colors.greenLight : colors.errorLight, 
                borderRadius: '10px',
                border: `1px solid ${difference >= 0 ? colors.green : colors.error}`
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={1}>
                  {difference >= 0 ? (
                    <IconTrendingUp size={20} color={colors.green} />
                  ) : (
                    <IconTrendingDown size={20} color={colors.error} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600, color: difference >= 0 ? colors.greenDark : colors.error }}>
                    {difference >= 0 ? 'Экономия (прибыль)' : 'Перерасход'}
                  </Typography>
                </Stack>
                <Typography 
                  variant="h6" 
                  sx={{ fontWeight: 700, color: difference >= 0 ? colors.green : colors.error }}
                >
                  {formatCurrency(Math.abs(difference))}
                </Typography>
              </Stack>
            </Box>
            
            {/* Процент выполнения */}
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: colors.primaryLight, 
                borderRadius: '10px',
                border: `1px solid ${colors.primary}`
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 600, color: colors.primary }}>
                  Процент выполнения работ
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: colors.primary }}>
                  {totalPlanAmount > 0 ? ((totalActualAmount / totalPlanAmount) * 100).toFixed(1) : 0}%
                </Typography>
              </Stack>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

SpecialistEstimate.propTypes = {
  estimateId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired
};

export default SpecialistEstimate;
