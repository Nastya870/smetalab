/**
 * FormKS3View - Компонент для отображения формы КС-3 с использованием официального шаблона
 * Использует pixel-perfect шаблон KS3.jsx и адаптер данных
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
// import KS3 from './KS3'; // Временно закомментировано
import { adaptKS3Data } from 'utils/ks3DataAdapter';
import { generateKS3Excel } from 'utils/exportKS3Excel';

const FormKS3View = ({ data }) => {
  const [openVatDialog, setOpenVatDialog] = useState(false);
  const [includeVat, setIncludeVat] = useState(false);

  // Адаптируем данные из API в формат, который ожидает KS3
  const { doc, rows, totals } = adaptKS3Data(data);

  const handleOpenVatDialog = () => {
    setOpenVatDialog(true);
  };

  const handleCloseVatDialog = () => {
    setOpenVatDialog(false);
    setIncludeVat(false);
  };

  const handleConfirmDownload = async () => {
    setOpenVatDialog(false);
    await generateKS3Excel(data, includeVat);
    setIncludeVat(false);
  };

  return (
    <Box>
      {/* Диалог выбора НДС */}
      <Dialog open={openVatDialog} onClose={handleCloseVatDialog}>
        <DialogTitle>Настройки экспорта КС-3</DialogTitle>
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

      {/* Форма КС-3 */}
      <Box sx={{ 
        border: '1px solid #e0e0e0', 
        borderRadius: 1, 
        overflow: 'auto',
        maxHeight: 'calc(100vh - 200px)' 
      }}>
        {/* <KS3 ref={printRef} doc={doc} rows={rows} totals={totals} /> */}
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <h2>КС-3 (в разработке)</h2>
          <p>Форма КС-3 скоро будет доступна</p>
        </Box>
      </Box>
    </Box>
  );
};

export default FormKS3View;
