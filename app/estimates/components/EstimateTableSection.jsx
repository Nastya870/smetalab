import React from 'react';
import PropTypes from 'prop-types';
import WorkRow from './WorkRow';
import MaterialRow from './MaterialRow';

/**
 * Рендер одной секции таблицы сметы (работы и материалы секции)
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.section - Данные секции со списком работ
 * @param {number} props.sectionIndex - Индекс секции в массиве
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
const EstimateTableSection = React.memo(({
  section,
  sectionIndex,
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
    <>
      {/* Работы и материалы раздела */}
      {section.items?.map((item, itemIndex) => (
        <React.Fragment key={item.id || `item-${sectionIndex}-${itemIndex}`}>
          {/* ✅ МЕМОИЗИРОВАННАЯ СТРОКА РАБОТЫ */}
          <WorkRow
            item={item}
            sectionIndex={sectionIndex}
            itemIndex={itemIndex}
            onQuantityChange={onWorkQuantityChange}
            onQuantityBlur={onWorkQuantityBlur}
            onPriceChange={onWorkPriceChange}
            onPriceBlur={onWorkPriceBlur}
            onUpdateWorkPrice={onUpdateWorkPrice}
            onAddMaterial={onAddMaterial}
            onDeleteWork={onDeleteWork}
          />

          {/* ✅ МЕМОИЗИРОВАННЫЕ СТРОКИ МАТЕРИАЛОВ */}
          {item.materials?.map((material, matIndex) => (
            <MaterialRow
              key={material.id}
              material={material}
              sectionIndex={sectionIndex}
              itemIndex={itemIndex}
              matIndex={matIndex}
              onQuantityChange={onMaterialQuantityChange}
              onQuantityBlur={onMaterialQuantityBlur}
              onConsumptionChange={onMaterialConsumptionChange}
              onConsumptionBlur={onMaterialConsumptionBlur}
              onReplaceMaterial={onReplaceMaterial}
              onDeleteMaterial={onDeleteMaterial}
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
});

EstimateTableSection.displayName = 'EstimateTableSection';

EstimateTableSection.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    items: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      materials: PropTypes.array
    }))
  }).isRequired,
  sectionIndex: PropTypes.number.isRequired,
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

export default EstimateTableSection;
