// material-ui
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import { useState, useEffect, useRef } from 'react';
import { 
  IconEdit, 
  IconDeviceFloppy, 
  IconX, 
  IconCamera,
  IconBuildingBank,
  IconUser,
  IconMapPin,
  IconPhone,
  IconMail,
  IconShield,
  IconInfoCircle,
  IconBuilding,
  IconId,
  IconUsers
} from '@tabler/icons-react';

// project imports
import useAuth from 'hooks/useAuth';
import tenantsAPI from 'api/tenants';
import usersAPI from 'api/users';

// assets
import User1 from 'assets/images/users/user-round.svg';

// ==============================|| SOCIAL PROFILE PAGE ||============================== //

const SocialProfile = () => {
  const { user, tenant, getRoleDisplayName } = useAuth();
  const fileInputRef = useRef(null);
  
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || User1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formData, setFormData] = useState({
    companyFullName: tenant?.companyFullName || '',
    inn: tenant?.inn || '',
    ogrn: tenant?.ogrn || '',
    kpp: tenant?.kpp || '',
    legalAddress: tenant?.legalAddress || '',
    actualAddress: tenant?.actualAddress || '',
    bankAccount: tenant?.bankAccount || '',
    correspondentAccount: tenant?.correspondentAccount || '',
    bankBik: tenant?.bankBik || '',
    bankName: tenant?.bankName || '',
    directorName: tenant?.directorName || '',
    accountantName: tenant?.accountantName || ''
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        companyFullName: tenant.companyFullName || '',
        inn: tenant.inn || '',
        ogrn: tenant.ogrn || '',
        kpp: tenant.kpp || '',
        legalAddress: tenant.legalAddress || '',
        actualAddress: tenant.actualAddress || '',
        bankAccount: tenant.bankAccount || '',
        correspondentAccount: tenant.correspondentAccount || '',
        bankBik: tenant.bankBik || '',
        bankName: tenant.bankName || '',
        directorName: tenant.directorName || '',
        accountantName: tenant.accountantName || ''
      });
    }
    if (user) {
      setAvatarUrl(user.avatar_url || User1);
    }
  }, [tenant, user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    if (confirm('Удалить фото профиля?')) {
      try {
        await usersAPI.updateUser(user.id, { avatar_url: null });
        setAvatarUrl(User1);
        setAvatarFile(null);
        const updatedUser = { ...user, avatar_url: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user',
          newValue: JSON.stringify(updatedUser)
        }));
        alert('Фото профиля успешно удалено');
        window.location.reload();
      } catch (error) {
        console.error('[SocialProfile] Error removing avatar:', error);
        alert('Ошибка при удалении фото: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      companyFullName: tenant?.companyFullName || '',
      inn: tenant?.inn || '',
      ogrn: tenant?.ogrn || '',
      kpp: tenant?.kpp || '',
      legalAddress: tenant?.legalAddress || '',
      actualAddress: tenant?.actualAddress || '',
      bankAccount: tenant?.bankAccount || '',
      correspondentAccount: tenant?.correspondentAccount || '',
      bankBik: tenant?.bankBik || '',
      bankName: tenant?.bankName || '',
      directorName: tenant?.directorName || '',
      accountantName: tenant?.accountantName || ''
    });
    setAvatarUrl(user?.avatar_url || User1);
    setAvatarFile(null);
  };

  const handleSave = async () => {
    try {
      let updatedData = { ...formData };
      const response = await tenantsAPI.update(tenant.id, updatedData);
      
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
        try {
          const uploadResponse = await usersAPI.uploadAvatar(user.id, avatarFormData);
          const updatedUser = { ...user, avatar_url: uploadResponse.avatar_url };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (avatarError) {
          console.error('[SocialProfile] Error uploading avatar:', avatarError);
          alert('Ошибка при загрузке фото: ' + (avatarError.response?.data?.message || avatarError.message));
          return;
        }
      }
      
      const updatedTenant = { ...tenant, ...response };
      localStorage.setItem('tenant', JSON.stringify(updatedTenant));
      alert('Данные успешно сохранены! Страница будет перезагружена.');
      setTimeout(() => { window.location.reload(); }, 500);
      setEditMode(false);
    } catch (error) {
      console.error('[SocialProfile] Error saving data:', error);
      alert('Ошибка при сохранении данных: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  // Форматирование банковских реквизитов
  const formatBankNumber = (value) => {
    if (!value) return null;
    return value.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  // Компонент для отображения поля (компактный)
  const InfoField = ({ label, value, monospace = false }) => (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography 
        sx={{ 
          fontSize: '0.9375rem', 
          color: value ? '#111827' : '#9CA3AF',
          fontFamily: monospace ? 'monospace' : 'inherit',
          letterSpacing: monospace ? '0.5px' : 'normal'
        }}
      >
        {monospace && value ? formatBankNumber(value) : (value || '— Не указано')}
      </Typography>
    </Box>
  );

  // Компонент заголовка секции (компактный)
  const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Icon size={16} stroke={1.5} color="#6B7280" />
      <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#1F2937' }}>
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#F3F4F6', minHeight: 'calc(100vh - 88px)', p: 2.5 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2.5
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconBuilding size={20} stroke={1.5} color="#6B7280" />
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937' }}>
            Профиль организации
          </Typography>
        </Box>
        
        {!editMode ? (
          <Button
            variant="outlined"
            startIcon={<IconEdit size={16} />}
            onClick={handleEdit}
            sx={{ 
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              borderColor: '#E5E7EB',
              borderRadius: '8px',
              px: 2,
              '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' }
            }}
          >
            Редактировать профиль
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handleCancel}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.875rem',
                color: '#6B7280',
                '&:hover': { bgcolor: '#F3F4F6' }
              }}
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              startIcon={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                bgcolor: '#4F46E5',
                borderRadius: '8px',
                px: 2,
                '&:hover': { bgcolor: '#4338CA' }
              }}
            >
              Сохранить
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={2.5}>
        {/* Блок 1: Профиль пользователя */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2.5,
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              bgcolor: '#FFFFFF'
            }}
          >
            {/* Аватар и данные в 2 колонки */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                  src={avatarUrl}
                  alt="user-avatar"
                  sx={{
                    width: 80,
                    height: 80,
                    border: '3px solid #E5E7EB',
                    cursor: editMode ? 'pointer' : 'default'
                  }}
                  onClick={editMode ? handleAvatarClick : undefined}
                />
                {editMode && (
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: -4, 
                    right: -4,
                    display: 'flex',
                    gap: 0.5
                  }}>
                    <Tooltip title="Изменить фото">
                      <IconButton
                        onClick={handleAvatarClick}
                        size="small"
                        sx={{
                          bgcolor: '#4F46E5',
                          color: 'white',
                          width: 28,
                          height: 28,
                          '&:hover': { bgcolor: '#4338CA' }
                        }}
                      >
                        <IconCamera size={14} />
                      </IconButton>
                    </Tooltip>
                    {(user?.avatar_url || avatarFile) && (
                      <Tooltip title="Удалить">
                        <IconButton
                          onClick={handleRemoveAvatar}
                          size="small"
                          sx={{
                            bgcolor: '#DC2626',
                            color: 'white',
                            width: 28,
                            height: 28,
                            '&:hover': { bgcolor: '#B91C1C' }
                          }}
                        >
                          <IconX size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </Box>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  color: '#111827',
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user?.fullName || 'Пользователь'}
                </Typography>
                
                {/* Бейдж роли */}
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: '#EEF2FF',
                  color: '#4F46E5',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  px: 1,
                  py: 0.375,
                  borderRadius: '6px',
                  mb: 1
                }}>
                  <IconShield size={14} color="#4338CA" />
                  {getRoleDisplayName()}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6B7280' }}>
                  <IconMail size={14} />
                  <Typography sx={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {user?.phone && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                pt: 1.5,
                borderTop: '1px solid #F3F4F6'
              }}>
                <IconPhone size={14} color="#6B7280" />
                <Typography sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  {user.phone}
                </Typography>
              </Box>
            )}

            <Collapse in={editMode}>
              <Alert 
                severity="info" 
                icon={<IconInfoCircle size={16} />}
                sx={{ 
                  mt: 2, 
                  py: 0.5,
                  fontSize: '0.75rem',
                  bgcolor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  '& .MuiAlert-message': { fontSize: '0.75rem' }
                }}
              >
                Нажмите на фото, чтобы изменить. Макс: 5МБ
              </Alert>
            </Collapse>
          </Paper>
        </Grid>

        {/* Блок 2: Личная информация */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2.5,
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              bgcolor: '#FFFFFF',
              mb: 2.5
            }}
          >
            <SectionHeader icon={IconUser} title="Личная информация" />
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Полное имя" value={user?.fullName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Email" value={user?.email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Телефон" value={user?.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 0.5 }}>
                    Роль в системе
                  </Typography>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: '#EEF2FF',
                    color: '#4F46E5',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    px: 1,
                    py: 0.375,
                    borderRadius: '6px'
                  }}>
                    <IconShield size={14} color="#4338CA" />
                    {getRoleDisplayName()}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Блок 3: Реквизиты организации */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 2.5,
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              bgcolor: '#FFFFFF'
            }}
          >
            <SectionHeader icon={IconBuilding} title="Реквизиты организации" />
            
            {/* Наименование */}
            {editMode ? (
              <TextField
                fullWidth
                label="Полное наименование организации"
                value={formData.companyFullName}
                onChange={handleChange('companyFullName')}
                placeholder='ООО "Название компании"'
                size="small"
                sx={{ mb: 2.5 }}
              />
            ) : (
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 0.5 }}>
                  Полное наименование
                </Typography>
                <Typography sx={{ fontSize: '0.9375rem', color: formData.companyFullName ? '#111827' : '#9CA3AF', fontWeight: 500 }}>
                  {formData.companyFullName || '— Не указано'}
                </Typography>
              </Box>
            )}

            {/* Основные реквизиты */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <IconId size={14} color="#9CA3AF" />
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6B7280' }}>
                  Основные реквизиты
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="ИНН"
                      value={formData.inn}
                      onChange={handleChange('inn')}
                      placeholder="10 или 12 цифр"
                      inputProps={{ maxLength: 12 }}
                      size="small"
                    />
                  ) : (
                    <InfoField label="ИНН" value={formData.inn} monospace />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="ОГРН"
                      value={formData.ogrn}
                      onChange={handleChange('ogrn')}
                      placeholder="13 или 15 цифр"
                      inputProps={{ maxLength: 15 }}
                      size="small"
                    />
                  ) : (
                    <InfoField label="ОГРН" value={formData.ogrn} monospace />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="КПП"
                      value={formData.kpp}
                      onChange={handleChange('kpp')}
                      placeholder="9 цифр"
                      inputProps={{ maxLength: 9 }}
                      size="small"
                    />
                  ) : (
                    <InfoField label="КПП" value={formData.kpp} monospace />
                  )}
                </Grid>
              </Grid>
            </Box>

            {/* Адреса */}
            <Box sx={{ mb: 2, pt: 1.5, borderTop: '1px solid #F3F4F6' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <IconMapPin size={14} color="#9CA3AF" />
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6B7280' }}>
                  Адреса
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Юридический адрес"
                      value={formData.legalAddress}
                      onChange={handleChange('legalAddress')}
                      size="small"
                    />
                  ) : (
                    <InfoField label="Юридический адрес" value={formData.legalAddress} />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Фактический адрес"
                      value={formData.actualAddress}
                      onChange={handleChange('actualAddress')}
                      size="small"
                    />
                  ) : (
                    <InfoField label="Фактический адрес" value={formData.actualAddress} />
                  )}
                </Grid>
              </Grid>
            </Box>

            {/* Банковские реквизиты */}
            <Box sx={{ mb: 2, pt: 1.5, borderTop: '1px solid #F3F4F6' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <IconBuildingBank size={14} color="#9CA3AF" />
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6B7280' }}>
                  Банковские реквизиты
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Наименование банка"
                      value={formData.bankName}
                      onChange={handleChange('bankName')}
                      placeholder="ПАО СБЕРБАНК"
                      size="small"
                    />
                  ) : (
                    <InfoField label="Банк" value={formData.bankName} />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="БИК"
                      value={formData.bankBik}
                      onChange={handleChange('bankBik')}
                      placeholder="044525225"
                      inputProps={{ maxLength: 9 }}
                      size="small"
                    />
                  ) : (
                    <InfoField label="БИК" value={formData.bankBik} monospace />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Расчётный счёт"
                      value={formData.bankAccount}
                      onChange={handleChange('bankAccount')}
                      placeholder="40702810000000000000"
                      inputProps={{ maxLength: 20 }}
                      size="small"
                    />
                  ) : (
                    <InfoField label="Расчётный счёт" value={formData.bankAccount} monospace />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Корр. счёт"
                      value={formData.correspondentAccount}
                      onChange={handleChange('correspondentAccount')}
                      placeholder="30101810000000000000"
                      inputProps={{ maxLength: 20 }}
                      size="small"
                    />
                  ) : (
                    <InfoField label="Корр. счёт" value={formData.correspondentAccount} monospace />
                  )}
                </Grid>
              </Grid>
            </Box>

            {/* Должностные лица */}
            <Box sx={{ pt: 1.5, borderTop: '1px solid #F3F4F6' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <IconUsers size={14} color="#9CA3AF" />
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6B7280' }}>
                  Должностные лица
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Генеральный директор"
                      value={formData.directorName}
                      onChange={handleChange('directorName')}
                      placeholder="Иванов Иван Иванович"
                      size="small"
                    />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        Генеральный директор
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem', 
                        color: formData.directorName ? '#111827' : '#9CA3AF',
                        textAlign: 'right'
                      }}>
                        {formData.directorName || '— Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Главный бухгалтер"
                      value={formData.accountantName}
                      onChange={handleChange('accountantName')}
                      placeholder="Петрова Мария Сергеевна"
                      size="small"
                    />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        Главный бухгалтер
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem', 
                        color: formData.accountantName ? '#111827' : '#9CA3AF',
                        textAlign: 'right'
                      }}>
                        {formData.accountantName || '— Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>

            <Collapse in={editMode}>
              <Alert 
                severity="info" 
                icon={<IconInfoCircle size={16} />}
                sx={{ 
                  mt: 2.5,
                  py: 1,
                  bgcolor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  '& .MuiAlert-message': { fontSize: '0.8125rem', color: '#4B5563' }
                }}
              >
                Эти данные будут использоваться при формировании документов и договоров.
              </Alert>
            </Collapse>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SocialProfile;
