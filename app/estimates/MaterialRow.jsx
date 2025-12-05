import React, { memo } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  TableRow,
  TableCell,
  TextField,
  Typography,
  Box,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  IconTrash,
  IconReplace,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';

// project imports
import { formatCurrency } from '../projects/utils';

/**
 * Мемоизированная строка материала в таблице сметы
 * Рендерится только при изменении своих props
 */
const MaterialRow = memo(({
  material,
  sectionIndex,
  itemIndex,
  matIndex,
  isLast,
  onQuantityChange,
  onPriceChange,
  onToggleImage,
  onReplace,
  onDelete
}) => {
  return (
    <TableRow
      sx={{
        bgcolor: 'background.paper',
        borderBottom: isLast ? '1px dashed' : 'none',
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' }
      }}
    >
      <TableCell
        sx={{
          py: 0.75,
          px: 1,
          pl: 3,
          fontSize: '0.75rem',
          borderRight: '1px dashed',
          borderColor: 'divider'
        }}
      >
        {material.code}
      </TableCell>
      <TableCell
        sx={{
          py: 0.75,
          px: 1,
          pl: 3,
          fontSize: '0.75rem',
          borderRight: '1px dashed',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* ✅ Иконка в зависимости от типа расчёта */}
          {material.auto_calculate || material.autoCalculate ? (
            <Box
              sx={{
                bgcolor: 'success.lighter',
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
                bgcolor: 'warning.lighter',
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
          <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
            {material.name}
          </Typography>
        </Box>
      </TableCell>
      <TableCell
        align="center"
        sx={{ py: 0.75, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
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
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'block',
              mx: 'auto'
            }}
          />
        ) : (
          <Box
            sx={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              borderRadius: 1,
              mx: 'auto'
            }}
          >
            <Typography fontSize="10px" color="text.disabled">
              ---
            </Typography>
          </Box>
        )}
      </TableCell>
      <TableCell
        align="center"
        sx={{ py: 0.75, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
      >
        <Typography fontSize="0.75rem">{material.unit}</Typography>
      </TableCell>
      <TableCell
        align="right"
        sx={{ py: 0.75, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
      >
        {material.auto_calculate || material.autoCalculate ? (
          <Typography fontSize="0.75rem" color="text.secondary">
            {parseFloat(material.quantity || 0).toFixed(2)}
          </Typography>
        ) : (
          <TextField
            type="number"
            value={material.quantity || ''}
            onChange={(e) => onQuantityChange(sectionIndex, itemIndex, matIndex, e.target.value)}
            size="small"
            inputProps={{
              min: 0,
              step: 0.01,
              style: {
                textAlign: 'right',
                fontSize: '0.75rem',
                padding: '2px 4px'
              }
            }}
            sx={{
              width: '80px',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.75rem',
                bgcolor: 'warning.lighter'
              },
              '& input[type=number]': {
                MozAppearance: 'textfield'
              },
              '& input[type=number]::-webkit-outer-spin-button': {
                WebkitAppearance: 'none',
                margin: 0
              },
              '& input[type=number]::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0
              }
            }}
          />
        )}
      </TableCell>
      <TableCell
        align="right"
        sx={{ py: 0.75, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
      >
        <TextField
          type="number"
          value={material.price || ''}
          onChange={(e) => onPriceChange(sectionIndex, itemIndex, matIndex, e.target.value)}
          size="small"
          inputProps={{
            min: 0,
            step: 0.01,
            style: {
              textAlign: 'right',
              fontSize: '0.75rem',
              padding: '2px 4px'
            }
          }}
          sx={{
            width: '90px',
            '& .MuiOutlinedInput-root': {
              fontSize: '0.75rem'
            },
            '& input[type=number]': {
              MozAppearance: 'textfield'
            },
            '& input[type=number]::-webkit-outer-spin-button': {
              WebkitAppearance: 'none',
              margin: 0
            },
            '& input[type=number]::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0
            }
          }}
        />
      </TableCell>
      <TableCell
        align="right"
        sx={{ py: 0.75, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
      >
        <Typography fontSize="0.75rem" fontWeight={500} color="success.main">
          {formatCurrency(material.total)}
        </Typography>
      </TableCell>
      <TableCell
        align="center"
        sx={{ py: 0.75, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
      >
        <Typography fontSize="0.75rem" color="text.secondary">
          {parseFloat(material.consumption || 0).toFixed(3)}
        </Typography>
      </TableCell>
      <TableCell align="center" sx={{ py: 0.75, px: 1 }}>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          {material.image && (
            <Tooltip title={material.showImage ? 'Скрыть изображение' : 'Показать изображение'}>
              <IconButton
                size="small"
                sx={{ p: 0.25 }}
                onClick={() => onToggleImage(sectionIndex, itemIndex, matIndex)}
              >
                {material.showImage ? <IconEyeOff size={14} /> : <IconEye size={14} />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Заменить материал">
            <IconButton
              size="small"
              color="warning"
              sx={{ p: 0.25 }}
              onClick={() => onReplace(sectionIndex, itemIndex, matIndex)}
            >
              <IconReplace size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить материал">
            <IconButton
              size="small"
              color="error"
              sx={{ p: 0.25 }}
              onClick={() => onDelete(sectionIndex, itemIndex, matIndex)}
            >
              <IconTrash size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Сравниваем только material
  if (prevProps.material !== nextProps.material) {
    return false;
  }
  
  // Сравниваем isLast (может измениться при удалении)
  if (prevProps.isLast !== nextProps.isLast) {
    return false;
  }
  
  // Индексы
  if (prevProps.sectionIndex !== nextProps.sectionIndex ||
      prevProps.itemIndex !== nextProps.itemIndex ||
      prevProps.matIndex !== nextProps.matIndex) {
    return false;
  }
  
  return true;
});

MaterialRow.propTypes = {
  material: PropTypes.object.isRequired,
  sectionIndex: PropTypes.number.isRequired,
  itemIndex: PropTypes.number.isRequired,
  matIndex: PropTypes.number.isRequired,
  isLast: PropTypes.bool.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onPriceChange: PropTypes.func.isRequired,
  onToggleImage: PropTypes.func.isRequired,
  onReplace: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

MaterialRow.displayName = 'MaterialRow';

export default MaterialRow;
