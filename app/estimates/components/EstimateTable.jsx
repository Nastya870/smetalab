import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import EstimateTableSection from './EstimateTableSection';

/**
 * Основная таблица сметы с работами и материалами
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.sortedEstimateData - Данные сметы (с секциями, работами, материалами)
 * @param {Function} props.onWorkQuantityChange - Обработчик изменения количества работы
 * @param {Function} props.onWorkQuantityBlur - Обработчик потери фокуса поля количества работы
 * @param {Function} props.onWorkPriceChange - Обработчик изменения цены работы
 * @param {Function} props.onWorkPriceBlur - Обработчик потери фокуса поля цены работы
 * @param {Function} props.onUpdateWorkPrice - Обработчик обновления цены работы в справочнике
 * @param {Function} props.onAddMaterial - Обработчик добавления материала к работе
 * @param {Function} props.onDeleteWork - Обработчик удаления работы
 * @param {Function} props.onMaterialQuantityChange - Обработчик изменения количества материала
 * @param {Function} props.onMaterialQuantityBlur - Обработчик потери фокуса поля количества материала
 * @param {Function} props.onMaterialConsumptionChange - Обработчик изменения расхода материала
 * @param {Function} props.onMaterialConsumptionBlur - Обработчик потери фокуса поля расхода материала
 * @param {Function} props.onReplaceMaterial - Обработчик замены материала
 * @param {Function} props.onDeleteMaterial - Обработчик удаления материала
 */
const EstimateTable = React.memo(({
  sortedEstimateData,
  onWorkQuantityChange,
  onWorkQuantityBlur,
  onWorkPriceChange,
  onWorkPriceBlur,
  onUpdateWorkPrice,
  onAddMaterial,
  onDeleteWork,
  onMaterialQuantityChange,
  onMaterialQuantityBlur,
  onMaterialConsumptionChange,
  onMaterialConsumptionBlur,
  onReplaceMaterial,
  onDeleteMaterial
}) => {
  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{ 
          overflowX: 'auto', 
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 340px)',
          '&::-webkit-scrollbar': { width: 6, height: 6 },
          '&::-webkit-scrollbar-track': { bgcolor: '#F1F5F9' },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 3 },
          '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#94A3B8' }
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Код
                </Typography>
              </TableCell>
              <TableCell 
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Наименование
                </Typography>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  minWidth: 70
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Фото
                </Typography>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ед.
                </Typography>
              </TableCell>
              <TableCell
                align="right"
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Кол-во
                </Typography>
              </TableCell>
              <TableCell
                align="right"
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Цена
                </Typography>
              </TableCell>
              <TableCell
                align="right"
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Сумма
                </Typography>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Расход
                </Typography>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  py: 1.25, 
                  px: 1.5, 
                  bgcolor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  minWidth: 100
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Действия
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEstimateData?.sections?.map((section, sectionIndex) => (
              <EstimateTableSection
                key={section.id || `section-${sectionIndex}`}
                section={section}
                sectionIndex={sectionIndex}
                onWorkQuantityChange={onWorkQuantityChange}
                onWorkQuantityBlur={onWorkQuantityBlur}
                onWorkPriceChange={onWorkPriceChange}
                onWorkPriceBlur={onWorkPriceBlur}
                onUpdateWorkPrice={onUpdateWorkPrice}
                onAddMaterial={onAddMaterial}
                onDeleteWork={onDeleteWork}
                onMaterialQuantityChange={onMaterialQuantityChange}
                onMaterialQuantityBlur={onMaterialQuantityBlur}
                onMaterialConsumptionChange={onMaterialConsumptionChange}
                onMaterialConsumptionBlur={onMaterialConsumptionBlur}
                onReplaceMaterial={onReplaceMaterial}
                onDeleteMaterial={onDeleteMaterial}
              />
            ))}

            {/* Итоги вынесены в отдельный sticky footer */}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

EstimateTable.displayName = 'EstimateTable';

EstimateTable.propTypes = {
  sortedEstimateData: PropTypes.shape({
    sections: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      items: PropTypes.arrayOf(PropTypes.object)
    }))
  }),
  onWorkQuantityChange: PropTypes.func.isRequired,
  onWorkQuantityBlur: PropTypes.func.isRequired,
  onWorkPriceChange: PropTypes.func.isRequired,
  onWorkPriceBlur: PropTypes.func.isRequired,
  onUpdateWorkPrice: PropTypes.func.isRequired,
  onAddMaterial: PropTypes.func.isRequired,
  onDeleteWork: PropTypes.func.isRequired,
  onMaterialQuantityChange: PropTypes.func.isRequired,
  onMaterialQuantityBlur: PropTypes.func.isRequired,
  onMaterialConsumptionChange: PropTypes.func.isRequired,
  onMaterialConsumptionBlur: PropTypes.func.isRequired,
  onReplaceMaterial: PropTypes.func.isRequired,
  onDeleteMaterial: PropTypes.func.isRequired
};

export default EstimateTable;
