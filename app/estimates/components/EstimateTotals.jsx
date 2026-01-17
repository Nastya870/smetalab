import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { formatCurrency } from '../../projects/utils';

/**
 * EstimateTotals - Sticky footer с итогами сметы
 * 
 * Отображает итоговые суммы работ, материалов и общий вес.
 * Показывается только когда есть данные в смете.
 * 
 * @component
 */
const EstimateTotals = ({ worksTotal, materialsTotal, totalWeight }) => {
  return (
    <Box
      sx={{
        borderTop: '2px solid #E5E7EB',
        bgcolor: '#FFFFFF',
        px: 2,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 3,
        flexShrink: 0
      }}
    >
      {/* Итого за работы */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>
          Итого за работы:
        </Typography>
        <Box sx={{
          px: 1.5,
          py: 0.5,
          bgcolor: '#F0FDF4',
          borderRadius: '6px',
          border: '1px solid #BBF7D0'
        }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16A34A' }}>
            {formatCurrency(worksTotal)}
          </Typography>
        </Box>
      </Box>

      {/* Итого за материалы */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>
          Итого за материалы:
        </Typography>
        <Box sx={{
          px: 1.5,
          py: 0.5,
          bgcolor: '#FEF3C7',
          borderRadius: '6px',
          border: '1px solid #FCD34D'
        }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#D97706' }}>
            {formatCurrency(materialsTotal)}
          </Typography>
        </Box>
      </Box>

      {/* 🔥 Общий вес материалов - показываем всегда */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>
          Вес:
        </Typography>
        <Box sx={{
          px: 1.5,
          py: 0.5,
          bgcolor: '#EFF6FF',
          borderRadius: '6px',
          border: '1px solid #BFDBFE'
        }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563EB' }}>
            {totalWeight.toLocaleString('ru-RU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 3
            })} кг
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

EstimateTotals.propTypes = {
  /** Итого за работы (рубли) */
  worksTotal: PropTypes.number.isRequired,
  /** Итого за материалы (рубли) */
  materialsTotal: PropTypes.number.isRequired,
  /** Общий вес материалов (кг) */
  totalWeight: PropTypes.number.isRequired
};

EstimateTotals.displayName = 'EstimateTotals';

export default EstimateTotals;
