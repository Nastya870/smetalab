/**
 * FormKS2View - Компонент для отображения формы КС-2 с использованием официального шаблона
 * Использует pixel-perfect шаблон KS2.jsx и адаптер данных
 */
import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormControlLabel,
  Checkbox,
  Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
// import KS2 from './KS2'; // Временно закомментировано
import { adaptKS2Data } from 'utils/ks2DataAdapter';
import { generateKS2Excel } from 'utils/exportKS2Excel';

const FormKS2View = ({ data }) => {
  const [openVatDialog, setOpenVatDialog] = useState(false);
  const [includeVat, setIncludeVat] = useState(false);

  // Адаптируем данные из API в формат, который ожидает KS2
  const { doc, rows, totals } = adaptKS2Data(data);

  const handleOpenVatDialog = () => {
    setOpenVatDialog(true);
  };

  const handleCloseVatDialog = () => {
    setOpenVatDialog(false);
    setIncludeVat(false);
  };

  const handleConfirmDownload = async () => {
    try {setOpenVatDialog(false);
      await generateKS2Excel(data, includeVat);setIncludeVat(false);
    } catch (error) {
      console.error('КС-2: Ошибка при скачивании:', error);
      alert('Ошибка при создании файла КС-2: ' + error.message);
      setIncludeVat(false);
    }
  };

  return (
    <Box>
      {/* Диалог выбора НДС */}
      <Dialog open={openVatDialog} onClose={handleCloseVatDialog}>
        <DialogTitle>Настройки экспорта КС-2</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
              />
            }
            label={
              <Typography>
                Включить НДС - 20% в стоимость
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVatDialog}>Отмена</Button>
          <Button onClick={handleConfirmDownload} variant="contained">
            Скачать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Кнопки управления */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }} className="no-print">
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleOpenVatDialog}
        >
          Скачать Excel
        </Button>
      </Box>

      {/* Форма КС-2 */}
      <Box sx={{ 
        border: '1px solid #e0e0e0', 
        borderRadius: 1, 
        overflow: 'auto',
        maxHeight: 'calc(100vh - 200px)' 
      }}>
        {/* <KS2 ref={printRef} doc={doc} rows={rows} totals={totals} /> */}
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <h2>Шаблон КС-2</h2>
          <p>Нажмите "Скачать Excel" чтобы получить файл формы КС-2</p>
        </Box>
      </Box>
    </Box>
  );
};

export default FormKS2View;
