import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress
} from '@mui/material';
import { IconTemplate } from '@tabler/icons-react';

/**
 * SaveTemplateDialog - диалог сохранения сметы как шаблона
 * 
 * ✅ Pure UI компонент:
 * - Не содержит state
 * - Не делает API запросы
 * - Все данные и callbacks из parent
 * 
 * @param {Object} props
 * @param {boolean} props.open - открыт ли диалог
 * @param {boolean} props.saving - идёт ли сохранение
 * @param {Object} props.formData - данные формы
 * @param {string} props.formData.name - название шаблона
 * @param {string} props.formData.description - описание шаблона
 * @param {string} props.formData.category - категория шаблона
 * @param {Function} props.onClose - callback закрытия диалога
 * @param {Function} props.onChange - callback изменения поля (field, value)
 * @param {Function} props.onSave - callback сохранения
 */
const SaveTemplateDialog = ({
  open,
  saving,
  formData,
  onClose,
  onChange,
  onSave
}) => {
  const hasNameError = !formData.name.trim() && formData.name !== '';

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="sm"
      PaperProps={{
        sx: {
          width: 540,
          maxWidth: '90vw',
          borderRadius: '12px',
          overflow: 'hidden'
        }
      }}
    >
      {/* Хедер */}
      <Box
        sx={{
          height: 56,
          px: 2.5,
          bgcolor: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Typography sx={{ 
          fontSize: '1.125rem', 
          fontWeight: 600, 
          color: '#111827'
        }}>
          Сохранить как шаблон
        </Typography>
      </Box>

      {/* Контент */}
      <DialogContent sx={{ px: 2.5, py: 3 }}>
        <Stack spacing={2.5}>
          {/* Название шаблона */}
          <Box>
            <TextField
              label="Название шаблона"
              value={formData.name}
              onChange={(e) => onChange('name', e.target.value)}
              required
              fullWidth
              placeholder="Например: Ремонт квартиры"
              error={hasNameError}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 44,
                  borderRadius: '10px',
                  '& fieldset': { borderColor: '#D1D5DB' },
                  '&:hover fieldset': { borderColor: '#9CA3AF' },
                  '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 2 },
                  '&.Mui-error fieldset': { borderColor: '#DC2626' }
                },
                '& .MuiInputLabel-root': { 
                  fontSize: '0.875rem',
                  '&.Mui-focused': { color: '#4F46E5' }
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '0.875rem',
                  '&::placeholder': { color: '#9CA3AF', opacity: 1 }
                }
              }}
            />
            {hasNameError && (
              <Typography sx={{ fontSize: '0.75rem', color: '#DC2626', mt: 0.5, ml: 0.5 }}>
                Название обязательно для заполнения
              </Typography>
            )}
          </Box>

          {/* Описание */}
          <Box>
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder="Краткое описание шаблона"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  minHeight: 90,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  '& fieldset': { borderColor: '#D1D5DB' },
                  '&:hover fieldset': { borderColor: '#9CA3AF' },
                  '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 2 }
                },
                '& .MuiInputLabel-root': { 
                  fontSize: '0.875rem',
                  '&.Mui-focused': { color: '#4F46E5' }
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '0.875rem',
                  padding: 0,
                  '&::placeholder': { color: '#9CA3AF', opacity: 1 }
                }
              }}
            />
            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mt: 0.75, ml: 0.5 }}>
              Необязательно. Поможет быстрее найти шаблон.
            </Typography>
          </Box>

          {/* Разделитель и категория */}
          <Box sx={{ pt: 1 }}>
            <Typography sx={{ 
              fontSize: '0.75rem', 
              fontWeight: 500, 
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 1.5
            }}>
              Дополнительно
            </Typography>

            <TextField
              label="Категория"
              value={formData.category}
              onChange={(e) => onChange('category', e.target.value)}
              fullWidth
              placeholder="Например: Квартиры, Офисы"
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 44,
                  borderRadius: '10px',
                  '& fieldset': { borderColor: '#D1D5DB' },
                  '&:hover fieldset': { borderColor: '#9CA3AF' },
                  '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 2 }
                },
                '& .MuiInputLabel-root': { 
                  fontSize: '0.875rem',
                  '&.Mui-focused': { color: '#4F46E5' }
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '0.875rem',
                  '&::placeholder': { color: '#9CA3AF', opacity: 1 }
                }
              }}
            />
            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mt: 0.75, ml: 0.5 }}>
              Для группировки шаблонов в списке.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      {/* Футер с кнопками */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5
        }}
      >
        <Button 
          onClick={onClose} 
          disabled={saving}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#6B7280',
            px: 2,
            '&:hover': { bgcolor: '#F3F4F6' }
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={saving || !formData.name.trim()}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <IconTemplate size={18} color="#FFFFFF" />}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            bgcolor: '#4F46E5',
            borderRadius: '8px',
            px: 2.5,
            height: 40,
            '&:hover': { bgcolor: '#4338CA' },
            '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' }
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить шаблон'}
        </Button>
      </Box>
    </Dialog>
  );
};

SaveTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default SaveTemplateDialog;
