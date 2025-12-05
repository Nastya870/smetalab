import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Stack, Chip, TextField, InputAdornment, IconButton, Tooltip,
  CircularProgress, Alert, Tabs, Tab
} from '@mui/material';
import {
  IconUsers, IconPlus, IconSearch, IconEdit, IconTrash, IconBuilding, IconUser
} from '@tabler/icons-react';
import counterpartiesAPI from 'api/counterparties';
import CounterpartyModal from './CounterpartyModal';

const Counterparties = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [counterparties, setCounterparties] = useState([]);
  const [filteredCounterparties, setFilteredCounterparties] = useState([]);
  const [search, setSearch] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);

  useEffect(() => {
    loadCounterparties();
  }, []);

  useEffect(() => {
    filterCounterparties();
  }, [counterparties, search, entityTypeFilter]);

  const loadCounterparties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await counterpartiesAPI.getAll();
      setCounterparties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading counterparties:', err);
      setError('Не удалось загрузить контрагентов');
    } finally {
      setLoading(false);
    }
  };

  const filterCounterparties = () => {
    let filtered = [...counterparties];
    
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.entityType === entityTypeFilter);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.fullName?.toLowerCase().includes(searchLower) ||
        c.companyName?.toLowerCase().includes(searchLower) ||
        c.inn?.includes(search) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredCounterparties(filtered);
  };

  const handleCreate = () => {
    setSelectedCounterparty(null);
    setModalOpen(true);
  };

  const handleEdit = (counterparty) => {
    setSelectedCounterparty(counterparty);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого контрагента?')) return;
    
    try {
      await counterpartiesAPI.delete(id);
      await loadCounterparties();
    } catch (err) {
      console.error('Error deleting counterparty:', err);
      setError('Не удалось удалить контрагента');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedCounterparty(null);
  };

  const handleModalSuccess = () => {
    loadCounterparties();
    handleModalClose();
  };

  const getEntityTypeLabel = (type) => type === 'individual' ? 'Физ. лицо' : 'Юр. лицо';
  const getEntityTypeIcon = (type) => type === 'individual' ? <IconUser size={16} /> : <IconBuilding size={16} />;

  return (
    <Box data-testid="counterparties-page">
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <IconUsers size={24} />
              <Typography variant="h5" data-testid="counterparties-title">Контрагенты</Typography>
            </Box>
            <Button variant="contained" startIcon={<IconPlus />} onClick={handleCreate} size="small" data-testid="add-counterparty-btn">
              Добавить контрагента
            </Button>
          </Box>

          <Tabs value={entityTypeFilter} onChange={(e, v) => setEntityTypeFilter(v)} data-testid="counterparties-tabs">
            <Tab label="Все" value="all" />
            <Tab label="Физ. лица" value="individual" icon={<IconUser size={18} />} iconPosition="start" />
            <Tab label="Юр. лица" value="legal" icon={<IconBuilding size={18} />} iconPosition="start" />
          </Tabs>

          <TextField
            placeholder="Поиск по имени, ИНН, телефону, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="counterparties-search"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              )
            }}
            size="small"
            fullWidth
          />

          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        </Stack>
      </Paper>

      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : filteredCounterparties.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              {search || entityTypeFilter !== 'all' ? 'Контрагенты не найдены' : 'Нет контрагентов. Добавьте первого контрагента.'}
            </Typography>
          </Box>
        ) : (
          <Table data-testid="counterparties-table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Тип</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Наименование / ФИО</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ИНН / Паспорт</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Телефон</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCounterparties.map((counterparty) => (
                <TableRow key={counterparty.id} hover>
                  <TableCell>
                    <Chip
                      icon={getEntityTypeIcon(counterparty.entityType)}
                      label={getEntityTypeLabel(counterparty.entityType)}
                      size="small"
                      color={counterparty.entityType === 'individual' ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {counterparty.entityType === 'individual' ? counterparty.fullName : counterparty.companyName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {counterparty.entityType === 'individual' ? counterparty.passportSeriesNumber : counterparty.inn}
                    </Typography>
                  </TableCell>
                  <TableCell>{counterparty.phone || '—'}</TableCell>
                  <TableCell>{counterparty.email || '—'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Редактировать">
                        <IconButton size="small" color="primary" onClick={() => handleEdit(counterparty)}>
                          <IconEdit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton size="small" color="error" onClick={() => handleDelete(counterparty.id)}>
                          <IconTrash size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <CounterpartyModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        counterparty={selectedCounterparty}
      />
    </Box>
  );
};

export default Counterparties;
