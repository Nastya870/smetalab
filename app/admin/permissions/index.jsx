import { useState, useEffect } from 'react';

// Material-UI
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';

// Project imports
import MainCard from 'ui-component/cards/MainCard';
import PermissionsMatrixSimple from './PermissionsMatrixSimple';

// API
import * as rolesAPI from 'shared/lib/api/roles';
import * as permissionsAPI from 'shared/lib/api/permissions';

// ==============================|| PERMISSIONS MANAGEMENT PAGE ||============================== //

const PermissionsManagement = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [permissionsData, setPermissionsData] = useState({ permissions: [], hidden: new Set() });
  const [matrixKey, setMatrixKey] = useState(0); // ✨ Ключ для перезагрузки матрицы

  // Загрузка ролей
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesAPI.getAllRoles();
      if (response.success) {
        setRoles(response.data || []);
        
        // Автоматически выбираем первую роль (не super_admin)
        const firstRole = (response.data || []).find(r => r.key !== 'super_admin') || response.data[0];
        if (firstRole) {
          setSelectedRole(firstRole);
        }
      }
    } catch (err) {
      console.error('Error loading roles:', err);
      setError('Ошибка загрузки ролей');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменения разрешений
  const handlePermissionsChange = (permissions, hidden) => {
    setPermissionsData({ permissions, hidden });
    setSuccess(null); // Сбрасываем сообщение об успехе при изменении
  };

  // Сохранение разрешений
  const handleSave = async () => {
    if (!selectedRole) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Формируем массив разрешений с флагами is_hidden
      const permissionsArray = permissionsData.permissions.map(permId => ({
        permissionId: permId,
        isHidden: permissionsData.hidden.has(permId)
      }));
      
      console.log('💾 Сохраняем разрешения:', {
        roleId: selectedRole.id,
        roleName: selectedRole.name,
        permissionsCount: permissionsArray.length,
        permissions: permissionsArray
      });
      
      const response = await permissionsAPI.updateRolePermissions(
        selectedRole.id,
        permissionsArray
      );
      
      if (response.success) {
        console.log('✅ Разрешения успешно сохранены:', response);
        setSuccess(`Разрешения для роли "${selectedRole.name}" успешно сохранены!`);
        
        // ✨ Обновляем ключ для перезагрузки компонента матрицы
        setMatrixKey(prev => prev + 1);
        
        // Очищаем сообщение через 5 секунд
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      } else {
        setError(response.message || 'Ошибка сохранения');
      }
    } catch (err) {
      console.error('❌ Error saving permissions:', err);
      setError(err.message || 'Ошибка сохранения разрешений');
    } finally {
      setSaving(false);
    }
  };

  // Обработчик изменения роли
  const handleRoleChange = (event) => {
    const roleId = event.target.value;
    const role = roles.find(r => r.id === roleId);
    setSelectedRole(role);
    setSuccess(null);
    setError(null);
  };

  if (loading) {
    return (
      <MainCard title="Управление разрешениями">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard 
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>🔐</span>
          <span>Управление правами доступа</span>
        </Box>
      }
      sx={{ 
        maxWidth: '100%',
        width: '100%'
      }}
      secondary={
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="medium"
            startIcon={<IconRefresh size={18} />}
            onClick={loadRoles}
            disabled={saving}
            sx={{ fontWeight: 500 }}
          >
            Обновить
          </Button>
          <Button
            variant="contained"
            size="medium"
            startIcon={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            disabled={!selectedRole || saving}
            sx={{ 
              fontWeight: 600,
              minWidth: 160,
              bgcolor: 'success.main',
              '&:hover': {
                bgcolor: 'success.dark'
              }
            }}
          >
            {saving ? '💾 Сохранение...' : '💾 Сохранить изменения'}
          </Button>
        </Box>
      }
    >
      <Box sx={{ width: '100%' }}>
        {/* Информационный блок */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>💡 Что такое права доступа?</strong>
          </Typography>
          <Typography variant="body2">
            Здесь вы управляете тем, что может делать каждая роль в системе. 
            Поставьте галочки в нужных столбцах, чтобы разрешить действия, 
            или снимите их, чтобы запретить.
          </Typography>
        </Alert>

        {/* Выбор роли */}
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              1️⃣ Выберите роль пользователя
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel sx={{ fontWeight: 500 }}>Роль</InputLabel>
              <Select
                value={selectedRole?.id || ''}
                label="Роль"
                onChange={handleRoleChange}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {role.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({role.key})
                      </Typography>
                      {role.key === 'super_admin' && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            ml: 'auto', 
                            color: 'error.main',
                            fontWeight: 'bold',
                            px: 1,
                            py: 0.5,
                            bgcolor: 'error.lighter',
                            borderRadius: 1
                          }}
                        >
                          ⚠️ АДМИНИСТРАТОР
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedRole && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                <Typography variant="body2" color="text.primary">
                  <strong>Описание:</strong> {selectedRole.description || 'Стандартная роль системы'}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Сообщения об успехе/ошибке */}
        {success && (
          <Alert 
            severity="success" 
            onClose={() => setSuccess(null)} 
            sx={{ mb: 3, fontWeight: 500 }}
            icon={<span style={{ fontSize: '1.5rem' }}>✅</span>}
          >
            {success}
          </Alert>
        )}

        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)} 
            sx={{ mb: 3, fontWeight: 500 }}
            icon={<span style={{ fontSize: '1.5rem' }}>❌</span>}
          >
            {error}
          </Alert>
        )}

        {/* Матрица разрешений */}
        {selectedRole && (
          <Box sx={{ width: '100%' }}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  2️⃣ Настройте права доступа
                </Typography>
                
                <PermissionsMatrixSimple
                  key={`${selectedRole.id}-${matrixKey}`}
                  roleId={selectedRole.id}
                  roleName={selectedRole.name}
                  roleKey={selectedRole.key}
                  onPermissionsChange={handlePermissionsChange}
                />
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </MainCard>
  );
};

export default PermissionsManagement;
