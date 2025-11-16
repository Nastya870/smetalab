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
  Checkbox,
  TextField
} from '@mui/material';
import { IconFileInvoice, IconDeviceFloppy, IconRefresh, IconDownload, IconCheck } from '@tabler/icons-react';

// API
import estimatesAPI from 'api/estimates';
import worksAPI from 'api/works';
import { projectsAPI } from 'api/projects';

// ==============================|| SPECIALIST ESTIMATE (ВЫПОЛНЕНИЕ) ||============================== //

const SpecialistEstimate = ({ estimateId, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [specialistData, setSpecialistData] = useState([]);
  const [estimateGenerated, setEstimateGenerated] = useState(false);
  const [estimateMetadata, setEstimateMetadata] = useState(null);
  const [saveTimeout, setSaveTimeout] = useState(null);

  // Итоги: План vs Факт
  const totalPlanAmount = specialistData.reduce((sum, section) => 
    sum + section.works.reduce((workSum, work) => workSum + work.planTotal, 0), 0
  );
  const totalActualAmount = specialistData.reduce((sum, section) => 
    sum + section.works.reduce((workSum, work) => workSum + work.actualTotal, 0), 0
  );
  const difference = totalPlanAmount - totalActualAmount; // Экономия или перерасход

  // Функция для сохранения изменений в БД (с debounce)
  const saveWorkCompletions = async (data) => {try {
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
        await estimatesAPI.batchSaveWorkCompletions(estimateId, completions);// Автоматически рассчитываем прогресс проекта после сохранения
        if (projectId) {
          try {const progressData = await projectsAPI.calculateProgress(projectId);} catch (progressError) {
            console.error('⚠️ Error calculating progress:', progressError);
            // Не показываем ошибку пользователю, это второстепенная операция
          }
        } else {}
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
            });}
        } catch (err) {}
        
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
            .map(item => item.work_id);// Загружаем базовые цены работ из справочника
          const basePricesMap = new Map();
          
          if (workIds.length > 0) {
            try {
              // Загружаем работы пакетом
              const worksResponse = await worksAPI.getAll({ pageSize: 10000 });
              const works = worksResponse.data || worksResponse;
              
              // Создаем Map для быстрого поиска
              works.forEach(work => {
                basePricesMap.set(work.id.toString(), work.base_price || 0);
              });} catch (err) {}
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
            const clientPrice = item.unit_price;// Получаем сохраненные данные о выполнении для этой работы
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
          });}
      } catch (err) {}
      
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
          .map(item => item.work_id);// Загружаем базовые цены работ из справочника
        const basePricesMap = new Map();
        
        if (workIds.length > 0) {
          try {
            // Загружаем работы пакетом
            const worksResponse = await worksAPI.getAll({ pageSize: 10000 });
            const works = worksResponse.data || worksResponse;
            
            // Создаем Map для быстрого поиска
            works.forEach(work => {
              basePricesMap.set(work.id.toString(), work.base_price || 0);
            });} catch (err) {}
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
      {/* Шапка */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={500}>
            Выполнение (Заказчик vs Специалист)
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Индикатор автосохранения */}
          {saving && (
            <Chip
              icon={<CircularProgress size={16} />}
              label="Сохранение..."
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          
          {estimateGenerated && (
            <Button
              variant="outlined"
              startIcon={<IconRefresh />}
              onClick={handleRefreshEstimate}
              disabled={loading}
            >
              Обновить смету
            </Button>
          )}
          
          {!estimateGenerated && (
            <Button
              variant="contained"
              startIcon={<IconDeviceFloppy />}
              onClick={handleGenerateEstimate}
              disabled={loading || !estimateId}
            >
              Сформировать смету
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Индикатор загрузки */}
      {loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Формирование сметы...
          </Typography>
        </Paper>
      )}

      {/* Ошибка */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !estimateGenerated ? (
        // Заглушка до формирования сметы
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <IconFileInvoice size={64} style={{ opacity: 0.2 }} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Выполнение еще не сформировано
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Нажмите кнопку "Сформировать смету" для создания сметы с базовыми ценами
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy />}
            onClick={handleGenerateEstimate}
            disabled={loading || !estimateId}
          >
            Сформировать смету
          </Button>
        </Paper>
      ) : (
        // Сформированная смета
        <>
          {/* Информация о смете */}
          {estimateMetadata && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter' }}>
              <Stack direction="row" spacing={4} alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Название
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {estimateMetadata.name}
                  </Typography>
                </Box>
                {estimateMetadata.estimateNumber && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Номер
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {estimateMetadata.estimateNumber}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Дата
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatDate(estimateMetadata.estimateDate)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}

          {specialistData.map((sectionData, sectionIndex) => (
            <Paper key={sectionIndex} sx={{ mb: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              {/* Заголовок раздела */}
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'secondary.lighter', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600} color="secondary.dark">
                    Раздел: {sectionData.section}
                  </Typography>
                  <Chip
                    label={`${sectionData.works.length} работ`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Stack>
              </Box>

              {/* Таблица работ */}
              <Table size="small">
                <TableHead>
                  {/* Первый уровень - секции */}
                  <TableRow>
                    {/* Чекбокс выполнения */}
                    <TableCell align="center" rowSpan={2} sx={{ width: 60, fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      <IconCheck size={18} />
                    </TableCell>
                    
                    {/* ⭐ НОВАЯ колонка "В акте" - ВТОРОЕ МЕСТО */}
                    <TableCell 
                      align="center" 
                      rowSpan={2}
                      sx={{ 
                        width: 90,
                        fontWeight: 600, 
                        bgcolor: 'action.hover',
                        borderRight: '2px solid',
                        borderColor: 'divider'
                      }}
                    >
                      В акте
                    </TableCell>
                    
                    <TableCell rowSpan={2} sx={{ width: 80, fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Код
                    </TableCell>
                    <TableCell rowSpan={2} sx={{ fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Наименование работы
                    </TableCell>
                    <TableCell rowSpan={2} align="center" sx={{ width: 80, fontWeight: 600, borderRight: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Ед. изм.
                    </TableCell>
                    
                    {/* Секция "Заказчик" */}
                    <TableCell 
                      align="center" 
                      colSpan={3} 
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.95rem',
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        borderRight: '3px solid',
                        borderColor: 'divider'
                      }}
                    >
                      Заказчик
                    </TableCell>
                    
                    {/* Секция "Специалист" */}
                    <TableCell 
                      align="center" 
                      colSpan={3}
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.95rem',
                        bgcolor: 'action.hover',
                        color: 'text.primary'
                      }}
                    >
                      Специалист
                    </TableCell>
                  </TableRow>
                  
                  {/* Второй уровень - колонки */}
                  <TableRow>
                    {/* Заказчик */}
                    <TableCell align="right" sx={{ width: 100, fontWeight: 600, bgcolor: 'action.hover' }}>Кол-во</TableCell>
                    <TableCell align="right" sx={{ width: 120, fontWeight: 600, bgcolor: 'action.hover' }}>Цена</TableCell>
                    <TableCell align="right" sx={{ width: 120, fontWeight: 600, borderRight: '3px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      Сумма
                    </TableCell>
                    
                    {/* Специалист */}
                    <TableCell align="right" sx={{ width: 120, fontWeight: 600, bgcolor: 'action.hover' }}>Баз.цена</TableCell>
                    <TableCell align="right" sx={{ width: 120, fontWeight: 600, bgcolor: 'action.hover' }}>Факт. Кол-во</TableCell>
                    <TableCell align="right" sx={{ width: 140, fontWeight: 600, borderRight: '3px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>Сумма</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sectionData.works.map((work, workIndex) => (
                    <TableRow
                      key={work.id || workIndex}
                      sx={{
                        bgcolor: work.completed ? 'success.lighter' : 'transparent',
                        '&:hover': { bgcolor: work.completed ? 'success.light' : 'action.hover' },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {/* Чекбокс выполнения */}
                      <TableCell align="center" sx={{ borderRight: '2px solid', borderColor: 'divider' }}>
                        <Checkbox
                          checked={work.completed}
                          onChange={(e) => handleCompletedChange(sectionIndex, workIndex, e.target.checked)}
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      
                      {/* ⭐ КОЛОНКА "В акте" - ВТОРОЕ МЕСТО */}
                      <TableCell align="center" sx={{ bgcolor: work.actNumber ? 'info.lighter' : 'transparent', borderRight: '2px solid', borderColor: 'divider' }}>
                        {work.actNumber ? (
                          <Typography variant="caption" fontWeight={600} color="info.dark">
                            {work.actNumber}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      
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
                      
                      {/* СЕКЦИЯ ЗАКАЗЧИК */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {work.planQuantity.toLocaleString('ru-RU', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 3
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(work.clientPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ borderRight: '3px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" fontWeight={600} color="secondary.dark">
                          {formatCurrency(work.planTotal)}
                        </Typography>
                      </TableCell>
                      
                      {/* СЕКЦИЯ СПЕЦИАЛИСТ */}
                      <TableCell align="right">
                        <Typography variant="body2" color="success.dark" fontWeight={500}>
                          {formatCurrency(work.basePrice)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ p: 0.25 }}>
                        <TextField
                          type="number"
                          value={work.actualQuantity || ''}
                          onChange={(e) => handleActualQuantityChange(sectionIndex, workIndex, e.target.value)}
                          size="small"
                          inputProps={{ 
                            min: 0,
                            step: 0.01,
                            style: { textAlign: 'right', fontSize: '0.875rem', padding: '4px 8px' }
                          }}
                          sx={{
                            width: '100px',
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'background.paper'
                            },
                            '& .MuiOutlinedInput-input': {
                              padding: '4px 8px'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          color={work.completed ? 'success.dark' : 'text.primary'}
                          sx={{
                            bgcolor: work.completed ? 'success.lighter' : 'transparent',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block'
                          }}
                        >
                          {formatCurrency(work.actualTotal)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Итого по разделу */}
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'warning.lighter', borderTop: '2px solid', borderColor: 'warning.main' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={600}>
                    Итого по разделу "{sectionData.section}"
                  </Typography>
                  <Stack direction="row" spacing={4} alignItems="center">
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        План
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="warning.dark">
                        {formatCurrency(sectionData.sectionPlanTotal)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Факт
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="success.dark">
                        {formatCurrency(sectionData.sectionActualTotal)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            </Paper>
          ))}

          {/* Общие итоги */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Итоговая информация по смете специалиста
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Stack spacing={1.5}>
              {specialistData.map((section, index) => {
                return (
                  <Stack key={index} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Раздел: {section.section}
                    </Typography>
                    <Stack direction="row" spacing={3}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">
                          План
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {formatCurrency(section.sectionPlanTotal)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">
                          Факт
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="success.dark">
                          {formatCurrency(section.sectionActualTotal)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                );
              })}
              
              <Divider sx={{ my: 1.5 }} />
              
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  ИТОГО ПО СМЕТЕ
                </Typography>
                <Stack direction="row" spacing={4}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      План (клиент)
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="secondary">
                      {formatCurrency(totalPlanAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Факт (базовые цены)
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="success.dark">
                      {formatCurrency(totalActualAmount)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
              
              {/* Экономия/Перерасход */}
              <Box sx={{ mt: 2, p: 2, bgcolor: difference >= 0 ? 'success.lighter' : 'error.lighter', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={600}>
                    {difference >= 0 ? 'Экономия (прибыль)' : 'Перерасход'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color={difference >= 0 ? 'success.dark' : 'error.dark'}>
                    {formatCurrency(Math.abs(difference))}
                  </Typography>
                </Stack>
              </Box>
              
              {/* Процент выполнения */}
              <Box sx={{ mt: 1, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={600}>
                    Процент выполнения работ
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="info.dark">
                    {totalPlanAmount > 0 ? ((totalActualAmount / totalPlanAmount) * 100).toFixed(1) : 0}%
                  </Typography>
                </Stack>
              </Box>
            </Stack>
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
