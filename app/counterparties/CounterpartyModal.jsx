import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Stack, Box, ToggleButtonGroup, ToggleButton, Typography, Divider, Grid
} from '@mui/material';
import { IconUser, IconBuilding } from '@tabler/icons-react';
import counterpartiesAPI from 'api/counterparties';

const CounterpartyModal = ({ open, onClose, onSuccess, counterparty }) => {
  const isEdit = Boolean(counterparty);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState('individual');
  const [formData, setFormData] = useState({
    fullName: '', birthDate: '', birthPlace: '', passportSeriesNumber: '',
    passportIssuedBy: '', passportIssueDate: '', registrationAddress: '',
    companyName: '', inn: '', ogrn: '', kpp: '', legalAddress: '', actualAddress: '',
    bankAccount: '', correspondentAccount: '', bankBik: '', bankName: '',
    directorName: '', accountantName: '', phone: '', email: ''
  });

  useEffect(() => {
    if (counterparty) {
      setEntityType(counterparty.entityType);
      setFormData({
        fullName: counterparty.fullName || '',
        birthDate: counterparty.birthDate || '',
        birthPlace: counterparty.birthPlace || '',
        passportSeriesNumber: counterparty.passportSeriesNumber || '',
        passportIssuedBy: counterparty.passportIssuedBy || '',
        passportIssueDate: counterparty.passportIssueDate || '',
        registrationAddress: counterparty.registrationAddress || '',
        companyName: counterparty.companyName || '',
        inn: counterparty.inn || '',
        ogrn: counterparty.ogrn || '',
        kpp: counterparty.kpp || '',
        legalAddress: counterparty.legalAddress || '',
        actualAddress: counterparty.actualAddress || '',
        bankAccount: counterparty.bankAccount || '',
        correspondentAccount: counterparty.correspondentAccount || '',
        bankBik: counterparty.bankBik || '',
        bankName: counterparty.bankName || '',
        directorName: counterparty.directorName || '',
        accountantName: counterparty.accountantName || '',
        phone: counterparty.phone || '',
        email: counterparty.email || ''
      });
    } else {
      setEntityType('individual');
      setFormData({
        fullName: '', birthDate: '', birthPlace: '', passportSeriesNumber: '',
        passportIssuedBy: '', passportIssueDate: '', registrationAddress: '',
        companyName: '', inn: '', ogrn: '', kpp: '', legalAddress: '', actualAddress: '',
        bankAccount: '', correspondentAccount: '', bankBik: '', bankName: '',
        directorName: '', accountantName: '', phone: '', email: ''
      });
    }
  }, [counterparty, open]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...formData, entityType };
      if (isEdit) {
        await counterpartiesAPI.update(counterparty.id, data);
      } else {
        await counterpartiesAPI.create(data);
      }
      onSuccess();
    } catch (err) {
      console.error('Error saving counterparty:', err);
      alert(err.response?.data?.error || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEdit ? 'Редактировать контрагента' : 'Добавить контрагента'}
        </DialogTitle>
        
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Тип контрагента *</Typography>
              <ToggleButtonGroup
                value={entityType}
                exclusive
                onChange={(e, v) => v && setEntityType(v)}
                disabled={isEdit}
                fullWidth
              >
                <ToggleButton value="individual">
                  <IconUser size={18} style={{ marginRight: 8 }} />
                  Физическое лицо
                </ToggleButton>
                <ToggleButton value="legal">
                  <IconBuilding size={18} style={{ marginRight: 8 }} />
                  Юридическое лицо
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {entityType === 'individual' ? (
              <>
                <Divider><Typography variant="caption">Паспортные данные</Typography></Divider>
                <TextField label="ФИО" required value={formData.fullName} onChange={handleChange('fullName')} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField label="Дата рождения" type="date" required fullWidth
                      value={formData.birthDate} onChange={handleChange('birthDate')} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Место рождения" required fullWidth
                      value={formData.birthPlace} onChange={handleChange('birthPlace')} />
                  </Grid>
                </Grid>
                <TextField label="Паспорт (серия и номер)" required
                  value={formData.passportSeriesNumber} onChange={handleChange('passportSeriesNumber')} />
                <TextField label="Кем выдан" required multiline rows={2}
                  value={formData.passportIssuedBy} onChange={handleChange('passportIssuedBy')} />
                <TextField label="Дата выдачи" type="date" required
                  value={formData.passportIssueDate} onChange={handleChange('passportIssueDate')} InputLabelProps={{ shrink: true }} />
                <TextField label="Адрес регистрации" required multiline rows={2}
                  value={formData.registrationAddress} onChange={handleChange('registrationAddress')} />
              </>
            ) : (
              <>
                <Divider><Typography variant="caption">Реквизиты организации</Typography></Divider>
                <TextField label="Наименование организации" required
                  value={formData.companyName} onChange={handleChange('companyName')} />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField label="ИНН" required fullWidth value={formData.inn} onChange={handleChange('inn')} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField label="ОГРН/ОГРНИП" required fullWidth value={formData.ogrn} onChange={handleChange('ogrn')} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField label="КПП" required fullWidth value={formData.kpp} onChange={handleChange('kpp')} />
                  </Grid>
                </Grid>
                <TextField label="Юридический адрес" required multiline rows={2}
                  value={formData.legalAddress} onChange={handleChange('legalAddress')} />
                <TextField label="Фактический адрес" multiline rows={2}
                  value={formData.actualAddress} onChange={handleChange('actualAddress')} />
                
                <Divider><Typography variant="caption">Банковские реквизиты</Typography></Divider>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField label="Расчётный счёт" fullWidth value={formData.bankAccount} onChange={handleChange('bankAccount')} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Корр. счёт" fullWidth value={formData.correspondentAccount} onChange={handleChange('correspondentAccount')} />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField label="БИК" fullWidth value={formData.bankBik} onChange={handleChange('bankBik')} />
                  </Grid>
                  <Grid item xs={8}>
                    <TextField label="Наименование банка" fullWidth value={formData.bankName} onChange={handleChange('bankName')} />
                  </Grid>
                </Grid>
                
                <Divider><Typography variant="caption">Должностные лица</Typography></Divider>
                <TextField label="Директор / Генеральный директор"
                  value={formData.directorName} onChange={handleChange('directorName')} />
                <TextField label="Главный бухгалтер"
                  value={formData.accountantName} onChange={handleChange('accountantName')} />
              </>
            )}

            <Divider><Typography variant="caption">Контактная информация</Typography></Divider>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Телефон" fullWidth value={formData.phone} onChange={handleChange('phone')} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Email" type="email" fullWidth value={formData.email} onChange={handleChange('email')} />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CounterpartyModal;
