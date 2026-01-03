import React from 'react';
import PropTypes from 'prop-types';
import { Box, TextField, InputAdornment, Button } from '@mui/material';
import { IconSearch, IconFilter } from '@tabler/icons-react';

/**
 * WorksSearchAndFilterBar - Поле поиска + кнопка фильтра
 * 
 * Debounce обрабатывается в parent компоненте.
 * onChange просто прокидывает значение вверх.
 * 
 * @component
 */
const WorksSearchAndFilterBar = ({
  searchTerm,
  onSearchChange,
  hasAvailableFilters,
  hasActiveFilter,
  onOpenFilters
}) => {
  return (
    <Box sx={{ px: 2.5, pb: 1.5, display: 'flex', gap: 1.5 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Поиск работ..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
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
      {hasAvailableFilters && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconFilter size={16} color="#6B7280" />}
          onClick={onOpenFilters}
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
          {hasActiveFilter && (
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
  );
};

WorksSearchAndFilterBar.propTypes = {
  /** Текущее значение поиска */
  searchTerm: PropTypes.string.isRequired,
  /** Callback при изменении поиска */
  onSearchChange: PropTypes.func.isRequired,
  /** Есть ли доступные фильтры */
  hasAvailableFilters: PropTypes.bool.isRequired,
  /** Есть ли активный фильтр */
  hasActiveFilter: PropTypes.bool.isRequired,
  /** Callback при открытии панели фильтров */
  onOpenFilters: PropTypes.func.isRequired
};

WorksSearchAndFilterBar.displayName = 'WorksSearchAndFilterBar';

export default WorksSearchAndFilterBar;
