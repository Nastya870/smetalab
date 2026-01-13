import PropTypes from 'prop-types';

// material-ui
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Button,
  TextField,
  Stack,
  Box,
  Typography,
  MenuItem,
  FormControlLabel,
  Switch,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { IconBox, IconTrash } from '@tabler/icons-react';

// ==============================|| MATERIAL DIALOG ||============================== //

const MaterialDialog = ({ open, editMode, material, onClose, onSave, onDelete, onChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isFormValid = material.sku && material.name && material.category && material.unit && material.price >= 0 && material.supplier && material.weight >= 0;

  const categories = [
    'Цемент и бетон',
    'Кирпич и блоки',
    'Металлопрокат',
    'Пиломатериалы',
    'Отделочные материалы',
    'Кровельные материалы',
    'Изоляционные материалы',
    'Электрика',
    'Сантехника',
    'Прочие'
  ];

  const units = ['м', 'м²', 'м³', 'шт', 'т', 'кг', 'л', 'упак.', 'рул.'];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          m: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : 'calc(100% - 64px)'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconBox size={24} />
          <Typography variant="h3">{editMode ? 'Редактировать материал' : 'Добавить новый материал'}</Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Артикул (SKU)"
            fullWidth
            required
            value={material.sku}
            onChange={(e) => onChange('sku', e.target.value)}
            variant="outlined"
            helperText="Уникальный артикул материала (например, MAT-001)"
          />

          <TextField
            label="Наименование материала"
            fullWidth
            required
            value={material.name}
            onChange={(e) => onChange('name', e.target.value)}
            variant="outlined"
            helperText="Полное наименование материала"
          />

          <Box>
            <TextField
              label="URL изображения"
              fullWidth
              value={material.image}
              onChange={(e) => onChange('image', e.target.value)}
              variant="outlined"
              helperText="Ссылка на изображение товара"
              disabled={!material.showImage}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={material.showImage}
                  onChange={(e) => onChange('showImage', e.target.checked)}
                  color="primary"
                />
              }
              label="Показывать изображение"
              sx={{ mt: 1 }}
            />
          </Box>

          <TextField
            label="Категория"
            fullWidth
            required
            select
            value={material.category}
            onChange={(e) => onChange('category', e.target.value)}
            variant="outlined"
            helperText="Выберите категорию материала"
          >
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Поставщик"
            fullWidth
            required
            value={material.supplier}
            onChange={(e) => onChange('supplier', e.target.value)}
            variant="outlined"
            helperText="Название компании-поставщика"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Единица измерения"
              fullWidth
              required
              select
              value={material.unit}
              onChange={(e) => onChange('unit', e.target.value)}
              variant="outlined"
            >
              {units.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Цена за единицу"
              fullWidth
              required
              type="number"
              value={material.price}
              onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
              variant="outlined"
              InputProps={{
                endAdornment: '₽'
              }}
            />
          </Box>

          <TextField
            label="Вес на единицу (кг)"
            fullWidth
            required
            type="number"
            value={material.weight}
            onChange={(e) => onChange('weight', parseFloat(e.target.value) || 0)}
            variant="outlined"
            helperText="Вес одной единицы товара в килограммах"
          />

          {/* ✅ НОВОЕ: Чекбокс "Автоматический расчёт" */}
          <Box
            sx={{
              p: 2,
              bgcolor: material.autoCalculate ? 'success.lighter' : 'warning.lighter',
              borderRadius: 1,
              border: '1px solid',
              borderColor: material.autoCalculate ? 'success.main' : 'warning.main'
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={material.autoCalculate !== false}
                  onChange={(e) => onChange('autoCalculate', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    🤖 Автоматический расчёт количества
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {material.autoCalculate !== false
                      ? 'Количество материала рассчитывается по формуле: количество работы × расход'
                      : 'Количество материала вводится вручную в каждой смете'}
                  </Typography>
                </Box>
              }
            />

            {/* Поле "Расход" показываем только если автоматический расчёт включён */}
            {material.autoCalculate !== false && (
              <TextField
                label="Расход на единицу работы"
                fullWidth
                required
                type="number"
                value={material.consumption || ''}
                onChange={(e) => onChange('consumption', parseFloat(e.target.value) || 0)}
                variant="outlined"
                helperText={`Например: 1.05 ${material.unit} материала на 1 единицу работы`}
                inputProps={{
                  step: 0.01,
                  min: 0
                }}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          <TextField
            label="URL товара"
            fullWidth
            value={material.productUrl}
            onChange={(e) => onChange('productUrl', e.target.value)}
            variant="outlined"
            helperText="Ссылка на страницу товара у поставщика (необязательно)"
          />

          {editMode && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'info.light',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'info.main'
              }}
            >
              <Typography variant="body2" color="info.dark">
                <strong>ID:</strong> {material.id}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Box>
          {editMode && (
            <Button onClick={onDelete} color="error" variant="outlined" startIcon={<IconTrash />} size="small">
              Удалить материал
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="secondary" variant="outlined" size="small">
            Отмена
          </Button>
          <Button onClick={onSave} color="primary" variant="contained" disabled={!isFormValid} size="small">
            {editMode ? 'Сохранить изменения' : 'Добавить материал'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

MaterialDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  editMode: PropTypes.bool.isRequired,
  material: PropTypes.shape({
    id: PropTypes.number,
    sku: PropTypes.string,
    name: PropTypes.string,
    image: PropTypes.string,
    unit: PropTypes.string,
    price: PropTypes.number,
    supplier: PropTypes.string,
    weight: PropTypes.number,
    category: PropTypes.string,
    productUrl: PropTypes.string,
    showImage: PropTypes.bool,
    autoCalculate: PropTypes.bool, // ✅ Флаг автоматического расчёта
    consumption: PropTypes.number // ✅ Расход материала
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired
};

export default MaterialDialog;
