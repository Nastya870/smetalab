import React from 'react';
import PropTypes from 'prop-types';
import { Virtuoso } from 'react-virtuoso';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { IconSearch, IconArrowRight } from '@tabler/icons-react';
import { formatCurrency } from '../../projects/utils';

/**
 * WorksListPanel - Виртуализированный список работ
 * 
 * ⚠️ PERF-CRITICAL: itemContent мемоизирован, избегаем inline-callbacks.
 * Set используется только через .has() для O(1) проверки.
 * 
 * @component
 */
const WorksListPanel = ({
  loading,
  error,
  works,
  addedWorkIds,
  addingWorkId,
  onAddWork,
  onReload
}) => {
  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: '#635BFF' }} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ px: 2.5, py: 3 }}>
        <Alert 
          severity="error"
          sx={{ 
            borderRadius: '10px',
            '& .MuiAlert-message': { fontSize: '0.875rem' }
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>
            {error}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={onReload}
            sx={{ borderRadius: '6px', textTransform: 'none' }}
          >
            Обновить страницу
          </Button>
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (works.length === 0) {
    return (
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
    );
  }

  // Виртуализированный список
  return (
    <Virtuoso
      style={{ height: '100%' }}
      data={works}
      itemContent={(index, work) => {
        const isAdded = addedWorkIds.has(work.id);
        const isAdding = addingWorkId === work.id;
        const isDisabled = isAdded || isAdding || (addingWorkId && addingWorkId !== work.id);
        
        return (
          <Box
            key={work.id}
            onClick={() => !isDisabled && onAddWork(work)}
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
                  ✓
                </Box>
              )}
            </Box>
          </Box>
        );
      }}
    />
  );
};

WorksListPanel.propTypes = {
  /** Флаг загрузки */
  loading: PropTypes.bool.isRequired,
  /** Текст ошибки */
  error: PropTypes.string,
  /** Массив работ для отображения */
  works: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
    section: PropTypes.string
  })).isRequired,
  /** Set ID уже добавленных работ (для O(1) проверки) */
  addedWorkIds: PropTypes.instanceOf(Set).isRequired,
  /** ID работы, которая сейчас добавляется */
  addingWorkId: PropTypes.string,
  /** Callback при добавлении работы */
  onAddWork: PropTypes.func.isRequired,
  /** Callback при перезагрузке (при ошибке) */
  onReload: PropTypes.func.isRequired
};

WorksListPanel.displayName = 'WorksListPanel';

export default WorksListPanel;
