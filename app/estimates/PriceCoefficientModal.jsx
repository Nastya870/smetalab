import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Divider,
  Alert,
  Stack,
  InputAdornment
} from '@mui/material';
import { IconPercentage, IconRefresh, IconCheck } from '@tabler/icons-react';

// ==============================|| PRICE COEFFICIENT MODAL ||============================== //

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
    if (window.confirm('Вы уверены, что хотите сбросить все цены работ до исходных значений?')) {
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
  const getPreviewText = () => {
    const numValue = parseFloat(coefficient);
    if (isNaN(numValue)) return '';
    
    const multiplier = 1 + (numValue / 100);
    const exampleOriginal = 1000;
    const exampleNew = exampleOriginal * multiplier;
    
    return `Пример: ${exampleOriginal.toLocaleString('ru-RU')} ₽ → ${exampleNew.toLocaleString('ru-RU')} ₽`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconPercentage size={24} />
          <Typography variant="h4" component="span">
            Коэффициент цен на работы
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            Коэффициент применяется <strong>только к работам</strong>, цены материалов не изменяются.
          </Alert>

          <Box>
            <TextField
              fullWidth
              label="Коэффициент, %"
              value={coefficient}
              onChange={handleCoefficientChange}
              onKeyPress={handleKeyPress}
              autoFocus
              type="text"
              inputMode="decimal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconPercentage size={18} />
                  </InputAdornment>
                )
              }}
              helperText={
                error || 
                'Положительное значение увеличивает цены, отрицательное - уменьшает'
              }
              error={!!error}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '1.2rem',
                  fontWeight: 600
                }
              }}
            />
          </Box>

          {!error && coefficient !== '' && !isNaN(parseFloat(coefficient)) && (
            <Box sx={{ 
              bgcolor: 'success.lighter', 
              p: 2, 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'success.main'
            }}>
              <Typography variant="body2" color="success.dark" fontWeight={500}>
                📊 {getPreviewText()}
              </Typography>
            </Box>
          )}

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Примеры использования:
            </Typography>
            <Stack spacing={0.5} sx={{ pl: 2 }}>
              <Typography variant="body2" color="text.secondary">
                • <strong>+20%</strong> — увеличение цен на 20%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>-15%</strong> — снижение цен на 15%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>+50%</strong> — увеличение цен в 1.5 раза
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<IconRefresh />}
          onClick={handleReset}
          sx={{ mr: 'auto' }}
        >
          Сбросить цены
        </Button>
        
        <Button onClick={onClose} color="inherit">
          Отмена
        </Button>
        
        <Button
          variant="contained"
          startIcon={<IconCheck />}
          onClick={handleApply}
          disabled={!!error || coefficient === '' || isNaN(parseFloat(coefficient))}
        >
          Применить
        </Button>
      </DialogActions>
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
