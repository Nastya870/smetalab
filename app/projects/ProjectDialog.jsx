import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

// material-ui
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Divider, Button, TextField, Stack, Box, Typography, 
  Autocomplete, CircularProgress,
  useMediaQuery, useTheme
} from '@mui/material';
import { IconBriefcase, IconTrash } from '@tabler/icons-react';

// project imports
import { getStatusText } from './utils';
import counterpartiesAPI from 'api/counterparties';
import useAuth from 'hooks/useAuth';

// ==============================|| PROJECT DIALOG ||============================== //

const ProjectDialog = ({ open, editMode, project, onClose, onSave, onDelete, onChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { tenant } = useAuth(); // Получаем данные нашей компании
  
  // State для контрагентов
  const [counterparties, setCounterparties] = useState([]);
  const [loadingCounterparties, setLoadingCounterparties] = useState(false);
  
  // Загрузка контрагентов при открытии диалога
  useEffect(() => {
    const loadCounterparties = async () => {
      if (!open) return;
      
      try {
        setLoadingCounterparties(true);
const data = await counterpartiesAPI.getAll();
setCounterparties(data || []);
      } catch (error) {
        console.error('[ProjectDialog] Error loading counterparties:', error);
        console.error('[ProjectDialog] Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setCounterparties([]);
      } finally {
        setLoadingCounterparties(false);
      }
    };
    
    loadCounterparties();
  }, [open]);
  
  // Форматирование названия контрагента для отображения
  const getCounterpartyLabel = (counterparty) => {
    if (!counterparty) return '';
    // API возвращает camelCase
    if (counterparty.entityType === 'legal') {
      return counterparty.companyName || '';
    } else {
      return counterparty.fullName || '';
    }
  };
  
  // Название нашей компании (подрядчик)
  const contractorName = tenant?.name || '';
  
  // DEBUG: Логирование состояния
  useEffect(() => {
}, [counterparties, loadingCounterparties, contractorName, tenant]);
  
  const isFormValid =
    project.client && project.contractor && project.address && project.objectName;

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
          <IconBriefcase size={24} />
          <Typography variant="h3">{editMode ? 'Редактировать проект' : 'Создать новый проект'}</Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Заказчик - Autocomplete с возможностью ручного ввода */}
          <Autocomplete
            freeSolo
            options={counterparties}
            getOptionKey={(option) => {
              // Уникальный ключ для каждой опции
              if (typeof option === 'object' && option !== null) {
                return option.id || option.company_name || option.full_name || Math.random();
              }
              return option || Math.random();
            }}
            getOptionLabel={(option) => {
              // Если это объект контрагента
              if (typeof option === 'object' && option !== null) {
                return getCounterpartyLabel(option);
              }
              // Если это строка (ручной ввод)
              return option || '';
            }}
            value={project.client}
            onChange={(event, newValue) => {
              // Если выбран контрагент из списка
              if (newValue && typeof newValue === 'object') {
                onChange('client', getCounterpartyLabel(newValue));
              } else {
                // Ручной ввод
                onChange('client', newValue || '');
              }
            }}
            onInputChange={(event, newInputValue) => {
              // Синхронизация при ручном вводе
              onChange('client', newInputValue);
            }}
            loading={loadingCounterparties}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Заказчик"
                required
                helperText="Выберите из списка контрагентов или введите вручную"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCounterparties ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
          />

          {/* Подрядчик - Autocomplete с автозаполнением нашей компании */}
          <Autocomplete
            freeSolo
            options={contractorName ? [contractorName] : []} // Наша компания в списке (только если есть)
            value={project.contractor}
            onChange={(event, newValue) => {
              onChange('contractor', newValue || '');
            }}
            onInputChange={(event, newInputValue) => {
              onChange('contractor', newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Подрядчик"
                required
                helperText={contractorName ? `По умолчанию: ${contractorName}` : 'Название организации-подрядчика'}
              />
            )}
          />

          <TextField
            label="Адрес объекта"
            fullWidth
            required
            value={project.address}
            onChange={(e) => onChange('address', e.target.value)}
            variant="outlined"
            multiline
            rows={2}
            helperText="Полный адрес строительного объекта"
          />

          <TextField
            label="Наименование объекта"
            fullWidth
            required
            value={project.objectName}
            onChange={(e) => onChange('objectName', e.target.value)}
            variant="outlined"
            helperText="Название строительного объекта"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Дата начала работ"
              type="date"
              fullWidth
              value={project.startDate}
              onChange={(e) => onChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              helperText="Необязательное поле"
            />

            <TextField
              label="Дата окончания работ"
              type="date"
              fullWidth
              value={project.endDate}
              onChange={(e) => onChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              helperText="Необязательное поле"
            />
          </Box>

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
                <strong>Номер договора:</strong> {project.contractNumber || 'Генерируется автоматически'} |{' '}
                <strong>Статус:</strong> {getStatusText(project.status)} | <strong>Прогресс:</strong> {project.progress}%
              </Typography>
            </Box>
          )}
          
          {!editMode && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'success.lighter',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'success.main'
              }}
            >
              <Typography variant="body2" color="success.dark">
                💡 Номер договора будет сгенерирован автоматически при создании проекта
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Box>{editMode && <Button onClick={onDelete} color="error" variant="outlined" startIcon={<IconTrash />} size="small">
            Удалить проект
          </Button>}</Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="secondary" variant="outlined" size="small">
            Отмена
          </Button>
          <Button onClick={onSave} color="primary" variant="contained" disabled={!isFormValid} size="small">
            {editMode ? 'Сохранить изменения' : 'Создать проект'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

ProjectDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  editMode: PropTypes.bool.isRequired,
  project: PropTypes.shape({
    id: PropTypes.number,
    client: PropTypes.string,
    contractor: PropTypes.string,
    address: PropTypes.string,
    objectName: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    status: PropTypes.string,
    progress: PropTypes.number
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired
};

export default ProjectDialog;
