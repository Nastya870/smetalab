import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  IconUser,
  IconBuilding,
  IconX,
  IconCheck
} from '@tabler/icons-react';

// API
import counterpartiesAPI from 'api/counterparties';

// ==============================|| COUNTERPARTY SELECTOR DIALOG ||============================== //

/**
 * Компонент для выбора контрагентов (Заказчик и Подрядчик) при создании договора
 */
const CounterpartySelectorDialog = ({ open, onClose, onSelect }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Списки контрагентов
  const [individuals, setIndividuals] = useState([]); // Физ. лица (Заказчики)
  const [legals, setLegals] = useState([]); // Юр. лица (Подрядчики)
  
  // Выбранные контрагенты
  const [selectedCustomer, setSelectedCustomer] = useState(''); // ID физ. лица
  const [selectedContractor, setSelectedContractor] = useState(''); // ID юр. лица

  // Загрузка контрагентов при открытии диалога
  useEffect(() => {
    if (open) {
      loadCounterparties();
    }
  }, [open]);

  const loadCounterparties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем физ. лица (Заказчики)
      const individualsData = await counterpartiesAPI.getAll({
        entityType: 'individual'
      });

      // Загружаем юр. лица (Подрядчики)
      const legalsData = await counterpartiesAPI.getAll({
        entityType: 'legal'
      });

      setIndividuals(individualsData);
      setLegals(legalsData);
    } catch (err) {
      console.error('Error loading counterparties:', err);
      setError('Не удалось загрузить список контрагентов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedCustomer || !selectedContractor) {
      setError('Необходимо выбрать обе стороны договора');
      return;
    }

    // Находим полные объекты выбранных контрагентов
    const customer = individuals.find(c => c.id === selectedCustomer);
    const contractor = legals.find(c => c.id === selectedContractor);

    onSelect({
      customer,
      contractor
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedCustomer('');
    setSelectedContractor('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant="h4">
            Выбор сторон договора
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Выберите Заказчика (физическое лицо) и Подрядчика (юридическое лицо)
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              </Grid>
            )}

            {/* ЗАКАЗЧИК (Физическое лицо) */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <IconUser size={20} />
                  <Typography variant="h4">
                    Заказчик (Сторона-1)
                  </Typography>
                  <Chip label="Физическое лицо" size="small" color="primary" />
                </Stack>
                <Divider />
              </Box>

              <FormControl fullWidth>
                <InputLabel id="customer-label">Выберите заказчика</InputLabel>
                <Select
                  labelId="customer-label"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  label="Выберите заказчика"
                >
                  {individuals.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="textSecondary">
                        Нет доступных физических лиц
                      </Typography>
                    </MenuItem>
                  ) : (
                    individuals.map((person) => (
                      <MenuItem key={person.id} value={person.id}>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {person.full_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Паспорт: {person.passport_series_number}
                            {person.phone && ` • Тел: ${person.phone}`}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {individuals.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  В справочнике нет физических лиц. Сначала создайте заказчика в разделе "Контрагенты".
                </Alert>
              )}
            </Grid>

            {/* ПОДРЯДЧИК (Юридическое лицо) */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <IconBuilding size={20} />
                  <Typography variant="h4">
                    Подрядчик (Сторона-2)
                  </Typography>
                  <Chip label="Юридическое лицо" size="small" color="secondary" />
                </Stack>
                <Divider />
              </Box>

              <FormControl fullWidth>
                <InputLabel id="contractor-label">Выберите подрядчика</InputLabel>
                <Select
                  labelId="contractor-label"
                  value={selectedContractor}
                  onChange={(e) => setSelectedContractor(e.target.value)}
                  label="Выберите подрядчика"
                >
                  {legals.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="textSecondary">
                        Нет доступных юридических лиц
                      </Typography>
                    </MenuItem>
                  ) : (
                    legals.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {company.company_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ИНН: {company.inn} • ОГРН: {company.ogrn}
                            {company.phone && ` • Тел: ${company.phone}`}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {legals.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  В справочнике нет юридических лиц. Сначала создайте подрядчика в разделе "Контрагенты".
                </Alert>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          startIcon={<IconX />}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!selectedCustomer || !selectedContractor || loading}
          startIcon={<IconCheck />}
        >
          Продолжить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CounterpartySelectorDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired
};

export default CounterpartySelectorDialog;
