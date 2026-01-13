import { useState, useEffect } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// assets
import { IconShield, IconCheck } from '@tabler/icons-react';

// project imports
import { getAllRoles, assignRoles } from 'api/users';

// ==============================|| ROLES MANAGEMENT DIALOG ||============================== //

const RolesDialog = ({ open, user, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await getAllRoles();
        setAvailableRoles(response.data || []);
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError('Ошибка загрузки ролей');
      } finally {
        setLoadingRoles(false);
      }
    };

    if (open) {
      fetchRoles();
    }
  }, [open]);

  // Set selected roles when user changes
  useEffect(() => {
    if (user && user.roles) {
      setSelectedRoles(user.roles.map((r) => r.id));
    } else {
      setSelectedRoles([]);
    }
  }, [user]);

  const handleRoleToggle = (roleId) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((id) => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await assignRoles(user.id, selectedRoles);
      onSave();
    } catch (err) {
      console.error('Error assigning roles:', err);
      setError(err.response?.data?.message || 'Ошибка назначения ролей');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  // Role display names
  const roleDisplayNames = {
    super_admin: 'Системный администратор',
    admin: 'Администратор',
    manager: 'Менеджер',
    estimator: 'Сметчик',
    supplier: 'Снабженец'
  };

  // Role descriptions
  const roleDescriptions = {
    super_admin: 'Полный доступ ко всем функциям системы',
    admin: 'Управление компанией и пользователями',
    manager: 'Управление проектами, сметами и закупками',
    estimator: 'Создание и редактирование смет',
    supplier: 'Управление закупками и материалами'
  };

  // Role badge colors
  const getRoleBadgeStyle = (roleName) => {
    switch (roleName) {
      case 'super_admin': return { bgcolor: '#FEE2E2', color: '#DC2626' };
      case 'admin': return { bgcolor: '#FEF3C7', color: '#D97706' };
      case 'manager': return { bgcolor: '#EDE9FE', color: '#7C3AED' };
      case 'estimator': return { bgcolor: '#DBEAFE', color: '#2563EB' };
      case 'supplier': return { bgcolor: '#D1FAE5', color: '#059669' };
      default: return { bgcolor: '#F3F4F6', color: '#6B7280' };
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconShield size={20} style={{ color: '#7C3AED' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#111827' }}>
            Управление ролями
          </Typography>
        </Box>
        {user && (
          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280', mt: 0.5 }}>
            {user.fullName || user.email}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loadingRoles ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {availableRoles.map((role) => {
              const isChecked = selectedRoles.includes(role.id);
              const roleName = role.name;
              const badgeStyle = getRoleBadgeStyle(roleName);

              return (
                <Box
                  key={role.id}
                  onClick={() => !loading && handleRoleToggle(role.id)}
                  sx={{
                    border: '1px solid',
                    borderColor: isChecked ? '#7C3AED' : '#E5E7EB',
                    borderRadius: '10px',
                    p: 2,
                    bgcolor: isChecked ? '#F5F3FF' : '#FFFFFF',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    '&:hover': {
                      borderColor: isChecked ? '#7C3AED' : '#D1D5DB',
                      bgcolor: isChecked ? '#F5F3FF' : '#F9FAFB'
                    }
                  }}
                >
                  {/* Checkbox */}
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '4px',
                      border: '2px solid',
                      borderColor: isChecked ? '#7C3AED' : '#D1D5DB',
                      bgcolor: isChecked ? '#7C3AED' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: '2px'
                    }}
                  >
                    {isChecked && <IconCheck size={14} style={{ color: '#FFFFFF' }} />}
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                        {roleDisplayNames[roleName] || roleName}
                      </Typography>
                      {(roleName === 'super_admin' || roleName === 'admin') && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            px: '6px',
                            py: '2px',
                            fontSize: '11px',
                            fontWeight: 500,
                            ...badgeStyle
                          }}
                        >
                          {roleName === 'super_admin' ? 'Высший уровень' : 'Администратор'}
                        </Box>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280', lineHeight: 1.4 }}>
                      {roleDescriptions[roleName] || 'Описание отсутствует'}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {selectedRoles.length === 0 && !loadingRoles && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Выберите хотя бы одну роль для пользователя
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, justifyContent: 'flex-end', gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          sx={{ 
            textTransform: 'none', 
            color: '#6B7280',
            fontSize: '0.875rem',
            '&:hover': { bgcolor: '#F3F4F6' }
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || selectedRoles.length === 0}
          startIcon={loading && <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />}
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
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RolesDialog;
