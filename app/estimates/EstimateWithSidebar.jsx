import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, startTransition, useDeferredValue } from 'react';
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
  Grid,
  Drawer,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel
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
  IconFileTypeXls,
  IconFilter,
  IconX,
  IconTemplate
} from '@tabler/icons-react';

// project imports
import { formatCurrency } from '../projects/utils';
import axiosInstance from 'shared/lib/axiosInstance';
import worksAPI from 'api/works';
import workMaterialsAPI from 'api/workMaterials';
import estimatesAPI from 'api/estimates';
import materialsAPI from 'api/materials';
import estimateTemplatesAPI from 'shared/lib/api/estimateTemplates';
import { useGetMenuMaster } from 'api/menu'; // ✅ Только для получения данных меню
import PriceCoefficientModal from './PriceCoefficientModal';
import ObjectParametersSidebar from './ObjectParametersSidebar';

// ✅ Мемоизированные компоненты строк для оптимизации производительности
import WorkRow from './components/WorkRow';
import MaterialRow from './components/MaterialRow';

// ==============================|| HELPER FUNCTIONS ||============================== //

/**
 * Сравнивает две работы по правилу: Фаза → Код → Стадия → Подстадия
 * @param {Object} a - первая работа
 * @param {Object} b - вторая работа
 * @returns {number} - результат сравнения (-1, 0, 1)
 */
const compareWorkItems = (a, b) => {
  // 1. Сравниваем по фазе (phase)
  const phaseA = a.phase || '';
  const phaseB = b.phase || '';
  if (phaseA !== phaseB) {
    return phaseA.localeCompare(phaseB, 'ru');
  }

  // 2. Сравниваем по коду работы (с правильной числовой сортировкой)
  const codeA = a.code || '';
  const codeB = b.code || '';
  if (codeA !== codeB) {
    // Разбиваем код на части: "3-100" -> ["3", "100"]
    const partsA = codeA.split(/[-–]/); // поддержка и дефиса и тире
    const partsB = codeB.split(/[-–]/);
    
    // Сравниваем первую часть (префикс) как число
    const prefixA = parseInt(partsA[0]) || 0;
    const prefixB = parseInt(partsB[0]) || 0;
    
    if (prefixA !== prefixB) {
      return prefixA - prefixB;
    }
    
    // Если префиксы равны, сравниваем вторую часть как число
    if (partsA.length > 1 && partsB.length > 1) {
      const numA = parseInt(partsA[1]) || 0;
      const numB = parseInt(partsB[1]) || 0;
      
      if (numA !== numB) {
        return numA - numB;
      }
    }
    
    // Если числовые части равны, сравниваем как строки (на случай букв)
    return codeA.localeCompare(codeB, 'ru');
  }

  // 3. Сравниваем по стадии (section)
  const sectionA = a.section || '';
  const sectionB = b.section || '';
  if (sectionA !== sectionB) {
    return sectionA.localeCompare(sectionB, 'ru');
  }

  // 4. Сравниваем по подстадии (subsection)
  const subsectionA = a.subsection || '';
  const subsectionB = b.subsection || '';
  return subsectionA.localeCompare(subsectionB, 'ru');
};

/**
 * Сортирует работы внутри раздела по правилу: Фаза → Код → Стадия → Подстадия
 * @param {Array} items - массив работ для сортировки
 */
const sortWorkItems = (items) => {
  items.sort((a, b) => compareWorkItems(a, b));
};

/**
 * Находит позицию для вставки новой работы с сохранением сортировки
 * @param {Array} items - отсортированный массив работ
 * @param {Object} newItem - новая работа для вставки
 * @returns {number} - индекс позиции для вставки
 */
const findInsertPosition = (items, newItem) => {
  if (items.length === 0) return 0;
  
  // Бинарный поиск для нахождения позиции вставки
  let left = 0;
  let right = items.length;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareWorkItems(items[mid], newItem);
    
    if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  return left;
};

// ==============================|| ESTIMATE WITH SIDEBAR ||============================== //

const EstimateWithSidebar = forwardRef(({ projectId, estimateId, onUnsavedChanges }, ref) => {
  // State
  const [sidebarVisible, setSidebarVisible] = useState(false); // ✅ По умолчанию скрыт (режим просмотра)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState(null); // ✅ Фильтр по стадии (разделу)
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false); // ✅ Состояние панели фильтров
  const [workSourceTab, setWorkSourceTab] = useState('global'); // 'global' или 'tenant'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // ✅ Флаг несохраненных изменений
  
  // ✅ State для виджета параметров объекта
  const [parametersWidgetOpen, setParametersWidgetOpen] = useState(false);
  
  // API state for availableWorks
  const [availableWorks, setAvailableWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [errorWorks, setErrorWorks] = useState(null);
  const [transferringWorks, setTransferringWorks] = useState(false); // ✅ Индикатор переноса работ
  const [addingWorkId, setAddingWorkId] = useState(null); // ✅ ID работы, которая сейчас добавляется
  
  // Modal states для действий с материалами
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialDialogMode, setMaterialDialogMode] = useState('add'); // 'add' или 'replace'
  const [currentWorkItem, setCurrentWorkItem] = useState(null);
  const [materialToReplace, setMaterialToReplace] = useState(null);
  const [allMaterialsForDialog, setAllMaterialsForDialog] = useState([]); // ✅ Материалы с Infinite Scroll
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState(''); // ✅ Для клиентского поиска
  
  // ✅ Пагинация для Infinite Scroll материалов
  const [materialsPage, setMaterialsPage] = useState(1);
  const [materialsHasMore, setMaterialsHasMore] = useState(true);
  const [materialsTotalRecords, setMaterialsTotalRecords] = useState(0);
  const MATERIALS_PAGE_SIZE = 50;
  
  // ✅ Ref для триггера Intersection Observer (автозагрузка при скролле)
  const loadMoreMaterialsRef = useRef(null);
  
  // ✅ Локальное хранилище для редактируемых полей (не вызывает ререндер)
  const editingValuesRef = useRef({});
  
  // ✅ State для модального окна коэффициента цен
  const [coefficientModalOpen, setCoefficientModalOpen] = useState(false);
  const [currentCoefficient, setCurrentCoefficient] = useState(0);
  const [originalPrices, setOriginalPrices] = useState(new Map()); // Сохраняем оригинальные цены работ
  
  // ✅ State для экспорта Excel
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // ✅ State для сохранения как шаблон
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({ name: '', description: '', category: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // ✅ Кеш материалов для быстрого открытия модалки
  const materialsCache = useRef(null);
  const materialsCacheTimestamp = useRef(null);
  const MATERIALS_CACHE_TTL = 5 * 60 * 1000; // 5 минут
  
  // ✅ Кеш для справочника работ (отдельно для global и tenant)
  const worksCache = useRef({ global: null, tenant: null });
  const worksCacheTimestamp = useRef({ global: null, tenant: null });
  const WORKS_CACHE_TTL = 10 * 60 * 1000; // 10 минут
  
  // ✅ Загрузка материалов с пагинацией (аналогично основному справочнику)
  const loadMaterialsForDialog = useCallback(async (pageNumber = 1, resetData = false, search = '') => {
    try {
      setLoadingMaterials(true);
      const startTime = performance.now(); // ⏱️ Замер времени
      
      const params = {
        page: pageNumber,
        pageSize: 100, // ✅ Увеличено до 100 для лучшего UX (было 50)
        skipCount: pageNumber > 1 ? 'true' : 'false'
      };
      if (search && search.trim().length > 0) {
        params.search = search.trim(); // ✅ Серверный поиск
      }
      
      const response = await materialsAPI.getAll(params);
      
      // Нормализация данных
      const normalizeMaterial = (mat) => ({
        ...mat,
        productUrl: mat.product_url || mat.productUrl,
        showImage: mat.show_image !== undefined ? mat.show_image : mat.showImage,
        isGlobal: mat.is_global !== undefined ? mat.is_global : mat.isGlobal,
        autoCalculate: mat.auto_calculate !== undefined ? mat.auto_calculate : mat.autoCalculate
      });
      
      let newMaterials = [];
      if (response.data) {
        newMaterials = response.data.map(normalizeMaterial);
      } else {
        const data = Array.isArray(response) ? response : [];
        newMaterials = data.map(normalizeMaterial);
      }
      
      // Получаем общее количество
      const total = response.total !== null && response.total !== undefined 
        ? response.total 
        : (materialsTotalRecords || response.count || newMaterials.length);
      setMaterialsTotalRecords(total);
      
      // Добавляем или заменяем данные
      if (resetData) {
        setAllMaterialsForDialog(newMaterials);
        setMaterialsPage(1);
        setMaterialsHasMore(newMaterials.length < total);
      } else {
        setAllMaterialsForDialog(prev => {
          const updated = [...prev, ...newMaterials];
          setMaterialsHasMore(updated.length < total);
          return updated;
        });
        setMaterialsPage(pageNumber);
      }
      
      // ⏱️ Логирование производительности
      const duration = performance.now() - startTime;
      console.log(`✅ Материалы загружены: ${duration.toFixed(0)}ms | страница ${pageNumber} | записей ${newMaterials.length} | всего ${total}`);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки материалов:', error);
      setAllMaterialsForDialog([]);
    } finally {
      setLoadingMaterials(false);
    }
  }, [materialsTotalRecords]);

  // ❌ ОТКЛЮЧЕНО: Автосохранение убрано для улучшения производительности
  // Сохранение теперь только по кнопке "Сохранить"

  // ✅ Загрузить работы с кешированием
  const loadWorksCached = useCallback(async (sourceType) => {
    const now = Date.now();
    
    // Проверяем валидность кеша
    if (worksCache.current[sourceType] && 
        worksCacheTimestamp.current[sourceType] && 
        (now - worksCacheTimestamp.current[sourceType]) < WORKS_CACHE_TTL) {
      // Используем кеш - мгновенная загрузка!
      console.log(`✅ Кеш работ (${sourceType}): ${worksCache.current[sourceType].length} записей`);
      setAvailableWorks(worksCache.current[sourceType]);
      setLoadingWorks(false);
      return;
    }
    
    // Кеш устарел или отсутствует - загружаем заново
    try {
      setLoadingWorks(true);
      setErrorWorks(null);
      
      console.log(`🔄 Загрузка работ из API (${sourceType})...`);
      
      // Фильтруем по типу справочника
      const isGlobal = sourceType === 'global';
      
      // Загружаем ВСЕ работы
      const response = await worksAPI.getAll({ 
        isGlobal: isGlobal.toString(),
        pageSize: 10000 // Загружаем все записи для виртуализации
      });
      
      // Извлекаем массив data из response
      const data = response.data || response;
      
      // Check if data is empty
      if (!data || !Array.isArray(data) || data.length === 0) {
        setErrorWorks('В справочнике пока нет работ. Добавьте работы в разделе "Справочники" → "Работы"');
        setAvailableWorks([]);
        worksCache.current[sourceType] = [];
        worksCacheTimestamp.current[sourceType] = now;
        return;
      }
      
      // Transform API data to match expected format
      const transformedWorks = data.map(work => ({
        id: work.id.toString(),
        code: work.code,
        name: work.name,
        category: work.section || '', // ✅ Используем section как category
        unit: work.unit,
        price: work.base_price || 0,
        phase: work.phase || '',
        section: work.section || '',
        subsection: work.subsection || ''
      }));
      
      // Сохраняем в кеш
      worksCache.current[sourceType] = transformedWorks;
      worksCacheTimestamp.current[sourceType] = now;
      
      setAvailableWorks(transformedWorks);
      console.log(`✅ Работы загружены и закешированы (${sourceType}): ${transformedWorks.length} записей`);
    } catch (err) {
      console.error('Ошибка загрузки работ:', err);
      const errorMessage = err.response?.status === 401 
        ? 'Требуется авторизация. Войдите в систему для доступа к справочнику работ.'
        : err.message || 'Не удалось загрузить данные';
      setErrorWorks(errorMessage);
    } finally {
      setLoadingWorks(false);
    }
  }, []);

  // Fetch works from API при изменении вкладки
  useEffect(() => {
    const sourceType = workSourceTab === 'global' ? 'global' : 'tenant';
    loadWorksCached(sourceType);
  }, [workSourceTab, loadWorksCached]); // ★ Используем кешированную загрузку!

  // Смета - данные загружаются из localStorage или начинаются с пустого состояния
  // ✅ ИСПРАВЛЕНИЕ: НЕ загружаем из localStorage при инициализации
  // Данные всегда загружаются из БД через useEffect
  const [estimateData, setEstimateData] = useState({ sections: [] });
  
  // ✅ ОПТИМИЗАЦИЯ: Отложенное обновление для таблицы (не блокирует ввод)
  const deferredEstimateData = useDeferredValue(estimateData);
  
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
  
  // 🛡️ ЗАЩИТА: Флаг завершения начальной загрузки данных (предотвращает автосохранение пустой сметы)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // ✅ Ref для callback onUnsavedChanges (избегаем лишних зависимостей)
  const onUnsavedChangesRef = useRef(onUnsavedChanges);
  
  useEffect(() => {
    onUnsavedChangesRef.current = onUnsavedChanges;
  }, [onUnsavedChanges]);

  // ❌ ОТКЛЮЧЕНО: Автоматическое сворачивание основного сайдбара
  // useEffect(() => {
  //   // Cleanup функция - выполнится при размонтировании компонента
  //   return () => {
  //     // Если сайдбар был открыт (режим расчета), закрываем его
  //     if (sidebarVisible) {
  //       // Закрываем основной левый сайдбар, если он был открыт
  //       handlerDrawerOpen(false);
  //     }
  //   };
  // }, [sidebarVisible]); // Зависимость от sidebarVisible чтобы знать текущее состояние

  // ❌ УДАЛЕНО: Сохранение в localStorage больше не нужно
  // Данные хранятся только в БД, localStorage используется только для estimateId

  // ✅ Экспортируем метод save для родительского компонента
  useImperativeHandle(ref, () => ({
    save: handleSaveToDatabase
  }));

  // ❌ УБРАН useEffect отслеживания изменений - он вызывал лаги
  // Флаг hasUnsavedChanges теперь ставится напрямую при изменениях

  // Фильтрация работ с полнотекстовым поиском
  // Поддерживает поиск по нескольким словам одновременно
  // ✅ Работы после поиска (для подсчёта в фильтрах)
  const worksAfterSearch = useMemo(() => {
    if (!searchTerm) return availableWorks;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return availableWorks.filter(work => {
      // Поиск по всем полям: название, код, раздел, подраздел
      const searchableText = [
        work.name,
        work.code,
        work.section,
        work.subsection
      ].filter(Boolean).join(' ').toLowerCase();
      
      // Поддержка поиска по нескольким словам (все слова должны присутствовать)
      const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
      return searchWords.every(word => searchableText.includes(word));
    });
  }, [searchTerm, availableWorks]);

  const filteredWorks = useMemo(() => {
    let works = worksAfterSearch;
    
    // Фильтруем по выбранной стадии (разделу)
    if (selectedSection) {
      works = works.filter(work => work.section === selectedSection);
    }
    
    return works;
  }, [selectedSection, worksAfterSearch]);
  
  // ✅ Получаем уникальные стадии (разделы) из работ после поиска
  const availableSections = useMemo(() => {
    const sections = new Set();
    worksAfterSearch.forEach(work => {
      if (work.section) {
        sections.add(work.section);
      }
    });
    
    return Array.from(sections).sort();
  }, [worksAfterSearch]);

  // ✅ Материалы теперь загружаются с сервера при поиске - клиентская фильтрация не нужна

  // Получить ID работ, которые уже добавлены в смету (используем deferred для отложенного пересчёта)
  const addedWorkIds = useMemo(() => {
    const ids = new Set();
    deferredEstimateData?.sections?.forEach((section) => {
      section.items?.forEach((item) => {
        // ★ Приводим к строке для корректного сравнения с availableWorks[].id
        if (item.workId != null) {
          ids.add(item.workId.toString());
        }
      });
    });
    return ids;
  }, [deferredEstimateData]);

  // ❌ УДАЛЕНО: totalAmount не используется (дублирует calculateTotals)

  // Перенести выбранные работы в смету
  const handleTransferToEstimate = useCallback(async (customWorks = null) => {
    // Используем только явно переданные работы (customWorks)
    const worksToAdd = customWorks || [];
    
    if (worksToAdd.length === 0) {
      return;
    }

    // ✅ Показываем индикатор для конкретной работы
    const workId = worksToAdd[0]?.id;
    setAddingWorkId(workId);
    setTransferringWorks(true);

    try {
      // ⚡ Загружаем материалы ОДНИМ запросом для всех работ
      const workIds = worksToAdd.map(w => w.id);
      const materialsMap = await workMaterialsAPI.getMaterialsForMultipleWorks(workIds);

      // Формируем worksWithMaterials из полученной карты
      const worksWithMaterials = worksToAdd.map(work => ({
        work,
        materials: materialsMap[work.id] || []
      }));

      // ✅ Обновляем состояние синхронно (без setTimeout) для быстрого отклика
      setEstimateData((prevData) => {
        // ✅ Глубокая копия секций для React.memo
        const newSections = prevData.sections.map(section => ({
          ...section,
          items: [...section.items]
        }));

        worksWithMaterials.forEach(({ work, materials }) => {
          const phaseKey = work.phase || 'Без фазы';
          const sectionCode = work.code ? work.code.split(/[-–]/)[0] : '00';

          let sectionIndex = newSections.findIndex((s) => s.title === phaseKey);

          if (sectionIndex === -1) {
            newSections.push({
              id: `s${sectionCode}-${Date.now()}`,
              code: sectionCode,
              title: phaseKey,
              name: phaseKey,
              items: [],
              subtotal: 0
            });
            sectionIndex = newSections.length - 1;
          }

          const defaultQuantity = 0;

          const calculatedMaterials = materials.map((mat) => ({
            id: `${mat.material_id}-${Date.now()}-${Math.random()}`,
            material_id: mat.material_id,
            code: mat.material_sku || `M-${mat.material_id}`,
            name: mat.material_name,
            unit: mat.material_unit,
            quantity: parseFloat((defaultQuantity * mat.consumption).toFixed(2)),
            price: mat.material_price,
            total: parseFloat((defaultQuantity * mat.consumption * mat.material_price).toFixed(2)),
            consumption: parseFloat(mat.consumption),
            auto_calculate: true
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

          // Создаём новый массив items (для React.memo)
          newSections[sectionIndex] = {
            ...newSections[sectionIndex],
            items: [...newSections[sectionIndex].items, newItem]
          };

          // Сортируем
          sortWorkItems(newSections[sectionIndex].items);

          // Пересчитываем subtotal
          newSections[sectionIndex].subtotal = newSections[sectionIndex].items.reduce(
            (sum, item) => sum + item.total, 0
          );
        });

        // Сортируем разделы по коду
        newSections.sort((a, b) => {
          const codeA = a.code || '00';
          const codeB = b.code || '00';
          return codeA.localeCompare(codeB);
        });

        // Сохраняем оригинальные цены новых работ
        saveOriginalPrices(newSections);
        
        return { sections: newSections };
      });
      
      setHasUnsavedChanges(true);
      
    } finally {
      setTransferringWorks(false);
      setAddingWorkId(null);
    }
  }, []);

  // Toggle режима расчёта/просмотра - справочник как overlay, главный сайдбар НЕ трогаем
  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };

  // ✅ Справочник работ теперь overlay - не требует cleanup

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
      
      // 🔥 FIX: Используем axiosInstance для правильного baseURL в production
      const response = await axiosInstance.post('/export-estimate-excel', exportData, {
        responseType: 'blob' // Важно для получения Excel файла
      });

      // Скачиваем файл
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate_${estimateId || 'new'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка экспорта Excel:', error);
      alert('Не удалось экспортировать Excel. Проверьте консоль для деталей.');
    } finally {
      setExportingExcel(false);
    }
  };

  // ============ СОХРАНЕНИЕ КАК ШАБЛОН ============
  const handleSaveAsTemplate = () => {
    if (!estimateId) {
      showSnackbar('Сначала сохраните смету в БД', 'warning');
      return;
    }
    
    if (estimateData.sections.length === 0) {
      showSnackbar('Смета пуста. Добавьте работы перед сохранением шаблона', 'warning');
      return;
    }
    
    // Открываем диалог
    setTemplateFormData({
      name: `Шаблон: ${estimateMetadata.name || 'Без названия'}`,
      description: estimateMetadata.description || '',
      category: ''
    });
    setSaveTemplateDialogOpen(true);
  };

  const handleSaveTemplateConfirm = async () => {
    try {
      setSavingTemplate(true);
      
      // Объединяем estimateId и данные формы в один объект
      await estimateTemplatesAPI.createTemplate({
        estimateId,
        ...templateFormData
      });
      
      showSnackbar('Шаблон успешно создан!', 'success');
      setSaveTemplateDialogOpen(false);
    } catch (error) {
      console.error('Error creating template:', error);
      showSnackbar(
        error.response?.data?.message || 'Ошибка при создании шаблона',
        'error'
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleTemplateFormChange = (field) => (event) => {
    setTemplateFormData({
      ...templateFormData,
      [field]: event.target.value
    });
  };

  // ============ ДЕЙСТВИЯ С МАТЕРИАЛАМИ ============

  // Открыть диалог добавления материала
  const handleOpenAddMaterial = useCallback(async (sectionIndex, itemIndex) => {
    setCurrentWorkItem({ sectionIndex, itemIndex });
    setMaterialDialogMode('add');
    setMaterialSearchQuery('');
    setAllMaterialsForDialog([]); // ✅ Очищаем перед загрузкой
    setMaterialsPage(1);
    setMaterialsHasMore(true);
    setMaterialDialogOpen(true);
    
    // ✅ Загружаем первую страницу
    await loadMaterialsForDialog(1, true);
  }, [loadMaterialsForDialog]);

  // Открыть диалог замены материала
  const handleOpenReplaceMaterial = useCallback(async (sectionIndex, itemIndex, materialIndex) => {
    setCurrentWorkItem({ sectionIndex, itemIndex });
    setMaterialToReplace(materialIndex);
    setMaterialDialogMode('replace');
    setMaterialSearchQuery('');
    setAllMaterialsForDialog([]); // ✅ Очищаем перед загрузкой
    setMaterialsPage(1);
    setMaterialsHasMore(true);
    setMaterialDialogOpen(true);
    
    // ✅ Загружаем первую страницу
    await loadMaterialsForDialog(1, true);
  }, [loadMaterialsForDialog]);

  // ✅ НОВАЯ ЛОГИКА: Debounced серверный поиск (вместо клиентской фильтрации)
  // Поиск запускается автоматически через 400ms после прекращения ввода
  const debouncedSearchRef = useRef(null);
  
  const handleMaterialSearchChange = useCallback((query) => {
    setMaterialSearchQuery(query);
    
    // Очищаем предыдущий таймер
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current);
    }
    
    // Если пустой запрос - загружаем первую страницу без поиска
    if (!query || query.trim().length === 0) {
      loadMaterialsForDialog(1, true, '');
      return;
    }
    
    // Запускаем поиск через 400ms
    debouncedSearchRef.current = setTimeout(() => {
      console.log(`🔍 Поиск материалов: "${query}"`);
      loadMaterialsForDialog(1, true, query.trim());
    }, 400); // Debounce 400ms
  }, [loadMaterialsForDialog]);
  
  // ✅ Убираем клиентскую фильтрацию - теперь все данные приходят с сервера
  const filteredMaterialsForDialog = allMaterialsForDialog;
  
  // ✅ Функция загрузки следующей страницы материалов
  const loadMoreMaterials = useCallback(() => {
    if (!loadingMaterials && materialsHasMore && !materialSearchQuery) {
      loadMaterialsForDialog(materialsPage + 1, false, materialSearchQuery);
    }
  }, [loadingMaterials, materialsHasMore, materialsPage, materialSearchQuery, loadMaterialsForDialog]);
  
  // ✅ Intersection Observer для автозагрузки материалов при скролле
  useEffect(() => {
    if (!loadMoreMaterialsRef.current || loadingMaterials || !materialsHasMore || materialSearchQuery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Когда триггер становится видимым - загружаем ещё данные
        if (entries[0].isIntersecting && !loadingMaterials && materialsHasMore) {
          loadMoreMaterials();
        }
      },
      {
        rootMargin: '200px', // Начинаем загрузку за 200px до конца
        threshold: 0.01
      }
    );

    observer.observe(loadMoreMaterialsRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loadingMaterials, materialsHasMore, materialsPage, materialSearchQuery, loadMoreMaterials]);

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

    // ✅ НЕ закрываем диалог, чтобы можно было добавить несколько материалов подряд
    // Диалог закроется только при клике на крестик или вне диалога
    // setMaterialDialogOpen(false);
    // setCurrentWorkItem(null);
    
    // Показываем уведомление об успешном добавлении
    showSnackbar(`✅ Материал "${material.name}" добавлен`, 'success');
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
  const handleDeleteMaterial = useCallback((sectionIndex, itemIndex, materialIndex) => {
    if (!window.confirm('Удалить этот материал?')) return;

    setHasUnsavedChanges(true);
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      const item = newSections[sectionIndex].items[itemIndex];
      item.materials.splice(materialIndex, 1);
      return { sections: newSections };
    });
  }, []);
  
  // ❌ КАЛЬКУЛЯТОР ОТКЛЮЧЕН - теперь только прямой ввод чисел
  // const calculateExpression = ... (удалено для производительности)
  
  // ✅ ОПТИМИЗИРОВАНО: onChange только сохраняет в ref (без ререндера)
  const handleMaterialConsumptionChange = useCallback((sectionIndex, itemIndex, materialIndex, newConsumption) => {
    const key = `cons_${sectionIndex}_${itemIndex}_${materialIndex}`;
    editingValuesRef.current[key] = newConsumption;
  }, []);
  
  // ✅ ОПТИМИЗИРОВАНО: Обработка при потере фокуса для расхода (onBlur)
  const handleMaterialConsumptionBlur = useCallback((sectionIndex, itemIndex, materialIndex, inputElement) => {
    const key = `cons_${sectionIndex}_${itemIndex}_${materialIndex}`;
    const currentValue = editingValuesRef.current[key] ?? inputElement?.value;
    
    // Очищаем ref
    delete editingValuesRef.current[key];
    
    setTimeout(() => {
      // Если пустое значение, ничего не делаем
      if (currentValue === '' || currentValue === null || currentValue === undefined) {
        return;
      }
      
      // ✅ УПРОЩЕНО: просто parseFloat без калькулятора
      const consumption = parseFloat(String(currentValue).replace(/,/g, '.'));
      
      // Если результат не число, ничего не делаем
      if (isNaN(consumption) || consumption < 0) {
        return;
      }
      
      setHasUnsavedChanges(true);
      setEstimateData((prevData) => {
        // ✅ Глубокая копия для корректной работы React.memo
        const newSections = prevData.sections.map((section, secIdx) => {
          if (secIdx !== sectionIndex) return section;
          
          return {
            ...section,
            items: section.items.map((item, itIdx) => {
              if (itIdx !== itemIndex) return item;
              
              return {
                ...item,
                materials: item.materials.map((mat, matIdx) => {
                  if (matIdx !== materialIndex) return mat;
                  
                  const isAutoCalculate = mat.auto_calculate || mat.autoCalculate;
                  const newQuantity = isAutoCalculate 
                    ? parseFloat((item.quantity * consumption).toFixed(2))
                    : mat.quantity;
                  
                  return {
                    ...mat,
                    consumption: consumption,
                    quantity: newQuantity,
                    total: parseFloat((newQuantity * mat.price).toFixed(2))
                  };
                })
              };
            })
          };
        });
        
        return { sections: newSections };
      });
    }, 50); // 50ms задержка для плавного перехода фокуса
  }, []);
  
  // ✅ ОПТИМИЗИРОВАНО: onChange только сохраняет в ref (без ререндера)
  const handleMaterialQuantityInputChange = useCallback((sectionIndex, itemIndex, materialIndex, value) => {
    const key = `mat_${sectionIndex}_${itemIndex}_${materialIndex}`;
    editingValuesRef.current[key] = value;
  }, []);
  
  // ✅ ОПТИМИЗИРОВАНО: Обработка при потере фокуса - только обновляем данные
  const handleMaterialQuantityBlur = useCallback((sectionIndex, itemIndex, materialIndex, inputElement) => {
    const key = `mat_${sectionIndex}_${itemIndex}_${materialIndex}`;
    const inputValue = editingValuesRef.current[key] ?? inputElement?.value;
    
    // Очищаем ref
    delete editingValuesRef.current[key];
    
    // ✅ ОПТИМИЗАЦИЯ: Увеличиваем задержку чтобы браузер успел обработать фокус нового поля
    setTimeout(() => {
      // Если пустое значение, ничего не делаем
      if (inputValue === '' || inputValue === null || inputValue === undefined) {
        return;
      }
      
      // ✅ УПРОЩЕНО: просто parseFloat без калькулятора
      const quantity = parseFloat(String(inputValue).replace(/,/g, '.'));
      
      // Если результат не число, ничего не делаем
      if (isNaN(quantity) || quantity < 0) {
        return;
      }
      
      // ✅ Ставим флаг изменений и обновляем данные
      setHasUnsavedChanges(true);
      setEstimateData((prevData) => {
        // ✅ Глубокая копия для корректной работы React.memo
        const newSections = prevData.sections.map((section, secIdx) => {
          if (secIdx !== sectionIndex) return section;
          
          return {
            ...section,
            items: section.items.map((item, itIdx) => {
              if (itIdx !== itemIndex) return item;
              
              return {
                ...item,
                materials: item.materials.map((mat, matIdx) => {
                  if (matIdx !== materialIndex) return mat;
                  
                  return {
                    ...mat,
                    quantity: quantity,
                    auto_calculate: false,
                    autoCalculate: false,
                    total: parseFloat((quantity * mat.price).toFixed(2))
                  };
                })
              };
            })
          };
        });
        
        return { sections: newSections };
      });
    }, 50); // 50ms задержка для плавного перехода фокуса
  }, []);

  // Удалить работу (блок) вместе со всеми материалами
  const handleDeleteWork = useCallback((sectionIndex, itemIndex) => {
    if (!window.confirm('Удалить эту работу и все связанные материалы?')) return;

    setHasUnsavedChanges(true);
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      newSections[sectionIndex].items.splice(itemIndex, 1);

      // Если в разделе больше нет работ - удаляем раздел
      if (newSections[sectionIndex].items.length === 0) {
        newSections.splice(sectionIndex, 1);
      }

      return { sections: newSections };
    });
  }, []);

  // ============ РЕДАКТИРОВАНИЕ КОЛИЧЕСТВА ============

  // ✅ ОПТИМИЗИРОВАНО: onChange только сохраняет в ref (без ререндера)
  const handleWorkQuantityInputChange = useCallback((sectionIndex, itemIndex, value) => {
    const key = `work_${sectionIndex}_${itemIndex}`;
    editingValuesRef.current[key] = value;
  }, []);

  // ✅ ОПТИМИЗИРОВАНО: Пересчёт только при onBlur с задержкой
  const handleWorkQuantityBlur = useCallback((sectionIndex, itemIndex, inputElement) => {
    const key = `work_${sectionIndex}_${itemIndex}`;
    const newQuantity = editingValuesRef.current[key] ?? inputElement?.value;
    
    // Очищаем ref
    delete editingValuesRef.current[key];
    
    // ✅ ОПТИМИЗАЦИЯ: задержка для плавного перехода фокуса
    setTimeout(() => {
      setHasUnsavedChanges(true);
      handleWorkQuantityChange(sectionIndex, itemIndex, newQuantity);
    }, 50);
  }, []);

  // Изменить количество работы (с автопересчётом материалов) - вызывается только при onBlur
  const handleWorkQuantityChange = (sectionIndex, itemIndex, newQuantity) => {
    // ✅ Разрешаем пустую строку (для полного стирания)
    if (newQuantity === '' || newQuantity === null || newQuantity === undefined) {
      setEstimateData((prevData) => {
        // ✅ Глубокая копия для корректной работы React.memo
        const newSections = prevData.sections.map((section, secIdx) => {
          if (secIdx !== sectionIndex) return section;
          
          return {
            ...section,
            items: section.items.map((item, itIdx) => {
              if (itIdx !== itemIndex) return item;
              
              const newItem = {
                ...item,
                quantity: 0,
                total: 0
              };
              
              // Обнуляем материалы (только автоматические)
              if (item.materials && item.materials.length > 0) {
                newItem.materials = item.materials.map((material) => {
                  const isAutoCalculate = material.auto_calculate !== undefined 
                    ? material.auto_calculate 
                    : material.autoCalculate !== false;
                  
                  if (isAutoCalculate) {
                    return { ...material, quantity: 0, total: 0 };
                  } else {
                    return { ...material, total: 0 };
                  }
                });
              }
              
              return newItem;
            }),
            subtotal: 0
          };
        });
        
        // Пересчитываем subtotal
        newSections[sectionIndex].subtotal = newSections[sectionIndex].items.reduce(
          (sum, item) => sum + item.total, 0
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
      // ✅ Глубокая копия для корректной работы React.memo
      const newSections = prevData.sections.map((section, secIdx) => {
        if (secIdx !== sectionIndex) return section;
        
        return {
          ...section,
          items: section.items.map((item, itIdx) => {
            if (itIdx !== itemIndex) return item;
            
            // Создаём новый объект работы
            const newItem = {
              ...item,
              quantity: quantity,
              total: quantity * item.price
            };
            
            // ★ ПЕРЕСЧЁТ МАТЕРИАЛОВ
            if (item.materials && item.materials.length > 0) {
              newItem.materials = item.materials.map((material) => {
                const isAutoCalculate = material.auto_calculate !== undefined 
                  ? material.auto_calculate 
                  : material.autoCalculate !== false;
                
                if (isAutoCalculate) {
                  const newMatQty = parseFloat((quantity * (material.consumption || 0)).toFixed(2));
                  return {
                    ...material,
                    quantity: newMatQty,
                    total: parseFloat((newMatQty * material.price).toFixed(2))
                  };
                } else {
                  return {
                    ...material,
                    total: parseFloat((material.quantity * material.price).toFixed(2))
                  };
                }
              });
            }
            
            return newItem;
          }),
          subtotal: 0 // Пересчитаем ниже
        };
      });
      
      // Пересчитываем subtotal для изменённой секции
      newSections[sectionIndex].subtotal = newSections[sectionIndex].items.reduce(
        (sum, item) => sum + item.total, 0
      );

      return { sections: newSections };
    });
  };

  // ============ ИЗМЕНЕНИЕ ЦЕНЫ РАБОТЫ ============
  
  // ✅ ОПТИМИЗИРОВАНО: onChange только сохраняет в ref (без ререндера)
  const handleWorkPriceInputChange = useCallback((sectionIndex, itemIndex, value) => {
    const key = `work_price_${sectionIndex}_${itemIndex}`;
    editingValuesRef.current[key] = value;
  }, []);

  // ✅ ОПТИМИЗИРОВАНО: Пересчёт только при onBlur с задержкой
  const handleWorkPriceBlur = useCallback((sectionIndex, itemIndex, inputElement) => {
    const key = `work_price_${sectionIndex}_${itemIndex}`;
    const newPrice = editingValuesRef.current[key] ?? inputElement?.value;
    
    // Очищаем ref
    delete editingValuesRef.current[key];
    
    // ✅ ОПТИМИЗАЦИЯ: задержка для плавного перехода фокуса
    setTimeout(() => {
      if (newPrice === '' || newPrice === null || newPrice === undefined) {
        return;
      }
      
      const price = parseFloat(String(newPrice).replace(/,/g, '.'));
      
      if (isNaN(price) || price < 0) {
        return;
      }
      
      setHasUnsavedChanges(true);
      handleWorkPriceChange(sectionIndex, itemIndex, price);
    }, 50);
  }, []);

  // Изменить цену работы
  const handleWorkPriceChange = (sectionIndex, itemIndex, newPrice) => {
    setEstimateData((prevData) => {
      const newSections = prevData.sections.map((section, secIdx) => {
        if (secIdx !== sectionIndex) return section;
        
        return {
          ...section,
          items: section.items.map((item, itIdx) => {
            if (itIdx !== itemIndex) return item;
            
            // Пересчитываем total работы
            const newTotal = parseFloat((item.quantity * newPrice).toFixed(2));
            
            return {
              ...item,
              price: newPrice,
              total: newTotal
            };
          }),
          subtotal: 0 // Пересчитаем ниже
        };
      });
      
      // Пересчитываем subtotal для изменённой секции
      newSections[sectionIndex].subtotal = newSections[sectionIndex].items.reduce(
        (sum, item) => sum + item.total, 0
      );

      return { sections: newSections };
    });
  };

  // Обновить базовую цену работы в справочнике
  const handleUpdateWorkPriceInReference = async (sectionIndex, itemIndex, workId, currentPrice) => {
    // Показываем диалог подтверждения
    const confirmed = window.confirm(
      `Обновить базовую цену в справочнике Работ?\n\n` +
      `Новая цена: ${currentPrice} ₽\n\n` +
      `⚠️ ВНИМАНИЕ: Это изменит базовую цену работы в справочнике.\n` +
      `Все новые сметы будут использовать обновлённую цену.`
    );
    
    if (!confirmed) return;
    
    try {
      // Вызываем API для обновления цены
      const response = await worksAPI.updateWorkPrice(workId, currentPrice);
      
      if (response.success) {
        enqueueSnackbar('✅ Базовая цена обновлена в справочнике Работ', { 
          variant: 'success',
          autoHideDuration: 3000
        });
      }
    } catch (error) {
      console.error('Ошибка обновления цены работы:', error);
      enqueueSnackbar(
        `❌ Ошибка обновления: ${error.response?.data?.message || error.message}`, 
        { variant: 'error', autoHideDuration: 5000 }
      );
    }
  };

  // ============ КОНЕЦ ДЕЙСТВИЙ С ЦЕНОЙ РАБОТЫ ============

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
    setEstimateData((prevData) => {
      const newSections = [...prevData.sections];
      
      newSections.forEach((section) => {
        section.items.forEach((item) => {
          const key = item.workId || `${item.code}_${item.name}`;
          
          // Восстанавливаем оригинальную цену
          const originalPrice = originalPrices.get(key);
          
          if (originalPrice !== undefined) {
            item.price = originalPrice;
            
            // Пересчитываем сумму работы
            item.total = parseFloat((item.quantity * originalPrice).toFixed(2));
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

  // Сохранить смету в БД (isAutoSave = true для тихого автосохранения)
  const handleSaveToDatabase = async (isAutoSave = false) => {
    try {
      // 🛡️ ЗАЩИТА #3: Подтверждение при сохранении пустой сметы (только для ручного сохранения)
      if (!isAutoSave && (estimateData.sections.length === 0 || 
          estimateData.sections.every(s => !s.items || s.items.length === 0))) {
        const confirmSave = window.confirm(
          '⚠️ ВНИМАНИЕ!\n\n' +
          'Смета пустая - в ней нет ни одной работы.\n\n' +
          'Вы уверены, что хотите сохранить пустую смету?\n' +
          'Это удалит все существующие данные из базы данных!'
        );
        
        if (!confirmSave) {
          console.log('❌ Сохранение пустой сметы отменено пользователем');
          return;
        }
        
        console.warn('⚠️ Пользователь подтвердил сохранение пустой сметы');
      }
      
      // При автосохранении пустой сметы - пропускаем (не удаляем данные автоматически)
      if (isAutoSave && (estimateData.sections.length === 0 || 
          estimateData.sections.every(s => !s.items || s.items.length === 0))) {
        console.log('⏭️ Автосохранение пустой сметы пропущено');
        return;
      }
      
      // Показываем UI индикатор только при ручном сохранении
      if (!isAutoSave) {
        setSaving(true);
        showSnackbar('Смета сохраняется...', 'info');
      }

      // Преобразуем estimateData в формат API
      // ✅ Подготавливаем данные для сохранения
      const items = [];
      
      // Клонируем sections и сортируем работы перед сохранением
      const sortedSections = estimateData.sections.map(section => ({
        ...section,
        items: [...section.items] // Клонируем массив работ
      }));
      
      // Сортируем работы внутри каждого раздела перед сохранением
      sortedSections.forEach(section => {
        sortWorkItems(section.items);
      });
      
      // Формируем items из отсортированных разделов
      sortedSections.forEach((section) => {
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

      // ✅ Разрешаем сохранять даже если нет позиций или все с quantity = 0
      // Пользователь увидит красную подсветку и сможет исправить

      let savedEstimate;
      
      // ✅ ИСПРАВЛЕНИЕ: Используем estimateId из URL для UPDATE, иначе CREATE
      if (estimateId) {
        // Обновляем существующую смету (с полной перезаписью items)
        savedEstimate = await estimatesAPI.updateWithItems(estimateId, estimatePayload);
        showSnackbar(`Смета успешно обновлена! ID: ${savedEstimate.id}`, 'success');
      } else {
        // Создаем новую смету
        savedEstimate = await estimatesAPI.create(estimatePayload);
        showSnackbar(`Смета успешно создана! ID: ${savedEstimate.id}`, 'success');
        
        // Сохраняем ID сметы в localStorage только для новых смет
        localStorage.setItem('currentEstimateId', savedEstimate.id);
        localStorage.setItem(`estimate_${projectId}`, savedEstimate.id);
      }
      
      // ✅ НЕ ОБНОВЛЯЕМ estimateData из savedEstimate!
      // Причина: savedEstimate содержит данные из БД, которые могут отличаться от текущего состояния
      // Например: пользователь добавил работу, сохранил, добавил еще одну - вторая потеряется!
      
      // ✅ Обновляем savedEstimateDataRef ТЕКУЩИМ состоянием (что сейчас в UI)
      savedEstimateDataRef.current = JSON.stringify(estimateData);
      setHasUnsavedChanges(false);
      if (onUnsavedChangesRef.current) {
        onUnsavedChangesRef.current(false);
      }
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
        return;
      }
      
      // ✅ Сбрасываем флаг загрузки при изменении estimateId
      isInitialLoadRef.current = false;
      
      try {
        setLoading(true);
        isInitialLoadRef.current = true; // Отмечаем, что загрузка началась
        console.log('🔄 Loading estimate:', estimateIdToLoad);

        const estimate = await estimatesAPI.getById(estimateIdToLoad);
        
        // ✅ ВАЖНО: Проверяем, что смета принадлежит текущему проекту
        if (projectId && estimate.project_id !== projectId) {
          localStorage.removeItem('currentEstimateId'); // Очищаем неверный ID
          setLoading(false);
          return;
        }

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

        // Преобразуем данные из API в формат estimateData
        const sections = [];
        
        estimate.items.forEach((item) => {
          // Группируем работы по ФАЗЕ (Этап №0, Этап №1, и т.д.)
          const phaseKey = item.phase || 'Без фазы';
          const sectionCode = item.code ? item.code.split(/[-–]/)[0] : '00';
          
          // Находим или создаем секцию по ФАЗЕ
          let section = sections.find(s => s.title === phaseKey);
          if (!section) {
            section = { 
              id: `s${sectionCode}-${Date.now()}`,
              code: sectionCode,
              title: phaseKey,
              name: phaseKey,
              items: [],
              subtotal: 0
            };
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

        // ✅ Сортируем работы внутри каждого раздела: Фаза → Код → Стадия → Подстадия
        sections.forEach(section => {
          sortWorkItems(section.items);
          // Пересчитываем subtotal раздела
          section.subtotal = section.items.reduce((sum, item) => sum + (item.total || 0), 0);
        });

        setEstimateData({ 
          sections,
          ...projectData  // ✅ Добавляем данные проекта
        });
        
        // ✅ Обновляем savedEstimateDataRef после загрузки из БД
        savedEstimateDataRef.current = JSON.stringify({ sections, ...projectData });
        setHasUnsavedChanges(false);
        if (onUnsavedChangesRef.current) {
          onUnsavedChangesRef.current(false);
        }
        
        // 🛡️ ЗАЩИТА #2: Разрешаем автосохранение только ПОСЛЕ успешной загрузки
        setIsInitialLoadComplete(true);
        console.log('✅ Начальная загрузка завершена, автосохранение активировано');
        
        showSnackbar(`📂 Смета "${estimate.name}" загружена из БД`, 'info');
      } catch (error) {
        console.error('Error auto-loading estimate:', error);
        // Не показываем ошибку пользователю при автозагрузке
        localStorage.removeItem('currentEstimateId');
        // 🛡️ Даже при ошибке разрешаем автосохранение (чтобы не блокировать работу)
        setIsInitialLoadComplete(true);
      } finally {
        setLoading(false);
      }
    };

    loadSavedEstimate();
  }, [estimateId, projectId]); // Перезагружаем только при изменении estimateId или projectId

  // ✅ АВТОМАТИЧЕСКАЯ СОРТИРОВКА: мемоизируем отсортированные данные
  // ✅ ОПТИМИЗАЦИЯ: Используем deferredEstimateData для отложенного рендера таблицы
  const sortedEstimateData = useMemo(() => {
    if (!deferredEstimateData.sections || deferredEstimateData.sections.length === 0) {
      return deferredEstimateData;
    }

    const sortedSections = deferredEstimateData.sections.map(section => {
      if (!section.items || section.items.length <= 1) {
        return section;
      }

      // Создаем копию массива и сортируем
      const sortedItems = [...section.items];
      sortWorkItems(sortedItems);

      return {
        ...section,
        items: sortedItems
      };
    });

    return {
      ...deferredEstimateData,
      sections: sortedSections
    };
  }, [deferredEstimateData]);

  // ✅ Подсчет итогов по работам и материалам (используем deferred для отложенного пересчёта)
  const calculateTotals = useMemo(() => {
    let totalWorks = 0;
    let totalMaterials = 0;
    let totalWeight = 0; // 🔥 Добавлен подсчёт веса

    sortedEstimateData.sections.forEach(section => {
      section.items.forEach(item => {
        // Добавляем стоимость работы
        totalWorks += parseFloat(item.total) || 0;
        
        // Добавляем стоимость материалов и вес
        item.materials?.forEach(material => {
          totalMaterials += parseFloat(material.total) || 0;
          // 🔥 Подсчёт веса: quantity × weight
          totalWeight += (parseFloat(material.quantity) || 0) * (parseFloat(material.weight) || 0);
        });
      });
    });

    return {
      totalWorks: totalWorks.toFixed(2),
      totalMaterials: totalMaterials.toFixed(2),
      grandTotal: (totalWorks + totalMaterials).toFixed(2),
      totalWeight: totalWeight.toFixed(3) // 🔥 Вес в кг с точностью до грамма
    };
  }, [sortedEstimateData]); // ✅ Зависит от sortedEstimateData который уже deferred

  return (
    <Box>
      {/* ✅ Заголовок компонента */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          sx={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            color: '#111827',
            mb: 0.5,
            lineHeight: 1.3
          }}
        >
          Смета: {estimateMetadata.name || 'Без названия'}
        </Typography>
        <Typography 
          sx={{ 
            fontSize: '0.8125rem', 
            color: '#6B7280'
          }}
        >
          ID: {estimateId?.slice(0, 8) || 'новая'}...
        </Typography>
      </Box>

      {/* ✅ Панель действий - новый дизайн */}
      <Box 
        sx={{ 
          mb: 2, 
          display: 'flex', 
          gap: 1, 
          alignItems: 'center', 
          flexWrap: 'wrap',
          py: 1,
          px: 1.5,
          bgcolor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E5E7EB'
        }}
      >
        {/* Переключатель режима */}
        <Button
          variant={sidebarVisible ? "contained" : "outlined"}
          startIcon={sidebarVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          onClick={toggleSidebar}
          size="small"
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            height: 34,
            px: 1.5,
            borderRadius: '8px',
            ...(sidebarVisible ? {
              bgcolor: '#635BFF',
              '&:hover': { bgcolor: '#564EE6' }
            } : {
              color: '#374151',
              borderColor: '#E5E7EB',
              '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' }
            })
          }}
        >
          {sidebarVisible ? 'Режим просмотра' : 'Режим расчёта'}
        </Button>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Сохранить в БД - фиолетовая primary */}
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <IconPlus size={16} />}
          onClick={handleSaveToDatabase}
          size="small"
          disabled={estimateData.sections.length === 0 || saving}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            height: 34,
            px: 1.5,
            borderRadius: '8px',
            bgcolor: '#635BFF',
            '&:hover': { bgcolor: '#564EE6' },
            '&:active': { bgcolor: '#453DCC' },
            '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' }
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>

        {/* Сохранить как шаблон - белая с фиолетовой обводкой */}
        <Button
          variant="outlined"
          startIcon={<IconTemplate size={16} />}
          onClick={handleSaveAsTemplate}
          size="small"
          disabled={!estimateId || estimateData.sections.length === 0}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            height: 34,
            px: 1.5,
            borderRadius: '8px',
            color: '#635BFF',
            borderColor: '#635BFF',
            '&:hover': { borderColor: '#564EE6', bgcolor: '#F5F3FF' }
          }}
        >
          Шаблон
        </Button>

        {/* Коэффициент цен - вторичная */}
        <Button
          variant="outlined"
          startIcon={<IconPercentage size={16} />}
          onClick={() => setCoefficientModalOpen(true)}
          size="small"
          disabled={estimateData.sections.length === 0}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            height: 34,
            px: 1.5,
            borderRadius: '8px',
            color: '#374151',
            borderColor: '#E5E7EB',
            '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' }
          }}
        >
          Коэффициент
        </Button>

        {/* Очистить смету - мягкий красный */}
        <Button
          variant="outlined"
          startIcon={<IconTrash size={16} />}
          onClick={handleClearEstimate}
          size="small"
          disabled={estimateData.sections.length === 0}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            height: 34,
            px: 1.5,
            borderRadius: '8px',
            color: '#DC2626',
            borderColor: '#FCA5A5',
            '&:hover': { borderColor: '#F87171', bgcolor: '#FEF2F2' }
          }}
        >
          Очистить
        </Button>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Экспорт в Excel - зелёная */}
        <Button
          variant="outlined"
          startIcon={exportingExcel ? <CircularProgress size={16} /> : <IconFileTypeXls size={16} />}
          onClick={handleExportExcel}
          size="small"
          disabled={estimateData.sections.length === 0 || exportingExcel}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            height: 34,
            px: 1.5,
            borderRadius: '8px',
            color: '#16A34A',
            borderColor: '#86EFAC',
            '&:hover': { borderColor: '#4ADE80', bgcolor: '#F0FDF4' }
          }}
        >
          {exportingExcel ? 'Экспорт...' : 'Excel'}
        </Button>
      </Box>

      {/* Основной контейнер - смета на всю ширину (справочник теперь overlay drawer) */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 280px)', minHeight: 500 }}>
        {/* Справочник работ перенесен в Drawer (см. ниже) - этот блок будет удален */}
        <Box sx={{ display: 'none' }}>
          <Paper
            sx={{
              width: 420,
              height: '100%',
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

            {/* ✅ Кнопка открытия фильтров */}
            {availableSections.length > 0 && (
              <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Button
                  fullWidth
                  variant={selectedSection ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<IconFilter size={16} />}
                  onClick={() => setFiltersPanelOpen(true)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Фильтры
                  {selectedSection && (
                    <Chip 
                      label="1" 
                      size="small" 
                      color="primary"
                      sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                </Button>
              </Box>
            )}

            {/* ✅ Боковая панель фильтров */}
            <Drawer
              anchor="left"
              open={filtersPanelOpen}
              onClose={() => setFiltersPanelOpen(false)}
              sx={{
                '& .MuiDrawer-paper': {
                  width: 320,
                  boxSizing: 'border-box'
                }
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Заголовок */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    Фильтры
                  </Typography>
                  <IconButton size="small" onClick={() => setFiltersPanelOpen(false)}>
                    <IconX size={18} />
                  </IconButton>
                </Box>

                {/* Контент фильтров */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {/* Фильтр по стадии */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                      📋 По стадии
                    </Typography>
                    <FormControl component="fieldset" fullWidth>
                      <RadioGroup
                        value={selectedSection || 'all'}
                        onChange={(e) => setSelectedSection(e.target.value === 'all' ? null : e.target.value)}
                      >
                        <FormControlLabel
                          value="all"
                          control={<Radio size="small" />}
                          label={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                              <Typography variant="body2">Все</Typography>
                              <Chip label={worksAfterSearch.length} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            </Box>
                          }
                          sx={{ mb: 0.5 }}
                        />
                        {availableSections.map(section => {
                          // ✅ Считаем из работ ПОСЛЕ поиска, но ДО фильтрации по стадии
                          const count = worksAfterSearch.filter(w => w.section === section).length;
                          return (
                            <FormControlLabel
                              key={section}
                              value={section}
                              control={<Radio size="small" />}
                              label={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {section}
                                  </Typography>
                                  <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                </Box>
                              }
                              sx={{ mb: 0.5 }}
                            />
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                  </Box>
                </Box>

                {/* Кнопки действий */}
                <Box sx={{ 
                  p: 2, 
                  borderTop: 1, 
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 1
                }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedSection(null);
                      setFiltersPanelOpen(false);
                    }}
                  >
                    Сбросить
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    onClick={() => setFiltersPanelOpen(false)}
                  >
                    Применить
                  </Button>
                </Box>
              </Box>
            </Drawer>

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
                      <React.Fragment key={work.id}>
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
                                    {work.category && (
                                      <Chip 
                                        label={work.category} 
                                        size="small" 
                                        color="primary"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.75 } }} 
                                      />
                                    )}
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
                      </React.Fragment>
                    );
                  }}
                />
              )}
            </Box>
          </Paper>
        </Box>

        {/* ПРАВАЯ ЧАСТЬ - Смета */}
        <Paper 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            borderRadius: '10px',
            border: '1px solid #E5E7EB'
          }}
          elevation={0}
        >
          {/* Таблица сметы */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer 
              component={Paper} 
              elevation={0}
              sx={{ 
                overflowX: 'auto', 
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 340px)',
                '&::-webkit-scrollbar': { width: 6, height: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: '#F1F5F9' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 3 },
                '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#94A3B8' }
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Код
                      </Typography>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Наименование
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        minWidth: 70
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Фото
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Ед.
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Кол-во
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Цена
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Сумма
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Расход
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="center" 
                      sx={{ 
                        py: 1.25, 
                        px: 1.5, 
                        bgcolor: '#F9FAFB', 
                        borderBottom: '1px solid #E5E7EB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        minWidth: 100
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Действия
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedEstimateData?.sections?.map((section, sectionIndex) => (
                    <React.Fragment key={section.id}>
                      {/* Работы и материалы раздела */}
                      {section.items?.map((item, itemIndex) => (
                        <React.Fragment key={item.id}>
                          {/* ✅ МЕМОИЗИРОВАННАЯ СТРОКА РАБОТЫ */}
                          <WorkRow
                            item={item}
                            sectionIndex={sectionIndex}
                            itemIndex={itemIndex}
                            onQuantityChange={handleWorkQuantityInputChange}
                            onQuantityBlur={handleWorkQuantityBlur}
                            onPriceChange={handleWorkPriceInputChange}
                            onPriceBlur={handleWorkPriceBlur}
                            onUpdateWorkPrice={handleUpdateWorkPriceInReference}
                            onAddMaterial={handleOpenAddMaterial}
                            onDeleteWork={handleDeleteWork}
                          />

                          {/* ✅ МЕМОИЗИРОВАННЫЕ СТРОКИ МАТЕРИАЛОВ */}
                          {item.materials?.map((material, matIndex) => (
                            <MaterialRow
                              key={material.id}
                              material={material}
                              sectionIndex={sectionIndex}
                              itemIndex={itemIndex}
                              matIndex={matIndex}
                              onQuantityChange={handleMaterialQuantityInputChange}
                              onQuantityBlur={handleMaterialQuantityBlur}
                              onConsumptionChange={handleMaterialConsumptionChange}
                              onConsumptionBlur={handleMaterialConsumptionBlur}
                              onReplaceMaterial={handleOpenReplaceMaterial}
                              onDeleteMaterial={handleDeleteMaterial}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Итоги вынесены в отдельный sticky footer */}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* ✅ STICKY FOOTER - Итоги прилипшие к низу */}
          {estimateData.sections.length > 0 && (
            <Box
              sx={{
                borderTop: '2px solid #E5E7EB',
                bgcolor: '#FFFFFF',
                px: 2.5,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
                flexShrink: 0
              }}
            >
              {/* Итого за работы */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                  Итого за работы:
                </Typography>
                <Box sx={{ 
                  px: 1.5, 
                  py: 0.5, 
                  bgcolor: '#F0FDF4', 
                  borderRadius: '6px',
                  border: '1px solid #BBF7D0'
                }}>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#16A34A' }}>
                    {formatCurrency(parseFloat(calculateTotals.totalWorks))}
                  </Typography>
                </Box>
              </Box>

              {/* Итого за материалы */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                  Итого за материалы:
                </Typography>
                <Box sx={{ 
                  px: 1.5, 
                  py: 0.5, 
                  bgcolor: '#FEF3C7', 
                  borderRadius: '6px',
                  border: '1px solid #FCD34D'
                }}>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#D97706' }}>
                    {formatCurrency(parseFloat(calculateTotals.totalMaterials))}
                  </Typography>
                </Box>
              </Box>

              {/* 🔥 Общий вес материалов */}
              {parseFloat(calculateTotals.totalWeight) > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                    Общий вес:
                  </Typography>
                  <Box sx={{ 
                    px: 1.5, 
                    py: 0.5, 
                    bgcolor: '#EFF6FF', 
                    borderRadius: '6px',
                    border: '1px solid #BFDBFE'
                  }}>
                    <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#2563EB' }}>
                      {parseFloat(calculateTotals.totalWeight).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} кг
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* 🎨 Компактный диалог выбора материала */}
      <Dialog 
        open={materialDialogOpen} 
        onClose={() => {
          setMaterialDialogOpen(false);
          setMaterialSearchQuery('');
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
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                {materialDialogMode === 'add' ? 'Добавить материал' : 'Заменить материал'}
              </Typography>
              {materialDialogMode === 'add' && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  💡 Добавьте несколько материалов подряд. Окно закроется при клике вне области.
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {loadingMaterials && (
                <CircularProgress size={16} thickness={4} />
              )}
              <Chip 
                label={materialsTotalRecords > 0 
                  ? `Найдено: ${materialsTotalRecords}${filteredMaterialsForDialog.length < materialsTotalRecords ? ` (показано ${filteredMaterialsForDialog.length})` : ''}`
                  : 'Загрузка...'
                }
                size="small"
                color={materialSearchQuery ? "success" : "primary"}
                variant="outlined"
              />
            </Stack>
          </Box>
          {/* ✅ НОВАЯ ЛОГИКА: Debounced серверный поиск (автоматически через 400ms) */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Начните вводить название, артикул или поставщика..."
              value={materialSearchQuery}
              onChange={(e) => handleMaterialSearchChange(e.target.value)}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={16} color={loadingMaterials ? '#9CA3AF' : '#3B82F6'} />
                  </InputAdornment>
                )
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  fontSize: '0.875rem',
                  bgcolor: loadingMaterials ? '#F9FAFB' : 'white'
                } 
              }}
            />
          </Box>
          {/* Подсказка для пользователя */}
          {materialSearchQuery && materialSearchQuery.trim().length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              🔍 Поиск в базе 47,000 материалов...
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '500px', overflow: 'auto' }}>
          {loadingMaterials && filteredMaterialsForDialog.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress size={40} />
            </Box>
          ) : filteredMaterialsForDialog.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                {materialSearchQuery 
                  ? `Материалы не найдены` 
                  : 'Загрузка материалов...'}
              </Typography>
              {materialSearchQuery && (
                <Typography color="text.secondary" variant="caption">
                  Попробуйте изменить поисковый запрос
                </Typography>
              )}
            </Box>
          ) : (
            /* ✅ Обычный список с Intersection Observer (без Virtuoso для избежания скачков скролла) */
            <List sx={{ py: 0 }}>
              {filteredMaterialsForDialog.map((material, index) => (
                <ListItem 
                  key={material.id}
                  disablePadding
                  sx={{ 
                    borderBottom: index < filteredMaterialsForDialog.length - 1 ? '1px solid' : 'none',
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
                          {material.supplier && (
                            <Chip 
                              label={material.supplier} 
                              size="small" 
                              color="secondary"
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
              ))}
              
              {/* ✅ Триггер для автозагрузки через Intersection Observer */}
              {materialsHasMore && (
                <Box 
                  ref={loadMoreMaterialsRef} 
                  sx={{ height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}
                >
                  {loadingMaterials && <CircularProgress size={20} thickness={4} sx={{ color: '#3B82F6' }} />}
                </Box>
              )}
              
              {/* Сообщение когда всё загружено или при поиске */}
              {!materialsHasMore && filteredMaterialsForDialog.length > 0 && (
                <Typography sx={{ textAlign: 'center', py: 2, color: '#9CA3AF', fontSize: '0.875rem' }}>
                  {materialSearchQuery 
                    ? `✅ Найдено ${filteredMaterialsForDialog.length} материалов` 
                    : `Показано ${filteredMaterialsForDialog.length} материалов`
                  }
                </Typography>
              )}
              
              {/* Подсказка при большом количестве результатов */}
              {materialsTotalRecords > 100 && !materialSearchQuery && (
                <Typography sx={{ textAlign: 'center', py: 2, color: '#F59E0B', fontSize: '0.8125rem', px: 2 }}>
                  💡 Найдено {materialsTotalRecords} материалов — используйте поиск для быстрого доступа
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setMaterialDialogOpen(false);
              setMaterialSearchQuery('');
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

      {/* ✅ Диалог сохранения как шаблон - ОБНОВЛЁННЫЙ ДИЗАЙН */}
      <Dialog
        open={saveTemplateDialogOpen}
        onClose={() => !savingTemplate && setSaveTemplateDialogOpen(false)}
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: 540,
            maxWidth: '90vw',
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        {/* ✅ Хедер - 56px, фон #F9FAFB */}
        <Box
          sx={{
            height: 56,
            px: 2.5,
            bgcolor: '#F9FAFB',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Typography sx={{ 
            fontSize: '1.125rem', 
            fontWeight: 600, 
            color: '#111827'
          }}>
            Сохранить как шаблон
          </Typography>
        </Box>

        {/* ✅ Контент */}
        <DialogContent sx={{ px: 2.5, py: 3 }}>
          <Stack spacing={2.5}>
            {/* Название шаблона */}
            <Box>
              <TextField
                label="Название шаблона"
                value={templateFormData.name}
                onChange={handleTemplateFormChange('name')}
                required
                fullWidth
                placeholder="Например: Ремонт квартиры"
                error={!templateFormData.name.trim() && templateFormData.name !== ''}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 44,
                    borderRadius: '10px',
                    '& fieldset': { borderColor: '#D1D5DB' },
                    '&:hover fieldset': { borderColor: '#9CA3AF' },
                    '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 2 },
                    '&.Mui-error fieldset': { borderColor: '#DC2626' }
                  },
                  '& .MuiInputLabel-root': { 
                    fontSize: '0.875rem',
                    '&.Mui-focused': { color: '#4F46E5' }
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '0.875rem',
                    '&::placeholder': { color: '#9CA3AF', opacity: 1 }
                  }
                }}
              />
              {!templateFormData.name.trim() && templateFormData.name !== '' && (
                <Typography sx={{ fontSize: '0.75rem', color: '#DC2626', mt: 0.5, ml: 0.5 }}>
                  Название обязательно для заполнения
                </Typography>
              )}
            </Box>

            {/* Описание */}
            <Box>
              <TextField
                label="Описание"
                value={templateFormData.description}
                onChange={handleTemplateFormChange('description')}
                multiline
                rows={3}
                fullWidth
                placeholder="Краткое описание шаблона"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    minHeight: 90,
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    '& fieldset': { borderColor: '#D1D5DB' },
                    '&:hover fieldset': { borderColor: '#9CA3AF' },
                    '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 2 }
                  },
                  '& .MuiInputLabel-root': { 
                    fontSize: '0.875rem',
                    '&.Mui-focused': { color: '#4F46E5' }
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '0.875rem',
                    padding: 0,
                    '&::placeholder': { color: '#9CA3AF', opacity: 1 }
                  }
                }}
              />
              <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mt: 0.75, ml: 0.5 }}>
                Необязательно. Поможет быстрее найти шаблон.
              </Typography>
            </Box>

            {/* Разделитель и подзаголовок */}
            <Box sx={{ pt: 1 }}>
              <Typography sx={{ 
                fontSize: '0.75rem', 
                fontWeight: 500, 
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5
              }}>
                Дополнительно
              </Typography>

              {/* Категория */}
              <TextField
                label="Категория"
                value={templateFormData.category}
                onChange={handleTemplateFormChange('category')}
                fullWidth
                placeholder="Например: Квартиры, Офисы"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 44,
                    borderRadius: '10px',
                    '& fieldset': { borderColor: '#D1D5DB' },
                    '&:hover fieldset': { borderColor: '#9CA3AF' },
                    '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 2 }
                  },
                  '& .MuiInputLabel-root': { 
                    fontSize: '0.875rem',
                    '&.Mui-focused': { color: '#4F46E5' }
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '0.875rem',
                    '&::placeholder': { color: '#9CA3AF', opacity: 1 }
                  }
                }}
              />
              <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mt: 0.75, ml: 0.5 }}>
                Для группировки шаблонов в списке.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        {/* ✅ Футер с кнопками */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1.5
          }}
        >
          <Button 
            onClick={() => setSaveTemplateDialogOpen(false)} 
            disabled={savingTemplate}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#6B7280',
              px: 2,
              '&:hover': { bgcolor: '#F3F4F6' }
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSaveTemplateConfirm}
            variant="contained"
            disabled={savingTemplate || !templateFormData.name.trim()}
            startIcon={savingTemplate ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <IconTemplate size={18} color="#FFFFFF" />}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              bgcolor: '#4F46E5',
              borderRadius: '8px',
              px: 2.5,
              height: 40,
              '&:hover': { bgcolor: '#4338CA' },
              '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' }
            }}
          >
            {savingTemplate ? 'Сохранение...' : 'Сохранить шаблон'}
          </Button>
        </Box>
      </Dialog>

      {/* 📚 OVERLAY DRAWER - Справочник работ (ФИНАЛЬНЫЙ РЕДИЗАЙН) */}
      <Drawer
        anchor="left"
        open={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        variant="persistent"
        hideBackdrop={true}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 2,
          '& .MuiDrawer-paper': {
            width: 400,
            boxSizing: 'border-box',
            bgcolor: '#FFFFFF',
            boxShadow: '4px 0 16px rgba(0, 0, 0, 0.06)',
            borderRight: '1px solid #E5E7EB',
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
        ModalProps={{
          keepMounted: true,
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF' }}>
          {/* ✅ ХЕДЕР */}
          <Box sx={{ 
            px: 2.5, 
            py: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <Typography sx={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: '#111827'
            }}>
              Справочник работ
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setSidebarVisible(false)}
              sx={{ 
                color: '#6B7280',
                '&:hover': { bgcolor: '#F3F4F6', color: '#111827' }
              }}
            >
              <IconX size={20} />
            </IconButton>
          </Box>

          {/* ✅ ВКЛАДКИ - с подчёркиванием */}
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  setWorkSourceTab('global');
                  setSearchTerm('');
                }}
                sx={{
                  py: 1,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  position: 'relative',
                  color: workSourceTab === 'global' ? '#3B82F6' : '#6B7280',
                  bgcolor: workSourceTab === 'global' ? '#EEF6FF' : 'transparent',
                  '&:hover': { 
                    bgcolor: workSourceTab === 'global' ? '#EEF6FF' : '#F3F4F6' 
                  },
                  '&::after': workSourceTab === 'global' ? {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 8,
                    right: 8,
                    height: 2,
                    bgcolor: '#3B82F6',
                    borderRadius: '1px'
                  } : {}
                }}
              >
                Глобальные работы
              </Button>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  setWorkSourceTab('tenant');
                  setSearchTerm('');
                }}
                sx={{
                  py: 1,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  position: 'relative',
                  color: workSourceTab === 'tenant' ? '#3B82F6' : '#6B7280',
                  bgcolor: workSourceTab === 'tenant' ? '#EEF6FF' : 'transparent',
                  '&:hover': { 
                    bgcolor: workSourceTab === 'tenant' ? '#EEF6FF' : '#F3F4F6' 
                  },
                  '&::after': workSourceTab === 'tenant' ? {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 8,
                    right: 8,
                    height: 2,
                    bgcolor: '#3B82F6',
                    borderRadius: '1px'
                  } : {}
                }}
              >
                Мои работы
              </Button>
            </Box>
          </Box>

          {/* ✅ ПОИСК + ФИЛЬТРЫ */}
          <Box sx={{ px: 2.5, pb: 1.5, display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Поиск работ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} color="#9CA3AF" />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: '#F9FAFB',
                  '& fieldset': { borderColor: '#E5E7EB' },
                  '&:hover fieldset': { borderColor: '#D1D5DB' },
                  '&.Mui-focused fieldset': { borderColor: '#635BFF', borderWidth: '2px' }
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem'
                }
              }}
            />
            {availableSections.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconFilter size={16} color="#6B7280" />}
                onClick={() => setFiltersPanelOpen(true)}
                sx={{ 
                  minWidth: 'auto',
                  height: 40,
                  px: 1.5,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#6B7280',
                  bgcolor: '#F9FAFB',
                  borderColor: '#E5E7EB',
                  '&:hover': { 
                    borderColor: '#D1D5DB',
                    bgcolor: '#F3F4F6'
                  }
                }}
              >
                {selectedSection && (
                  <Box sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ml: 0.5
                  }}>
                    1
                  </Box>
                )}
              </Button>
            )}
          </Box>

          {/* ✅ Вложенный Drawer фильтров */}
          <Drawer
            anchor="left"
            open={filtersPanelOpen}
            onClose={() => setFiltersPanelOpen(false)}
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 3,
              '& .MuiDrawer-paper': {
                width: 320,
                boxSizing: 'border-box',
                bgcolor: '#FFFFFF',
                boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Заголовок фильтров */}
              <Box sx={{ 
                px: 2.5, 
                py: 2, 
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                  Фильтры
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setFiltersPanelOpen(false)}
                  sx={{ color: '#6B7280', '&:hover': { bgcolor: '#F3F4F6' } }}
                >
                  <IconX size={18} />
                </IconButton>
              </Box>

              {/* Контент фильтров */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
                <Typography sx={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1.5 
                }}>
                  По стадии
                </Typography>
                <FormControl component="fieldset" fullWidth>
                  <RadioGroup
                    value={selectedSection || 'all'}
                    onChange={(e) => setSelectedSection(e.target.value === 'all' ? null : e.target.value)}
                  >
                    <FormControlLabel
                      value="all"
                      control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#635BFF' } }} />}
                      label={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 1 }}>
                          <Typography sx={{ fontSize: '0.875rem', color: '#374151' }}>Все работы</Typography>
                          <Box sx={{ 
                            px: 1, 
                            py: 0.25, 
                            borderRadius: '6px', 
                            bgcolor: '#F3F4F6',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: '#6B7280'
                          }}>
                            {worksAfterSearch.length}
                          </Box>
                        </Box>
                      }
                      sx={{ 
                        mb: 0.5,
                        mx: 0,
                        py: 0.75,
                        px: 1,
                        borderRadius: '8px',
                        '&:hover': { bgcolor: '#F9FAFB' }
                      }}
                    />
                    {availableSections.map(section => {
                      const count = worksAfterSearch.filter(w => w.section === section).length;
                      return (
                        <FormControlLabel
                          key={section}
                          value={section}
                          control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#635BFF' } }} />}
                          label={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 1 }}>
                              <Typography sx={{ fontSize: '0.875rem', color: '#374151' }}>
                                {section}
                              </Typography>
                              <Box sx={{ 
                                px: 1, 
                                py: 0.25, 
                                borderRadius: '6px', 
                                bgcolor: '#F3F4F6',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: '#6B7280'
                              }}>
                                {count}
                              </Box>
                            </Box>
                          }
                          sx={{ 
                            mb: 0.5,
                            mx: 0,
                            py: 0.75,
                            px: 1,
                            borderRadius: '8px',
                            '&:hover': { bgcolor: '#F9FAFB' }
                          }}
                        />
                      );
                    })}
                  </RadioGroup>
                </FormControl>
              </Box>

              {/* Кнопки действий */}
              <Box sx={{ 
                p: 2.5, 
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                gap: 1.5
              }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedSection(null);
                    setFiltersPanelOpen(false);
                  }}
                  sx={{
                    height: 40,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    color: '#374151',
                    borderColor: '#E5E7EB',
                    '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' }
                  }}
                >
                  Сбросить
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={() => setFiltersPanelOpen(false)}
                  sx={{
                    height: 40,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    bgcolor: '#635BFF',
                    '&:hover': { bgcolor: '#564EE6' }
                  }}
                >
                  Применить
                </Button>
              </Box>
            </Box>
          </Drawer>

          {/* ✅ СПИСОК РАБОТ */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {/* Загрузка */}
            {loadingWorks && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                <CircularProgress size={32} sx={{ color: '#635BFF' }} />
              </Box>
            )}

            {/* Ошибка */}
            {errorWorks && !loadingWorks && (
              <Box sx={{ px: 2.5, py: 3 }}>
                <Alert 
                  severity="error"
                  sx={{ 
                    borderRadius: '10px',
                    '& .MuiAlert-message': { fontSize: '0.875rem' }
                  }}
                >
                  <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>
                    {errorWorks}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => window.location.reload()}
                    sx={{ borderRadius: '6px', textTransform: 'none' }}
                  >
                    Обновить страницу
                  </Button>
                </Alert>
              </Box>
            )}

            {/* ✅ EMPTY STATE */}
            {!loadingWorks && !errorWorks && filteredWorks.length === 0 && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 8,
                px: 3 
              }}>
                <Box sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  bgcolor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}>
                  <IconSearch size={28} color="#9CA3AF" />
                </Box>
                <Typography sx={{ 
                  fontSize: '0.9375rem', 
                  fontWeight: 600, 
                  color: '#374151',
                  mb: 0.5 
                }}>
                  Работы не найдены
                </Typography>
                <Typography sx={{ 
                  fontSize: '0.8125rem', 
                  color: '#9CA3AF',
                  textAlign: 'center'
                }}>
                  Измените фильтры или строку поиска
                </Typography>
              </Box>
            )}

            {/* ✅ Виртуализированный список работ - НОВЫЙ ДИЗАЙН */}
            {!loadingWorks && !errorWorks && filteredWorks.length > 0 && (
              <Virtuoso
                style={{ height: '100%' }}
                data={filteredWorks}
                itemContent={(index, work) => {
                  const isAdded = addedWorkIds.has(work.id);
                  const isAdding = addingWorkId === work.id;
                  const isDisabled = isAdded || isAdding || (addingWorkId && addingWorkId !== work.id);
                  
                  return (
                    <Box
                      key={work.id}
                      onClick={() => !isDisabled && handleTransferToEstimate([work])}
                      sx={{
                        px: 2.5,
                        py: 1.25,
                        minHeight: 56,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isDisabled ? 'default' : 'pointer',
                        bgcolor: isAdding ? '#EEF6FF' : '#FFFFFF',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        opacity: isAdded ? 0.5 : (addingWorkId && !isAdding ? 0.6 : 1),
                        pointerEvents: addingWorkId ? 'none' : 'auto',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: 16,
                          right: 16,
                          height: '1px',
                          bgcolor: '#E5E7EB'
                        },
                        '&:hover': !isDisabled ? {
                          bgcolor: '#F9FAFB',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            bgcolor: '#635BFF',
                            borderRadius: '0 2px 2px 0'
                          }
                        } : {}
                      }}
                    >
                      {/* Левая часть: код + название */}
                      <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                        <Typography sx={{ 
                          fontSize: '0.6875rem', 
                          color: '#9CA3AF',
                          fontWeight: 500,
                          mb: 0.25
                        }}>
                          {work.code}
                        </Typography>
                        <Typography sx={{ 
                          fontSize: '0.8125rem', 
                          fontWeight: 500, 
                          color: '#111827',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {work.name}
                        </Typography>
                        {/* Бейдж категории (опционально) */}
                        {work.section && (
                          <Typography sx={{ 
                            fontSize: '0.75rem', 
                            color: '#9CA3AF',
                            mt: 0.5
                          }}>
                            {work.section}
                          </Typography>
                        )}
                      </Box>

                      {/* Правая часть: цена + стрелка/спиннер */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ 
                            fontSize: '0.8125rem', 
                            fontWeight: 600, 
                            color: '#111827'
                          }}>
                            {formatCurrency(work.price)}
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '0.6875rem', 
                            color: '#9CA3AF'
                          }}>
                            {work.unit}
                          </Typography>
                        </Box>
                        {isAdding ? (
                          /* ✅ Спиннер при добавлении */
                          <Box sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            bgcolor: '#EEF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CircularProgress size={16} thickness={5} sx={{ color: '#635BFF' }} />
                          </Box>
                        ) : !isAdded ? (
                          <Box sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            bgcolor: '#F1F4F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: '#635BFF',
                              '& svg': { color: '#FFFFFF' }
                            }
                          }}>
                            <IconArrowRight size={16} color="#6B7280" />
                          </Box>
                        ) : (
                          <Box sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: '6px',
                            bgcolor: '#DCFCE7',
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                            color: '#16A34A'
                          }}>
                            В смете
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                }}
              />
            )}
          </Box>
        </Box>
      </Drawer>
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
