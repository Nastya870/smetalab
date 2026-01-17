import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button } from '@mui/material';

/**
 * WorksTabs - Переключатель источника работ (Глобальные/Мои)
 * 
 * Чистый UI компонент без локального состояния.
 * Сброс поиска происходит в parent через callback.
 * 
 * @component
 */
const WorksTabs = ({ value, onChange }) => {
  return (
    <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button
          fullWidth
          size="small"
          onClick={() => onChange('global')}
          sx={{
            py: 0.75,
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            position: 'relative',
            color: value === 'global' ? '#3B82F6' : '#6B7280',
            bgcolor: value === 'global' ? '#EEF6FF' : 'transparent',
            '&:hover': {
              bgcolor: value === 'global' ? '#EEF6FF' : '#F3F4F6'
            },
            '&::after': value === 'global' ? {
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
          onClick={() => onChange('tenant')}
          sx={{
            py: 0.75,
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            position: 'relative',
            color: value === 'tenant' ? '#3B82F6' : '#6B7280',
            bgcolor: value === 'tenant' ? '#EEF6FF' : 'transparent',
            '&:hover': {
              bgcolor: value === 'tenant' ? '#EEF6FF' : '#F3F4F6'
            },
            '&::after': value === 'tenant' ? {
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
  );
};

WorksTabs.propTypes = {
  /** Текущий выбранный источник */
  value: PropTypes.oneOf(['global', 'tenant']).isRequired,
  /** Callback при переключении источника */
  onChange: PropTypes.func.isRequired
};

WorksTabs.displayName = 'WorksTabs';

export default WorksTabs;
