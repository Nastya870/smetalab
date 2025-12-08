import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  InputAdornment
} from '@mui/material';
import { IconPercentage, IconRefresh, IconCheck, IconInfoCircle } from '@tabler/icons-react';

// ==============================|| PRICE COEFFICIENT MODAL - REDESIGNED ||============================== //

const PriceCoefficientModal = ({ open, onClose, onApply, onReset, currentCoefficient = 0 }) => {
  const [coefficient, setCoefficient] = useState(currentCoefficient);
  const [error, setError] = useState('');

  // Синхронизируем локальное состояние с пропсом при открытии модалки
  useEffect(() => {
    if (open) {
      setCoefficient(currentCoefficient);
      setError('');
    }
  }, [open, currentCoefficient]);

  const handleCoefficientChange = (e) => {
    const value = e.target.value;
    
    // Разрешаем пустое значение, минус и цифры с точкой/запятой
    if (value === '' || value === '-' || /^-?\d*[.,]?\d*$/.test(value)) {
      // Заменяем запятую на точку для корректной работы
      const normalizedValue = value.replace(',', '.');
      setCoefficient(normalizedValue);
      setError('');
    }
  };

  const handleApply = () => {
    // Конвертируем в число
    const numValue = parseFloat(coefficient);
    
    // Валидация
    if (isNaN(numValue)) {
      setError('Введите корректное числовое значение');
      return;
    }
    
    if (numValue < -100) {
      setError('Коэффициент не может быть меньше -100%');
      return;
    }
    
    if (numValue > 1000) {
      setError('Коэффициент не может быть больше 1000%');
      return;
    }

    // Применяем коэффициент
    onApply(numValue);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Сбросить все цены работ до исходных значений?')) {
      onReset();
      setCoefficient(0);
      onClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  // Предпросмотр результата
  const getPreviewResult = () => {
    const numValue = parseFloat(coefficient);
    if (isNaN(numValue)) return null;
    
    const multiplier = 1 + (numValue / 100);
    const exampleOriginal = 1000;
    const exampleNew = exampleOriginal * multiplier;
    
    return {
      original: exampleOriginal.toLocaleString('ru-RU'),
      result: exampleNew.toLocaleString('ru-RU')
    };
  };

  const preview = getPreviewResult();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
      {/* ✅ Хедер - 56px, фон #F9FAFB */}
      <Box
        sx={{
          height: 56,
          px: 2.5,
          bgcolor: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <Box sx={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          bgcolor: '#EEF2FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <IconPercentage size={18} color="#4F46E5" />
        </Box>
        <Typography sx={{ 
          fontSize: '1.125rem', 
          fontWeight: 600, 
          color: '#111827'
        }}>
          Коэффициент цен на работы
        </Typography>
      </Box>

      {/* ✅ Контент */}
      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        <Stack spacing={2.5}>
          
          {/* ✅ Информационный блок - фиолетовый */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            p: 1.5,
            bgcolor: '#EEF2FF',
            borderRadius: '10px',
            border: '1px solid #C7D2FE'
          }}>
            <IconInfoCircle size={18} color="#4F46E5" style={{ flexShrink: 0, marginTop: 1 }} />
            <Typography sx={{ fontSize: '0.8125rem', color: '#4338CA', lineHeight: 1.5 }}>
              Коэффициент применяется <strong>только к работам</strong>, цены материалов не изменяются.
            </Typography>
          </Box>

          {/* ✅ Поле ввода */}
          <Box>
            <TextField
              fullWidth
              label="Коэффициент"
              value={coefficient}
              onChange={handleCoefficientChange}
              onKeyPress={handleKeyPress}
              autoFocus
              type="text"
              inputMode="decimal"
              error={!!error}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: '#6B7280' }}>%</Typography>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 48,
                  borderRadius: '10px',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  '& fieldset': { borderColor: '#D1D5DB' },
                  '&:hover fieldset': { borderColor: '#9CA3AF' },
                  '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 2 },
                  '&.Mui-error fieldset': { borderColor: '#DC2626' }
                },
                '& .MuiInputLabel-root': { 
                  fontSize: '0.875rem',
                  '&.Mui-focused': { color: '#4F46E5' }
                }
              }}
            />
            {error ? (
              <Typography sx={{ fontSize: '0.75rem', color: '#DC2626', mt: 0.75, ml: 0.5 }}>
                {error}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mt: 0.75, ml: 0.5 }}>
                Положительное значение увеличивает цены, отрицательное — уменьшает
              </Typography>
            )}
          </Box>

          {/* ✅ Пример - мягкий зеленый блок */}
          {!error && coefficient !== '' && preview && (
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.25,
              bgcolor: '#F0FDF4',
              borderRadius: '8px',
              border: '1px solid #BBF7D0'
            }}>
              <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                Пример:
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                {preview.original} ₽
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>→</Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#16A34A' }}>
                {preview.result} ₽
              </Typography>
            </Box>
          )}

          {/* ✅ Примеры использования - компактные */}
          <Box sx={{ pt: 0.5 }}>
            <Typography sx={{ 
              fontSize: '0.75rem', 
              fontWeight: 500, 
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 1
            }}>
              Примеры значений
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { value: '+20%', desc: 'рост' },
                { value: '-15%', desc: 'скидка' },
                { value: '+50%', desc: '×1.5' }
              ].map((item) => (
                <Box 
                  key={item.value}
                  sx={{ 
                    px: 1.5, 
                    py: 0.5, 
                    bgcolor: '#F3F4F6', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75
                  }}
                >
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                    {item.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                    {item.desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      {/* ✅ Футер с кнопками */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        {/* Сбросить - слева */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconRefresh size={16} />}
          onClick={handleReset}
          sx={{
            mr: 'auto',
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#D97706',
            borderColor: '#FCD34D',
            borderRadius: '8px',
            px: 1.5,
            height: 36,
            '&:hover': { 
              bgcolor: '#FEF3C7',
              borderColor: '#F59E0B'
            }
          }}
        >
          Сбросить
        </Button>
        
        {/* Отмена - текстовая */}
        <Button 
          onClick={onClose}
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
        
        {/* Применить - фиолетовая */}
        <Button
          variant="contained"
          startIcon={<IconCheck size={18} color="#FFFFFF" />}
          onClick={handleApply}
          disabled={!!error || coefficient === '' || isNaN(parseFloat(coefficient))}
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
          Применить
        </Button>
      </Box>
    </Dialog>
  );
};

PriceCoefficientModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  currentCoefficient: PropTypes.number
};

export default PriceCoefficientModal;
