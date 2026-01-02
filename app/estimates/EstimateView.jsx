import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
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
  DialogContentText,
  CircularProgress
} from '@mui/material';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import EstimateNavBar from './EstimateNavBar';
import ObjectParameters from './ObjectParameters';
import EstimateWithSidebar from './EstimateWithSidebar';
import WorkCompletionActs from './WorkCompletionActs';
import ContractView from './ContractView';

// error boundary
import ErrorBoundary from 'shared/ui/components/ErrorBoundary';
import ErrorFallback from 'shared/ui/components/ErrorFallback';

// ✅ Lazy-loaded компоненты для оптимизации производительности
const Schedule = lazy(() => import('./Schedule'));
const SpecialistEstimate = lazy(() => import('./SpecialistEstimate'));
const Purchases = lazy(() => import('./Purchases'));

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
        
        {activeTab === 'schedule' && (
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          }>
            <Schedule estimateId={estimateId} projectId={projectId} />
          </Suspense>
        )}
        
        {activeTab === 'specialist_estimate' && (
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          }>
            <SpecialistEstimate estimateId={estimateId} projectId={projectId} />
          </Suspense>
        )}
        
        {activeTab === 'purchases' && (
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          }>
            <Purchases estimateId={estimateId} projectId={projectId} />
          </Suspense>
        )}
        
        {activeTab === 'documents' && activeDocument === 'acts' && (
          <WorkCompletionActs estimateId={estimateId} projectId={projectId} />
        )}
        
        {activeTab === 'documents' && activeDocument === 'contract' && (
          <ContractView estimateId={estimateId} projectId={projectId} />
        )}
      </>
    );
  };

  // Error handler для ErrorBoundary
  const handleError = (error, errorInfo) => {
    console.error('[EstimateView] Error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      estimateId,
      projectId,
      activeTab
    });
  };

  return (
    <ErrorBoundary fallback={<ErrorFallback />} onError={handleError}>
      <MainCard>
        <EstimateNavBar activeTab={activeTab} onTabChange={handleTabChange} />
        {renderContent()}

      {/* Диалог предупреждения о несохраненных изменениях */}
      <Dialog
        open={dialogOpen}
        onClose={handleCancelSwitch}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px', maxWidth: 420 } }}
      >
        <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', pb: 0.5, pt: 2.5 }}>
          Есть несохранённые изменения
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <DialogContentText sx={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
            У вас есть несохранённые изменения. Сохранить их перед переходом?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0.5, gap: 2.5 }}>
          <Button
            onClick={handleCancelSwitch}
            sx={{ 
              color: '#6B7280', 
              bgcolor: 'transparent',
              border: 'none',
              textTransform: 'none', 
              fontWeight: 500, 
              px: 2,
              py: '8px',
              height: 40,
              lineHeight: '20px',
              minWidth: 'auto',
              '&:hover': { bgcolor: '#F3F4F6' }
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleContinueWithoutSaving}
            variant="outlined"
            sx={{ 
              color: '#DC2626', 
              borderColor: '#FCA5A5', 
              borderWidth: '1px',
              borderRadius: '8px',
              textTransform: 'none', 
              fontWeight: 500,
              textAlign: 'center',
              px: 2,
              py: '6px',
              height: 40,
              lineHeight: 'normal',
              '&:hover': { borderColor: '#F87171', bgcolor: '#FEF2F2', borderWidth: '1px' }
            }}
          >
            Не сохранять
          </Button>
          <Button
            onClick={handleSaveAndSwitch}
            variant="contained"
            startIcon={<IconDeviceFloppy size={18} />}
            sx={{ 
              bgcolor: '#635BFF', 
              textTransform: 'none', 
              fontWeight: 500,
              px: 2.5,
              py: '8px',
              height: 40,
              lineHeight: '20px',
              '&:hover': { bgcolor: '#564EE6' },
              '&:active': { bgcolor: '#453DCC' }
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Диалог предупреждения о несохраненных изменениях при навигации */}
      <Dialog
        open={navigationDialogOpen}
        onClose={handleCancelNavigation}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px', maxWidth: 420 } }}
      >
        <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', pb: 0.5, pt: 2.5 }}>
          Есть несохранённые изменения
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <DialogContentText sx={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
            У вас есть несохранённые изменения. Сохранить их перед переходом?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0.5, gap: 2.5 }}>
          <Button
            onClick={handleCancelNavigation}
            sx={{ 
              color: '#6B7280', 
              bgcolor: 'transparent',
              border: 'none',
              textTransform: 'none', 
              fontWeight: 500, 
              px: 2,
              py: '8px',
              height: 40,
              lineHeight: '20px',
              minWidth: 'auto',
              '&:hover': { bgcolor: '#F3F4F6' }
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleNavigateWithoutSaving}
            variant="outlined"
            sx={{ 
              color: '#DC2626', 
              borderColor: '#FCA5A5', 
              borderWidth: '1px',
              borderRadius: '8px',
              textTransform: 'none', 
              fontWeight: 500,
              textAlign: 'center',
              px: 2,
              py: '6px',
              height: 40,
              lineHeight: 'normal',
              '&:hover': { borderColor: '#F87171', bgcolor: '#FEF2F2', borderWidth: '1px' }
            }}
          >
            Не сохранять
          </Button>
          <Button
            onClick={handleSaveAndNavigate}
            variant="contained"
            startIcon={<IconDeviceFloppy size={18} />}
            sx={{ 
              bgcolor: '#635BFF', 
              textTransform: 'none', 
              fontWeight: 500,
              px: 2.5,
              py: '8px',
              height: 40,
              lineHeight: '20px',
              '&:hover': { bgcolor: '#564EE6' },
              '&:active': { bgcolor: '#453DCC' }
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
    </ErrorBoundary>
  );
};

export default EstimateView;
