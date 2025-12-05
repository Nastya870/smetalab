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
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import { alpha } from '@mui/material/styles';
import { useState, useEffect, useRef } from 'react';
import { 
  IconEdit, 
  IconDeviceFloppy, 
  IconX, 
  IconCamera,
  IconBuildingBank,
  IconUserCheck,
  IconMapPin,
  IconPhone,
  IconMail,
  IconShield,
  IconInfoCircle,
  IconCheck
} from '@tabler/icons-react';

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
// Сохраняем данные организации
      let updatedData = { ...formData };
      const response = await tenantsAPI.update(tenant.id, updatedData);
// Если есть новый аватар пользователя, загружаем его
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
        
        try {
          const uploadResponse = await usersAPI.uploadAvatar(user.id, avatarFormData);
// Обновляем user в localStorage
          const updatedUser = { 
            ...user, 
            avatar_url: uploadResponse.avatar_url 
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (avatarError) {
          console.error('[SocialProfile] Error uploading avatar:', avatarError);
          alert('Ошибка при загрузке фото: ' + (avatarError.response?.data?.message || avatarError.message));
          return;
        }
      }
      
      // Обновляем tenant в localStorage с данными из ответа сервера
      const updatedTenant = { 
        ...tenant,
        ...response
      };
localStorage.setItem('tenant', JSON.stringify(updatedTenant));
alert('Данные успешно сохранены! Страница будет перезагружена.');
      
      // Перезагружаем страницу чтобы обновить данные в useAuth
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
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

  // Helper компонент для отображения поля
  const InfoField = ({ label, value, icon: Icon, monospace = false }) => (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        {Icon && <Icon size={16} color={theme.palette.text.secondary} />}
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
      <Typography 
        variant="body1" 
        sx={{ 
          pl: Icon ? 3 : 0, 
          fontWeight: 500,
          fontFamily: monospace ? 'monospace' : 'inherit',
          color: value ? 'text.primary' : 'text.disabled'
        }}
      >
        {value || 'Не указано'}
      </Typography>
    </Stack>
  );

  return (
    <MainCard 
      title="Профиль организации"
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {editMode && (
            <Chip 
              label="Режим редактирования" 
              color="warning" 
              size="small"
              icon={<IconEdit size={16} />}
            />
          )}
          {!editMode ? (
            <Tooltip title="Редактировать профиль">
              <Button
                variant="outlined"
                startIcon={<IconX size={18} />}
                onClick={handleCancel}
                size="small"
              >
                Редактировать
              </Button>
            </Tooltip>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<IconCheck size={18} />}
                onClick={handleSave}
                size="small"
                color="success"
              >
                Сохранить
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconX size={18} />}
                onClick={handleCancel}
                size="medium"
                color="error"
              >
                Отмена
              </Button>
            </>
          )}
        </Stack>
      }
    >
      <Grid container spacing={3}>
        {/* Карточка профиля пользователя */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card 
            sx={{ 
              textAlign: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              position: 'relative',
              overflow: 'visible'
            }}
          >
            <CardContent>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    editMode && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Изменить фото">
                          <IconButton
                            onClick={handleAvatarClick}
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'white',
                              width: 40,
                              height: 40,
                              boxShadow: 3,
                              '&:hover': {
                                bgcolor: 'primary.dark',
                                transform: 'scale(1.1)'
                              },
                              transition: 'all 0.2s'
                            }}
                          >
                            <IconCamera size={20} />
                          </IconButton>
                        </Tooltip>
                        {(user?.avatar_url || avatarFile) && (
                          <Tooltip title="Удалить фото">
                            <IconButton
                              onClick={handleRemoveAvatar}
                              sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                width: 40,
                                height: 40,
                                boxShadow: 3,
                                '&:hover': {
                                  bgcolor: 'error.dark',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s'
                              }}
                            >
                              <IconX size={20} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )
                  }
                >
                  <Avatar
                    src={avatarUrl}
                    alt="user-avatar"
                    sx={{
                      width: 140,
                      height: 140,
                      border: `5px solid white`,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      transition: 'transform 0.3s ease',
                      '&:hover': {
                        transform: editMode ? 'scale(1.05)' : 'none',
                        cursor: editMode ? 'pointer' : 'default'
                      }
                    }}
                    onClick={editMode ? handleAvatarClick : undefined}
                  />
                </Badge>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </Box>
              
              <Typography variant="h2" gutterBottom sx={{ fontWeight: 600 }}>
                {user?.fullName || 'Пользователь'}
              </Typography>
              
              <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
                <IconMail size={16} color={theme.palette.text.secondary} />
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Stack>
              
              <Chip 
                label={getRoleDisplayName()} 
                color="primary" 
                size="medium"
                icon={<IconShield size={16} />}
                sx={{ 
                  mt: 1, 
                  fontWeight: 600,
                  boxShadow: 1
                }} 
              />
              
              {user?.phone && (
                <>
                  <Divider sx={{ my: 2.5 }} />
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <IconPhone size={18} color={theme.palette.primary.main} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user.phone}
                    </Typography>
                  </Stack>
                </>
              )}
              
              <Collapse in={editMode}>
                <Alert 
                  severity="info" 
                  icon={<IconInfoCircle size={20} />}
                  sx={{ mt: 2, textAlign: 'left' }}
                >
                  Нажмите на фото, чтобы изменить аватар. Макс. размер: 5МБ
                </Alert>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>

        {/* Детальная информация об организации */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Личная информация пользователя */}
          <Paper 
            elevation={0}
            sx={{ 
              mb: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Box sx={{ 
              p: 2.5, 
              background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
              borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  <IconUserCheck size={20} />
                </Avatar>
                <Typography variant="h3" sx={{ fontWeight: 600 }}>
                  Личная информация
                </Typography>
              </Stack>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconUserCheck size={16} color={theme.palette.text.secondary} />
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Полное имя
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 3, fontWeight: 500 }}>
                      {user?.fullName || 'Не указано'}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconMail size={16} color={theme.palette.text.secondary} />
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Email
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 3, fontWeight: 500 }}>
                      {user?.email || 'Не указано'}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconPhone size={16} color={theme.palette.text.secondary} />
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Телефон
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 3, fontWeight: 500 }}>
                      {user?.phone || 'Не указано'}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconShield size={16} color={theme.palette.text.secondary} />
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Роль в системе
                      </Typography>
                    </Stack>
                    <Chip 
                      label={getRoleDisplayName()} 
                      color="primary" 
                      size="small"
                      sx={{ ml: 3, width: 'fit-content' }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Paper>

          {/* Реквизиты организации */}
          <Paper 
            elevation={0}
            sx={{ 
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Box sx={{ 
              p: 2.5, 
              background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
              borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.1)}`
            }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36 }}>
                  <IconBuildingBank size={20} />
                </Avatar>
                <Typography variant="h3" sx={{ fontWeight: 600, flexGrow: 1 }}>
                  Реквизиты организации
                </Typography>
              </Stack>
            </Box>
            <CardContent sx={{ p: 3 }}>
              
              <Grid container spacing={3}>
                {/* Наименование организации */}
                <Grid size={12}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Полное наименование организации"
                      value={formData.companyFullName}
                      onChange={handleChange('companyFullName')}
                      placeholder='ООО "Главная компания"'
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Полное наименование организации"
                      value={formData.companyFullName}
                      icon={IconBuildingBank}
                    />
                  )}
                </Grid>

                {/* ИНН, ОГРН/ОГРНИП, КПП */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="ИНН"
                      value={formData.inn}
                      onChange={handleChange('inn')}
                      placeholder="10 или 12 цифр"
                      inputProps={{ maxLength: 12 }}
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="ИНН"
                      value={formData.inn}
                      monospace
                    />
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="ОГРН/ОГРНИП"
                      value={formData.ogrn}
                      onChange={handleChange('ogrn')}
                      placeholder="13 или 15 цифр"
                      inputProps={{ maxLength: 15 }}
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="ОГРН/ОГРНИП"
                      value={formData.ogrn}
                      monospace
                    />
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
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="КПП"
                      value={formData.kpp}
                      monospace
                    />
                  )}
                </Grid>

                {/* Адреса */}
                <Grid size={12}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Юридический адрес"
                      value={formData.legalAddress}
                      onChange={handleChange('legalAddress')}
                      placeholder="г. Москва, ул. Ленина, д. 1, офис 10"
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Юридический адрес"
                      value={formData.legalAddress}
                      icon={IconMapPin}
                    />
                  )}
                </Grid>

                <Grid size={12}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Фактический адрес"
                      value={formData.actualAddress}
                      onChange={handleChange('actualAddress')}
                      placeholder="г. Москва, ул. Ленина, д. 1, офис 10"
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Фактический адрес"
                      value={formData.actualAddress}
                      icon={IconMapPin}
                    />
                  )}
                </Grid>
              </Grid>

              {/* Банковские реквизиты */}
              <Box sx={{ mt: 4, mb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Divider sx={{ flexGrow: 1 }} />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), width: 32, height: 32 }}>
                      <IconBuildingBank size={18} color={theme.palette.info.main} />
                    </Avatar>
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                      Банковские реквизиты
                    </Typography>
                  </Stack>
                  <Divider sx={{ flexGrow: 1 }} />
                </Stack>
              </Box>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Расчетный счет"
                      value={formData.bankAccount}
                      onChange={handleChange('bankAccount')}
                      placeholder="40702810000000000000"
                      inputProps={{ maxLength: 20 }}
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5, fontFamily: 'monospace' }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Расчетный счет"
                      value={formData.bankAccount}
                      monospace
                    />
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Корреспондентский счет"
                      value={formData.correspondentAccount}
                      onChange={handleChange('correspondentAccount')}
                      placeholder="30101810000000000000"
                      inputProps={{ maxLength: 20 }}
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5, fontFamily: 'monospace' }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Корреспондентский счет"
                      value={formData.correspondentAccount}
                      monospace
                    />
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
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5, fontFamily: 'monospace' }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="БИК"
                      value={formData.bankBik}
                      monospace
                    />
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Наименование банка"
                      value={formData.bankName}
                      onChange={handleChange('bankName')}
                      placeholder="ПАО СБЕРБАНК"
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Наименование банка"
                      value={formData.bankName}
                    />
                  )}
                </Grid>
              </Grid>

              {/* Должностные лица */}
              <Box sx={{ mt: 4, mb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Divider sx={{ flexGrow: 1 }} />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), width: 32, height: 32 }}>
                      <IconUserCheck size={18} color={theme.palette.warning.main} />
                    </Avatar>
                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                      Должностные лица
                    </Typography>
                  </Stack>
                  <Divider sx={{ flexGrow: 1 }} />
                </Stack>
              </Box>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Генеральный директор"
                      value={formData.directorName}
                      onChange={handleChange('directorName')}
                      placeholder="Иванов Иван Иванович"
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Генеральный директор"
                      value={formData.directorName}
                      icon={IconUserCheck}
                    />
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
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: 1.5 }
                      }}
                    />
                  ) : (
                    <InfoField 
                      label="Главный бухгалтер"
                      value={formData.accountantName}
                      icon={IconUserCheck}
                    />
                  )}
                </Grid>
              </Grid>

              <Collapse in={editMode}>
                <Alert 
                  severity="success" 
                  icon={<IconInfoCircle size={20} />}
                  sx={{ 
                    mt: 3,
                    borderRadius: 2,
                    background: alpha(theme.palette.success.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    💡 Эти данные будут использоваться при формировании документов, актов выполненных работ и договоров.
                  </Typography>
                </Alert>
              </Collapse>
            </CardContent>
          </Paper>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default SocialProfile;
