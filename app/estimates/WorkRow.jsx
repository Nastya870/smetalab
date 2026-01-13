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
  IconPackage,
  IconTrash,
  IconReplace,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';

// project imports
import { formatCurrency } from '../projects/utils';

/**
 * Мемоизированная строка работы в таблице сметы
 * Оптимизирована для больших смет (500+ работ)
 * Перерендеривается только при изменении своих props
 */
const WorkRow = memo(({
  item,
  sectionIndex,
  itemIndex,
  onQuantityChange,
  onAddMaterial,
  onDeleteWork
}) => {
  return (
    <>
      {/* Строка работы */}
      <TableRow
        sx={{
          bgcolor: 'primary.lighter',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          '&:hover': { bgcolor: 'primary.light' }
        }}
      >
        <TableCell
          sx={{
            py: 1,
            px: 1,
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRight: '1px dashed',
            borderColor: 'divider'
          }}
        >
          {item.code}
        </TableCell>
        <TableCell
          sx={{
            py: 1,
            px: 1,
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRight: '1px dashed',
            borderColor: 'divider'
          }}
        >
          <Box>
            {item.name}
            {item.description && (
              <Typography variant="caption" color="text.secondary" display="block">
                {item.description}
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell
          align="center"
          sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
        >
          -
        </TableCell>
        <TableCell
          align="center"
          sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
        >
          {item.unit}
        </TableCell>
        <TableCell
          align="right"
          sx={{
            py: 1,
            px: 1,
            borderRight: '1px dashed',
            borderColor: 'divider'
          }}
        >
          {/* ✏️ РЕДАКТИРУЕМОЕ ПОЛЕ КОЛИЧЕСТВА */}
          <TextField
            type="number"
            value={item.quantity || ''}
            onChange={(e) => onQuantityChange(sectionIndex, itemIndex, e.target.value)}
            size="small"
            inputProps={{
              min: 0,
              step: 0.01,
              style: {
                textAlign: 'right',
                fontSize: '0.875rem',
                padding: '4px 8px'
              }
            }}
            sx={{
              width: '100px',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                bgcolor: (!item.quantity || item.quantity === 0) ? 'rgba(255, 0, 0, 0.15)' : 'background.paper',
                '&:hover': {
                  bgcolor: (!item.quantity || item.quantity === 0) ? 'rgba(255, 0, 0, 0.2)' : 'primary.lighter'
                },
                '&.Mui-focused': {
                  bgcolor: (!item.quantity || item.quantity === 0) ? 'rgba(255, 0, 0, 0.25)' : 'primary.lighter'
                }
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
          sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
        >
          {formatCurrency(item.price)}
        </TableCell>
        <TableCell
          align="right"
          sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
        >
          {/* 💰 АВТОМАТИЧЕСКИ РАССЧИТАННАЯ СУММА */}
          <Typography
            variant="body2"
            fontWeight={600}
            color="primary"
            sx={{
              bgcolor: 'success.lighter',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              display: 'inline-block'
            }}
          >
            {formatCurrency(item.total)}
          </Typography>
        </TableCell>
        <TableCell
          align="center"
          sx={{ py: 1, px: 1, borderRight: '1px dashed', borderColor: 'divider' }}
        >
          -
        </TableCell>
        <TableCell align="center" sx={{ py: 1, px: 1 }}>
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="Добавить материал">
              <IconButton
                size="small"
                color="primary"
                sx={{ p: 0.5 }}
                onClick={() => onAddMaterial(sectionIndex, itemIndex)}
              >
                <IconPackage size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Удалить блок">
              <IconButton
                size="small"
                color="error"
                sx={{ p: 0.5 }}
                onClick={() => onDeleteWork(sectionIndex, itemIndex)}
              >
                <IconTrash size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>
    </>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для React.memo
  // Возвращает true если props НЕ изменились (пропустить рендер)
  // Возвращает false если props изменились (выполнить рендер)
  
  // Сравниваем только item (самое важное)
  if (prevProps.item !== nextProps.item) {
    return false; // Изменился - рендерим
  }
  
  // Сравниваем индексы (на случай сортировки)
  if (prevProps.sectionIndex !== nextProps.sectionIndex ||
      prevProps.itemIndex !== nextProps.itemIndex) {
    return false;
  }
  
  // Если ничего не изменилось - пропускаем рендер
  return true;
});

WorkRow.propTypes = {
  item: PropTypes.object.isRequired,
  sectionIndex: PropTypes.number.isRequired,
  itemIndex: PropTypes.number.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onAddMaterial: PropTypes.func.isRequired,
  onDeleteWork: PropTypes.func.isRequired
};

WorkRow.displayName = 'WorkRow';

export default WorkRow;
