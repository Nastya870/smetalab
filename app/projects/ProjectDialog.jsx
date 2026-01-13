import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

// material-ui
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Stack, Box, Typography, 
  Autocomplete, CircularProgress,
  useMediaQuery, useTheme
} from '@mui/material';
import { IconFolderPlus, IconTrash, IconInfoCircle, IconBuilding } from '@tabler/icons-react';

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
  
  // Автоматически устанавливаем подрядчика при открытии
  useEffect(() => {
    if (open && contractorName && !project.contractor) {
      onChange('contractor', contractorName);
    }
  }, [open, contractorName, project.contractor, onChange]);
  
  const isFormValid =
    project.client && project.address && project.objectName;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          m: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : 'calc(100% - 64px)',
          borderRadius: isMobile ? 0 : '12px'
        }
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconFolderPlus size={20} stroke={1.5} color="#6B7280" />
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#1F2937' }}>
            {editMode ? 'Редактировать проект' : 'Создать новый проект'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 2 }}>
        <Stack spacing={2}>
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
                label="Клиент"
                required
                placeholder="Поиск или ввод контрагента..."
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCounterparties ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
          />

          {/* Подрядчик - компактное отображение */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            py: 1,
            px: 1.5,
            bgcolor: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <IconBuilding size={16} stroke={1.5} color="#6B7280" />
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Подрядчик:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              {contractorName || 'Не определён'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', ml: 'auto' }}>
              назначается автоматически
            </Typography>
          </Box>

          <TextField
            label="Адрес объекта"
            fullWidth
            required
            value={project.address}
            onChange={(e) => onChange('address', e.target.value)}
            variant="outlined"
            size="small"
            multiline
            rows={2}
            placeholder="Полный адрес строительного объекта"
          />

          <TextField
            label="Наименование объекта"
            fullWidth
            required
            value={project.objectName}
            onChange={(e) => onChange('objectName', e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Название строительного объекта"
          />

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label="Дата начала"
              type="date"
              value={project.startDate}
              onChange={(e) => onChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
            />

            <TextField
              label="Дата окончания"
              type="date"
              value={project.endDate}
              onChange={(e) => onChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
            />
          </Box>

          {editMode && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <IconInfoCircle size={16} stroke={1.5} color="#6B7280" />
              <Typography sx={{ fontSize: '0.8125rem', color: '#4B5563' }}>
                <strong>Договор:</strong> {project.contractNumber || 'Генерируется'} &nbsp;•&nbsp;
                <strong>Статус:</strong> {getStatusText(project.status)} &nbsp;•&nbsp;
                <strong>Прогресс:</strong> {project.progress}%
              </Typography>
            </Box>
          )}
          
          {!editMode && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <IconInfoCircle size={16} stroke={1.5} color="#6B7280" />
              <Typography sx={{ fontSize: '0.8125rem', color: '#4B5563' }}>
                Номер договора будет сгенерирован автоматически
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end', gap: 1 }}>
        {editMode && (
          <Button 
            onClick={onDelete} 
            startIcon={<IconTrash size={16} />}
            sx={{ 
              mr: 'auto',
              color: '#DC2626',
              fontSize: '0.875rem',
              textTransform: 'none',
              '&:hover': { bgcolor: '#FEF2F2' }
            }}
          >
            Удалить
          </Button>
        )}
        <Button 
          onClick={onClose}
          sx={{ 
            color: '#6B7280',
            fontSize: '0.875rem',
            textTransform: 'none',
            '&:hover': { bgcolor: '#F3F4F6' }
          }}
        >
          Отмена
        </Button>
        <Button 
          onClick={() => onSave(project)} 
          variant="contained" 
          disabled={!isFormValid}
          sx={{ 
            bgcolor: '#4F46E5',
            fontSize: '0.875rem',
            fontWeight: 500,
            textTransform: 'none',
            px: 2.5,
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(79,70,229,0.2)',
            '&:hover': { bgcolor: '#4338CA', boxShadow: '0 4px 6px rgba(79,70,229,0.25)' },
            '&:disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' }
          }}
        >
          {editMode ? 'Сохранить' : 'Создать проект'}
        </Button>
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
