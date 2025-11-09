import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Virtuoso } from 'react-virtuoso';
import debounce from 'lodash.debounce';

// material-ui
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Grid
} from '@mui/material';
import {
  IconSearch,
  IconPlus,
  IconArrowRight,
  IconPackage,
  IconTrash,
  IconReplace,
  IconEye,
  IconEyeOff,
  IconPercentage,
  IconFileTypeXls
} from '@tabler/icons-react';

// project imports
import { formatCurrency } from '../projects/utils';
import worksAPI from 'api/works';
import workMaterialsAPI from 'api/workMaterials';
import estimatesAPI from 'api/estimates';
import materialsAPI from 'api/materials';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu'; // ✅ Для управления основным сайдбаром
import PriceCoefficientModal from './PriceCoefficientModal';
import ObjectParametersSidebar from './ObjectParametersSidebar';

// ==============================|| ESTIMATE WITH SIDEBAR ||============================== //

const EstimateWithSidebar = forwardRef(({ projectId, estimateId, onUnsavedChanges }, ref) => {
  // State
  const [sidebarVisible, setSidebarVisible] = useState(false); // ✅ По умолчанию скрыт (режим просмотра)
  const [searchTerm, setSearchTerm] = useState('');
  const [workSourceTab, setWorkSourceTab] = useState('global'); // 'global' или 'tenant'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // ✅ Флаг несохраненных изменений
  
  // ✅ State для виджета параметров объекта
  const [parametersWidgetOpen, setParametersWidgetOpen] = useState(false);
  
  // API state for availableWorks
  const [availableWorks, setAvailableWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [errorWorks, setErrorWorks] = useState(null);
  const [transferringWorks, setTransferringWorks] = useState(false); // ✅ Индикатор переноса работ
  
  // Modal states для действий с материалами
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialDialogMode, setMaterialDialogMode] = useState('add'); // 'add' или 'replace'
  const [currentWorkItem, setCurrentWorkItem] = useState(null);
  const [materialToReplace, setMaterialToReplace] = useState(null);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialSearchTerm, setMaterialSearchTerm] = useState(''); // ✅ Поиск в модалке материалов
  
  // ✅ State для модального окна коэффициента цен
  const [coefficientModalOpen, setCoefficientModalOpen] = useState(false);
  const [currentCoefficient, setCurrentCoefficient] = useState(0);
  const [originalPrices, setOriginalPrices] = useState(new Map()); // Сохраняем оригинальные цены работ
  
  // ✅ State для экспорта Excel
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // ✅ Кеш материалов для быстрого открытия модалки
  const materialsCache = useRef(null);
  const materialsCacheTimestamp = useRef(null);
  const MATERIALS_CACHE_TTL = 5 * 60 * 1000; // 5 минут
  
  // ✅ Debounced поиск материалов - отложенный запрос к серверу
  const debouncedSearchMaterials = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.trim().length >= 2) {
        // Поиск по запросу на сервере
        await loadAvailableMaterials(searchQuery);
      }
    }, 500),
    []
  );

  // Fetch works from API
  useEffect(() => {
    const fetchWorks = async () => {
      try {
        setLoadingWorks(true);
        setErrorWorks(null);
        
        // Фильтруем по типу справочника
        const isGlobal = workSourceTab === 'global';
        
        // Загружаем ВСЕ работы
        const response = await worksAPI.getAll({ 
          isGlobal: isGlobal.toString(),
          pageSize: 10000 // Загружаем все записи для виртуализации
        });
        
        console.log(`API response (${workSourceTab}):`, response); // Debug log
        
        // Извлекаем массив data из response
        const data = response.data || response;
        
        // Check if data is empty
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn('No works found in database');
          setErrorWorks('В справочнике пока нет работ. Добавьте работы в разделе "Справочники" → "Работы"');
          setAvailableWorks([]);
          return;
        }
        
        // Transform API data to match expected format
        const transformedWorks = data.map(work => ({
          id: work.id.toString(),
          code: work.code,
          name: work.name,
          category: work.category || 'Без категории',
          unit: work.unit,
          price: work.base_price || 0,
          phase: work.phase || '',
          section: work.section || '',
          subsection: work.subsection || ''
        }));
        
        console.log('Transformed works:', transformedWorks.length); // Debug log
        setAvailableWorks(transformedWorks);
      } catch (err) {
        console.error('Ошибка загрузки работ:', err);
        const errorMessage = err.response?.status === 401 
          ? 'Требуется авторизация. Войдите в систему для доступа к справочнику работ.'
          : err.message || 'Не удалось загрузить данные';
        setErrorWorks(errorMessage);
      } finally {
        setLoadingWorks(false);
      }
    };

    fetchWorks();
  }, [workSourceTab]); // ★ Перезагружаем при смене вкладки!

  // Смета - данные загружаются из localStorage или начинаются с пустого состояния
  // ✅ ИСПРАВЛЕНИЕ: НЕ загружаем из localStorage при инициализации
  // Данные всегда загружаются из БД через useEffect
  const [estimateData, setEstimateData] = useState({ sections: [] });
  
  // ✅ Метаданные сметы (название, тип, описание и т.д.)
  const [estimateMetadata, setEstimateMetadata] = useState({
    name: `Смета от ${new Date().toLocaleDateString()}`,
    estimateType: 'строительство',
    status: 'draft',
    description: `Смета создана в конструкторе смет`,
    estimateDate: new Date().toISOString().split('T')[0],
    currency: 'RUB'
  });
  
  // ✅ Ref для хранения последнего сохраненного состояния
  const savedEstimateDataRef = useRef(null);
  
  // ✅ Ref для предотвращения повторной загрузки
  const isInitialLoadRef = useRef(false);
  
  // ✅ Ref для callback onUnsavedChanges (избегаем лишних зависимостей)
  const onUnsavedChangesRef = useRef(onUnsavedChanges);
  
  useEffect(() => {
    onUnsavedChangesRef.current = onUnsavedChanges;
  }, [onUnsavedChanges]);

  // ✅ Автоматическое переключение в режим просмотра при уходе со страницы
  useEffect(() => {
    // Cleanup функция - выполнится при размонтировании компонента
    return () => {
      // Если сайдбар был открыт (режим расчета), закрываем его
      if (sidebarVisible) {
        console.log('[EstimateWithSidebar] Компонент размонтируется - закрываем сайдбары');
        // Закрываем основной левый сайдбар, если он был открыт
        handlerDrawerOpen(false);
      }
    };
  }, [sidebarVisible]); // Зависимость от sidebarVisible чтобы знать текущее состояние

  // ❌ УДАЛЕНО: Сохранение в localStorage больше не нужно
  // Данные хранятся только в БД, localStorage используется только для estimateId

  // ✅ Экспортируем метод save для родительского компонента
  useImperativeHandle(ref, () => ({
    save: handleSaveToDatabase
  }));

  // ✅ Отслеживание изменений estimateData
  useEffect(() => {
    // Игнорируем первый рендер (когда savedEstimateDataRef еще не установлен)
    if (savedEstimateDataRef.current === null) {
      savedEstimateDataRef.current = JSON.stringify(estimateData);
      return;
    }

    // Сравниваем текущее состояние с сохраненным
    const currentData = JSON.stringify(estimateData);
    const hasChanges = currentData !== savedEstimateDataRef.current;
    
    setHasUnsavedChanges(hasChanges);
    
    // Уведомляем родительский компонент через ref (стабильная ссылка)
    if (onUnsavedChangesRef.current) {
      onUnsavedChangesRef.current(hasChanges);
    }
  }, [estimateData]); // Только estimateData в зависимостях!

  // Фильтрация работ по поиску
  const filteredWorks = useMemo(() => {
    if (!searchTerm) return availableWorks;
    const lower = searchTerm.toLowerCase();
    return availableWorks.filter(
      (work) =>
        work.name.toLowerCase().includes(lower) ||
        work.code.toLowerCase().includes(lower) ||
        work.category.toLowerCase().includes(lower)
    );
  }, [searchTerm, availableWorks]);

  // ✅ Фильтрация материалов по поиску в модалке
  const filteredMaterials = useMemo(() => {
    if (!materialSearchTerm) return availableMaterials;
    const lower = materialSearchTerm.toLowerCase();
    return availableMaterials.filter(
      (material) =>
        material.name.toLowerCase().includes(lower) ||
        (material.sku && material.sku.toLowerCase().includes(lower)) ||
        (material.category && material.category.toLowerCase().includes(lower))
    );
  }, [materialSearchTerm, availableMaterials]);

  // Получить ID работ, которые уже добавлены в смету
  const addedWorkIds = useMemo(() => {
    const ids = new Set();
    estimateData?.sections?.forEach((section) => {
      section.items?.forEach((item) => {
        // ★ Приводим к строке для корректного сравнения с availableWorks[].id
        if (item.workId != null) {
          ids.add(item.workId.toString());
        }
      });
    });
    return ids;
  }, [estimateData]);

  // Подсчет итогов
  const totalAmount = useMemo(
    () => estimateData?.sections?.reduce((sum, section) => sum + section.subtotal, 0) || 0,
    [estimateData]
  );

  // Перенести выбранные работы в смету
  const handleTransferToEstimate = async (customWorks = null) => {
    try {
      const startTime = performance.now();
      setTransferringWorks(true);
      
      // Используем только явно переданные работы (customWorks)
      const worksToAdd = customWorks || [];
      
      if (worksToAdd.length === 0) {
        console.log('⚠️ No works to transfer');
        setTransferringWorks(false);
        return;
      }
      
      console.log(`⏱️ Transferring ${worksToAdd.length} works...`);

      // ⚡ Загружаем материалы ОДНИМ запросом для всех работ
      const materialsStartTime = performance.now();
      const workIds = worksToAdd.map(w => w.id);
      const materialsMap = await workMaterialsAPI.getMaterialsForMultipleWorks(workIds);
      const materialsEndTime = performance.now();
      console.log(`⚡ Batch materials loaded in ${(materialsEndTime - materialsStartTime).toFixed(0)}ms`);

      // Формируем worksWithMaterials из полученной карты
      const worksWithMaterials = worksToAdd.map(work => ({
        work,
        materials: materialsMap[work.id] || []
      }));

    setEstimateData((prevData) => {
      console.log(`➕ Adding ${worksWithMaterials.length} works. Current items: ${prevData.sections.flatMap(s => s.items).length}`);
      const newSections = [...prevData.sections];

      worksWithMaterials.forEach(({ work, materials }) => {
        // Определяем раздел по коду работы (01-xxx -> раздел 01)
        // Проверяем наличие кода и используем fallback
        const sectionCode = work.code ? work.code.split('-')[0] : '00';
        const sectionName = work.category || 'Без категории';

        // Ищем существующий раздел или создаем новый
        let section = newSections.find((s) => s.code === sectionCode);

        if (!section) {
          section = {
            id: `s${sectionCode}`,
            code: sectionCode,
            name: sectionName,
            items: [],
            subtotal: 0
          };
          newSections.push(section);
        }

        // Создаем новую позицию работы с материалами
        const defaultQuantity = 0; // Начальное количество для новой работы (0 по умолчанию)

        // Рассчитываем материалы из API
        const calculatedMaterials = materials.map((mat) => ({
          id: `${mat.material_id}-${Date.now()}-${Math.random()}`, // временный ID для UI
          material_id: mat.material_id, // реальный ID для БД
          code: mat.material_sku || `M-${mat.material_id}`,
          name: mat.material_name,
          unit: mat.material_unit,
          quantity: parseFloat((defaultQuantity * mat.consumption).toFixed(2)),
          price: mat.material_price,
          total: parseFloat((defaultQuantity * mat.consumption * mat.material_price).toFixed(2)),
          consumption: parseFloat(mat.consumption)
        }));

        const newItem = {
          id: `item-${Date.now()}-${work.id}`,
          workId: work.id,
          code: work.code,
          name: work.name,
          unit: work.unit,
          quantity: defaultQuantity,
          price: work.price,
          total: defaultQuantity * work.price,
          phase: work.phase,
          section: work.section,
          subsection: work.subsection,
          materials: calculatedMaterials
        };

        section.items.push(newItem);

        // Пересчитываем subtotal раздела
        section.subtotal = section.items.reduce((sum, item) => sum + item.total, 0);
      });

      // Сортируем разделы по коду (с проверкой на undefined)
      newSections.sort((a, b) => {
        const codeA = a.code || '00';
        const codeB = b.code || '00';
        return codeA.localeCompare(codeB);
      });

      const totalItems = newSections.flatMap(s => s.items).length;
      console.log(`✅ Works added. New total items: ${totalItems}`);
      
      // ✅ Сохраняем оригинальные цены новых работ
      saveOriginalPrices(newSections);
      
      return { sections: newSections };
    });

    const endTime = performance.now();
    console.log(`⏱️ TOTAL transfer time: ${(endTime - startTime).toFixed(0)}ms`);
    } finally {
      setTransferringWorks(false);
    }
  };

  // Toggle режима расчёта/просмотра (управление ОСНОВНЫМ сайдбаром)
  const { menuMaster } = useGetMenuMaster();
  const mainDrawerOpen = menuMaster.isDashboardDrawerOpened;

  const toggleSidebar = () => {
    // Переключаем основной левый сайдбар
    handlerDrawerOpen(!mainDrawerOpen);
    // Также переключаем справочник работ синхронно
    setSidebarVisible((prev) => !prev);
  };

  // Очистить смету
  const handleClearEstimate = () => {
    if (window.confirm('Вы уверены, что хотите очистить всю смету?')) {
      setEstimateData({ sections: [] });
      localStorage.removeItem('currentEstimate');
      localStorage.removeItem('currentEstimateId');
    }
  };

  // ============ ЭКСПОРТ В EXCEL ============
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      
      // ✅ Логируем данные перед отправкой
      const exportData = {
        estimate: {
          id: estimateId,
          project_id: projectId, // 🔥 ДОБАВЛЯЕМ project_id для загрузки из БД
          estimate_number: estimateId || 'б_н',
          estimate_date: estimateMetadata.estimateDate || new Date().toISOString().split('T')[0],
          project_name: estimateMetadata.name || estimateData.projectName || 'Проект',
          client_name: estimateData.clientName || '',
          contractor_name: estimateData.contractorName || '',
          object_address: estimateData.objectAddress || '',
          contract_number: estimateData.contractNumber || '',
          sections: estimateData.sections
        }
      };
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/export-estimate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Ошибка экспорта Excel');
      }

      // Скачиваем файл
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate_${estimateId || 'new'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Excel экспортирован успешно');
    } catch (error) {
      console.error('Ошибка экспорта Excel:', error);
      alert('Не удалось экспортировать Excel. Проверьте консоль для деталей.');
    } finally {
      setExportingExcel(false);
    }
  };

  // ============ ДЕЙСТВИЯ С МАТЕРИАЛАМИ ============

  // Открыть диалог добавления материала
  const handleOpenAddMaterial = (sectionIndex, itemIndex) => {
    setCurrentWorkItem({ sectionIndex, itemIndex });
    setMaterialDialogMode('add');
    setMaterialSearchTerm(''); // ✅ Сбрасываем поиск
    setMaterialDialogOpen(true);
    // ✅ Используем кешированные данные если они актуальны
    loadAvailableMaterialsCached();
  };

  // Открыть диалог замены материала
  const handleOpenReplaceMaterial = (sectionIndex, itemIndex, materialIndex) => {
    setCurrentWorkItem({ sectionIndex, itemIndex });
    setMaterialToReplace(materialIndex);
    setMaterialDialogMode('replace');
    setMaterialSearchTerm(''); // ✅ Сбрасываем поиск
    setMaterialDialogOpen(true);
    // ✅ Используем кешированные данные если они актуальны
    loadAvailableMaterialsCached();
  };

  // ✅ Загрузить материалы с использованием кеша
  const loadAvailableMaterialsCached = async () => {
    const now = Date.now();
    
    // Проверяем валидность кеша
    if (materialsCache.current && 
        materialsCacheTimestamp.current && 
        (now - materialsCacheTimestamp.current) < MATERIALS_CACHE_TTL) {
      // Используем кеш - мгновенное открытие!
      setAvailableMaterials(materialsCache.current);
      return;
    }
    
    // Кеш устарел или отсутствует - загружаем заново
    await loadAvailableMaterials();
  };

  // Загрузить список материалов из API
  const loadAvailableMaterials = async (searchQuery = '') => {
    try {
      setLoadingMaterials(true);
      // ✅ Загружаем только первые 1000 материалов для быстрой загрузки
      // Пользователь может использовать поиск для остальных
      const materials = await materialsAPI.getAll({
        search: searchQuery || undefined,
        pageSize: 1000 // ✅ Оптимизировано: 1000 вместо 100000
      });
      
      // ✅ Сохраняем в кеш
      materialsCache.current = materials;
      materialsCacheTimestamp.current = Date.now();
      
      setAvailableMaterials(materials);
    } catch (error) {
      console.error('Error loading materials:', error);
      setAvailableMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Добавить материал к работе
  const handleAddMaterialToWork = (material) => {
    if (!currentWorkItem) return;

    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const { sectionIndex, itemIndex } = currentWorkItem;
      const item = newSections[sectionIndex].items[itemIndex];

      // ✅ Получаем consumption из материала (если есть) или используем дефолт
      const materialConsumption = material.consumption || material.consumption_coefficient || 1.0;
      
      // ✅ Получаем auto_calculate из материала
      const autoCalculate = material.auto_calculate !== undefined 
        ? material.auto_calculate 
        : (material.autoCalculate !== undefined ? material.autoCalculate : true);

      // ✅ Если auto_calculate = true, то quantity = work_quantity × consumption
      // ✅ Если auto_calculate = false, то quantity = consumption (ручной ввод)
      const calculatedQuantity = autoCalculate 
        ? parseFloat((item.quantity * materialConsumption).toFixed(2))
        : materialConsumption;

      const newMaterial = {
        id: `${material.id}-${Date.now()}-${Math.random()}`,
        material_id: material.id,
        code: material.sku || `M-${material.id}`,
        name: material.name,
        unit: material.unit,
        quantity: calculatedQuantity,
        price: material.price,
        total: parseFloat((calculatedQuantity * material.price).toFixed(2)),
        consumption: materialConsumption,
        auto_calculate: autoCalculate, // ✅ Сохраняем флаг автоматического расчета
        autoCalculate: autoCalculate, // ✅ Дублируем для совместимости
        image: material.image || null,
        showImage: material.image ? true : false // ✅ По умолчанию true если есть изображение
      };

      item.materials.push(newMaterial);

      return { sections: newSections };
    });

    setMaterialDialogOpen(false);
    setCurrentWorkItem(null);
  };

  // Заменить материал
  const handleReplaceMaterialConfirm = (newMaterial) => {
    if (!currentWorkItem || materialToReplace === null) return;

    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const { sectionIndex, itemIndex } = currentWorkItem;
      const item = newSections[sectionIndex].items[itemIndex];
      const oldMaterial = item.materials[materialToReplace];

      // Сохраняем количество, но обновляем материал
      const updatedMaterial = {
        id: `${newMaterial.id}-${Date.now()}-${Math.random()}`,
        material_id: newMaterial.id,
        code: newMaterial.sku || `M-${newMaterial.id}`,
        name: newMaterial.name,
        unit: newMaterial.unit,
        quantity: oldMaterial.quantity,
        price: newMaterial.price,
        total: parseFloat((oldMaterial.quantity * newMaterial.price).toFixed(2)),
        consumption: oldMaterial.consumption,
        image: newMaterial.image || null,
        showImage: newMaterial.image ? true : false // ✅ По умолчанию true если есть изображение
      };

      item.materials[materialToReplace] = updatedMaterial;

      return { sections: newSections };
    });

    setMaterialDialogOpen(false);
    setCurrentWorkItem(null);
    setMaterialToReplace(null);
  };

  // Удалить материал
  const handleDeleteMaterial = (sectionIndex, itemIndex, materialIndex) => {
    if (!window.confirm('Удалить этот материал?')) return;

    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const item = newSections[sectionIndex].items[itemIndex];
      item.materials.splice(materialIndex, 1);
      return { sections: newSections };
    });
  };
  
  // ✅ КАЛЬКУЛЯТОР: Функция безопасного вычисления математических выражений
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
        return result;
      }
    } catch (error) {
      // Если ошибка вычисления, возвращаем исходное значение
      console.warn('Ошибка вычисления выражения:', expression, error);
    }
    
    return expression;
  };
  
  // ✅ НОВОЕ: Изменить расход материала (consumption) - onChange
  const handleMaterialConsumptionChange = (sectionIndex, itemIndex, materialIndex, newConsumption) => {
    // Просто сохраняем значение как есть (для ввода выражения)
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const material = newSections[sectionIndex].items[itemIndex].materials[materialIndex];
      material.consumption = newConsumption;
      return { sections: newSections };
    });
  };
  
  // ✅ НОВОЕ: Обработка при потере фокуса для расхода - вычисляем выражение (onBlur)
  const handleMaterialConsumptionBlur = (sectionIndex, itemIndex, materialIndex) => {
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const item = newSections[sectionIndex].items[itemIndex];
      const material = item.materials[materialIndex];
      const currentValue = material.consumption;
      
      // Если пустое значение, оставляем как есть
      if (currentValue === '' || currentValue === null || currentValue === undefined) {
        return prevData;
      }
      
      // ✅ Вычисляем математическое выражение
      const calculatedValue = calculateExpression(String(currentValue));
      const consumption = parseFloat(calculatedValue);
      
      // Если результат не число, оставляем как есть
      if (isNaN(consumption) || consumption < 0) {
        return prevData;
      }
      
      material.consumption = consumption;
      
      // ✅ Если auto_calculate = true, пересчитываем quantity
      if (material.auto_calculate || material.autoCalculate) {
        material.quantity = parseFloat((item.quantity * consumption).toFixed(2));
      }
      
      // Пересчитываем total
      material.total = parseFloat((material.quantity * material.price).toFixed(2));
      
      return { sections: newSections };
    });
  };
  
  // ✅ НОВОЕ: Изменить количество материала вручную (onChange - просто сохраняет значение)
  const handleMaterialQuantityChange = (sectionIndex, itemIndex, materialIndex, newQuantity) => {
    // Просто сохраняем значение как есть (для ввода выражения типа "2+3" или "10*1.5")
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const material = newSections[sectionIndex].items[itemIndex].materials[materialIndex];
      material.quantity = newQuantity;
      return { sections: newSections };
    });
  };
  
  // ✅ НОВОЕ: Обработка при потере фокуса - вычисляем выражение (onBlur)
  const handleMaterialQuantityBlur = (sectionIndex, itemIndex, materialIndex) => {
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const material = newSections[sectionIndex].items[itemIndex].materials[materialIndex];
      const currentValue = material.quantity;
      
      // Если пустое значение, оставляем как есть
      if (currentValue === '' || currentValue === null || currentValue === undefined) {
        return prevData;
      }
      
      // ✅ Вычисляем математическое выражение
      const calculatedValue = calculateExpression(String(currentValue));
      const quantity = parseFloat(calculatedValue);
      
      // Если результат не число, оставляем как есть
      if (isNaN(quantity) || quantity < 0) {
        return prevData;
      }
      
      // ✅ Ручное изменение количества отключает автоматический расчет
      material.quantity = quantity;
      material.auto_calculate = false;
      material.autoCalculate = false;
      
      // Пересчитываем total
      material.total = parseFloat((quantity * material.price).toFixed(2));
      
      return { sections: newSections };
    });
  };

  // Удалить работу (блок) вместе со всеми материалами
  const handleDeleteWork = (sectionIndex, itemIndex) => {
    if (!window.confirm('Удалить эту работу и все связанные материалы?')) return;

    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      newSections[sectionIndex].items.splice(itemIndex, 1);

      // Если в разделе больше нет работ - удаляем раздел
      if (newSections[sectionIndex].items.length === 0) {
        newSections.splice(sectionIndex, 1);
      }

      return { sections: newSections };
    });
  };

  // ============ РЕДАКТИРОВАНИЕ КОЛИЧЕСТВА ============

  // Изменить количество работы (с автопересчётом материалов)
  const handleWorkQuantityChange = (sectionIndex, itemIndex, newQuantity) => {
    // ✅ Разрешаем пустую строку (для полного стирания)
    if (newQuantity === '' || newQuantity === null || newQuantity === undefined) {
      setEstimateData((prevData) => {
        const newSections = [...prevData.sections];
        const item = newSections[sectionIndex].items[itemIndex];
        
        // Устанавливаем 0 при пустом поле
        item.quantity = 0;
        item.total = 0;
        
        // Обнуляем материалы (только автоматические)
        if (item.materials && item.materials.length > 0) {
          item.materials.forEach((material) => {
            const isAutoCalculate = material.auto_calculate !== undefined 
              ? material.auto_calculate 
              : material.autoCalculate !== false;
            
            if (isAutoCalculate) {
              // 🤖 Автоматические материалы → обнуляем
              material.quantity = 0;
              material.total = 0;
            } else {
              // ✏️ Ручные материалы → пересчитываем только сумму
              material.total = 0;
            }
          });
        }

        // Пересчитываем subtotal раздела
        newSections[sectionIndex].subtotal = newSections[sectionIndex].items.reduce(
          (sum, item) => sum + item.total,
          0
        );

        return { sections: newSections };
      });
      return;
    }

    const quantity = parseFloat(newQuantity);
    
    // Валидация: только неотрицательные числа
    if (isNaN(quantity) || quantity < 0) {
      return;
    }

    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const item = newSections[sectionIndex].items[itemIndex];
      
      // Обновляем количество работы
      item.quantity = quantity;
      
      // Пересчитываем стоимость работы
      item.total = quantity * item.price;
      
      // ★ ПЕРЕСЧЁТ МАТЕРИАЛОВ:
      // Если auto_calculate = true → quantity = work_quantity × consumption (автоматически)
      // Если auto_calculate = false → quantity НЕ меняется (ручной ввод)
      if (item.materials && item.materials.length > 0) {
        item.materials.forEach((material) => {
          // ✅ Проверяем флаг auto_calculate (поддержка snake_case и camelCase)
          const isAutoCalculate = material.auto_calculate !== undefined 
            ? material.auto_calculate 
            : material.autoCalculate !== false; // По умолчанию true
          
          if (isAutoCalculate) {
            // 🤖 Автоматический расчёт: quantity = work_quantity × consumption
            material.quantity = parseFloat((quantity * (material.consumption || 0)).toFixed(2));
            material.total = parseFloat((material.quantity * material.price).toFixed(2));
          } else {
            // ✏️ Ручной расчёт: количество НЕ меняется, пересчитываем только сумму
            material.total = parseFloat((material.quantity * material.price).toFixed(2));
          }
        });
      }

      // Пересчитываем subtotal раздела
      newSections[sectionIndex].subtotal = newSections[sectionIndex].items.reduce(
        (sum, item) => sum + item.total,
        0
      );

      return { sections: newSections };
    });
  };

  // ============ КОНЕЦ ДЕЙСТВИЙ С МАТЕРИАЛАМИ ============

  // ============ КОЭФФИЦИЕНТ ЦЕН НА РАБОТЫ ============
  
  // Сохранить оригинальные цены при первом добавлении работ
  const saveOriginalPrices = (sections) => {
    const newOriginalPrices = new Map(originalPrices);
    
    sections.forEach((section) => {
      section.items.forEach((item) => {
        // Создаем уникальный ключ для работы на основе workId (более надежно)
        const key = item.workId || `${item.code}_${item.name}`;
        
        // Сохраняем оригинальную цену только если её еще нет
        if (!newOriginalPrices.has(key)) {
          newOriginalPrices.set(key, item.price);
          console.log(`💾 Saved original price for ${key}: ${item.price}`);
        }
      });
    });
    
    setOriginalPrices(newOriginalPrices);
  };

  // Применить коэффициент к ценам работ
  const handleApplyCoefficient = (coefficientPercent) => {
    const multiplier = 1 + (coefficientPercent / 100);
    
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      
      newSections.forEach((section) => {
        section.items.forEach((item) => {
          const key = item.workId || `${item.code}_${item.name}`;
          
          // Получаем оригинальную цену или используем текущую
          const originalPrice = originalPrices.get(key) || item.price;
          
          // Сохраняем оригинальную цену если её еще нет
          if (!originalPrices.has(key)) {
            originalPrices.set(key, item.price);
          }
          
          // Применяем коэффициент к оригинальной цене
          const newPrice = parseFloat((originalPrice * multiplier).toFixed(2));
          
          // Обновляем цену работы
          item.price = newPrice;
          
          // Пересчитываем сумму работы
          item.total = parseFloat((item.quantity * newPrice).toFixed(2));
          
          // ⚠️ НЕ ТРОГАЕМ МАТЕРИАЛЫ - коэффициент применяется только к работам
        });
        
        // Пересчитываем subtotal раздела
        section.subtotal = section.items.reduce((sum, item) => sum + item.total, 0);
      });
      
      return { sections: newSections };
    });
    
    setCurrentCoefficient(coefficientPercent);
    showSnackbar(`Коэффициент ${coefficientPercent > 0 ? '+' : ''}${coefficientPercent}% применен к ценам работ`, 'success');
  };

  // Сбросить цены работ до оригинальных значений
  const handleResetPrices = () => {
    console.log('🔄 Resetting prices. Original prices map:', originalPrices);
    
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      
      newSections.forEach((section) => {
        section.items.forEach((item) => {
          const key = item.workId || `${item.code}_${item.name}`;
          
          // Восстанавливаем оригинальную цену
          const originalPrice = originalPrices.get(key);
          
          console.log(`🔍 Looking for key: ${key}, found: ${originalPrice}, current: ${item.price}`);
          
          if (originalPrice !== undefined) {
            item.price = originalPrice;
            
            // Пересчитываем сумму работы
            item.total = parseFloat((item.quantity * originalPrice).toFixed(2));
            
            console.log(`✅ Reset price for ${item.name}: ${originalPrice}`);
          } else {
            console.warn(`⚠️ No original price found for ${item.name} (key: ${key})`);
          }
        });
        
        // Пересчитываем subtotal раздела
        section.subtotal = section.items.reduce((sum, item) => sum + item.total, 0);
      });
      
      return { sections: newSections };
    });
    
    setCurrentCoefficient(0);
    showSnackbar('Цены работ сброшены до исходных значений', 'info');
  };

  // ============ КОНЕЦ КОЭФФИЦИЕНТА ЦЕН ============

  // State для сохранения/загрузки
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Функция для показа уведомлений
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Сохранить смету в БД
  const handleSaveToDatabase = async () => {
    try {
      setSaving(true);
      showSnackbar('Смета сохраняется...', 'info');

      // Преобразуем estimateData в формат API
      const items = [];
      estimateData.sections.forEach((section) => {
        section.items.forEach((item) => {
          // ✅ Сохраняем ВСЕ позиции, включая с quantity = 0
          // Пользователь увидит красную подсветку для quantity = 0
          
          items.push({
            workId: item.workId, // ★ Добавлено! Передаём ID работы из справочника
            item_type: 'work',
            name: item.name,
            description: item.description || '',
            code: item.code,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.price,
            source_type: 'global',
            phase: item.phase || '',
            section: item.section || '',
            subsection: item.subsection || '',
            overhead_percent: 0,
            profit_percent: 0,
            tax_percent: 0,
            is_optional: false,
            notes: '',
            materials: item.materials
              .filter(m => m.material_id && parseFloat(m.quantity) > 0) // ✅ Фильтруем материалы без ID или с нулевым количеством
              .map(m => ({
                material_id: m.material_id, // используем реальный ID
                quantity: parseFloat(m.quantity), // ✅ Конвертируем в число (уже проверили что > 0)
                unit_price: parseFloat(m.price) || 0, // ✅ Конвертируем в число
                consumption: parseFloat(m.consumption) || 1.0, // ✅ Конвертируем в число
                auto_calculate: m.auto_calculate !== undefined ? m.auto_calculate : (m.autoCalculate !== undefined ? m.autoCalculate : true), // ✅ Добавляем флаг
                is_required: m.is_required !== false,
                notes: m.notes || ''
              }))
          });
        });
      });

      const estimatePayload = {
        name: estimateMetadata.name,
        projectId: projectId, // ✅ Реальный ID проекта из props
        estimateType: estimateMetadata.estimateType,
        status: estimateMetadata.status,
        description: estimateMetadata.description,
        estimateDate: estimateMetadata.estimateDate,
        currency: estimateMetadata.currency,
        // ✅ Добавляем данные проекта для старой структуры БД
        clientName: estimateData.clientName || '',
        contractorName: estimateData.contractorName || '',
        objectAddress: estimateData.objectAddress || '',
        contractNumber: estimateData.contractNumber || '',
        items: items
      };

      console.log('Saving estimate:', estimatePayload);
      console.log('First item structure:', items[0]); // Debug: проверяем структуру первого элемента

      // ✅ Разрешаем сохранять даже если нет позиций или все с quantity = 0
      // Пользователь увидит красную подсветку и сможет исправить

      let savedEstimate;
      
      // ✅ ИСПРАВЛЕНИЕ: Используем estimateId из URL для UPDATE, иначе CREATE
      if (estimateId) {
        // Обновляем существующую смету (с полной перезаписью items)
        console.log('Updating existing estimate:', estimateId);
        savedEstimate = await estimatesAPI.updateWithItems(estimateId, estimatePayload);
        showSnackbar(`Смета успешно обновлена! ID: ${savedEstimate.id}`, 'success');
      } else {
        // Создаем новую смету
        console.log('Creating new estimate');
        savedEstimate = await estimatesAPI.create(estimatePayload);
        showSnackbar(`Смета успешно создана! ID: ${savedEstimate.id}`, 'success');
        
        // Сохраняем ID сметы в localStorage только для новых смет
        localStorage.setItem('currentEstimateId', savedEstimate.id);
        localStorage.setItem(`estimate_${projectId}`, savedEstimate.id);
      }
      
      console.log('Saved estimate:', savedEstimate);
      
      // ✅ НЕ ОБНОВЛЯЕМ estimateData из savedEstimate!
      // Причина: savedEstimate содержит данные из БД, которые могут отличаться от текущего состояния
      // Например: пользователь добавил работу, сохранил, добавил еще одну - вторая потеряется!
      
      // ✅ Обновляем savedEstimateDataRef ТЕКУЩИМ состоянием (что сейчас в UI)
      savedEstimateDataRef.current = JSON.stringify(estimateData);
      setHasUnsavedChanges(false);
      if (onUnsavedChangesRef.current) {
        onUnsavedChangesRef.current(false);
      }
      
      console.log('✅ State preserved after save. Current items:', estimateData.sections.flatMap(s => s.items).length);
    } catch (error) {
      console.error('Error saving estimate:', error);
      showSnackbar(
        `Ошибка сохранения: ${error.response?.data?.error || error.message}`,
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // Автозагрузка сметы из БД при монтировании
  useEffect(() => {
    const loadSavedEstimate = async () => {
      // Приоритет: estimateId из URL, затем localStorage
      const estimateIdToLoad = estimateId || localStorage.getItem('currentEstimateId');
      
      if (!estimateIdToLoad) {
        console.log('⏭️ No estimateId to load, skipping auto-load');
        return;
      }
      
      // ✅ ДВОЙНАЯ ЗАЩИТА: проверяем и ref, и наличие данных
      const hasData = estimateData.sections.length > 0;
      if (isInitialLoadRef.current || hasData) {
        console.log(`⏭️ Already loaded, skipping (ref=${isInitialLoadRef.current}, hasData=${hasData}, sections=${estimateData.sections.length})`);
        return;
      }

      try {
        setLoading(true);
        isInitialLoadRef.current = true; // Отмечаем, что загрузка началась
        console.log('🔄 Auto-loading estimate:', estimateIdToLoad);

        const estimate = await estimatesAPI.getById(estimateIdToLoad);
        
        // ✅ ВАЖНО: Проверяем, что смета принадлежит текущему проекту
        if (projectId && estimate.project_id !== projectId) {
          console.warn(`Estimate ${estimateIdToLoad} belongs to project ${estimate.project_id}, but current project is ${projectId}. Skipping load.`);
          localStorage.removeItem('currentEstimateId'); // Очищаем неверный ID
          setLoading(false);
          return;
        }
        
        console.log('Loaded estimate:', estimate);

        // ✅ Логируем данные проекта из API
        console.log('📋 Project data from API:', {
          client_name: estimate.client_name,
          contractor_name: estimate.contractor_name,
          object_address: estimate.object_address,
          contract_number: estimate.contract_number,
        });

        // ✅ Сохраняем метаданные сметы
        setEstimateMetadata({
          name: estimate.name || `Смета от ${new Date(estimate.created_at).toLocaleDateString()}`,
          estimateType: estimate.estimate_type || estimate.estimateType || 'строительство',
          status: estimate.status || 'draft',
          description: estimate.description || '',
          estimateDate: estimate.estimate_date || estimate.estimateDate || new Date().toISOString().split('T')[0],
          currency: estimate.currency || 'RUB'
        });

        // ✅ Загружаем данные проекта в estimateData
        const projectData = {
          clientName: estimate.client_name || '',
          contractorName: estimate.contractor_name || '',
          objectAddress: estimate.object_address || '',
          contractNumber: estimate.contract_number || '',
        };

        console.log('📋 Project data prepared:', projectData);

        // Преобразуем данные из API в формат estimateData
        const sections = [];
        
        estimate.items.forEach((item) => {
          // Находим или создаем секцию
          let section = sections.find(s => s.title === (item.phase || 'Без фазы'));
          if (!section) {
            section = { title: item.phase || 'Без фазы', items: [] };
            sections.push(section);
          }

          // Добавляем работу в секцию
          section.items.push({
            workId: item.work_id || item.id, // ★ Используем work_id для связи с справочником!
            code: item.code,
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            price: item.unit_price,
            total: item.final_price || parseFloat((item.quantity * item.unit_price).toFixed(2)), // ✅ ИСПРАВЛЕНИЕ: рассчитываем total для работы
            phase: item.phase,
            section: item.section,
            subsection: item.subsection,
            materials: item.materials.map(m => ({
              id: m.material_id,
              material_id: m.material_id, // сохраняем реальный ID
              sku: m.sku,
              name: m.material_name,
              unit: m.unit,
              quantity: m.quantity,
              price: m.unit_price || m.price, // используем unit_price или price
              total: m.total || parseFloat((m.quantity * (m.unit_price || m.price || 0)).toFixed(2)), // ✅ ИСПРАВЛЕНИЕ: рассчитываем total
              consumption: m.consumption_coefficient || m.consumption,
              auto_calculate: m.auto_calculate, // ✅ Добавлено
              autoCalculate: m.auto_calculate, // ✅ Дублируем в camelCase для совместимости
              is_required: m.is_required,
              notes: m.notes,
              image: m.image || null, // ✅ Загружаем изображение из БД
              showImage: m.image ? true : false // ✅ Показываем изображение если оно есть
            }))
          });
        });

        setEstimateData({ 
          sections,
          ...projectData  // ✅ Добавляем данные проекта
        });
        
        console.log('✅ EstimateData updated with project data:', { sections: sections.length, ...projectData });
        
        // ✅ Обновляем savedEstimateDataRef после загрузки из БД
        savedEstimateDataRef.current = JSON.stringify({ sections, ...projectData });
        setHasUnsavedChanges(false);
        if (onUnsavedChangesRef.current) {
          onUnsavedChangesRef.current(false);
        }
        
        console.log(`✅ Loaded ${sections.length} sections with ${sections.flatMap(s => s.items).length} items from DB`);
        showSnackbar(`📂 Смета "${estimate.name}" загружена из БД`, 'info');
      } catch (error) {
        console.error('Error auto-loading estimate:', error);
        // Не показываем ошибку пользователю при автозагрузке
        localStorage.removeItem('currentEstimateId');
      } finally {
        setLoading(false);
      }
    };

    loadSavedEstimate();
  }, [estimateId, projectId]); // Перезагружаем только при изменении estimateId или projectId

  // ✅ Подсчет итогов по работам и материалам
  const calculateTotals = useMemo(() => {
    let totalWorks = 0;
    let totalMaterials = 0;

    estimateData.sections.forEach(section => {
      section.items.forEach(item => {
        // Добавляем стоимость работы
        totalWorks += parseFloat(item.total) || 0;
        
        // Добавляем стоимость материалов
        item.materials?.forEach(material => {
          totalMaterials += parseFloat(material.total) || 0;
        });
      });
    });

    return {
      totalWorks: totalWorks.toFixed(2),
      totalMaterials: totalMaterials.toFixed(2),
      grandTotal: (totalWorks + totalMaterials).toFixed(2)
    };
  }, [estimateData]);

  return (
    <Box>
      {/* Переключатель режима: Расчет (сайдбары открыты) / Просмотр (сайдбары скрыты) */}
      <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color={sidebarVisible ? "primary" : "secondary"}
          startIcon={sidebarVisible ? <IconEyeOff /> : <IconEye />}
          onClick={toggleSidebar}
          size="small"
          sx={{ py: 0.5 }}
        >
          {sidebarVisible ? 'Режим просмотра' : 'Режим расчёта'}
        </Button>

        <Divider orientation="vertical" flexItem />

        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} /> : <IconPlus />}
          onClick={handleSaveToDatabase}
          size="small"
          sx={{ py: 0.5 }}
          disabled={estimateData.sections.length === 0 || saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить в БД'}
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          startIcon={<IconPercentage />}
          onClick={() => setCoefficientModalOpen(true)}
          size="small"
          sx={{ py: 0.5 }}
          disabled={estimateData.sections.length === 0}
        >
          Коэффициент цен
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<IconTrash />}
          onClick={handleClearEstimate}
          size="small"
          sx={{ py: 0.5 }}
          disabled={estimateData.sections.length === 0}
        >
          Очистить смету
        </Button>

        <Divider orientation="vertical" flexItem />

        <Button
          variant="outlined"
          color="success"
          startIcon={exportingExcel ? <CircularProgress size={16} /> : <IconFileTypeXls />}
          onClick={handleExportExcel}
          size="small"
          sx={{ py: 0.5 }}
          disabled={estimateData.sections.length === 0 || exportingExcel}
        >
          {exportingExcel ? 'Экспорт...' : 'Экспорт в Excel'}
        </Button>
      </Box>

      {/* Основной контейнер с сайдбаром и сметой */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 250px)', minHeight: 500 }}>
        {/* ЛЕВЫЙ САЙДБАР - Справочник работ */}
        {sidebarVisible && (
          <Paper
            sx={{
              width: 420,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2
            }}
            elevation={3}
          >
            {/* Заголовок сайдбара */}
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Справочник работ
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Выберите работы для добавления в смету
              </Typography>
            </Box>

            {/* Tabs для переключения между глобальными и тенантными работами */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={workSourceTab} 
                onChange={(e, newValue) => {
                  setWorkSourceTab(newValue);
                  setSearchTerm(''); // Сбрасываем поиск
                }}
                variant="fullWidth"
              >
                <Tab label="Глобальные работы" value="global" />
                <Tab label="Мои работы" value="tenant" />
              </Tabs>
            </Box>

            {/* Поиск */}
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Поиск работ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={18} />
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* Список работ - ВИРТУАЛИЗИРОВАННЫЙ */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {/* Загрузка */}
              {loadingWorks && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                </Box>
              )}

              {/* Ошибка */}
              {errorWorks && !loadingWorks && (
                <Box sx={{ px: 2, py: 2 }}>
                  <Alert severity="error">
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {errorWorks}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => window.location.reload()}
                    >
                      Обновить страницу
                    </Button>
                  </Alert>
                </Box>
              )}

              {/* Виртуализированный список работ */}
              {!loadingWorks && !errorWorks && (
                <Virtuoso
                  style={{ height: '600px' }}
                  data={filteredWorks}
                  itemContent={(index, work) => {
                    const isAdded = addedWorkIds.has(work.id);

                    return (
                      <>
                        <ListItem 
                          disablePadding
                          secondaryAction={
                            !isAdded && (
                              <Tooltip title="Перенести в смету">
                                <IconButton
                                  edge="end"
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    // Переносим одну работу
                                    const worksToAdd = [work];
                                    handleTransferToEstimate(worksToAdd);
                                  }}
                                  sx={{ mr: 1 }}
                                >
                                  <IconArrowRight size={20} />
                                </IconButton>
                              </Tooltip>
                            )
                          }
                        >
                          <ListItemButton
                            disabled={isAdded}
                            sx={{
                              py: 1.5,
                              px: 2,
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box>
                                  <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                                    {work.code} • {work.name}
                                  </Typography>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip label={work.category} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {work.unit}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={600} color="primary">
                                      {formatCurrency(work.price)}
                                    </Typography>
                                  </Stack>
                                </Box>
                              }
                            />
                            {isAdded && (
                              <Chip label="В смете" size="small" color="success" sx={{ ml: 1, height: 22 }} />
                            )}
                          </ListItemButton>
                        </ListItem>
                        <Divider />
                      </>
                    );
                  }}
                />
              )}
            </Box>
          </Paper>
        )}

        {/* ПРАВАЯ ЧАСТЬ - Смета */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Таблица сметы */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Код
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Наименование
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider', minWidth: 80 }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Изображение
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Ед. изм.
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Кол-во
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Цена, ₽
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Сумма, ₽
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Расход
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1, px: 1, minWidth: 120 }}>
                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.8rem">
                        Действия
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimateData?.sections?.map((section, sectionIndex) => (
                    <React.Fragment key={section.id}>
                      {/* Работы и материалы раздела */}
                      {section.items?.map((item, itemIndex) => (
                        <React.Fragment key={item.id}>
                          {/* Строка работы */}
                          <TableRow
                            sx={{
                              bgcolor: 'primary.lighter',
                              borderBottom: item.materials?.length > 0 ? 'none' : '1px dashed',
                              borderColor: 'divider',
                              '&:hover': { bgcolor: 'primary.light' }
                            }}
                          >
                            <TableCell
                              sx={{
                                py: 1,
                                px: 1,
                                fontWeight: 600,
                                borderRight: '1px dashed',
                                borderColor: 'divider'
                              }}
                            >
                              {item.code}
                            </TableCell>
                            <TableCell
                              sx={{
                                py: 1,
                                px: 1,
                                fontWeight: 600,
                                borderRight: '1px dashed',
                                borderColor: 'divider'
                              }}
                            >
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.name}
                                </Typography>
                                {(item.phase || item.section || item.subsection) && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      display: 'block',
                                      mt: 0.5,
                                      fontSize: '0.65rem',
                                      fontStyle: 'italic'
                                    }}
                                  >
                                    {item.phase && <span style={{ color: '#81C784' }}>{item.phase}</span>}
                                    {item.phase && item.section && <span> → </span>}
                                    {item.section && <span style={{ color: '#E57373' }}>{item.section}</span>}
                                    {item.section && item.subsection && <span> → </span>}
                                    {item.subsection && <span style={{ color: '#64B5F6' }}>{item.subsection}</span>}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                            >
                              -
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                            >
                              {item.unit}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ 
                                py: 1, 
                                px: 1, 
                                borderRight: '1px dashed', 
                                borderColor: 'divider'
                              }}
                            >
                              {/* ✏️ РЕДАКТИРУЕМОЕ ПОЛЕ КОЛИЧЕСТВА */}
                              <TextField
                                type="number"
                                value={item.quantity || ''}
                                onChange={(e) => handleWorkQuantityChange(sectionIndex, itemIndex, e.target.value)}
                                size="small"
                                inputProps={{
                                  min: 0,
                                  step: 0.01,
                                  style: { 
                                    textAlign: 'right', 
                                    fontSize: '0.875rem',
                                    padding: '4px 8px'
                                  }
                                }}
                                sx={{
                                  width: '100px',
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem',
                                    // ✅ Красный фон input если quantity = 0 или пусто
                                    bgcolor: (!item.quantity || item.quantity === 0) ? 'rgba(255, 0, 0, 0.15)' : 'background.paper',
                                    '&:hover': {
                                      bgcolor: (!item.quantity || item.quantity === 0) ? 'rgba(255, 0, 0, 0.2)' : 'primary.lighter'
                                    },
                                    '&.Mui-focused': {
                                      bgcolor: (!item.quantity || item.quantity === 0) ? 'rgba(255, 0, 0, 0.25)' : 'primary.lighter'
                                    }
                                  },
                                  // ❌ Убрать стрелки (spinner) у input[type="number"]
                                  '& input[type=number]': {
                                    MozAppearance: 'textfield'
                                  },
                                  '& input[type=number]::-webkit-outer-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0
                                  },
                                  '& input[type=number]::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                            >
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                            >
                              {/* 💰 АВТОМАТИЧЕСКИ РАССЧИТАННАЯ СУММА */}
                              <Typography 
                                variant="body2" 
                                fontWeight={600} 
                                color="primary"
                                sx={{
                                  bgcolor: 'success.lighter',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  display: 'inline-block'
                                }}
                              >
                                {formatCurrency(item.total)}
                              </Typography>
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                            >
                              -
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1, px: 1 }}>
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title="Добавить материал">
                                  <IconButton 
                                    size="small" 
                                    color="primary" 
                                    sx={{ p: 0.5 }}
                                    onClick={() => handleOpenAddMaterial(sectionIndex, itemIndex)}
                                  >
                                    <IconPackage size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Удалить блок">
                                  <IconButton 
                                    size="small" 
                                    color="error" 
                                    sx={{ p: 0.5 }}
                                    onClick={() => handleDeleteWork(sectionIndex, itemIndex)}
                                  >
                                    <IconTrash size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>

                          {/* Строки материалов */}
                          {item.materials?.map((material, matIndex) => (
                            <TableRow
                              key={material.id}
                              sx={{
                                bgcolor: 'background.paper',
                                borderBottom: matIndex === (item.materials?.length || 0) - 1 ? '1px dashed' : 'none',
                                borderColor: 'divider',
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                            >
                              <TableCell
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  pl: 3,
                                  fontSize: '0.75rem',
                                  borderRight: '1px dashed',
                                  borderColor: 'divider'
                                }}
                              >
                                {material.code}
                              </TableCell>
                              <TableCell
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  pl: 3,
                                  fontSize: '0.75rem',
                                  borderRight: '1px dashed',
                                  borderColor: 'divider'
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {/* ✅ Иконка в зависимости от типа расчёта */}
                                  {material.auto_calculate || material.autoCalculate ? (
                                    <Box
                                      sx={{
                                        bgcolor: 'success.lighter',
                                        borderRadius: '50%',
                                        width: 18,
                                        height: 18,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      title="Автоматический расчёт"
                                    >
                                      <Typography fontSize="10px">🤖</Typography>
                                    </Box>
                                  ) : (
                                    <Box
                                      sx={{
                                        bgcolor: 'warning.lighter',
                                        borderRadius: '50%',
                                        width: 18,
                                        height: 18,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      title="Ручной ввод"
                                    >
                                      <Typography fontSize="10px">✏️</Typography>
                                    </Box>
                                  )}
                                  <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                                    {material.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{ py: 0.75, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
                              >
                                {material.showImage && material.image ? (
                                  <Box
                                    component="img"
                                    src={material.image}
                                    alt={material.name}
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      objectFit: 'cover',
                                      borderRadius: 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      display: 'block',
                                      mx: 'auto'
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      bgcolor: 'grey.200',
                                      borderRadius: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      mx: 'auto'
                                    }}
                                  >
                                    <IconPackage size={14} style={{ opacity: 0.3 }} />
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  fontSize: '0.75rem',
                                  borderRight: '1px dashed',
                                  borderColor: 'divider'
                                }}
                              >
                                {material.unit}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  fontSize: '0.75rem',
                                  borderRight: '1px dashed',
                                  borderColor: 'divider'
                                }}
                              >
                                {/* 🔢 КОЛИЧЕСТВО МАТЕРИАЛА - с калькулятором! */}
                                <TextField
                                  type="text"
                                  value={material.quantity}
                                  onChange={(e) => handleMaterialQuantityChange(sectionIndex, itemIndex, matIndex, e.target.value)}
                                  onBlur={() => handleMaterialQuantityBlur(sectionIndex, itemIndex, matIndex)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleMaterialQuantityBlur(sectionIndex, itemIndex, matIndex);
                                      e.target.blur(); // Снимаем фокус с поля
                                    }
                                  }}
                                  size="small"
                                  placeholder="10 или 2+3"
                                  inputProps={{
                                    style: { 
                                      textAlign: 'right',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      padding: '4px 8px'
                                    }
                                  }}
                                  sx={{
                                    width: 90,
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: material.auto_calculate || material.autoCalculate ? 'success.lighter' : 'warning.lighter',
                                      '& fieldset': {
                                        borderColor: material.auto_calculate || material.autoCalculate ? 'success.main' : 'warning.main',
                                        borderStyle: 'dashed'
                                      },
                                      '&:hover fieldset': {
                                        borderColor: material.auto_calculate || material.autoCalculate ? 'success.dark' : 'warning.dark'
                                      }
                                    }
                                  }}
                                  title={material.auto_calculate || material.autoCalculate ? '🧮 Калькулятор: 2+3, 10*1.5 и т.д. (автоматический расчет)' : '🧮 Калькулятор: 2+3, 10*1.5 и т.д. (ручной ввод)'}
                                />
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  fontSize: '0.75rem',
                                  borderRight: '1px dashed',
                                  borderColor: 'divider'
                                }}
                              >
                                {formatCurrency(material.price)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  fontSize: '0.75rem',
                                  borderRight: '1px dashed',
                                  borderColor: 'divider'
                                }}
                              >
                                {/* 💰 АВТОМАТИЧЕСКИ РАССЧИТАННАЯ СУММА МАТЕРИАЛА */}
                                <Box
                                  sx={{
                                    bgcolor: 'warning.lighter',
                                    px: 1,
                                    py: 0.3,
                                    borderRadius: 0.5,
                                    display: 'inline-block'
                                  }}
                                >
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    fontWeight={500}
                                    sx={{ fontSize: '0.75rem' }}
                                  >
                                    {formatCurrency(material.total)}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  fontSize: '0.75rem',
                                  borderRight: '1px dashed',
                                  borderColor: 'divider'
                                }}
                              >
                                {/* 📊 КОЭФФИЦИЕНТ РАСХОДА - с калькулятором! */}
                                <TextField
                                  type="text"
                                  value={material.consumption}
                                  onChange={(e) => handleMaterialConsumptionChange(sectionIndex, itemIndex, matIndex, e.target.value)}
                                  onBlur={() => handleMaterialConsumptionBlur(sectionIndex, itemIndex, matIndex)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleMaterialConsumptionBlur(sectionIndex, itemIndex, matIndex);
                                      e.target.blur(); // Снимаем фокус с поля
                                    }
                                  }}
                                  size="small"
                                  placeholder="1.05 или 2+3"
                                  inputProps={{
                                    style: { 
                                      textAlign: 'center',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '2px 6px'
                                    }
                                  }}
                                  sx={{
                                    width: 80,
                                    '& .MuiOutlinedInput-root': {
                                      '& fieldset': {
                                        borderColor: 'primary.main',
                                        borderStyle: 'dashed'
                                      }
                                    }
                                  }}
                                  title="🧮 Калькулятор расхода: 1.05, 2+3, 10*1.5 и т.д."
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75, px: 1 }}>
                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                  <Tooltip title="Заменить материал">
                                    <IconButton 
                                      size="small" 
                                      color="warning" 
                                      sx={{ p: 0.5 }}
                                      onClick={() => handleOpenReplaceMaterial(sectionIndex, itemIndex, matIndex)}
                                    >
                                      <IconReplace size={14} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Удалить материал">
                                    <IconButton 
                                      size="small" 
                                      color="error" 
                                      sx={{ p: 0.5 }}
                                      onClick={() => handleDeleteMaterial(sectionIndex, itemIndex, matIndex)}
                                    >
                                      <IconTrash size={14} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* ✅ КОМПАКТНЫЕ ИТОГИ */}
                  {estimateData.sections.length > 0 && (
                    <>
                      {/* Пустая разделительная строка */}
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 0.5, borderBottom: '2px solid', borderColor: 'divider' }} />
                      </TableRow>

                      {/* Итого за работы */}
                      <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                        <TableCell colSpan={6} sx={{ py: 1, px: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="subtitle2" fontWeight={600} fontSize="0.85rem">
                            Итого за работы
                          </Typography>
                        </TableCell>
                        <TableCell colSpan={3} align="right" sx={{ py: 1, px: 2 }}>
                          <Typography variant="h6" fontWeight={700} color="primary.main" fontSize="0.95rem">
                            {formatCurrency(parseFloat(calculateTotals.totalWorks))}
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {/* Итого за материалы */}
                      <TableRow sx={{ bgcolor: 'success.lighter' }}>
                        <TableCell colSpan={6} sx={{ py: 1, px: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="subtitle2" fontWeight={600} fontSize="0.85rem">
                            Итого за материалы
                          </Typography>
                        </TableCell>
                        <TableCell colSpan={3} align="right" sx={{ py: 1, px: 2 }}>
                          <Typography variant="h6" fontWeight={700} color="success.main" fontSize="0.95rem">
                            {formatCurrency(parseFloat(calculateTotals.totalMaterials))}
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {/* Общий итог */}
                      <TableRow sx={{ bgcolor: 'warning.lighter', borderTop: '2px solid', borderColor: 'warning.main' }}>
                        <TableCell colSpan={6} sx={{ py: 1.5, px: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="h6" fontWeight={700} fontSize="1rem">
                            ИТОГО ПО СМЕТЕ
                          </Typography>
                        </TableCell>
                        <TableCell colSpan={3} align="right" sx={{ py: 1.5, px: 2 }}>
                          <Typography variant="h5" fontWeight={700} color="warning.dark" fontSize="1.1rem">
                            {formatCurrency(parseFloat(calculateTotals.grandTotal))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </Box>

      {/* 🎨 Компактный диалог выбора материала */}
      <Dialog 
        open={materialDialogOpen} 
        onClose={() => {
          setMaterialDialogOpen(false);
          setMaterialSearchTerm('');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            height: '80vh', 
            maxHeight: '700px',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              {materialDialogMode === 'add' ? 'Добавить материал' : 'Заменить материал'}
            </Typography>
            <Chip 
              label={loadingMaterials ? 'Загрузка...' : `${filteredMaterials.length} шт`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          {/* ✅ Компактный поиск с подсказкой */}
          <TextField
            fullWidth
            size="small"
            placeholder="Поиск по названию, артикулу... (мин. 2 символа)"
            value={materialSearchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setMaterialSearchTerm(value);
              
              // ✅ Запускаем поиск на сервере при вводе >= 2 символов
              if (value.trim().length >= 2) {
                debouncedSearchMaterials(value);
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} />
                </InputAdornment>
              )
            }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {loadingMaterials ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress size={40} />
            </Box>
          ) : filteredMaterials.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                {materialSearchTerm ? `Материалы по запросу "${materialSearchTerm}" не найдены` : 'Материалы не найдены'}
              </Typography>
            </Box>
          ) : (
            /* ✅ Компактный виртуализированный список */
            <Virtuoso
              style={{ height: '100%' }}
              data={filteredMaterials}
              itemContent={(index, material) => (
                <ListItem 
                  disablePadding
                  sx={{ 
                    borderBottom: index < filteredMaterials.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemButton
                    onClick={() => {
                      if (materialDialogMode === 'add') {
                        handleAddMaterialToWork(material);
                      } else {
                        handleReplaceMaterialConfirm(material);
                      }
                    }}
                    sx={{ py: 1, px: 2 }}
                  >
                    {/* ✅ Компактная иконка */}
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <IconPackage size={20} />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500} sx={{ mb: 0.25 }}>
                          {material.name}
                        </Typography>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                          {material.category && (
                            <Chip 
                              label={material.category} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.75 } }}
                            />
                          )}
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {material.sku || `#${material.id}`}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>•</Typography>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {material.unit}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>•</Typography>
                          <Typography component="span" variant="caption" fontWeight={600} color="primary.main" sx={{ fontSize: '0.75rem' }}>
                            {formatCurrency(material.price)}
                          </Typography>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'span' }}
                    />
                    
                    {/* ✅ Компактное превью изображения */}
                    {material.image && (
                      <Box
                        component="img"
                        src={material.image}
                        alt={material.name}
                        sx={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          ml: 1,
                          flexShrink: 0
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              )}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setMaterialDialogOpen(false);
              setMaterialSearchTerm('');
            }}
            size="small"
          >
            Отмена
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модальное окно коэффициента цен */}
      <PriceCoefficientModal
        open={coefficientModalOpen}
        onClose={() => setCoefficientModalOpen(false)}
        onApply={handleApplyCoefficient}
        onReset={handleResetPrices}
        currentCoefficient={currentCoefficient}
      />

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ✅ Виджет параметров объекта */}
      <ObjectParametersSidebar
        estimateId={estimateId}
        open={parametersWidgetOpen}
        onToggle={() => setParametersWidgetOpen(!parametersWidgetOpen)}
      />
    </Box>
  );
});

EstimateWithSidebar.displayName = 'EstimateWithSidebar';

EstimateWithSidebar.propTypes = {
  projectId: PropTypes.string,
  estimateId: PropTypes.string,
  onUnsavedChanges: PropTypes.func
};

export default EstimateWithSidebar;
