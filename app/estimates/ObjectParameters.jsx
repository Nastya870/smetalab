import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';

// API
import objectParametersAPI from 'api/objectParametersAPI';

// ==============================|| OBJECT PARAMETERS ||============================== //

const ObjectParameters = forwardRef(({ estimateId, onUnsavedChanges }, ref) => {
  // Loading и error состояния
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Ref для отслеживания сохраненного состояния
  const savedRowsRef = useRef(null);
  // Колонки - простые поля
  const simpleColumns = [
    { id: 'room', label: 'Помещение', type: 'text', unit: '' },
    { id: 'perimeter', label: 'Периметр', type: 'number', unit: 'м' },
    { id: 'height', label: 'Высота', type: 'number', unit: 'м' },
    { id: 'floorArea', label: 'S пола', type: 'number', unit: 'м²' },
    { id: 'wallArea', label: 'S стен', type: 'number', unit: 'м²' },
    { id: 'windows', label: 'Откосы', type: 'number', unit: 'м' },
    { id: 'ceilingArea', label: 'S потолка', type: 'number', unit: 'м²' },
    { id: 'ceilingSlopes', label: 'Откосы пот.', type: 'number', unit: 'м' },
    { id: 'doorsCount', label: 'Двери', type: 'number', unit: 'шт' },
    { id: 'baseboards', label: 'Простенки', type: 'number', unit: 'м' }
  ];

  // Колонки с размерами (высота x ширина)
  const dimensionColumns = [
    { id: 'window1', label: 'Окно 1' },
    { id: 'window2', label: 'Окно 2' },
    { id: 'window3', label: 'Окно 3' },
    { id: 'portal1', label: 'Портал 1' },
    { id: 'portal2', label: 'Портал 2' }
  ];

  // Начальные данные
  const initialRows = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    room: '',
    perimeter: '',
    height: '',
    floorArea: '',
    wallArea: '',
    windows: '',
    ceilingArea: '',
    ceilingSlopes: '',
    doorsCount: '',
    baseboards: '',
    window1H: '',
    window1W: '',
    window2H: '',
    window2W: '',
    window3H: '',
    window3W: '',
    portal1H: '',
    portal1W: '',
    portal2H: '',
    portal2W: ''
  }));

  const [rows, setRows] = useState(initialRows);
  
  // Убираем состояние editingCell - оно вызывает проблемы с перерендером
  // Вместо этого будем сохранять оригинальное значение в ref
  const originalValueRef = useRef(null);

  // ==================== HELPER ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАПЯТОЙ ====================
  
  /**
   * Преобразует строку с запятой в число
   * "2,5" → 2.5
   * "2.5" → 2.5
   */
  const parseCommaFloat = (value) => {
    if (!value || value === '') return null;
    // Заменяем запятую на точку для parseFloat
    const normalized = String(value).replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  };

  /**
   * Форматирует число с запятой для отображения
   * 2.5 → "2,5"
   * null → ""
   */
  const formatCommaFloat = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseCommaFloat(value) : value;
    if (num === null || isNaN(num)) return '';
    return num.toFixed(decimals).replace('.', ',');
  };

  /**
   * Обработчик ввода - заменяет точку на запятую
   */
  const normalizeInput = (value) => {
    if (!value) return value;
    return String(value).replace('.', ',');
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    if (estimateId) {
      loadParameters();
    }
  }, [estimateId]);

  // ✅ Отслеживание изменений для защиты от потери данных
  useEffect(() => {
    // Игнорируем первый рендер (когда savedRowsRef еще не установлен)
    if (savedRowsRef.current === null) {
      return;
    }

    // Сравниваем текущее состояние с сохраненным
    const currentData = JSON.stringify(rows);
    const hasChanges = currentData !== savedRowsRef.current;
    
    // Уведомляем родительский компонент
    if (onUnsavedChanges) {
      onUnsavedChanges(hasChanges);
    }
  }, [rows, onUnsavedChanges]);

  // ✅ Экспортируем метод save для родительского компонента
  useImperativeHandle(ref, () => ({
    save: handleSave
  }));

  // Функция загрузки параметров из API
  const loadParameters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await objectParametersAPI.getByEstimateId(estimateId);
      
      if (data && data.length > 0) {
        // Преобразуем данные из API формата в формат компонента
        const loadedRows = data.map((param, index) => {
          const row = {
            id: index + 1,
            room: param.room_name || '',
            perimeter: param.perimeter || '',
            height: param.height || '',
            floorArea: param.floor_area || '',
            wallArea: param.wall_area || '',
            windows: param.total_window_slopes || '',
            ceilingArea: param.ceiling_area || '',
            ceilingSlopes: param.ceiling_slopes || '',
            doorsCount: param.doors_count || '',
            baseboards: param.baseboards || '',
            window1H: '',
            window1W: '',
            window2H: '',
            window2W: '',
            window3H: '',
            window3W: '',
            portal1H: '',
            portal1W: '',
            portal2H: '',
            portal2W: ''
          };

          // Загружаем проемы
          if (param.openings && Array.isArray(param.openings)) {
            const windows = param.openings.filter(o => o.type === 'window');
            const portals = param.openings.filter(o => o.type === 'portal');

            windows.forEach((win, idx) => {
              if (idx < 3) {
                row[`window${idx + 1}H`] = win.height || '';
                row[`window${idx + 1}W`] = win.width || '';
              }
            });

            portals.forEach((portal, idx) => {
              if (idx < 2) {
                row[`portal${idx + 1}H`] = portal.height || '';
                row[`portal${idx + 1}W`] = portal.width || '';
              }
            });
          }

          return row;
        });

        setRows(loadedRows);
        // ✅ Сохраняем начальное состояние
        savedRowsRef.current = JSON.stringify(loadedRows);
      } else {
        // ✅ Если данных нет, сохраняем пустое состояние
        savedRowsRef.current = JSON.stringify(initialRows);
      }
    } catch (err) {
      console.error('Error loading parameters:', err);
      setError('Не удалось загрузить параметры объекта');
    } finally {
      setLoading(false);
    }
  };

  // Функция преобразования данных для сохранения в API
  const prepareDataForSave = () => {
    // ✅ ИСПРАВЛЕНИЕ: Используем calculatedRows вместо rows, чтобы получить рассчитанные значения wallArea и windows
    const prepared = calculatedRows.filter(row => row.room.trim() !== '').map(row => {
      const openings = [];

      // Безопасное преобразование чисел с округлением до 2 знаков
      const toFloat = (val) => {
        if (!val || val === '') return null;
        const num = parseCommaFloat(val);
        if (num === null) return null;
        // Округляем до 2 знаков для точного сохранения в DECIMAL(10,2)
        return Math.round(num * 100) / 100;
      };

      // Собираем окна
      for (let i = 1; i <= 3; i++) {
        const height = row[`window${i}H`];
        const width = row[`window${i}W`];
        if (height && width) {
          const h = toFloat(height);
          const w = toFloat(width);
          if (h !== null && w !== null && h > 0 && w > 0) {
            openings.push({
              type: 'window',
              position: i,
              height: h,
              width: w
            });
          }
        }
      }

      // Собираем порталы
      for (let i = 1; i <= 2; i++) {
        const height = row[`portal${i}H`];
        const width = row[`portal${i}W`];
        if (height && width) {
          const h = toFloat(height);
          const w = toFloat(width);
          if (h !== null && w !== null && h > 0 && w > 0) {
            openings.push({
              type: 'portal',
              position: i,
              height: h,
              width: w
            });
          }
        }
      }

      const toInt = (val) => {
        if (!val || val === '') return 0;
        // Для целых чисел тоже поддерживаем запятую (на случай "1,0")
        const normalized = String(val).replace(',', '.');
        const num = parseInt(normalized);
        return isNaN(num) ? 0 : num;
      };

      return {
        roomName: row.room || '',
        perimeter: toFloat(row.perimeter),
        height: toFloat(row.height),
        floorArea: toFloat(row.floorArea),
        wallArea: toFloat(row.wallArea),
        totalWindowSlopes: toFloat(row.windows), // ✅ Откосы - автоматически рассчитанное поле
        ceilingArea: toFloat(row.ceilingArea),
        ceilingSlopes: toFloat(row.ceilingSlopes),
        doorsCount: toInt(row.doorsCount),
        baseboards: toFloat(row.baseboards),
        openings
      };
    });
    
    return prepared;
  };

  // Функция безопасного вычисления математических выражений (поддержка запятой)
  const calculateExpression = (expression) => {
    if (!expression || typeof expression !== 'string') return expression;
    
    // Проверяем, содержит ли строка математические операторы
    if (!/[+\-*/]/.test(expression)) return expression;
    
    try {
      // Заменяем запятые на точки для вычисления
      const normalized = expression.replace(/,/g, '.');
      
      // Очищаем выражение от недопустимых символов (только цифры, точка, операторы, скобки, пробелы)
      const sanitized = normalized.replace(/[^\d+\-*/.() ]/g, '');
      
      // Вычисляем результат через Function (безопаснее eval)
      const result = new Function('return ' + sanitized)();
      
      // Проверяем, что результат - число
      if (typeof result === 'number' && !isNaN(result)) {
        // Возвращаем с запятой
        return result.toString().replace('.', ',');
      }
    } catch (error) {
      // Если ошибка вычисления, возвращаем исходное значение
    }
    
    return expression;
  };

  const handleCellChange = (rowId, columnId, value) => {
    // Просто сохраняем значение как есть (для ввода выражения)
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row))
    );
  };

  // Обработчик фокуса - сохраняем оригинальное значение и выделяем весь текст
  const handleCellFocus = (rowId, columnId, currentValue, event) => {
    // Сохраняем оригинальное значение в ref для возможности отмены по ESC
    originalValueRef.current = {
      rowId,
      columnId,
      value: currentValue
    };
    
    // Выделяем весь текст в поле для удобства замены
    if (event && event.target) {
      // Используем requestAnimationFrame для гарантированного выполнения после рендера
      requestAnimationFrame(() => {
        event.target.select();
      });
    }
  };

  // Обработчик нажатия клавиш
  const handleCellKeyDown = (rowId, columnId, event, isAutoCalculated = false) => {
    if (isAutoCalculated) return;
    
    if (event.key === 'Enter') {
      event.preventDefault();
      event.target.blur(); // Применяем изменения через onBlur
    } else if (event.key === 'Escape') {
      event.preventDefault();
      // Возвращаем оригинальное значение
      if (originalValueRef.current && 
          originalValueRef.current.rowId === rowId && 
          originalValueRef.current.columnId === columnId) {
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === rowId ? { ...row, [columnId]: originalValueRef.current.value } : row
          )
        );
        originalValueRef.current = null;
      }
      event.target.blur(); // Снимаем фокус
    }
  };

  // Обработка при потере фокуса - форматируем и сохраняем
  const handleCellBlur = (rowId, columnId, value) => {
    const column = simpleColumns.find(col => col.id === columnId);
    
    // Для числовых полей вычисляем математическое выражение и форматируем
    if (column?.type === 'number') {
      const calculatedValue = calculateExpression(value);
      const formattedValue = calculatedValue !== '' && parseCommaFloat(calculatedValue) !== null
        ? formatCommaFloat(parseCommaFloat(calculatedValue), 2)
        : calculatedValue;
      
      // Обновляем значение
      setRows((prevRows) =>
        prevRows.map((row) => (row.id === rowId ? { ...row, [columnId]: formattedValue } : row))
      );
    }
    
    // Очищаем ref
    originalValueRef.current = null;
  };

  // Обработка для размерных полей (окна/порталы)
  const handleDimensionBlur = (rowId, columnId, value) => {
    const calculatedValue = calculateExpression(value);
    const formattedValue = calculatedValue !== '' && parseCommaFloat(calculatedValue) !== null
      ? formatCommaFloat(parseCommaFloat(calculatedValue), 2)
      : calculatedValue;
    
    // Обновляем значение
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === rowId ? { ...row, [columnId]: formattedValue } : row))
    );
    
    // Очищаем ref
    originalValueRef.current = null;
  };

  // Функция для получения числового значения из строки
  const getNumValue = (value) => parseCommaFloat(value) || 0;

  // Автоматический расчёт полей по формулам
  const calculateAutoFields = (row) => {
    // 1. S стен = Периметр * Высоту - (Окно1 ш*в) - (Окно2 ш*в) - (Окно3 ш*в) - (Портал1 ш*в) - (Портал2 ш*в)
    const perimeter = getNumValue(row.perimeter);
    const height = getNumValue(row.height);
    const window1Area = getNumValue(row.window1H) * getNumValue(row.window1W);
    const window2Area = getNumValue(row.window2H) * getNumValue(row.window2W);
    const window3Area = getNumValue(row.window3H) * getNumValue(row.window3W);
    const portal1Area = getNumValue(row.portal1H) * getNumValue(row.portal1W);
    const portal2Area = getNumValue(row.portal2H) * getNumValue(row.portal2W);
    
    const wallArea = perimeter * height - window1Area - window2Area - window3Area - portal1Area - portal2Area;
    
    // 2. Откосы = Простенки + (Окно1_ш + Окно1_в*2) + (Окно2_ш + Окно2_в*2) + (Окно3_ш + Окно3_в*2)
    const baseboards = getNumValue(row.baseboards);
    const window1Slopes = getNumValue(row.window1W) + (getNumValue(row.window1H) * 2);
    const window2Slopes = getNumValue(row.window2W) + (getNumValue(row.window2H) * 2);
    const window3Slopes = getNumValue(row.window3W) + (getNumValue(row.window3H) * 2);
    
    const windowsSlopes = baseboards + window1Slopes + window2Slopes + window3Slopes;
    
    return {
      ...row,
      // ✅ ВСЕГДА сохраняем рассчитанные значения (даже если 0)
      wallArea: (perimeter > 0 && height > 0) ? formatCommaFloat(wallArea, 2) : formatCommaFloat(0, 2),
      windows: formatCommaFloat(windowsSlopes, 2)
    };
  };

  // Применяем автоматический расчёт к строкам
  const calculatedRows = useMemo(() => {
    return rows.map(calculateAutoFields);
  }, [rows]);

  // Вычисление итогов по помещениям (для каждой строки отдельно)
  const calculateRoomTotals = (row) => {
    return {
      floorArea: parseCommaFloat(row.floorArea) || 0,
      wallArea: parseCommaFloat(row.wallArea) || 0,
      windows: parseCommaFloat(row.windows) || 0,
      ceilingArea: parseCommaFloat(row.ceilingArea) || 0,
      ceilingSlopes: parseCommaFloat(row.ceilingSlopes) || 0
    };
  };

  // Общие итоги (сумма всех помещений)
  const totals = useMemo(() => {
    return {
      floorArea: calculatedRows.reduce((sum, row) => sum + (parseCommaFloat(row.floorArea) || 0), 0),
      wallArea: calculatedRows.reduce((sum, row) => sum + (parseCommaFloat(row.wallArea) || 0), 0),
      windows: calculatedRows.reduce((sum, row) => sum + (parseCommaFloat(row.windows) || 0), 0),
      ceilingArea: calculatedRows.reduce((sum, row) => sum + (parseCommaFloat(row.ceilingArea) || 0), 0),
      ceilingSlopes: calculatedRows.reduce((sum, row) => sum + (parseCommaFloat(row.ceilingSlopes) || 0), 0)
    };
  }, [calculatedRows]);

  const handleAddRow = () => {
    // Optimistic UI: мгновенное добавление строки
    const newRow = {
      id: rows.length + 1,
      room: '',
      perimeter: '',
      height: '',
      floorArea: '',
      wallArea: '',
      windows: '',
      ceilingArea: '',
      ceilingSlopes: '',
      doorsCount: '',
      baseboards: '',
      window1: '',
      window2: '',
      window3: '',
      portal1: '',
      portal2: ''
    };
    setRows([...rows, newRow]);
    
    // Визуальный feedback
    setSuccessMessage('Строка добавлена (не забудьте сохранить)');
  };

  const handleDeleteRow = (rowId) => {
    if (rows.length > 1) {
      // Optimistic UI: мгновенное удаление
      setRows(rows.filter((row) => row.id !== rowId));
      
      // Показываем feedback
      setSuccessMessage('Строка удалена (не забудьте сохранить)');
    }
  };

  const handleSave = async () => {
    // Optimistic UI: мгновенная визуальная обратная связь
    setSaving(true);
    setError(null);
    
    const parametersToSave = prepareDataForSave();
    
    if (parametersToSave.length === 0) {
      setError('Нет данных для сохранения. Заполните хотя бы одно помещение.');
      setSaving(false);
      return;
    }

    // Показываем мгновенное уведомление "Сохраняется..."
    setSuccessMessage('Сохранение параметров...');

    try {
      // Фоновое сохранение на сервер
      const result = await objectParametersAPI.saveAll(estimateId, parametersToSave);
      
      // Обновляем сообщение на "Успешно"
      setSuccessMessage(`✅ Сохранено ${result.parameters?.length || parametersToSave.length} помещений`);
      
      // Перезагружаем данные для получения вычисленных значений откосов
      await loadParameters();
      
      // ✅ Обновляем сохраненное состояние (данные уже загружены в loadParameters)
      // savedRowsRef.current обновится автоматически в loadParameters
      
      // ✅ Уведомляем родителя что изменений больше нет
      if (onUnsavedChanges) {
        onUnsavedChanges(false);
      }
      
    } catch (err) {
      console.error('❌ Error saving parameters:', err);
      
      // Graceful error handling
      setError(err.response?.data?.error || 'Не удалось сохранить параметры объекта');
      setSuccessMessage(''); // Убираем "Сохраняется..."
      
    } finally {
      setSaving(false);
    }
  };

  // Если идет загрузка
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Заголовок и кнопки */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={500}>
            Параметры объекта
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Заполните размеры помещений для расчета объемов работ
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<IconPlus />} onClick={handleAddRow} disabled={saving} size="small">
            Добавить помещение
          </Button>
          <Button 
            variant="contained" 
            startIcon={saving ? <CircularProgress size={20} /> : <IconDeviceFloppy />} 
            onClick={handleSave}
            disabled={saving}
            size="small"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </Stack>
      </Stack>

      {/* Сообщения об ошибках и успехе */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={saving ? null : 3000} 
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={saving ? 'info' : (successMessage.includes('✅') ? 'success' : 'info')} 
          onClose={() => setSuccessMessage('')}
          sx={{
            minWidth: 300,
            animation: saving ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.7 }
            }
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Таблица */}
      <Paper sx={{ overflow: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell 
                sx={{ 
                  width: 40, 
                  py: 1.5,
                  borderRight: '1px dashed',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                  №
                </Typography>
              </TableCell>
              {simpleColumns.map((col) => (
                <TableCell 
                  key={col.id} 
                  sx={{ 
                    minWidth: col.id === 'room' ? 140 : 70,
                    py: 1.5,
                    px: 1,
                    borderRight: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem" noWrap>
                    {col.label}
                  </Typography>
                  {col.unit && (
                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                      ({col.unit})
                    </Typography>
                  )}
                </TableCell>
              ))}
              {dimensionColumns.map((col) => (
                <TableCell 
                  key={col.id} 
                  align="center" 
                  colSpan={2} 
                  sx={{ 
                    minWidth: 100, 
                    py: 1.5, 
                    px: 1,
                    borderRight: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem" noWrap>
                    {col.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                    В×Ш (м)
                  </Typography>
                </TableCell>
              ))}
              <TableCell sx={{ width: 60, py: 1.5, borderRight: 'none' }}>
                <IconTrash size={16} />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {calculatedRows.map((row, index) => (
              <TableRow 
                key={row.id} 
                sx={{ 
                  '&:hover': { bgcolor: 'action.hover' },
                  borderBottom: '1px dashed',
                  borderColor: 'divider'
                }}
              >
                <TableCell 
                  sx={{ 
                    py: 0.5,
                    borderRight: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="body2" color="text.secondary" fontSize="0.8rem" fontWeight={500}>
                    {index + 1}
                  </Typography>
                </TableCell>

                {/* Простые поля */}
                {simpleColumns.map((col) => {
                  // Поля, которые вычисляются автоматически
                  const isAutoCalculated = col.id === 'wallArea' || col.id === 'windows';
                  
                  // Всегда показываем текущее значение из row (без форматирования в value)
                  // Форматирование применяется только при потере фокуса
                  const cellValue = row[col.id];
                  
                  return (
                    <TableCell 
                      key={col.id} 
                      sx={{ 
                        py: 0.5, 
                        px: 0.5,
                        borderRight: '1px dashed',
                        borderColor: 'divider'
                      }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        type={col.type === 'number' ? 'text' : col.type}
                        value={cellValue}
                        onChange={!isAutoCalculated ? (e) => handleCellChange(row.id, col.id, e.target.value) : undefined}
                        onFocus={!isAutoCalculated ? (e) => handleCellFocus(row.id, col.id, row[col.id], e) : undefined}
                        onBlur={!isAutoCalculated ? (e) => handleCellBlur(row.id, col.id, e.target.value) : undefined}
                        onKeyDown={!isAutoCalculated ? (e) => handleCellKeyDown(row.id, col.id, e, isAutoCalculated) : undefined}
                        placeholder={col.id === 'room' ? 'Помещение' : '0'}
                        variant="standard"
                        disabled={isAutoCalculated}
                        InputProps={{
                          disableUnderline: true,
                          readOnly: isAutoCalculated
                        }}
                      sx={{
                        '& input': {
                          textAlign: col.type === 'number' ? 'center' : 'left',
                          fontSize: '0.8rem',
                          py: 0.5,
                          px: 0.75,
                          borderRadius: 0.75,
                          bgcolor: isAutoCalculated ? 'action.hover' : 'background.paper',
                          border: '1px solid',
                          borderColor: isAutoCalculated ? 'action.disabled' : 'transparent',
                          transition: 'all 0.2s',
                          cursor: isAutoCalculated ? 'not-allowed' : 'text',
                          color: isAutoCalculated ? 'success.dark' : 'inherit',
                          fontWeight: isAutoCalculated ? 600 : 400,
                          '&:hover': {
                            borderColor: isAutoCalculated ? 'action.disabled' : 'primary.light',
                            bgcolor: isAutoCalculated ? 'action.hover' : 'primary.lighter'
                          },
                          '&:focus': {
                            bgcolor: isAutoCalculated ? 'action.hover' : 'background.paper',
                            borderColor: isAutoCalculated ? 'action.disabled' : 'primary.main',
                            outline: 'none'
                          },
                          // Убираем стрелки для number input
                          '&[type=number]': {
                            MozAppearance: 'textfield'
                          },
                          '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          }
                        }
                      }}
                    />
                  </TableCell>
                );
                })}

                {/* Поля с размерами (В x Ш) */}
                {dimensionColumns.map((col, colIndex) => {
                  // Используем текущие значения напрямую из row
                  const heightValue = row[`${col.id}H`];
                  const widthValue = row[`${col.id}W`];
                  
                  return (
                  <React.Fragment key={col.id}>
                    <TableCell 
                      key={`${col.id}-h`} 
                      sx={{ 
                        py: 0.5, 
                        px: 0.25,
                        borderRight: '1px dashed',
                        borderColor: 'divider'
                      }}
                    >
                      <TextField
                        size="small"
                        type="text"
                        value={heightValue}
                        onChange={(e) => handleCellChange(row.id, `${col.id}H`, e.target.value)}
                        onFocus={(e) => handleCellFocus(row.id, `${col.id}H`, row[`${col.id}H`], e)}
                        onBlur={(e) => handleDimensionBlur(row.id, `${col.id}H`, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(row.id, `${col.id}H`, e)}
                        placeholder="0"
                        variant="standard"
                        InputProps={{
                          disableUnderline: true
                        }}
                        sx={{
                          width: 45,
                          '& input': {
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            py: 0.5,
                            px: 0.5,
                            borderRadius: 0.75,
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.light',
                              bgcolor: 'primary.lighter'
                            },
                            '&:focus': {
                              bgcolor: 'background.paper',
                              borderColor: 'primary.main',
                              outline: 'none'
                            },
                            // Убираем стрелки
                            '&[type=number]': {
                              MozAppearance: 'textfield'
                            },
                            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                              WebkitAppearance: 'none',
                              margin: 0
                            }
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell 
                      key={`${col.id}-w`} 
                      sx={{ 
                        py: 0.5, 
                        px: 0.25,
                        borderRight: colIndex < dimensionColumns.length - 1 ? '1px dashed' : '1px dashed',
                        borderColor: 'divider'
                      }}
                    >
                      <TextField
                        size="small"
                        type="text"
                        value={widthValue}
                        onChange={(e) => handleCellChange(row.id, `${col.id}W`, e.target.value)}
                        onFocus={(e) => handleCellFocus(row.id, `${col.id}W`, row[`${col.id}W`], e)}
                        onBlur={(e) => handleDimensionBlur(row.id, `${col.id}W`, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(row.id, `${col.id}W`, e)}
                        placeholder="0"
                        variant="standard"
                        InputProps={{
                          disableUnderline: true
                        }}
                        sx={{
                          width: 45,
                          '& input': {
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            py: 0.5,
                            px: 0.5,
                            borderRadius: 0.75,
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.light',
                              bgcolor: 'primary.lighter'
                            },
                            '&:focus': {
                              bgcolor: 'background.paper',
                              borderColor: 'primary.main',
                              outline: 'none'
                            },
                            // Убираем стрелки
                            '&[type=number]': {
                              MozAppearance: 'textfield'
                            },
                            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                              WebkitAppearance: 'none',
                              margin: 0
                            }
                          }
                        }}
                      />
                    </TableCell>
                  </React.Fragment>
                  );
                })}

                {/* Кнопка удаления */}
                <TableCell 
                  align="center" 
                  sx={{ 
                    py: 0.5,
                    borderRight: 'none'
                  }}
                >
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteRow(row.id)} 
                    disabled={rows.length === 1} 
                    color="error"
                    sx={{ 
                      p: 0.5,
                      '&:hover': { bgcolor: 'error.lighter' }
                    }}
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Блок итогов */}
      <Paper sx={{ mt: 3, p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
          Итоги по помещениям
        </Typography>
        
        {/* Итоги для каждого помещения */}
        <Stack spacing={2} sx={{ mb: 4 }}>
          {calculatedRows.filter(row => row.room.trim() !== '').map((row, index) => {
            const roomTotals = calculateRoomTotals(row);
            return (
              <Paper 
                key={row.id} 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 1.5 }}>
                  {index + 1}. {row.room || `Помещение ${index + 1}`}
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Площадь пола
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="primary.main">
                      {formatCommaFloat(roomTotals.floorArea, 2)} м²
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Площадь стен
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="success.main">
                      {formatCommaFloat(roomTotals.wallArea, 2)} м²
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Откосы
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="warning.main">
                      {formatCommaFloat(roomTotals.windows, 2)} м
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Площадь потолка
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="info.main">
                      {formatCommaFloat(roomTotals.ceilingArea, 2)} м²
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Откосы потолок
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="secondary.main">
                      {formatCommaFloat(roomTotals.ceilingSlopes, 2)} м
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        {/* Общие итоги */}
        <Box sx={{ pt: 3, borderTop: '2px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
            Общие итоги
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Площадь пола
              </Typography>
              <Typography variant="h5" fontWeight={600} color="primary.main">
                {formatCommaFloat(totals.floorArea, 2)} м²
              </Typography>
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Площадь стен
              </Typography>
              <Typography variant="h5" fontWeight={600} color="success.main">
                {formatCommaFloat(totals.wallArea, 2)} м²
              </Typography>
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Откосы
              </Typography>
              <Typography variant="h5" fontWeight={600} color="warning.main">
                {formatCommaFloat(totals.windows, 2)} м
              </Typography>
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Площадь потолка
              </Typography>
              <Typography variant="h5" fontWeight={600} color="info.main">
                {formatCommaFloat(totals.ceilingArea, 2)} м²
              </Typography>
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Откосы потолок
              </Typography>
              <Typography variant="h5" fontWeight={600} color="secondary.main">
                {formatCommaFloat(totals.ceilingSlopes, 2)} м
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
});

ObjectParameters.displayName = 'ObjectParameters';

ObjectParameters.propTypes = {
  estimateId: PropTypes.string.isRequired,
  onUnsavedChanges: PropTypes.func
};

export default ObjectParameters;
