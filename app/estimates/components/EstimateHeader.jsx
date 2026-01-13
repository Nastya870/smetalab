import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  IconEye,
  IconEyeOff,
  IconPlus,
  IconTemplate,
  IconPercentage,
  IconTrash,
  IconFileTypeXls,
  IconEdit,
  IconSearch
} from '@tabler/icons-react';

/**
 * EstimateHeader - Заголовок сметы с панелью действий
 * 
 * Отображает название сметы, ID и панель действий с кнопками управления.
 * Чистый UI-компонент без бизнес-логики.
 * 
 * @component
 */
const EstimateHeader = ({
  estimateName,
  estimateIdShort,
  sidebarVisible,
  saving,
  exportingExcel,
  disableSave,
  disableTemplate,
  disableCoefficient,
  disableClear,
  disableExport,
  onToggleSidebar,
  onSave,
  onSaveAsTemplate,
  onOpenCoefficient,
  onClear,
  onExportExcel,
  onSearch,
  searchQuery, // ✅ Controlled input
  onEdit
}) => {
  return (
    <Box>
      {/* ✅ Заголовок компонента */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.3
            }}
          >
            Смета: {estimateName || 'Без названия'}
          </Typography>
          <IconButton
            onClick={onEdit}
            size="small"
            sx={{
              color: '#9CA3AF',
              '&:hover': { color: '#635BFF', bgcolor: '#EEF2FF' }
            }}
          >
            <IconEdit size={20} />
          </IconButton>
        </Box>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: '#6B7280'
          }}
        >
          ID: {estimateIdShort}...
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
        {/* Поиск по смете */}
        <TextField
          placeholder="Поиск по смете..."
          size="small"
          value={searchQuery || ''}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} color="#9CA3AF" />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 250,
            '& .MuiOutlinedInput-root': {
              fontSize: '0.8125rem',
              bgcolor: '#F9FAFB',
              '& fieldset': { borderColor: '#E5E7EB' },
              '&:hover fieldset': { borderColor: '#D1D5DB' },
              '&.Mui-focused fieldset': { borderColor: '#635BFF' }
            }
          }}
        />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Переключатель режима */}
        <Button
          variant={sidebarVisible ? "contained" : "outlined"}
          startIcon={sidebarVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          onClick={onToggleSidebar}
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
          onClick={onSave}
          size="small"
          disabled={disableSave}
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
          onClick={onSaveAsTemplate}
          size="small"
          disabled={disableTemplate}
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
          onClick={onOpenCoefficient}
          size="small"
          disabled={disableCoefficient}
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
          onClick={onClear}
          size="small"
          disabled={disableClear}
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
          onClick={onExportExcel}
          size="small"
          disabled={disableExport}
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
    </Box>
  );
};

EstimateHeader.propTypes = {
  /** Название сметы */
  estimateName: PropTypes.string,
  /** Короткий ID сметы (8 символов или 'новая') */
  estimateIdShort: PropTypes.string.isRequired,
  /** Флаг видимости sidebar */
  sidebarVisible: PropTypes.bool.isRequired,
  /** Флаг процесса сохранения */
  saving: PropTypes.bool.isRequired,
  /** Флаг процесса экспорта */
  exportingExcel: PropTypes.bool.isRequired,
  /** Отключить кнопку "Сохранить" */
  disableSave: PropTypes.bool.isRequired,
  /** Отключить кнопку "Шаблон" */
  disableTemplate: PropTypes.bool.isRequired,
  /** Отключить кнопку "Коэффициент" */
  disableCoefficient: PropTypes.bool.isRequired,
  /** Отключить кнопку "Очистить" */
  disableClear: PropTypes.bool.isRequired,
  /** Отключить кнопку "Excel" */
  disableExport: PropTypes.bool.isRequired,
  /** Обработчик переключения sidebar */
  onToggleSidebar: PropTypes.func.isRequired,
  /** Обработчик сохранения */
  onSave: PropTypes.func.isRequired,
  /** Обработчик сохранения как шаблон */
  onSaveAsTemplate: PropTypes.func.isRequired,
  /** Обработчик открытия модального окна коэффициента */
  onOpenCoefficient: PropTypes.func.isRequired,
  /** Обработчик очистки сметы */
  onClear: PropTypes.func.isRequired,
  /** Обработчик экспорта в Excel */
  onExportExcel: PropTypes.func.isRequired,
  onSearch: PropTypes.func
};

EstimateHeader.displayName = 'EstimateHeader';

export default EstimateHeader;
