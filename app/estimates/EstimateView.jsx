import React, { useState, useRef, useEffect } from 'react';
import { useParams, useBlocker, useNavigate, useSearchParams } from 'react-router-dom';

// material-ui
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText
} from '@mui/material';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import EstimateNavBar from './EstimateNavBar';
import ObjectParameters from './ObjectParameters';
import EstimateWithSidebar from './EstimateWithSidebar';
import Schedule from './Schedule';
import SpecialistEstimate from './SpecialistEstimate';
import Purchases from './Purchases';
import WorkCompletionActs from './WorkCompletionActs';
import ContractView from './ContractView';

// ==============================|| ESTIMATE VIEW ||============================== //

const EstimateView = () => {
  const { projectId, estimateId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Восстанавливаем активную вкладку из URL или используем по умолчанию 'estimate_v2'
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'estimate_v2');
  const [activeDocument, setActiveDocument] = useState(null);
  
  // ✅ Отслеживание изменений для каждой вкладки отдельно
  const [estimateHasChanges, setEstimateHasChanges] = useState(false);
  const [parametersHasChanges, setParametersHasChanges] = useState(false);
  
  // Общий флаг - есть ли изменения на активной вкладке
  const hasUnsavedChanges = 
    (activeTab === 'estimate_v2' && estimateHasChanges) ||
    (activeTab === 'parameters' && parametersHasChanges);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [pendingDocType, setPendingDocType] = useState(null);
  const [navigationDialogOpen, setNavigationDialogOpen] = useState(false);
  const estimateRef = useRef(null);
  const parametersRef = useRef(null);

  // ✅ ЗАЩИТА ОТ НАВИГАЦИИ: Блокируем переход на другие страницы при несохраненных изменениях
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Обрабатываем блокировку навигации
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setNavigationDialogOpen(true);
    }
  }, [blocker.state]);

  // ✅ Обработчики уведомлений о несохраненных изменениях для каждой вкладки
  const handleEstimateUnsavedChanges = (hasChanges) => {
    setEstimateHasChanges(hasChanges);
  };

  const handleParametersUnsavedChanges = (hasChanges) => {
    setParametersHasChanges(hasChanges);
  };

  // ✅ ЗАЩИТА ОТ ПОТЕРИ ДАННЫХ: Предупреждение при закрытии/обновлении страницы
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleTabChange = (tab, docType = null) => {
    // ✅ Проверяем изменения на ТЕКУЩЕЙ вкладке
    const currentTabHasChanges = 
      (activeTab === 'estimate_v2' && estimateHasChanges) ||
      (activeTab === 'parameters' && parametersHasChanges);

    if (currentTabHasChanges) {
      // Показываем диалог
      setPendingTab(tab);
      setPendingDocType(docType);
      setDialogOpen(true);
    } else {
      // Переключаем без предупреждения
      setActiveTab(tab);
      // Обновляем URL с новой вкладкой
      setSearchParams({ tab });
      if (docType) {
        setActiveDocument(docType);
      }
    }
  };

  // Сохранить и переключить вкладку
  const handleSaveAndSwitch = async () => {
    // ✅ Сохраняем данные текущей вкладки
    if (activeTab === 'estimate_v2' && estimateRef.current?.save) {
      await estimateRef.current.save();
    } else if (activeTab === 'parameters' && parametersRef.current?.save) {
      await parametersRef.current.save();
    }
    
    setDialogOpen(false);
    setActiveTab(pendingTab);
    // Обновляем URL с новой вкладкой
    setSearchParams({ tab: pendingTab });
    if (pendingDocType) {
      setActiveDocument(pendingDocType);
    }
  };

  // Продолжить без сохранения
  const handleContinueWithoutSaving = () => {
    // ✅ Сбрасываем флаг изменений для текущей вкладки
    if (activeTab === 'estimate_v2') {
      setEstimateHasChanges(false);
    } else if (activeTab === 'parameters') {
      setParametersHasChanges(false);
    }
    
    setDialogOpen(false);
    setActiveTab(pendingTab);
    // Обновляем URL с новой вкладкой
    setSearchParams({ tab: pendingTab });
    if (pendingDocType) {
      setActiveDocument(pendingDocType);
    }
  };

  // Отмена
  const handleCancelSwitch = () => {
    setDialogOpen(false);
    setPendingTab(null);
    setPendingDocType(null);
  };

  // ✅ ОБРАБОТЧИКИ ДЛЯ НАВИГАЦИОННОГО ДИАЛОГА
  // Сохранить и разрешить навигацию
  const handleSaveAndNavigate = async () => {
    // ✅ Сохраняем данные активной вкладки
    if (activeTab === 'estimate_v2' && estimateRef.current?.save) {
      await estimateRef.current.save();
    } else if (activeTab === 'parameters' && parametersRef.current?.save) {
      await parametersRef.current.save();
    }
    
    setNavigationDialogOpen(false);
    setEstimateHasChanges(false);
    setParametersHasChanges(false);
    blocker.proceed(); // Разрешаем навигацию
  };

  // Продолжить без сохранения (разрешить навигацию)
  const handleNavigateWithoutSaving = () => {
    setNavigationDialogOpen(false);
    setEstimateHasChanges(false);
    setParametersHasChanges(false);
    blocker.proceed(); // Разрешаем навигацию
  };

  // Отменить навигацию
  const handleCancelNavigation = () => {
    setNavigationDialogOpen(false);
    blocker.reset(); // Отменяем навигацию
  };

  const renderContent = () => {
    return (
      <>
        {/* ✅ Смета всегда в DOM, но скрыта когда не активна (сохраняет состояние) */}
        <Box sx={{ display: activeTab === 'estimate_v2' ? 'block' : 'none' }}>
          <EstimateWithSidebar
            ref={estimateRef}
            projectId={projectId}
            estimateId={estimateId}
            onUnsavedChanges={handleEstimateUnsavedChanges}
          />
        </Box>

        {/* Остальные вкладки */}
        {activeTab === 'parameters' && (
          <ObjectParameters 
            ref={parametersRef}
            estimateId={estimateId} 
            onUnsavedChanges={handleParametersUnsavedChanges}
          />
        )}
        
        {activeTab === 'schedule' && <Schedule estimateId={estimateId} projectId={projectId} />}
        
        {activeTab === 'specialist_estimate' && <SpecialistEstimate estimateId={estimateId} projectId={projectId} />}
        
        {activeTab === 'purchases' && <Purchases estimateId={estimateId} projectId={projectId} />}
        
        {activeTab === 'documents' && activeDocument === 'acts' && (
          <WorkCompletionActs estimateId={estimateId} projectId={projectId} />
        )}
        
        {activeTab === 'documents' && activeDocument === 'contract' && (
          <ContractView estimateId={estimateId} projectId={projectId} />
        )}
      </>
    );
  };

  return (
    <MainCard>
      <EstimateNavBar activeTab={activeTab} onTabChange={handleTabChange} />
      {renderContent()}

      {/* Диалог предупреждения о несохраненных изменениях */}
      <Dialog
        open={dialogOpen}
        onClose={handleCancelSwitch}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Несохраненные изменения</DialogTitle>
        <DialogContent>
          <DialogContentText>
            В смете есть несохраненные изменения. Хотите сохранить их перед переключением?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCancelSwitch}
            color="inherit"
            startIcon={<IconX />}
          >
            Отмена
          </Button>
          <Button
            onClick={handleContinueWithoutSaving}
            color="warning"
            variant="outlined"
          >
            Продолжить без сохранения
          </Button>
          <Button
            onClick={handleSaveAndSwitch}
            color="primary"
            variant="contained"
            startIcon={<IconDeviceFloppy />}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Диалог предупреждения о несохраненных изменениях при навигации */}
      <Dialog
        open={navigationDialogOpen}
        onClose={handleCancelNavigation}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Несохраненные изменения</DialogTitle>
        <DialogContent>
          <DialogContentText>
            В смете есть несохраненные изменения. Хотите сохранить их перед уходом со страницы?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCancelNavigation}
            color="inherit"
            startIcon={<IconX />}
          >
            Отмена
          </Button>
          <Button
            onClick={handleNavigateWithoutSaving}
            color="warning"
            variant="outlined"
          >
            Продолжить без сохранения
          </Button>
          <Button
            onClick={handleSaveAndNavigate}
            color="primary"
            variant="contained"
            startIcon={<IconDeviceFloppy />}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
};

export default EstimateView;
