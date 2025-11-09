import { useState, useEffect, useCallback } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
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
import MainCard from 'ui-component/cards/MainCard';
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
  IconCircleX
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
      project_manager: 'Менеджер',
      estimator: 'Сметчик',
      supplier: 'Поставщик',
      viewer: 'Наблюдатель'
    };

    return roles.map((role) => roleMap[role.name] || role.name).join(', ');
  };

  // Get role chip color
  const getRoleColor = (roles) => {
    if (!roles || roles.length === 0) return 'default';
    if (roles.some((r) => r.name === 'super_admin')) return 'error';
    if (roles.some((r) => r.name === 'admin')) return 'warning';
    if (roles.some((r) => r.name === 'project_manager')) return 'primary';
    return 'secondary';
  };

  return (
    <MainCard
      title="Управление пользователями"
      secondary={
        <Button
          variant="contained"
          startIcon={<IconUserPlus />}
          onClick={handleCreateUser}
          disabled={loading}
        >
          Добавить пользователя
        </Button>
      }
    >
      {/* Search */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <OutlinedInput
            fullWidth
            value={search}
            onChange={handleSearchChange}
            placeholder="Поиск по имени или email..."
            startAdornment={
              <InputAdornment position="start">
                <IconSearch stroke={1.5} size="20px" />
              </InputAdornment>
            }
          />
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Роли</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Пользователи не найдены
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.fullName || 'Не указано'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleNames(user.roles)}
                      size="small"
                      color={getRoleColor(user.roles)}
                    />
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Chip
                        icon={<IconCircleCheck size={16} />}
                        label="Активен"
                        size="small"
                        color="success"
                      />
                    ) : (
                      <Chip
                        icon={<IconCircleX size={16} />}
                        label="Неактивен"
                        size="small"
                        color="default"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Управление ролями">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleManageRoles(user)}
                        >
                          <IconShield size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleEditUser(user)}
                        >
                          <IconEdit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <IconTrash size={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
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
      />

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
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить пользователя{' '}
            <strong>{selectedUser?.fullName || selectedUser?.email}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Это действие необратимо!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
};

export default UsersManagement;
