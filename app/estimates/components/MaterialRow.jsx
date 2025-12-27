import React, { memo } from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import { IconPackage, IconTrash, IconReplace } from '@tabler/icons-react';

// Утилита форматирования валюты
const formatCurrency = (value) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
};

/**
 * Мемоизированная строка материала в таблице сметы
 * Перерендерится только при изменении своих props
 */
const MaterialRow = memo(({
  material,
  sectionIndex,
  itemIndex,
  matIndex,
  onQuantityChange,
  onQuantityBlur,
  onConsumptionChange,
  onConsumptionBlur,
  onReplaceMaterial,
  onDeleteMaterial
}) => {
  const isAutoCalculate = material.auto_calculate || material.autoCalculate;
  
  return (
    <TableRow
      sx={{
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #F1F5F9',
        '&:hover': { bgcolor: '#F9FAFB' }
      }}
    >
      {/* Код материала */}
      <TableCell
        sx={{
          py: 0.75,
          px: 1.5,
          pl: 3,
          fontSize: '0.65rem',
          color: '#6B7280'
        }}
      >
        {material.code || '—'}
      </TableCell>

      {/* Название материала с иконкой типа */}
      <TableCell
        sx={{
          py: 0.75,
          px: 1.5,
          pl: 3,
          fontSize: '0.7rem'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isAutoCalculate ? (
            <Box
              sx={{
                bgcolor: '#DCFCE7',
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
                bgcolor: '#FEF3C7',
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
          <Typography sx={{ fontSize: '0.7rem', color: '#374151' }}>
            {material.name}
          </Typography>
        </Box>
      </TableCell>

      {/* Фото материала */}
      <TableCell
        align="center"
        sx={{ py: 0.75, px: 1.5 }}
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
              borderRadius: '4px',
              border: '1px solid #E5E7EB',
              display: 'block',
              mx: 'auto'
            }}
          />
        ) : (
          <Box
            sx={{
              width: 28,
              height: 28,
              bgcolor: '#F3F4F6',
              borderRadius: '4px',
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

      {/* Единица измерения */}
      <TableCell
        align="center"
        sx={{
          py: 0.75,
          px: 1.5,
          fontSize: '0.65rem',
          color: '#6B7280'
        }}
      >
        {material.unit || '—'}
      </TableCell>

      {/* Количество материала - uncontrolled */}
      <TableCell
        align="right"
        sx={{ py: 0.75, px: 1.5 }}
      >
        <TextField
          type="text"
          key={`matqty_${sectionIndex}_${itemIndex}_${matIndex}_${material.quantity}`}
          defaultValue={material.quantity}
          onChange={(e) => onQuantityChange(sectionIndex, itemIndex, matIndex, e.target.value)}
          onBlur={(e) => onQuantityBlur(sectionIndex, itemIndex, matIndex, e.target)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onQuantityBlur(sectionIndex, itemIndex, matIndex, e.target);
              e.target.blur();
            }
          }}
          size="small"
          placeholder="0"
          inputProps={{
            style: { 
              textAlign: 'right',
              fontSize: '0.65rem',
              fontWeight: 500,
              padding: '4px 8px'
            }
          }}
          sx={{
            width: 80,
            '& .MuiOutlinedInput-root': {
              height: 30,
              borderRadius: '6px',
              bgcolor: isAutoCalculate ? '#F0FDF4' : '#FEFCE8',
              '& fieldset': {
                borderColor: isAutoCalculate ? '#86EFAC' : '#FDE68A',
              },
              '&:hover fieldset': {
                borderColor: isAutoCalculate ? '#4ADE80' : '#FBBF24',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#635BFF',
                borderWidth: '2px'
              }
            }
          }}
        />
      </TableCell>

      {/* Цена */}
      <TableCell
        align="right"
        sx={{
          py: 0.75,
          px: 1.5,
          fontSize: '0.7rem',
          color: '#374151'
        }}
      >
        {formatCurrency(material.price)}
      </TableCell>

      {/* Сумма */}
      <TableCell
        align="right"
        sx={{ py: 0.75, px: 1.5 }}
      >
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#1D4ED8'
          }}
        >
          {formatCurrency(material.total)}
        </Typography>
      </TableCell>

      {/* Коэффициент расхода - uncontrolled */}
      <TableCell
        align="center"
        sx={{ py: 0.75, px: 1.5, fontSize: '0.65rem' }}
      >
        <TextField
          type="text"
          key={`cons_${sectionIndex}_${itemIndex}_${matIndex}_${material.consumption}`}
          defaultValue={material.consumption}
          onChange={(e) => onConsumptionChange(sectionIndex, itemIndex, matIndex, e.target.value)}
          onBlur={(e) => onConsumptionBlur(sectionIndex, itemIndex, matIndex, e.target)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onConsumptionBlur(sectionIndex, itemIndex, matIndex, e.target);
              e.target.blur();
            }
          }}
          size="small"
          placeholder="1.05"
          inputProps={{
            style: { 
              textAlign: 'center',
              fontSize: '0.65rem',
              fontWeight: 600,
              padding: '2px 6px'
            }
          }}
          sx={{
            width: 70,
            '& .MuiOutlinedInput-root': {
              height: 26,
              borderRadius: '6px',
              '& fieldset': {
                borderColor: '#D1D5DB',
              },
              '&:hover fieldset': {
                borderColor: '#9CA3AF',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#635BFF',
                borderWidth: '2px'
              }
            }
          }}
          title="Коэффициент расхода"
        />
      </TableCell>

      {/* Действия */}
      <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Tooltip title="Заменить материал">
            <IconButton 
              size="small" 
              sx={{ 
                p: 0.5,
                color: '#6B7280',
                '&:hover': { bgcolor: '#F3F4F6', color: '#F59E0B' }
              }}
              onClick={() => onReplaceMaterial(sectionIndex, itemIndex, matIndex)}
            >
              <IconReplace size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить материал">
            <IconButton 
              size="small" 
              sx={{ 
                p: 0.5,
                color: '#9CA3AF',
                '&:hover': { bgcolor: '#FEF2F2', color: '#EF4444' }
              }}
              onClick={() => onDeleteMaterial(sectionIndex, itemIndex, matIndex)}
            >
              <IconTrash size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  // Ререндер только если изменились критические данные
  return (
    prevProps.material.id === nextProps.material.id &&
    prevProps.material.quantity === nextProps.material.quantity &&
    prevProps.material.total === nextProps.material.total &&
    prevProps.material.price === nextProps.material.price &&
    prevProps.material.consumption === nextProps.material.consumption &&
    prevProps.material.auto_calculate === nextProps.material.auto_calculate &&
    prevProps.sectionIndex === nextProps.sectionIndex &&
    prevProps.itemIndex === nextProps.itemIndex &&
    prevProps.matIndex === nextProps.matIndex
  );
});

MaterialRow.displayName = 'MaterialRow';

export default MaterialRow;
