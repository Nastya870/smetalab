// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { useState, useEffect, useRef } from 'react';
import { IconEdit, IconDeviceFloppy, IconX, IconCamera } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import useAuth from 'hooks/useAuth';
import tenantsAPI from 'api/tenants';
import usersAPI from 'api/users';

// assets
import User1 from 'assets/images/users/user-round.svg';

// ==============================|| SOCIAL PROFILE PAGE ||============================== //

const SocialProfile = () => {
  const theme = useTheme();
  const { user, tenant, getRoleDisplayName } = useAuth();
  const fileInputRef = useRef(null);
  
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || User1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formData, setFormData] = useState({
    // Реквизиты организации
    companyFullName: tenant?.companyFullName || '',
    inn: tenant?.inn || '',
    ogrn: tenant?.ogrn || '',
    kpp: tenant?.kpp || '',
    legalAddress: tenant?.legalAddress || '',
    actualAddress: tenant?.actualAddress || '',
    // Банковские реквизиты
    bankAccount: tenant?.bankAccount || '',
    correspondentAccount: tenant?.correspondentAccount || '',
    bankBik: tenant?.bankBik || '',
    bankName: tenant?.bankName || '',
    // Должностные лица
    directorName: tenant?.directorName || '',
    accountantName: tenant?.accountantName || ''
  });

  // Обновляем formData когда tenant загружается или изменяется
  useEffect(() => {
    if (tenant) {
      console.log('[SocialProfile] Tenant loaded:', tenant);
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
      console.log('[SocialProfile] User loaded:', user);
      setAvatarUrl(user.avatar_url || User1);
    }
  }, [tenant, user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }
      
      // Проверка размера (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }
      
      setAvatarFile(file);
      
      // Создаем preview
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
        // Удаляем аватар из базы данных
        await usersAPI.updateUser(user.id, { avatar_url: null });
        
        // Обновляем состояние
        setAvatarUrl(User1);
        setAvatarFile(null);
        
        // Обновляем localStorage
        const updatedUser = { ...user, avatar_url: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user',
          newValue: JSON.stringify(updatedUser)
        }));
        
        console.log('[SocialProfile] Avatar removed successfully');
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
    // Сбрасываем к исходным значениям
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
    // Сбрасываем аватар
    setAvatarUrl(user?.avatar_url || User1);
    setAvatarFile(null);
  };

  const handleSave = async () => {
    try {
      console.log('[SocialProfile] Saving data...');
      
      // Сохраняем данные организации
      let updatedData = { ...formData };
      const response = await tenantsAPI.update(tenant.id, updatedData);
      console.log('[SocialProfile] Tenant updated:', response);
      
      // Если есть новый аватар пользователя, загружаем его
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
        
        try {
          const uploadResponse = await usersAPI.uploadAvatar(user.id, avatarFormData);
          console.log('[SocialProfile] Avatar uploaded:', uploadResponse);
          
          // Обновляем user в localStorage
          const updatedUser = { 
            ...user, 
            avatar_url: uploadResponse.avatar_url 
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'user',
            newValue: JSON.stringify(updatedUser)
          }));
        } catch (avatarError) {
          console.error('[SocialProfile] Error uploading avatar:', avatarError);
          alert('Ошибка при загрузке фото: ' + (avatarError.response?.data?.message || avatarError.message));
          return;
        }
      }
      
      // Обновляем tenant в localStorage
      const updatedTenant = { 
        ...tenant, 
        ...response
      };
      localStorage.setItem('tenant', JSON.stringify(updatedTenant));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tenant',
        newValue: JSON.stringify(updatedTenant)
      }));
      
      console.log('[SocialProfile] All data saved successfully');
      
      // Перезагружаем страницу чтобы обновить данные в useAuth
      window.location.reload();
      
      setEditMode(false);
    } catch (error) {
      console.error('[SocialProfile] Error saving data:', error);
      alert('Ошибка при сохранении данных: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  return (
    <MainCard title="Профиль организации">
      <Grid container spacing={3}>
        {/* Карточка профиля пользователя */}
        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={avatarUrl}
                  alt="user-avatar"
                  sx={{
                    width: 120,
                    height: 120,
                    margin: '0 auto 16px',
                    border: `4px solid ${theme.palette.primary.main}`
                  }}
                />
                {editMode && (
                  <>
                    <IconButton
                      onClick={handleAvatarClick}
                      sx={{
                        position: 'absolute',
                        bottom: 12,
                        right: -8,
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: 36,
                        height: 36,
                        '&:hover': {
                          bgcolor: 'primary.dark'
                        }
                      }}
                    >
                      <IconCamera size={20} />
                    </IconButton>
                    {(user?.avatar_url || avatarFile) && (
                      <IconButton
                        onClick={handleRemoveAvatar}
                        sx={{
                          position: 'absolute',
                          bottom: 12,
                          right: 32,
                          bgcolor: 'error.main',
                          color: 'white',
                          width: 36,
                          height: 36,
                          '&:hover': {
                            bgcolor: 'error.dark'
                          }
                        }}
                      >
                        <IconX size={20} />
                      </IconButton>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </>
                )}
              </Box>
              <Typography variant="h2" gutterBottom>
                {user?.fullName || 'Пользователь'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>
              <Chip label={getRoleDisplayName()} color="primary" sx={{ mt: 1 }} />
              
              {user?.phone && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" align="left">
                      Телефон
                    </Typography>
                    <Typography variant="body1" align="left">
                      {user.phone}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Детальная информация об организации */}
        <Grid item xs={12} md={8}>
          {/* Личная информация пользователя */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Личная информация
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Полное имя
                    </Typography>
                    <Typography variant="body1">{user?.fullName || 'Не указано'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">{user?.email || 'Не указано'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Телефон
                    </Typography>
                    <Typography variant="body1">{user?.phone || 'Не указано'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Роль
                    </Typography>
                    <Typography variant="body1">{getRoleDisplayName()}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Реквизиты организации */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3">
                  Реквизиты организации
                </Typography>
                {!editMode ? (
                  <Button
                    variant="outlined"
                    startIcon={<IconEdit />}
                    onClick={handleEdit}
                    size="small"
                  >
                    Редактировать
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<IconDeviceFloppy />}
                      onClick={handleSave}
                      size="small"
                    >
                      Сохранить
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<IconX />}
                      onClick={handleCancel}
                      size="small"
                    >
                      Отмена
                    </Button>
                  </Box>
                )}
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                {/* Наименование организации */}
                <Grid item xs={12}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Полное наименование организации"
                      value={formData.companyFullName}
                      onChange={handleChange('companyFullName')}
                      placeholder='ООО "Главная компания"'
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Полное наименование организации
                      </Typography>
                      <Typography variant="body1">
                        {formData.companyFullName || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* ИНН */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="ИНН"
                      value={formData.inn}
                      onChange={handleChange('inn')}
                      placeholder="10 или 12 цифр"
                      inputProps={{ maxLength: 12 }}
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        ИНН
                      </Typography>
                      <Typography variant="body1">
                        {formData.inn || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* ОГРН/ОГРНИП */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="ОГРН/ОГРНИП"
                      value={formData.ogrn}
                      onChange={handleChange('ogrn')}
                      placeholder="13 или 15 цифр"
                      inputProps={{ maxLength: 15 }}
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        ОГРН/ОГРНИП
                      </Typography>
                      <Typography variant="body1">
                        {formData.ogrn || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* КПП */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="КПП (необязательно)"
                      value={formData.kpp}
                      onChange={handleChange('kpp')}
                      placeholder="9 цифр"
                      inputProps={{ maxLength: 9 }}
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        КПП
                      </Typography>
                      <Typography variant="body1">
                        {formData.kpp || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Юридический адрес */}
                <Grid item xs={12}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Юридический адрес"
                      value={formData.legalAddress}
                      onChange={handleChange('legalAddress')}
                      placeholder="г. Москва, ул. Ленина, д. 1, офис 10"
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Юридический адрес
                      </Typography>
                      <Typography variant="body1">
                        {formData.legalAddress || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Фактический адрес */}
                <Grid item xs={12}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Фактический адрес (необязательно)"
                      value={formData.actualAddress}
                      onChange={handleChange('actualAddress')}
                      placeholder="г. Москва, ул. Ленина, д. 1, офис 10"
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Фактический адрес
                      </Typography>
                      <Typography variant="body1">
                        {formData.actualAddress || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {/* Банковские реквизиты */}
              <Typography variant="h3" gutterBottom sx={{ mt: 4 }}>
                Банковские реквизиты
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                {/* Расчетный счет */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Расчетный счет"
                      value={formData.bankAccount}
                      onChange={handleChange('bankAccount')}
                      placeholder="40702810000000000000"
                      inputProps={{ maxLength: 20 }}
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Расчетный счет
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {formData.bankAccount || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Корреспондентский счет */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Корреспондентский счет"
                      value={formData.correspondentAccount}
                      onChange={handleChange('correspondentAccount')}
                      placeholder="30101810000000000000"
                      inputProps={{ maxLength: 20 }}
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Корреспондентский счет
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {formData.correspondentAccount || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* БИК */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="БИК"
                      value={formData.bankBik}
                      onChange={handleChange('bankBik')}
                      placeholder="044525225"
                      inputProps={{ maxLength: 9 }}
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        БИК
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {formData.bankBik || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Наименование банка */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Наименование банка"
                      value={formData.bankName}
                      onChange={handleChange('bankName')}
                      placeholder="ПАО Сбербанк"
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Наименование банка
                      </Typography>
                      <Typography variant="body1">
                        {formData.bankName || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {/* Должностные лица */}
              <Typography variant="h3" gutterBottom sx={{ mt: 4 }}>
                Должностные лица
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                {/* Генеральный директор */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Генеральный директор"
                      value={formData.directorName}
                      onChange={handleChange('directorName')}
                      placeholder="Иванов Иван Иванович"
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Генеральный директор
                      </Typography>
                      <Typography variant="body1">
                        {formData.directorName || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Главный бухгалтер */}
                <Grid item xs={12} sm={6}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Главный бухгалтер"
                      value={formData.accountantName}
                      onChange={handleChange('accountantName')}
                      placeholder="Петрова Мария Сергеевна"
                    />
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Главный бухгалтер
                      </Typography>
                      <Typography variant="body1">
                        {formData.accountantName || 'Не указано'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {editMode && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.dark">
                    💡 Эти данные будут использоваться при формировании документов, актов выполненных работ и других отчетов.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default SocialProfile;
