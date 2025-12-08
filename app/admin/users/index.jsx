import { useState, useEffect, useCallback } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

// project imports
import { getAllUsers, deleteUser } from 'api/users';
import UserDialog from './UserDialog';
import RolesDialog from './RolesDialog';

// assets
import {
  IconSearch,
  IconUserPlus,
  IconEdit,
  IconTrash,
  IconShield,
  IconCircleCheck,
  IconCircleX,
  IconUsers
} from '@tabler/icons-react';

// ==============================|| USERS MANAGEMENT ||============================== //

const UsersManagement = () => {
  const theme = useTheme();

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);

  // Dialogs
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAllUsers({
        page: page + 1,
        pageSize: rowsPerPage,
        search
      });

      setUsers(response.data || []);
      setTotalUsers(response.total || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleManageRoles = (user) => {
    setSelectedUser(user);
    setRolesDialogOpen(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.id);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || 'Ошибка удаления пользователя');
    }
  };

  const handleUserSaved = () => {
    setUserDialogOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const handleRolesSaved = () => {
    setRolesDialogOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  // Get role names
  const getRoleNames = (roles) => {
    if (!roles || roles.length === 0) return 'Нет ролей';

    const roleMap = {
      super_admin: 'Супер Админ',
      admin: 'Админ',
      manager: 'Менеджер',
      estimator: 'Сметчик',
      supplier: 'Снабженец'
    };

    return roles.map((role) => roleMap[role.name] || role.name).join(', ');
  };

  // Get role badge styles - единый стиль фиолетовый
  const getRoleBadgeStyle = (roles) => {
    return { bgcolor: '#F3E8FF', color: '#6D28D9' };
  };

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
        {/* Заголовок */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '16px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconUsers size={20} style={{ color: '#6B7280' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1F2937' }}>
              Управление пользователями
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<IconUserPlus size={16} />} 
            onClick={handleCreateUser}
            disabled={loading}
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
            Добавить пользователя
          </Button>
        </Box>

        {/* Поиск */}
        <TextField
          fullWidth
          value={search}
          onChange={handleSearchChange}
          placeholder="Поиск по имени или email..."
          size="small"
          sx={{
            mb: '16px',
            flexShrink: 0,
            '& .MuiOutlinedInput-root': {
              height: 44,
              bgcolor: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '0.875rem',
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

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Users Table */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1, borderBottom: '1px solid #E5E7EB' }}>
                    Имя
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1, borderBottom: '1px solid #E5E7EB' }}>
                    Email
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1, borderBottom: '1px solid #E5E7EB' }}>
                    Телефон
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1, borderBottom: '1px solid #E5E7EB' }}>
                    Роли
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1, borderBottom: '1px solid #E5E7EB' }}>
                    Статус
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#F9FAFB', fontWeight: 500, fontSize: '0.75rem', color: '#374151', py: 1, pr: 2, borderBottom: '1px solid #E5E7EB' }}>
                    Действия
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, borderBottom: 'none' }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, borderBottom: 'none' }}>
                      <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                        Пользователи не найдены
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, index) => (
                    <TableRow 
                      key={user.id} 
                      sx={{ 
                        height: '52px',
                        bgcolor: index % 2 === 1 ? '#FAF9FF' : 'transparent',
                        transition: 'background-color 0.15s ease',
                        '&:hover': { bgcolor: '#F3F4F6' }
                      }}
                    >
                      <TableCell sx={{ py: '10px', borderBottom: '1px solid #F3F4F6' }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                          {user.fullName || 'Не указано'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: '10px', borderBottom: '1px solid #F3F4F6' }}>
                        <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: '10px', borderBottom: '1px solid #F3F4F6' }}>
                        <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>
                          {user.phone || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: '10px', borderBottom: '1px solid #F3F4F6' }}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: '6px',
                            px: '8px',
                            py: '3px',
                            fontSize: '12px',
                            fontWeight: 500,
                            ...getRoleBadgeStyle(user.roles)
                          }}
                        >
                          {getRoleNames(user.roles)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: '10px', borderBottom: '1px solid #F3F4F6' }}>
                        {user.isActive ? (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              bgcolor: '#DCFCE7',
                              color: '#15803D',
                              borderRadius: '6px',
                              px: '8px',
                              py: '3px',
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          >
                            <IconCircleCheck size={14} style={{ color: '#15803D' }} />
                            Активен
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              bgcolor: '#F3F4F6',
                              color: '#6B7280',
                              borderRadius: '6px',
                              px: '8px',
                              py: '3px',
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          >
                            <IconCircleX size={14} />
                            Неактивен
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ py: '10px', pr: 2, borderBottom: '1px solid #F3F4F6' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                          <Tooltip title="Управление ролями">
                            <IconButton
                              size="small"
                              onClick={() => handleManageRoles(user)}
                              sx={{ width: 30, height: 30, color: '#6D28D9', '&:hover': { color: '#5B21B6', bgcolor: '#F3E8FF' } }}
                            >
                              <IconShield size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Редактировать">
                            <IconButton
                              size="small"
                              onClick={() => handleEditUser(user)}
                              sx={{ width: 30, height: 30, color: '#6B7280', '&:hover': { color: '#374151', bgcolor: '#F3F4F6' } }}
                            >
                              <IconEdit size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(user)}
                              sx={{ width: 30, height: 30, color: '#EF4444', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                            >
                              <IconTrash size={18} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalUsers}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
            sx={{
              borderTop: '1px solid #E5E7EB',
              flexShrink: 0,
              py: 0.5,
              '& .MuiTablePagination-toolbar': {
                minHeight: 48
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.75rem',
                color: '#6B7280'
              },
              '& .MuiTablePagination-select': {
                fontSize: '0.75rem'
              },
              '& .MuiTablePagination-actions': {
                '& .MuiIconButton-root': {
                  padding: '4px',
                  color: '#6B7280'
                }
              }
            }}
          />
        </Paper>
      </Paper>

      {/* User Create/Edit Dialog */}
      <UserDialog
        open={userDialogOpen}
        user={selectedUser}
        onClose={() => setUserDialogOpen(false)}
        onSave={handleUserSaved}
      />

      {/* Roles Management Dialog */}
      <RolesDialog
        open={rolesDialogOpen}
        user={selectedUser}
        onClose={() => setRolesDialogOpen(false)}
        onSave={handleRolesSaved}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#111827', pb: 1 }}>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ color: '#374151', fontSize: '0.875rem' }}>
            Вы уверены, что хотите удалить пользователя{' '}
            <strong>{selectedUser?.fullName || selectedUser?.email}</strong>?
          </Typography>
          <Typography sx={{ color: '#DC2626', fontSize: '0.8125rem', mt: 2 }}>
            Это действие необратимо!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
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
            onClick={handleDeleteConfirm} 
            variant="contained"
            sx={{
              textTransform: 'none',
              bgcolor: '#EF4444',
              height: 40,
              px: 2,
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '8px',
              '&:hover': { bgcolor: '#DC2626' }
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersManagement;
