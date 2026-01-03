import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  CircularProgress
} from '@mui/material';
import { IconSearch, IconPackage } from '@tabler/icons-react';
import { formatCurrency } from '../../projects/utils';

/**
 * MaterialsDialog - диалог выбора/замены материала
 * 
 * ✅ Pure UI компонент:
 * - Не содержит бизнес-логики
 * - Не делает API запросы
 * - Использует IntersectionObserver через ref из parent
 * 
 * @param {Object} props
 * @param {boolean} props.open - открыт ли диалог
 * @param {'add'|'replace'} props.mode - режим: добавление или замена
 * @param {Array} props.items - отфильтрованный список материалов
 * @param {string} props.totalCountText - текст с количеством материалов
 * @param {boolean} props.loading - индикатор загрузки
 * @param {string} props.searchQuery - поисковый запрос
 * @param {boolean} props.hasMore - есть ли ещё материалы для загрузки
 * @param {React.RefObject} props.loadMoreRef - ref для IntersectionObserver
 * @param {Function} props.onClose - callback закрытия диалога
 * @param {Function} props.onSearchChange - callback изменения поиска
 * @param {Function} props.onSelect - callback выбора материала
 */
const MaterialsDialog = ({
  open,
  mode,
  items,
  totalCountText,
  loading,
  searchQuery,
  hasMore,
  loadMoreRef,
  onClose,
  onSearchChange,
  onSelect
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          height: '80vh', 
          maxHeight: '700px',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
              {mode === 'add' ? 'Добавить материал' : 'Заменить материал'}
            </Typography>
            {mode === 'add' && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                💡 Добавьте несколько материалов подряд. Окно закроется при клике вне области.
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && (
              <CircularProgress size={16} thickness={4} />
            )}
            <Chip 
              label={totalCountText || 'Загрузка...'}
              size="small"
              color={searchQuery ? "success" : "primary"}
              variant="outlined"
            />
          </Stack>
        </Box>

        {/* Поисковое поле */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Начните вводить название, артикул или поставщика..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} color={loading ? '#9CA3AF' : '#3B82F6'} />
                </InputAdornment>
              )
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                fontSize: '0.875rem',
                bgcolor: loading ? '#F9FAFB' : 'white'
              } 
            }}
          />
        </Box>

        {/* Подсказка при поиске */}
        {searchQuery && searchQuery.trim().length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            🔍 Поиск в базе 47,000 материалов...
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '500px', overflow: 'auto' }}>
        {/* Loading state - только когда список пуст */}
        {loading && items.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={40} />
          </Box>
        ) : items.length === 0 ? (
          /* Empty state */
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
              {searchQuery 
                ? `Материалы не найдены` 
                : 'Загрузка материалов...'}
            </Typography>
            {searchQuery && (
              <Typography color="text.secondary" variant="caption">
                Попробуйте изменить поисковый запрос
              </Typography>
            )}
          </Box>
        ) : (
          /* Список материалов */
          <List sx={{ py: 0 }}>
            {items.map((material, index) => (
              <ListItem 
                key={material.id}
                disablePadding
                sx={{ 
                  borderBottom: index < items.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider'
                }}
              >
                <ListItemButton
                  onClick={() => onSelect(material)}
                  sx={{ py: 1, px: 2 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconPackage size={20} />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500} sx={{ mb: 0.25 }}>
                        {material.name}
                      </Typography>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                        {material.category && (
                          <Chip 
                            label={material.category} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.75 } }}
                          />
                        )}
                        {material.supplier && (
                          <Chip 
                            label={material.supplier} 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.75 } }}
                          />
                        )}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {material.sku || `#${material.id}`}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>•</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {material.unit}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>•</Typography>
                        <Typography component="span" variant="caption" fontWeight={600} color="primary.main" sx={{ fontSize: '0.75rem' }}>
                          {formatCurrency(material.price)}
                        </Typography>
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'span' }}
                  />
                  
                  {/* Превью изображения */}
                  {material.image && (
                    <Box
                      component="img"
                      src={material.image}
                      alt={material.name}
                      sx={{
                        width: 40,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        ml: 1,
                        flexShrink: 0
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
            
            {/* Триггер автозагрузки через Intersection Observer */}
            {hasMore && (
              <Box 
                ref={loadMoreRef} 
                sx={{ height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}
              >
                {loading && <CircularProgress size={20} thickness={4} sx={{ color: '#3B82F6' }} />}
              </Box>
            )}
            
            {/* Сообщение когда всё загружено */}
            {!hasMore && items.length > 0 && (
              <Typography sx={{ textAlign: 'center', py: 2, color: '#9CA3AF', fontSize: '0.875rem' }}>
                {searchQuery 
                  ? `✅ Найдено ${items.length} материалов` 
                  : `Показано ${items.length} материалов`
                }
              </Typography>
            )}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button 
          onClick={onClose}
          size="small"
        >
          Отмена
        </Button>
      </DialogActions>
    </Dialog>
  );
};

MaterialsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['add', 'replace']).isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string,
    supplier: PropTypes.string,
    sku: PropTypes.string,
    unit: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    image: PropTypes.string
  })).isRequired,
  totalCountText: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  searchQuery: PropTypes.string.isRequired,
  hasMore: PropTypes.bool.isRequired,
  loadMoreRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]),
  onClose: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired
};

export default MaterialsDialog;
