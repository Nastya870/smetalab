import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Button, Stack, Chip, TextField, InputAdornment, IconButton, Tooltip,
  CircularProgress, Alert
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

  // Табы фильтрации
  const tabs = [
    { value: 'all', label: 'Все' },
    { value: 'individual', label: 'Физ. лица', icon: <IconUser size={16} /> },
    { value: 'legal', label: 'Юр. лица', icon: <IconBuilding size={16} /> }
  ];

  return (
    <Box sx={{ bgcolor: '#F3F4F6', height: '100vh', p: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} data-testid="counterparties-page">
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        {/* Заголовок */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '10px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconUsers size={20} style={{ color: '#6B7280' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1F2937' }} data-testid="counterparties-title">
              Контрагенты
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<IconPlus size={16} />} 
            onClick={handleCreate} 
            data-testid="add-counterparty-btn"
            sx={{
              textTransform: 'none',
              bgcolor: '#4F46E5',
              height: 40,
              px: 2,
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(79,70,229,0.2)',
              '&:hover': { 
                bgcolor: '#4338CA',
                boxShadow: '0 4px 6px rgba(79,70,229,0.25)'
              }
            }}
          >
            Добавить контрагента
          </Button>
        </Box>

        {/* Табы */}
        <Box sx={{ display: 'flex', gap: 0, mb: '12px', borderBottom: '1px solid #E5E7EB' }} data-testid="counterparties-tabs">
          {tabs.map((tab) => (
            <Box
              key={tab.value}
              onClick={() => setEntityTypeFilter(tab.value)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                borderBottom: entityTypeFilter === tab.value ? '2px solid #7C3AED' : '2px solid transparent',
                color: entityTypeFilter === tab.value ? '#5B21B6' : '#6B7280',
                fontWeight: entityTypeFilter === tab.value ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
                mb: '-1px',
                '&:hover': {
                  color: entityTypeFilter === tab.value ? '#5B21B6' : '#7C3AED'
                }
              }}
            >
              {tab.icon}
              {tab.label}
            </Box>
          ))}
        </Box>

        {/* Поиск */}
        <TextField
          placeholder="Поиск по имени, ИНН, телефону, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="counterparties-search"
          size="small"
          fullWidth
          sx={{
            mb: '20px',
            '& .MuiOutlinedInput-root': {
              height: 44,
              bgcolor: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '0.875rem',
              pl: 0.5,
              '& fieldset': { borderColor: '#E5E7EB' },
              '&:hover fieldset': { borderColor: '#D1D5DB' },
              '&.Mui-focused fieldset': { borderColor: '#6366F1' }
            },
            '& .MuiInputBase-input': {
              color: '#374151',
              '&::placeholder': { color: '#9CA3AF', opacity: 1 }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} style={{ color: '#9CA3AF' }} />
              </InputAdornment>
            )
          }}
        />

        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

        {/* Таблица */}
        <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : filteredCounterparties.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography sx={{ color: '#6B7280', fontSize: '0.9375rem' }}>
                {search || entityTypeFilter !== 'all' ? 'Контрагенты не найдены' : 'Нет контрагентов. Добавьте первого контрагента.'}
              </Typography>
            </Box>
          ) : (
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', height: '100%' }}>
              <TableContainer sx={{ height: '100%', overflowX: 'hidden' }}>
                <Table stickyHeader data-testid="counterparties-table" sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '120px', bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, pl: 2, borderBottom: '1px solid #E5E7EB' }}>
                        Тип
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Наименование / ФИО
                      </TableCell>
                      <TableCell sx={{ width: '150px', bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        ИНН / Паспорт
                      </TableCell>
                      <TableCell sx={{ width: '140px', bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Телефон
                      </TableCell>
                      <TableCell sx={{ width: '180px', bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, borderBottom: '1px solid #E5E7EB' }}>
                        Email
                      </TableCell>
                      <TableCell align="center" sx={{ width: '90px', bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1.25, pr: 2, borderBottom: '1px solid #E5E7EB' }}>
                        Действия
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCounterparties.map((counterparty, index) => (
                      <TableRow 
                        key={counterparty.id} 
                        sx={{ 
                          bgcolor: index % 2 === 1 ? '#FAF9FF' : 'transparent',
                          transition: 'background-color 0.15s ease',
                          '&:hover': { bgcolor: '#F5F3FF' }
                        }}
                      >
                        <TableCell sx={{ py: '8px', pl: 2, borderBottom: '1px solid #F3F4F6' }}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              bgcolor: '#F3E8FF',
                              color: '#7C3AED',
                              borderRadius: '4px',
                              px: '8px',
                              py: '3px',
                              fontSize: '11.5px',
                              fontWeight: 500
                            }}
                          >
                            {counterparty.entityType === 'individual' ? <IconUser size={12} /> : <IconBuilding size={12} />}
                            {getEntityTypeLabel(counterparty.entityType)}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: '8px', borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                            {counterparty.entityType === 'individual' ? counterparty.fullName : counterparty.companyName}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: '8px', borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#374151', fontFamily: 'monospace' }}>
                            {counterparty.entityType === 'individual' ? counterparty.passportSeriesNumber : counterparty.inn}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: '8px', borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                            {counterparty.phone || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: '8px', borderBottom: '1px solid #F3F4F6' }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {counterparty.email || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: '8px', pr: 2, borderBottom: '1px solid #F3F4F6' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                            <Tooltip title="Редактировать">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEdit(counterparty)}
                                sx={{ width: 28, height: 28, color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                              >
                                <IconEdit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDelete(counterparty.id)}
                                sx={{ width: 28, height: 28, color: '#EF4444', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                              >
                                <IconTrash size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
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
