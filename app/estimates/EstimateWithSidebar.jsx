import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Box,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Stack,
  Drawer,
} from '@mui/material';
import {
  IconX
} from '@tabler/icons-react';

// project imports
import axiosInstance from 'shared/lib/axiosInstance';
import estimateTemplatesAPI from 'shared/lib/api/estimateTemplates';
import { useNotifications } from 'contexts/NotificationsContext';
import PriceCoefficientModal from './PriceCoefficientModal';
import ObjectParametersSidebar from './ObjectParametersSidebar';

import useMaterialsSearch from './hooks/useMaterialsSearch'; // ✅ Custom Hook for Materials
import useWorksLibrary from './hooks/useWorksLibrary'; // ✅ Custom Hook for Works
import useEstimateData from './hooks/useEstimateData'; // ✅ Custom Hook for Data
import estimatesAPI from 'api/estimates';
import EstimateHeader from './components/EstimateHeader';
import ImportDialog from 'shared/ui/components/ImportDialog';
import EstimateTotals from './components/EstimateTotals';
import WorksTabs from './components/WorksTabs';
import WorksSearchAndFilterBar from './components/WorksSearchAndFilterBar';
import WorksFiltersDrawer from './components/WorksFiltersDrawer';
import WorksListPanel from './components/WorksListPanel';
import MaterialsDialog from './components/MaterialsDialog';
import SaveTemplateDialog from './components/SaveTemplateDialog';
import EstimateTable from './components/EstimateTable';
import EstimateMetadataForm from './components/EstimateMetadataForm';



// ==============================|| ESTIMATE WITH SIDEBAR ||============================== //

const EstimateWithSidebar = forwardRef(({ projectId, estimateId, onUnsavedChanges }, ref) => {
  // ==============================|| HOOKS & NOTIFICATIONS ||============================== //

  const { success, error: showError, warning, info } = useNotifications();

  // ==============================|| STATE - UI ||============================== //

  const [sidebarVisible, setSidebarVisible] = useState(false); // ✅ По умолчанию скрыт (режим просмотра)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState(null); // ✅ Фильтр по стадии (разделу)
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false); // ✅ Состояние панели фильтров
  const [workSourceTab, setWorkSourceTab] = useState('global'); // 'global' или 'tenant'
  // const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // ✅ УЖЕ ЕСТЬ В ХУКЕ useEstimateData
  const [parametersWidgetOpen, setParametersWidgetOpen] = useState(false); // ✅ State для виджета параметров объекта
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);

  // ==============================|| STATE - WORKS SIDEBAR ||============================== //

  // ✅ Hook: Управление библиотекой работ (Global / Tenant + AI Search)
  const {
    availableWorks,
    aiSearchedWorks,
    loading: loadingWorks,
    loadingAi: loadingAiSearch,
    error: errorWorks,
    sourceType: workSourceTypeResult,
    loadWorks: loadWorksCached,
    debouncedSearchWorksAI: debouncedAiSearchWorks,
    setAiSearchedWorks
  } = useWorksLibrary(workSourceTab);
  const [transferringWorks, setTransferringWorks] = useState(false); // ✅ Индикатор переноса работ
  const [addingWorkId, setAddingWorkId] = useState(null); // ✅ ID работы, которая сейчас добавляется

  // ==============================|| STATE - MATERIALS DIALOG ||============================== //

  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialDialogMode, setMaterialDialogMode] = useState('add'); // 'add' или 'replace'
  const [currentWorkItem, setCurrentWorkItem] = useState(null);
  const [materialToReplace, setMaterialToReplace] = useState(null);

  // ✅ Hook: Поиск и загрузка материалов
  const {
    materials: allMaterialsForDialog,
    loading: loadingMaterials,
    hasMore: materialsHasMore,
    totalRecords: materialsTotalRecords,
    page: materialsPage,
    loadMaterials: loadMaterialsForDialog,
    resetMaterials
  } = useMaterialsSearch();

  // ✅ Hook: Данные сметы
  const {
    estimateData, estimateMetadata, deferredEstimateData, originalPrices, currentCoefficient,
    loading: loadingEstimate, saving: savingEstimate, isInitialLoadComplete,
    hasUnsavedChanges, setHasUnsavedChanges,
    addWorks, updateWorkQuantity, updateWorkPrice, removeWorkItem,
    addMaterialToWork, replaceMaterial, removeMaterial, updateMaterialConsumption, updateMaterialQuantity,
    updateMetadata, updateProjectData, save: saveEstimate, clearEstimate,
    applyCoefficient, resetPrices, saveOriginalPrices, setEstimateMetadata,
    handleUpdateWorkPriceInReference, loadSavedEstimate
  } = useEstimateData({ projectId, estimateId, onUnsavedChanges });

  const [materialSearchQuery, setMaterialSearchQuery] = useState(''); // ✅ Для клиентского поиска
  const [estimateSearchQuery, setEstimateSearchQuery] = useState(''); // ✅ Search in Estimate

  // ==============================|| CONSTANTS ||============================== //

  const MATERIALS_PAGE_SIZE = 50;
  const MATERIALS_CACHE_TTL = 5 * 60 * 1000; // 5 минут
  const WORKS_CACHE_TTL = 10 * 60 * 1000; // 10 минут

  // ==============================|| STATE - COEFFICIENT MODAL ||============================== //

  const [coefficientModalOpen, setCoefficientModalOpen] = useState(false);
  // REMOVED duplicate currentCoefficient state
  // REMOVED duplicate originalPrices state

  // ==============================|| STATE - TEMPLATE ||============================== //

  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({ name: '', description: '', category: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ==============================|| STATE - EXPORT ||============================== //

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);

  // ==============================|| REFS ||============================== //

  const loadMoreMaterialsRef = useRef(null); // Триггер Intersection Observer (автозагрузка при скролле)
  const editingValuesRef = useRef({}); // Локальное хранилище для редактируемых полей (не вызывает ререндер)

  // Редактирование метаданных сметы
  const handleEditMetadata = useCallback(() => setMetadataDialogOpen(true), []);

  const handleSaveMetadata = useCallback((data) => {
    Object.keys(data).forEach(key => updateMetadata(key, data[key]));
    setMetadataDialogOpen(false);
  }, [updateMetadata]);

  // 🧠 Обработчик изменения поиска работ
  const handleWorksSearchChange = useCallback((value) => {
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      debouncedAiSearchWorks(value);
    } else {
      setAiSearchedWorks(null); // Очищаем AI-результаты
    }
  }, [debouncedAiSearchWorks, setAiSearchedWorks]);

  // Fetch works from API при изменении вкладки
  useEffect(() => {
    const sourceType = workSourceTab === 'global' ? 'global' : 'tenant';
    loadWorksCached(sourceType);
    setAiSearchedWorks(null); // Сбрасываем AI-поиск при смене вкладки
  }, [workSourceTab, loadWorksCached, setAiSearchedWorks]);

  // ✅ Экспортируем метод save для родительского компонента
  useImperativeHandle(ref, () => ({
    save: saveEstimate
  }));

  // ==============================|| COMPUTED VALUES ||============================== //

  // 🧠 Работы после поиска (AI или клиентский fallback)
  const worksAfterSearch = useMemo(() => {
    // Если есть AI-результаты - используем их
    if (aiSearchedWorks !== null) {
      return aiSearchedWorks;
    }

    // Fallback на клиентский поиск
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
  }, [searchTerm, availableWorks, aiSearchedWorks]);

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

  // ==============================|| HANDLERS - WORKS SIDEBAR ||============================== //

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
      await addWorks(worksToAdd);
    } finally {
      setTransferringWorks(false);
      setAddingWorkId(null);
    }
  }, [addWorks]);

  // Toggle режима расчёта/просмотра - справочник как overlay, главный сайдбар НЕ трогаем
  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };

  // ==============================|| HANDLERS - EXPORT/SAVE/CLEAR ||============================== //

  // REMOVED handleClearEstimate (Use clearEstimate from hook directly)

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

  // ============ ЭКСПОРТ В CSV ============
  const handleExportCSV = async () => {
    if (!estimateId) {
      warning('Сначала сохраните смету');
      return;
    }
    try {
      setExportingCSV(true);
      info('Подготовка файла экспорта...');
      await estimatesAPI.exportEstimate(estimateId);
      success('Файл экспорта успешно сформирован');
    } catch (err) {
      console.error('Export error:', err);
      showError('Ошибка при экспорте сметы', err.message);
    } finally {
      setExportingCSV(false);
    }
  };

  // ============ ИМПОРТ ИЗ CSV ============
  const handleImportCSV = () => {
    if (!estimateId) {
      warning('Сначала сохраните смету');
      return;
    }
    setOpenImportDialog(true);
  };

  const handleImportSuccess = async () => {
    // Вместо полной перезагрузки страницы вызываем обновление данных через хук
    await loadSavedEstimate();
  };

  // ==============================|| HANDLERS - TEMPLATE ||============================== //

  // Сохранение как шаблон
  const handleSaveAsTemplate = () => {
    if (!estimateId) {
      warning('Сначала сохраните смету в БД');
      return;
    }

    if (estimateData.sections.length === 0) {
      warning('Смета пуста. Добавьте работы перед сохранением шаблона');
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

      success('Шаблон успешно создан!');
      setSaveTemplateDialogOpen(false);
    } catch (error) {
      console.error('Error creating template:', error);
      showError('Ошибка при создании шаблона', error.response?.data?.message);
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

  // ==============================|| HANDLERS - MATERIALS DIALOG ||============================== //

  // Открыть диалог добавления материала
  const handleOpenAddMaterial = useCallback(async (sectionIndex, itemIndex) => {
    setCurrentWorkItem({ sectionIndex, itemIndex });
    setMaterialDialogMode('add');
    setMaterialSearchQuery('');
    resetMaterials(); // ✅ Очищаем через хук
    setMaterialDialogOpen(true);

    // ✅ Загружаем первую страницу
    await loadMaterialsForDialog(1, true);
  }, [loadMaterialsForDialog, resetMaterials]);

  // Открыть диалог замены материала
  const handleOpenReplaceMaterial = useCallback(async (sectionIndex, itemIndex, materialIndex) => {
    setCurrentWorkItem({ sectionIndex, itemIndex });
    setMaterialToReplace(materialIndex);
    setMaterialDialogMode('replace');
    setMaterialSearchQuery('');
    resetMaterials(); // ✅ Очищаем через хук
    setMaterialDialogOpen(true);

    // ✅ Загружаем первую страницу
    await loadMaterialsForDialog(1, true);
  }, [loadMaterialsForDialog, resetMaterials]);

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

  // ==============================|| HANDLERS - MATERIAL ||============================== //

  // Добавить материал к работе
  const handleAddMaterialToWork = (material) => {
    if (!currentWorkItem) return;
    addMaterialToWork(currentWorkItem.sectionIndex, currentWorkItem.itemIndex, material);
    // Диалог не закрываем для массового добавления
  };

  // Заменить материал
  const handleReplaceMaterialConfirm = (newMaterial) => {
    if (!currentWorkItem || materialToReplace === null) return;
    replaceMaterial(currentWorkItem.sectionIndex, currentWorkItem.itemIndex, materialToReplace, newMaterial);

    setMaterialDialogOpen(false);
    setCurrentWorkItem(null);
    setMaterialToReplace(null);
  };

  // Удалить материал
  const handleDeleteMaterial = useCallback((sectionIndex, itemIndex, materialIndex) => {
    removeMaterial(sectionIndex, itemIndex, materialIndex);
  }, [removeMaterial]);

  // ==============================|| HANDLERS - MATERIAL EDITING ||============================== //

  // onChange только сохраняет в ref
  const handleMaterialConsumptionChange = useCallback((sectionIndex, itemIndex, materialIndex, newConsumption) => {
    const key = `cons_${sectionIndex}_${itemIndex}_${materialIndex}`;
    editingValuesRef.current[key] = newConsumption;
  }, []);

  // onBlur обрабатывает значение
  const handleMaterialConsumptionBlur = useCallback((sectionIndex, itemIndex, materialIndex, inputElement) => {
    const key = `cons_${sectionIndex}_${itemIndex}_${materialIndex}`;
    const currentValue = editingValuesRef.current[key] ?? inputElement?.value;
    delete editingValuesRef.current[key];

    setTimeout(() => {
      if (currentValue === '' || currentValue === null || currentValue === undefined) return;

      const consumption = parseFloat(String(currentValue).replace(/,/g, '.'));
      if (isNaN(consumption) || consumption < 0) return;

      updateMaterialConsumption(sectionIndex, itemIndex, materialIndex, consumption);
    }, 50);
  }, [updateMaterialConsumption]);

  const handleMaterialQuantityInputChange = useCallback((sectionIndex, itemIndex, materialIndex, value) => {
    const key = `mat_${sectionIndex}_${itemIndex}_${materialIndex}`;
    editingValuesRef.current[key] = value;
  }, []);

  const handleMaterialQuantityBlur = useCallback((sectionIndex, itemIndex, materialIndex, inputElement) => {
    const key = `mat_${sectionIndex}_${itemIndex}_${materialIndex}`;
    const inputValue = editingValuesRef.current[key] ?? inputElement?.value;
    delete editingValuesRef.current[key];

    setTimeout(() => {
      if (inputValue === '' || inputValue === null || inputValue === undefined) return;

      const quantity = parseFloat(String(inputValue).replace(/,/g, '.'));
      if (isNaN(quantity) || quantity < 0) return;

      updateMaterialQuantity(sectionIndex, itemIndex, materialIndex, quantity);
    }, 50);
  }, [updateMaterialQuantity]);

  // ==============================|| HANDLERS - WORK EDITING ||============================== //

  const handleDeleteWork = useCallback((sectionIndex, itemIndex) => {
    removeWorkItem(sectionIndex, itemIndex);
  }, [removeWorkItem]);

  const handleWorkQuantityInputChange = useCallback((sectionIndex, itemIndex, value) => {
    const key = `work_${sectionIndex}_${itemIndex}`;
    editingValuesRef.current[key] = value;
  }, []);

  const handleWorkQuantityBlur = useCallback((sectionIndex, itemIndex, inputElement) => {
    const key = `work_${sectionIndex}_${itemIndex}`;
    const newQuantity = editingValuesRef.current[key] ?? inputElement?.value;
    delete editingValuesRef.current[key];

    setTimeout(() => {
      updateWorkQuantity(sectionIndex, itemIndex, newQuantity);
    }, 50);
  }, [updateWorkQuantity]);

  const handleWorkPriceInputChange = useCallback((sectionIndex, itemIndex, value) => {
    const key = `work_price_${sectionIndex}_${itemIndex}`;
    editingValuesRef.current[key] = value;
  }, []);

  const handleWorkPriceBlur = useCallback((sectionIndex, itemIndex, inputElement) => {
    const key = `work_price_${sectionIndex}_${itemIndex}`;
    const newPrice = editingValuesRef.current[key] ?? inputElement?.value;
    delete editingValuesRef.current[key];

    setTimeout(() => {
      if (newPrice === '' || newPrice === null || newPrice === undefined) return;
      const price = parseFloat(String(newPrice).replace(/,/g, '.'));
      if (isNaN(price) || price < 0) return;

      updateWorkPrice(sectionIndex, itemIndex, price);
    }, 50);
  }, [updateWorkPrice]);


  // ==============================|| CALCULATIONS ||============================== //
  // ✅ Подсчет итогов по работам и материалам
  const calculateTotals = useMemo(() => {
    let totalWorks = 0;
    let totalMaterials = 0;
    let totalWeight = 0; // 🔥 Добавлен подсчёт веса

    const sections = deferredEstimateData.sections || [];

    sections.forEach(section => {
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
  }, [deferredEstimateData]);

  // ==============================|| JSX ||============================== //

  return (
    <Box>
      {/* ✅ Заголовок компонента и панель действий */}
      <EstimateHeader
        onEdit={handleEditMetadata}
        estimateName={estimateMetadata.name}
        estimateIdShort={estimateId?.slice(0, 8) || 'новая'}
        sidebarVisible={sidebarVisible}
        saving={savingEstimate}
        exportingExcel={exportingExcel}
        disableSave={savingEstimate}
        disableTemplate={!estimateId || estimateData.sections.length === 0}
        disableCoefficient={estimateData.sections.length === 0}
        disableClear={estimateData.sections.length === 0}
        disableExport={estimateData.sections.length === 0 || exportingExcel}
        onToggleSidebar={toggleSidebar}
        onSave={saveEstimate}
        onSaveAsTemplate={handleSaveAsTemplate}
        onOpenCoefficient={() => setCoefficientModalOpen(true)}
        onClear={async () => await clearEstimate()}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onImportCSV={handleImportCSV}
        exportingCSV={exportingCSV}
        onSearch={setEstimateSearchQuery} // ✅ Pass search handler
        searchQuery={estimateSearchQuery} // ✅ Pass state
      />

      {/* Основной контейнер - смета на всю ширину (справочник теперь overlay drawer) */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 280px)', minHeight: 500 }}>
        {/* Справочник работ перенесен в Drawer (см. ниже) - этот блок будет удален */}
        <Box sx={{ display: 'none' }}>
        </Box >

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
          {/* ✅ Индикатор загрузки сметы */}
          {
            loadingEstimate && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: 1,
                  gap: 2,
                  py: 8
                }}
              >
                <CircularProgress size={48} thickness={4} sx={{ color: '#635BFF' }} />
                <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500 }}>
                  Загрузка сметы...
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                  Пожалуйста, подождите
                </Typography>
              </Box>
            )
          }

          {/* Таблица сметы */}
          {
            !loadingEstimate && (
              <EstimateTable
                sortedEstimateData={deferredEstimateData}
                searchQuery={estimateSearchQuery} // ✅ Pass search query
                onWorkQuantityChange={handleWorkQuantityInputChange}
                onWorkQuantityBlur={handleWorkQuantityBlur}
                onWorkPriceChange={handleWorkPriceInputChange}
                onWorkPriceBlur={handleWorkPriceBlur}
                onUpdateWorkPrice={handleUpdateWorkPriceInReference}
                onAddMaterial={handleOpenAddMaterial}
                onDeleteWork={handleDeleteWork}
                onMaterialQuantityChange={handleMaterialQuantityInputChange}
                onMaterialQuantityBlur={handleMaterialQuantityBlur}
                onMaterialConsumptionChange={handleMaterialConsumptionChange}
                onMaterialConsumptionBlur={handleMaterialConsumptionBlur}
                onReplaceMaterial={handleOpenReplaceMaterial}
                onDeleteMaterial={handleDeleteMaterial}
              />
            )
          }

          {/* ✅ STICKY FOOTER - Итоги прилипшие к низу */}
          {
            !loadingEstimate && estimateData.sections.length > 0 && (
              <EstimateTotals
                worksTotal={parseFloat(calculateTotals.totalWorks)}
                materialsTotal={parseFloat(calculateTotals.totalMaterials)}
                totalWeight={parseFloat(calculateTotals.totalWeight || 0)}
              />
            )
          }
        </Paper >
      </Box >

      {/* 🎨 Компактный диалог выбора материала */}
      <MaterialsDialog
        open={materialDialogOpen}
        mode={materialDialogMode}
        items={filteredMaterialsForDialog}
        totalCountText={
          materialsTotalRecords > 0
            ? `Найдено: ${materialsTotalRecords}${filteredMaterialsForDialog.length < materialsTotalRecords ? ` (показано ${filteredMaterialsForDialog.length})` : ''}`
            : undefined
        }
        loading={loadingMaterials}
        searchQuery={materialSearchQuery}
        hasMore={materialsHasMore}
        loadMoreRef={loadMoreMaterialsRef}
        onClose={() => {
          setMaterialDialogOpen(false);
          setMaterialSearchQuery('');
        }}
        onSearchChange={handleMaterialSearchChange}
        onSelect={(material) => {
          if (materialDialogMode === 'add') {
            handleAddMaterialToWork(material);
          } else {
            handleReplaceMaterialConfirm(material);
          }
        }}
      />

      {/* Модальное окно коэффициента цен */}
      <PriceCoefficientModal
        open={coefficientModalOpen}
        onClose={() => setCoefficientModalOpen(false)}
        onApply={applyCoefficient}
        onReset={resetPrices}
        currentCoefficient={currentCoefficient}
      />

      {/* ✅ Виджет параметров объекта */}
      <ObjectParametersSidebar
        estimateId={estimateId}
        open={parametersWidgetOpen}
        onToggle={() => setParametersWidgetOpen(!parametersWidgetOpen)}
      />

      {/* ✅ Диалог редактирования метаданных */}
      <EstimateMetadataForm
        open={metadataDialogOpen}
        onClose={() => setMetadataDialogOpen(false)}
        metadata={estimateMetadata}
        onSave={handleSaveMetadata}
      />

      {/* ✅ Диалог сохранения как шаблон */}
      <SaveTemplateDialog
        open={saveTemplateDialogOpen}
        saving={savingTemplate}
        formData={templateFormData}
        onClose={() => !savingTemplate && setSaveTemplateDialogOpen(false)}
        onChange={(field, value) => {
          setTemplateFormData(prev => ({
            ...prev,
            [field]: value
          }));
        }}
        onSave={handleSaveTemplateConfirm}
      />

      {/* ✅ Диалог импорта сметы */}
      <ImportDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        onImport={(file, options) => estimatesAPI.importEstimate(estimateId, file, options.mode)}
        onSuccess={handleImportSuccess}
        title="Импорт позиций в смету"
        description="📄 Загрузите CSV файл с позициями сметы. Обязательные поля: Наименование, Кол-во, Цена. Дополнительные: Код, Ед изм, Фаза, Раздел."
      />

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

          {/* ✅ ВКЛАДКИ */}
          <WorksTabs
            value={workSourceTab}
            onChange={(newTab) => {
              setWorkSourceTab(newTab);
              setSearchTerm('');
              setAiSearchedWorks(null); // Сбрасываем AI-поиск
            }}
          />

          {/* ✅ ПОИСК + ФИЛЬТРЫ */}
          <WorksSearchAndFilterBar
            searchTerm={searchTerm}
            onSearchChange={handleWorksSearchChange}
            hasAvailableFilters={availableSections.length > 0}
            hasActiveFilter={selectedSection !== null}
            onOpenFilters={() => setFiltersPanelOpen(true)}
            loading={loadingAiSearch} // 🧠 Индикатор AI-поиска
          />

          {/* ✅ Вложенный Drawer фильтров */}
          <WorksFiltersDrawer
            open={filtersPanelOpen}
            selectedSection={selectedSection}
            availableSections={availableSections}
            worksAfterSearch={worksAfterSearch}
            onSectionChange={setSelectedSection}
            onReset={() => {
              setSelectedSection(null);
              setFiltersPanelOpen(false);
            }}
            onApply={() => setFiltersPanelOpen(false)}
            onClose={() => setFiltersPanelOpen(false)}
          />

          {/* ✅ СПИСОК РАБОТ */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <WorksListPanel
              loading={loadingWorks}
              error={errorWorks}
              works={filteredWorks}
              addedWorkIds={addedWorkIds}
              addingWorkId={addingWorkId}
              onAddWork={(work) => handleTransferToEstimate([work])}
              onReload={() => window.location.reload()}
            />
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
