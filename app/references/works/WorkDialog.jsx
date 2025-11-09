import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

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
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { IconTool, IconTrash } from '@tabler/icons-react';

// API
import workHierarchyAPI from 'api/workHierarchy';

// ==============================|| WORK DIALOG ||============================== //

const WorkDialog = ({ open, editMode, work, onClose, onSave, onDelete, onChange }) => {
  const isFormValid = work.code && work.name && work.unit && work.basePrice >= 0;

  // State для autocomplete options
  const [phaseOptions, setPhaseOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [subsectionOptions, setSubsectionOptions] = useState([]);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingSubsections, setLoadingSubsections] = useState(false);

  const units = ['м', 'м²', 'м³', 'шт', 'т', 'кг', 'компл.'];

  // Загружаем фазы при открытии диалога
  useEffect(() => {
    if (open) {
      loadPhases();
    }
  }, [open]);

  // Загружаем разделы когда выбрана фаза
  useEffect(() => {
    if (work.phase) {
      loadSections(work.phase);
    } else {
      setSectionOptions([]);
      setSubsectionOptions([]);
    }
  }, [work.phase]);

  // Загружаем подразделы когда выбран раздел
  useEffect(() => {
    if (work.section) {
      loadSubsections(work.section);
    } else {
      setSubsectionOptions([]);
    }
  }, [work.section]);

  const loadPhases = async () => {
    try {
      setLoadingPhases(true);
      const response = await workHierarchyAPI.getAutocomplete('phase');
      setPhaseOptions(response.data.data || []);
    } catch (error) {
      console.error('Error loading phases:', error);
    } finally {
      setLoadingPhases(false);
    }
  };

  const loadSections = async (phaseValue) => {
    try {
      setLoadingSections(true);
      const response = await workHierarchyAPI.getByLevel('section', phaseValue);
      setSectionOptions(response.data.data.map(s => ({ label: s.value, value: s.value })));
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setLoadingSections(false);
    }
  };

  const loadSubsections = async (sectionValue) => {
    try {
      setLoadingSubsections(true);
      const response = await workHierarchyAPI.getByLevel('subsection', sectionValue);
      setSubsectionOptions(response.data.data.map(s => ({ label: s.value, value: s.value })));
    } catch (error) {
      console.error('Error loading subsections:', error);
    } finally {
      setLoadingSubsections(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconTool size={24} />
          <Typography variant="h3">{editMode ? 'Редактировать работу' : 'Добавить новую работу'}</Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Код работы"
            fullWidth
            required
            value={work.code}
            onChange={(e) => onChange('code', e.target.value)}
            variant="outlined"
            helperText="Уникальный код работы (например, 01-001)"
          />

          <TextField
            label="Наименование работы"
            fullWidth
            required
            value={work.name}
            onChange={(e) => onChange('name', e.target.value)}
            variant="outlined"
            helperText="Полное наименование вида работ"
          />

          {/* Иерархия: Фаза → Раздел → Подраздел */}
          <Typography variant="subtitle2" sx={{ mt: 1, mb: -1 }}>
            Иерархия работ
          </Typography>

          <Autocomplete
            freeSolo
            options={phaseOptions}
            value={work.phase || ''}
            onChange={(event, newValue) => {
              onChange('phase', typeof newValue === 'string' ? newValue : newValue?.value || '');
              onChange('section', ''); // Сбрасываем раздел
              onChange('subsection', ''); // Сбрасываем подраздел
            }}
            onInputChange={(event, newInputValue) => {
              onChange('phase', newInputValue);
            }}
            loading={loadingPhases}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Фаза/Этап"
                helperText="Выберите или введите новую фазу"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingPhases ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
          />

          <Autocomplete
            freeSolo
            disabled={!work.phase}
            options={sectionOptions}
            value={work.section || ''}
            onChange={(event, newValue) => {
              onChange('section', typeof newValue === 'string' ? newValue : newValue?.value || '');
              onChange('subsection', ''); // Сбрасываем подраздел
            }}
            onInputChange={(event, newInputValue) => {
              onChange('section', newInputValue);
            }}
            loading={loadingSections}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Раздел"
                helperText={work.phase ? 'Выберите или введите новый раздел' : 'Сначала выберите фазу'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingSections ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
          />

          <Autocomplete
            freeSolo
            disabled={!work.section}
            options={subsectionOptions}
            value={work.subsection || ''}
            onChange={(event, newValue) => {
              onChange('subsection', typeof newValue === 'string' ? newValue : newValue?.value || '');
            }}
            onInputChange={(event, newInputValue) => {
              onChange('subsection', newInputValue);
            }}
            loading={loadingSubsections}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Подраздел"
                helperText={work.section ? 'Выберите или введите новый подраздел' : 'Сначала выберите раздел'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingSubsections ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Единица измерения"
              fullWidth
              required
              select
              value={work.unit}
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
              label="Базовая цена за единицу"
              fullWidth
              required
              type="number"
              value={work.basePrice}
              onChange={(e) => onChange('basePrice', parseFloat(e.target.value) || 0)}
              variant="outlined"
              InputProps={{
                endAdornment: '₽'
              }}
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
                <strong>ID:</strong> {work.id}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Box>
          {editMode && (
            <Button onClick={onDelete} color="error" variant="outlined" startIcon={<IconTrash />}>
              Удалить работу
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="secondary" variant="outlined">
            Отмена
          </Button>
          <Button onClick={onSave} color="primary" variant="contained" disabled={!isFormValid}>
            {editMode ? 'Сохранить изменения' : 'Добавить работу'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

WorkDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  editMode: PropTypes.bool.isRequired,
  work: PropTypes.shape({
    id: PropTypes.number,
    code: PropTypes.string,
    name: PropTypes.string,
    unit: PropTypes.string,
    basePrice: PropTypes.number
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired
};

export default WorkDialog;
