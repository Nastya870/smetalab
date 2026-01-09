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
import { TableVirtuoso } from 'react-virtuoso';
import WorkRow from './WorkRow';
import MaterialRow from './MaterialRow';

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
// ✅ Stable components for Virtuoso (Must be defined outside render)
const VirtuosoScroller = React.forwardRef((props, ref) => (
  <TableContainer component={Paper} {...props} ref={ref} elevation={0} sx={{ height: 'calc(100vh - 340px)' }} />
));

const VirtuosoTable = (props) => (
  <Table {...props} size="small" stickyHeader sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} />
);

const VirtuosoTableHead = React.forwardRef((props, ref) => <TableHead {...props} ref={ref} />);
const VirtuosoTableBody = React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />);

// ✅ Custom TableRow to handle styles
const CustomTableRow = (props) => {
  const { item, ...rest } = props;
  const sx = item?.type === 'work'
    ? {
      bgcolor: '#F7F8FF',
      borderBottom: '1px solid #E5E7EB',
      '&:hover': { bgcolor: '#EEF2FF' }
    }
    : {
      bgcolor: '#FFFFFF',
      borderBottom: '1px solid #F1F5F9',
      '&:hover': { bgcolor: '#F9FAFB' }
    };

  return <TableRow {...rest} sx={sx} />;
};

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
  onDeleteMaterial,
  searchQuery // ✅ New Prop
}) => {
  // ✅ Flat data for virtualization with Filtering
  const flatData = React.useMemo(() => {
    const rows = [];
    const query = searchQuery ? searchQuery.toLowerCase().trim() : '';
    // console.log('EstimateTable filtering with:', query);

    sortedEstimateData?.sections?.forEach((section, sectionIndex) => {
      section.items?.forEach((item, itemIndex) => {

        let matches = true;

        if (query) {
          const itemMatches = (item.name || '').toLowerCase().includes(query) || (item.code || '').toLowerCase().includes(query);
          const materialMatches = item.materials?.some(m => (m.name || '').toLowerCase().includes(query) || (m.code || '').toLowerCase().includes(query));
          matches = itemMatches || materialMatches;
        }

        if (matches) {
          // Work Row
          rows.push({
            type: 'work',
            item,
            sectionIndex,
            itemIndex
          });

          // Material Rows
          item.materials?.forEach((material, matIndex) => {
            // Should we filter materials? 
            // Better to show all materials if the work block is shown, for context.
            // Or maybe highlight them?
            // For simplicity: Show all materials if work matches. 
            // Refinement: If only material matches, and work doesn't? 
            // Let's show all materials for now to maintain structure integrity.
            rows.push({
              type: 'material',
              material,
              sectionIndex,
              itemIndex,
              matIndex
            });
          });
        }
      });
    });
    return rows;
  }, [sortedEstimateData, searchQuery]);

  return (
    <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
      {searchQuery && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          right: 20,
          bgcolor: 'rgba(255,255,255,0.9)',
          px: 1,
          py: 0.5,
          borderRadius: '0 0 4px 4px',
          border: '1px solid #E5E7EB',
          borderTop: 'none',
          zIndex: 10,
          fontSize: '0.75rem',
          color: '#6B7280'
        }}>
          Найдено: {flatData.length} поз.
        </Box>
      )}
      {searchQuery && flatData.length === 0 && (
        <Box sx={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#6B7280',
          zIndex: 10
        }}>
          <Typography>Ничего не найдено по запросу "{searchQuery}"</Typography>
        </Box>
      )}
      <TableVirtuoso
        data={flatData}
        computeItemKey={(index, item) => {
          // Bulletproof unique key generation using composite of Position + ID
          // This ensures keys are always unique even if data has duplicate IDs
          // And stable during edits (where position doesn't change)

          if (item.type === 'work') {
            const id = item.item.id || 'unknown';
            return `w_${item.sectionIndex}_${item.itemIndex}_${id}`;
          } else {
            const id = item.material.id || 'unknown';
            return `m_${item.sectionIndex}_${item.itemIndex}_${item.matIndex}_${id}`;
          }
        }}
        components={{
          Scroller: VirtuosoScroller,
          Table: VirtuosoTable,
          TableHead: VirtuosoTableHead,
          TableRow: CustomTableRow,
          TableBody: VirtuosoTableBody,
        }}
        fixedHeaderContent={() => (
          <TableRow sx={{ bgcolor: '#F9FAFB' }}>
            <TableCell sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '60px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Код</Typography>
            </TableCell>
            <TableCell sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: 'auto' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Наименование</Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '50px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Фото</Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '60px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ед.</Typography>
            </TableCell>
            <TableCell align="right" sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '100px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Кол-во</Typography>
            </TableCell>
            <TableCell align="right" sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '120px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Цена</Typography>
            </TableCell>
            <TableCell align="right" sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '120px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Сумма</Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '90px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Расход</Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 1.25, px: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '100px' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Действия</Typography>
            </TableCell>
          </TableRow>
        )}
        itemContent={(index, row) => {
          if (row.type === 'work') {
            return (
              <WorkRow
                item={row.item}
                sectionIndex={row.sectionIndex}
                itemIndex={row.itemIndex}
                onQuantityChange={onWorkQuantityChange}
                onQuantityBlur={onWorkQuantityBlur}
                onPriceChange={onWorkPriceChange}
                onPriceBlur={onWorkPriceBlur}
                onUpdateWorkPrice={onUpdateWorkPrice}
                onAddMaterial={onAddMaterial}
                onDeleteWork={onDeleteWork}
                isVirtual={true} // ✅ Render as cells (Fragment)
              />
            );
          } else {
            return (
              <MaterialRow
                material={row.material}
                sectionIndex={row.sectionIndex}
                itemIndex={row.itemIndex}
                matIndex={row.matIndex}
                onQuantityChange={onMaterialQuantityChange}
                onQuantityBlur={onMaterialQuantityBlur}
                onConsumptionChange={onMaterialConsumptionChange}
                onConsumptionBlur={onMaterialConsumptionBlur}
                onReplaceMaterial={onReplaceMaterial}
                onDeleteMaterial={onDeleteMaterial}
                isVirtual={true} // ✅ Render as cells (Fragment)
              />
            );
          }
        }}
      />
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
