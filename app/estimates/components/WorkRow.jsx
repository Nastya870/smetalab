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
import { IconPackage, IconTrash, IconRefresh } from '@tabler/icons-react';

// Утилита форматирования валюты
const formatCurrency = (value) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
};

/**
 * Мемоизированная строка работы в таблице сметы
 * Перерендерится только при изменении своих props
 */
const WorkRow = memo(({
  item,
  sectionIndex,
  itemIndex,
  onQuantityChange,
  onQuantityBlur,
  onPriceChange,
  onPriceBlur,
  onUpdateWorkPrice,
  onAddMaterial,
  onDeleteWork
}) => {
  return (
    <TableRow
      sx={{
        bgcolor: '#F7F8FF',
        borderBottom: '1px solid #E5E7EB',
        '&:hover': { bgcolor: '#EEF2FF' }
      }}
    >
      {/* Код */}
      <TableCell
        sx={{
          py: 1,
          px: 1.5,
          fontWeight: 600,
          fontSize: '0.7rem',
          color: '#374151'
        }}
      >
        {item.code}
      </TableCell>

      {/* Название + Фаза/Стадия/Подстадия */}
      <TableCell
        sx={{
          py: 1,
          px: 1.5,
          fontWeight: 600
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>
            {item.name}
          </Typography>
          {(item.phase || item.section || item.subsection) && (
            <Typography 
              sx={{ 
                display: 'block',
                mt: 0.5,
                fontSize: '0.625rem',
                fontStyle: 'italic',
                color: '#6B7280'
              }}
            >
              {[
                item.phase && <span key="phase" style={{ color: '#16A34A' }}>{item.phase}</span>,
                item.phase && item.section && <span key="arrow1"> → </span>,
                item.section && <span key="section" style={{ color: '#DC2626' }}>{item.section}</span>,
                item.section && item.subsection && <span key="arrow2"> → </span>,
                item.subsection && <span key="subsection" style={{ color: '#2563EB' }}>{item.subsection}</span>
              ].filter(Boolean)}
            </Typography>
          )}
        </Box>
      </TableCell>

      {/* Фото (пусто для работы) */}
      <TableCell
        align="center"
        sx={{ py: 1, px: 1.5, color: '#9CA3AF', fontSize: '0.65rem' }}
      >
        —
      </TableCell>

      {/* Единица измерения */}
      <TableCell
        align="center"
        sx={{ py: 1, px: 1.5, fontSize: '0.7rem', color: '#6B7280' }}
      >
        {item.unit}
      </TableCell>

      {/* Количество - uncontrolled input */}
      <TableCell
        align="right"
        sx={{ py: 1, px: 1.5 }}
      >
        <TextField
          type="number"
          key={`qty_${sectionIndex}_${itemIndex}_${item.quantity}`}
          defaultValue={item.quantity || ''}
          onChange={(e) => onQuantityChange(sectionIndex, itemIndex, e.target.value)}
          onBlur={(e) => onQuantityBlur(sectionIndex, itemIndex, e.target)}
          size="small"
          inputProps={{
            min: 0,
            step: 0.01,
            style: { 
              textAlign: 'right', 
              fontSize: '0.7rem',
              padding: '6px 10px'
            }
          }}
          sx={{
            width: '90px',
            '& .MuiOutlinedInput-root': {
              fontSize: '0.7rem',
              borderRadius: '6px',
              height: 34,
              bgcolor: (!item.quantity || item.quantity === 0) ? '#FEF2F2' : '#FFFFFF',
              '& fieldset': {
                borderColor: (!item.quantity || item.quantity === 0) ? '#FCA5A5' : '#D1D5DB',
              },
              '&:hover fieldset': {
                borderColor: (!item.quantity || item.quantity === 0) ? '#F87171' : '#9CA3AF',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#635BFF',
                borderWidth: '2px'
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

      {/* Цена - редактируемое поле */}
      <TableCell
        align="right"
        sx={{ py: 1, px: 1.5 }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
          <TextField
            type="number"
            key={`price_${sectionIndex}_${itemIndex}_${item.price}`}
            defaultValue={item.price || ''}
            onChange={(e) => onPriceChange(sectionIndex, itemIndex, e.target.value)}
            onBlur={(e) => onPriceBlur(sectionIndex, itemIndex, e.target)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onPriceBlur(sectionIndex, itemIndex, e.target);
                e.target.blur();
              }
            }}
            size="small"
            inputProps={{
              min: 0,
              step: 0.01,
              style: { 
                textAlign: 'right', 
                fontSize: '0.7rem',
                padding: '6px 10px'
              }
            }}
            sx={{
              width: '110px',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.7rem',
                borderRadius: '6px',
                height: 34,
                bgcolor: '#FEF3C7',
                '& fieldset': {
                  borderColor: '#FCD34D',
                },
                '&:hover fieldset': {
                  borderColor: '#FBBF24',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#F59E0B',
                  borderWidth: '2px'
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
          {item.workId && (
            <Tooltip title="Обновить базовую цену в справочнике Работ">
              <IconButton 
                size="small" 
                sx={{ 
                  p: 0.5,
                  color: '#6B7280',
                  '&:hover': { bgcolor: '#F3F4F6', color: '#10B981' }
                }}
                onClick={() => onUpdateWorkPrice(sectionIndex, itemIndex, item.workId, item.price)}
              >
                <IconRefresh size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>

      {/* Сумма */}
      <TableCell
        align="right"
        sx={{ py: 1, px: 1.5 }}
      >
        <Typography 
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#1D4ED8'
          }}
        >
          {formatCurrency(item.total)}
        </Typography>
      </TableCell>

      {/* Расход (пусто для работы) */}
      <TableCell
        align="center"
        sx={{ py: 1, px: 1.5, color: '#9CA3AF', fontSize: '0.65rem' }}
      >
        —
      </TableCell>

      {/* Действия */}
      <TableCell align="center" sx={{ py: 1, px: 1.5 }}>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Tooltip title="Добавить материал">
            <IconButton 
              size="small" 
              sx={{ 
                p: 0.5,
                color: '#4B5563',
                '&:hover': { bgcolor: '#F3F4F6', color: '#635BFF' }
              }}
              onClick={() => onAddMaterial(sectionIndex, itemIndex)}
            >
              <IconPackage size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить блок">
            <IconButton 
              size="small" 
              sx={{ 
                p: 0.5,
                color: '#9CA3AF',
                '&:hover': { bgcolor: '#FEF2F2', color: '#EF4444' }
              }}
              onClick={() => onDeleteWork(sectionIndex, itemIndex)}
            >
              <IconTrash size={18} />
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
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.total === nextProps.item.total &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.sectionIndex === nextProps.sectionIndex &&
    prevProps.itemIndex === nextProps.itemIndex
  );
});

WorkRow.displayName = 'WorkRow';

export default WorkRow;
