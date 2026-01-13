import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button
} from '@mui/material';
import { IconX } from '@tabler/icons-react';

/**
 * WorksFiltersDrawer - Nested drawer с фильтрами по стадиям
 * 
 * ⚠️ ВАЖНО: UI выглядит staged (Reset/Apply), но фактически:
 * - Radio сразу меняет selectedSection через onSectionChange
 * - Apply только закрывает drawer
 * - Reset сбрасывает и закрывает
 * 
 * Не изменять это поведение - это текущий UX!
 * 
 * @component
 */
const WorksFiltersDrawer = ({
  open,
  selectedSection,
  availableSections,
  worksAfterSearch,
  onSectionChange,
  onReset,
  onApply,
  onClose
}) => {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
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
            onClick={onClose}
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
              onChange={(e) => onSectionChange(e.target.value === 'all' ? null : e.target.value)}
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
            onClick={onReset}
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
            onClick={onApply}
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
  );
};

WorksFiltersDrawer.propTypes = {
  /** Флаг открытия drawer */
  open: PropTypes.bool.isRequired,
  /** Текущая выбранная секция (null = все) */
  selectedSection: PropTypes.string,
  /** Доступные секции для фильтрации */
  availableSections: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Работы после поиска (для подсчета) */
  worksAfterSearch: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    section: PropTypes.string
  })).isRequired,
  /** Callback при изменении секции (сразу применяется!) */
  onSectionChange: PropTypes.func.isRequired,
  /** Callback при сбросе фильтров (сбрасывает + закрывает) */
  onReset: PropTypes.func.isRequired,
  /** Callback при применении (только закрывает drawer) */
  onApply: PropTypes.func.isRequired,
  /** Callback при закрытии drawer */
  onClose: PropTypes.func.isRequired
};

WorksFiltersDrawer.displayName = 'WorksFiltersDrawer';

export default WorksFiltersDrawer;
