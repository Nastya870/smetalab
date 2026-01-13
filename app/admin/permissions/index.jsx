import { useState, useEffect } from 'react';

// Material-UI
import {
  Box,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { IconDeviceFloppy, IconRefresh, IconShieldLock, IconChevronDown } from '@tabler/icons-react';

// Project imports
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
  const [matrixKey, setMatrixKey] = useState(0);

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

  const handlePermissionsChange = (permissions, hidden) => {
    setPermissionsData({ permissions, hidden });
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const permissionsArray = permissionsData.permissions.map(permId => ({
        permissionId: permId,
        isHidden: permissionsData.hidden.has(permId)
      }));
      
      const response = await permissionsAPI.updateRolePermissions(
        selectedRole.id,
        permissionsArray
      );
      
      if (response.success) {
        setSuccess(`Разрешения для роли "${selectedRole.name}" сохранены`);
        setMatrixKey(prev => prev + 1);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(response.message || 'Ошибка сохранения');
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError(err.message || 'Ошибка сохранения разрешений');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (event) => {
    const roleId = event.target.value;
    const role = roles.find(r => r.id === roleId);
    setSelectedRole(role);
    setSuccess(null);
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ 
        bgcolor: '#F3F4F6', 
        height: 'calc(100vh - 160px)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <CircularProgress size={28} sx={{ color: '#6B7280' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F3F4F6', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          pt: 2.5,
          px: 3,
          pb: 2,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0
        }}
      >
        {/* Header row */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexShrink: 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconShieldLock size={20} color="#6B7280" />
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937' }}>
              Управление разрешениями
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconRefresh size={16} />}
              onClick={loadRoles}
              disabled={saving}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#6B7280',
                borderColor: '#E5E7EB',
                height: 40,
                px: 2,
                borderRadius: '8px',
                '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' }
              }}
            >
              Обновить
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              disabled={!selectedRole || saving}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                height: 40,
                px: 2,
                borderRadius: '8px',
                bgcolor: '#4F46E5',
                boxShadow: '0 1px 3px rgba(79,70,229,0.2)',
                '&:hover': { bgcolor: '#4338CA', boxShadow: '0 4px 6px rgba(79,70,229,0.25)' },
                '&:disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' }
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </Box>
        </Box>

        {/* Role selector row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', flexShrink: 0 }}>
            Роль:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <Select
              value={selectedRole?.id || ''}
              onChange={handleRoleChange}
              IconComponent={(props) => <IconChevronDown size={16} {...props} style={{ color: '#9CA3AF', right: 10 }} />}
              sx={{
                fontSize: '0.875rem',
                bgcolor: '#FFFFFF',
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4F46E5' },
                '& .MuiSelect-select': { py: 1 }
              }}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id} sx={{ fontSize: '0.875rem' }}>
                  {role.name}
                  {role.key === 'super_admin' && (
                    <Typography component="span" sx={{ ml: 1, fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>
                      ADMIN
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Hierarchy description */}
        <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 2, lineHeight: 1.5, flexShrink: 0 }}>
          <strong style={{ color: '#374151' }}>Admin</strong> → Users, Roles, Tenants &nbsp;•&nbsp; 
          <strong style={{ color: '#374151' }}>References</strong> → Materials, Works, Counterparties &nbsp;•&nbsp; 
          <strong style={{ color: '#374151' }}>Projects</strong> → Estimates, Purchases, Reports
        </Typography>

        {/* Alerts */}
        {success && (
          <Alert 
            severity="success" 
            onClose={() => setSuccess(null)} 
            sx={{ mb: 2, flexShrink: 0 }}
          >
            {success}
          </Alert>
        )}

        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)} 
            sx={{ mb: 2, flexShrink: 0 }}
          >
            {error}
          </Alert>
        )}

        {/* Permissions Matrix */}
        {selectedRole && (
          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <PermissionsMatrixSimple
              key={`${selectedRole.id}-${matrixKey}`}
              roleId={selectedRole.id}
              roleName={selectedRole.name}
              roleKey={selectedRole.key}
              onPermissionsChange={handlePermissionsChange}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PermissionsManagement;
