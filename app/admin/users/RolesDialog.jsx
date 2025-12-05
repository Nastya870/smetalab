import { useState, useEffect } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Управление ролями
        {user && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {user.fullName || user.email}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loadingRoles ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <FormControl component="fieldset" fullWidth>
            <FormGroup>
              {availableRoles.map((role) => {
                const isChecked = selectedRoles.includes(role.id);
                const roleName = role.name;

                return (
                  <Box
                    key={role.id}
                    sx={{
                      border: '1px solid',
                      borderColor: isChecked ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      p: 2,
                      mb: 1.5,
                      bgcolor: isChecked ? 'primary.lighter' : 'background.paper',
                      transition: 'all 0.3s'
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleRoleToggle(role.id)}
                          disabled={loading}
                        />
                      }
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {roleDisplayNames[roleName] || roleName}
                            </Typography>
                            {roleName === 'super_admin' && (
                              <Chip label="Высший уровень" size="small" color="error" />
                            )}
                            {roleName === 'admin' && (
                              <Chip label="Администратор" size="small" color="warning" />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {roleDescriptions[roleName] || 'Описание отсутствует'}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                );
              })}
            </FormGroup>
          </FormControl>
        )}

        {selectedRoles.length === 0 && !loadingRoles && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Выберите хотя бы одну роль для пользователя
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading} size="small">
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || selectedRoles.length === 0}
          startIcon={loading && <CircularProgress size={16} />}
          size="small"
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RolesDialog;
