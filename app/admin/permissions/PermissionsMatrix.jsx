import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Material-UI
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Collapse,
  CircularProgress
} from '@mui/material';
import {
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons-react';

// API
import * as permissionsAPI from 'shared/lib/api/permissions';

// ==============================|| PERMISSIONS MATRIX COMPONENT ||============================== //

/**
 * Компонент матрицы разрешений для управления правами ролей
 * 
 * @param {Object} props
 * @param {string} props.roleId - ID роли
 * @param {string} props.roleName - Название роли
 * @param {string} props.roleKey - Ключ роли (для проверки super_admin)
 * @param {Function} props.onPermissionsChange - Callback при изменении разрешений
 */
const PermissionsMatrix = ({ roleId, roleName, roleKey, onPermissionsChange }) => {
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState([]); // Все доступные разрешения
  const [rolePermissions, setRolePermissions] = useState([]); // Разрешения роли
  const [hiddenPermissions, setHiddenPermissions] = useState(new Set()); // ID скрытых разрешений
  const [expandedResources, setExpandedResources] = useState(new Set()); // Развернутые ресурсы
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка данных
  useEffect(() => {
    loadPermissions();
  }, [roleId]);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Загружаем все разрешения и разрешения роли параллельно
      const [allPermsRes, rolePermsRes] = await Promise.all([
        permissionsAPI.getAllPermissions(),
        permissionsAPI.getRolePermissions(roleId)
      ]);

      if (allPermsRes.success && rolePermsRes.success) {
        setAllPermissions(allPermsRes.data || []);
        setRolePermissions(rolePermsRes.data.permissionIds || []);
        setHiddenPermissions(new Set(rolePermsRes.data.hiddenPermissionIds || []));
        
        // Автоматически разворачиваем первые 3 ресурса
        const firstResources = (allPermsRes.data || []).slice(0, 3).map(r => r.resource);
        setExpandedResources(new Set(firstResources));
      } else {
        setError('Ошибка загрузки разрешений');
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Переключение разрешения (вкл/выкл)
  const togglePermission = (permissionId) => {
    const newPermissions = rolePermissions.includes(permissionId)
      ? rolePermissions.filter(id => id !== permissionId)
      : [...rolePermissions, permissionId];
    
    setRolePermissions(newPermissions);
    setHasChanges(true);
    
    if (onPermissionsChange) {
      onPermissionsChange(newPermissions, hiddenPermissions);
    }
  };

  // Переключение видимости UI (is_hidden)
  const toggleHidden = (permissionId) => {
    const newHidden = new Set(hiddenPermissions);
    if (newHidden.has(permissionId)) {
      newHidden.delete(permissionId);
    } else {
      newHidden.add(permissionId);
    }
    
    setHiddenPermissions(newHidden);
    setHasChanges(true);
    
    if (onPermissionsChange) {
      onPermissionsChange(rolePermissions, newHidden);
    }
  };

  // Переключить все разрешения ресурса
  const toggleResourcePermissions = (resourcePerms) => {
    const resourcePermIds = resourcePerms.map(p => p.id);
    const allChecked = resourcePermIds.every(id => rolePermissions.includes(id));
    
    let newPermissions;
    if (allChecked) {
      // Убрать все
      newPermissions = rolePermissions.filter(id => !resourcePermIds.includes(id));
    } else {
      // Добавить все
      const toAdd = resourcePermIds.filter(id => !rolePermissions.includes(id));
      newPermissions = [...rolePermissions, ...toAdd];
    }
    
    setRolePermissions(newPermissions);
    setHasChanges(true);
    
    if (onPermissionsChange) {
      onPermissionsChange(newPermissions, hiddenPermissions);
    }
  };

  // Развернуть/свернуть ресурс
  const toggleResource = (resource) => {
    const newExpanded = new Set(expandedResources);
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource);
    } else {
      newExpanded.add(resource);
    }
    setExpandedResources(newExpanded);
  };

  // Получить иконку действия
  const getActionIcon = (action) => {
    const icons = {
      create: '➕',
      read: '👁️',
      update: '✏️',
      delete: '🗑️',
      manage: '⚙️',
      view: '👀',
      view_menu: '📋'
    };
    return icons[action] || '📄';
  };

  // Получить цвет действия
  const getActionColor = (action) => {
    const colors = {
      create: 'success',
      read: 'info',
      update: 'warning',
      delete: 'error',
      manage: 'secondary',
      view: 'primary',
      view_menu: 'default'
    };
    return colors[action] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const isSuperAdmin = roleKey === 'super_admin';

  return (
    <Box>
      {/* Предупреждение для super_admin */}
      {isSuperAdmin && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Внимание!</strong> Вы редактируете разрешения роли <strong>super_admin</strong>. 
          Эта роль имеет полный доступ ко всей системе.
        </Alert>
      )}

      {/* Статистика */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip 
          label={`Всего разрешений: ${allPermissions.reduce((sum, r) => sum + r.permissions.length, 0)}`}
          color="default"
          size="small"
        />
        <Chip 
          label={`Активных: ${rolePermissions.length}`}
          color="success"
          size="small"
        />
        <Chip 
          label={`Скрыто в UI: ${hiddenPermissions.size}`}
          color="warning"
          size="small"
        />
        {hasChanges && (
          <Chip 
            label="Есть несохраненные изменения"
            color="error"
            size="small"
            icon={<IconX />}
          />
        )}
      </Box>

      {/* Таблица разрешений */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell><strong>Ресурс</strong></TableCell>
              <TableCell align="center"><strong>Разрешение</strong></TableCell>
              <TableCell align="center"><strong>Действие</strong></TableCell>
              <TableCell align="center"><strong>Включено</strong></TableCell>
              <TableCell align="center"><strong>Скрыть UI</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allPermissions.map((resourceGroup) => {
              const isExpanded = expandedResources.has(resourceGroup.resource);
              const allChecked = resourceGroup.permissions.every(p => rolePermissions.includes(p.id));
              const someChecked = resourceGroup.permissions.some(p => rolePermissions.includes(p.id));
              
              return (
                <React.Fragment key={resourceGroup.resource}>
                  {/* Заголовок ресурса */}
                  <TableRow 
                    hover 
                    sx={{ 
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                    onClick={() => toggleResource(resourceGroup.resource)}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                      </IconButton>
                    </TableCell>
                    <TableCell colSpan={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {resourceGroup.icon} {resourceGroup.resourceName}
                        </Typography>
                        <Chip 
                          label={resourceGroup.permissions.length}
                          size="small"
                          color="default"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked && !allChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleResourcePermissions(resourceGroup.permissions);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Разрешения ресурса */}
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Table size="small">
                          <TableBody>
                            {resourceGroup.permissions.map((perm) => {
                              const isChecked = rolePermissions.includes(perm.id);
                              const isHidden = hiddenPermissions.has(perm.id);
                              
                              return (
                                <TableRow 
                                  key={perm.id}
                                  hover
                                  sx={{ 
                                    opacity: isChecked ? 1 : 0.5,
                                    '&:hover': { bgcolor: 'action.hover' }
                                  }}
                                >
                                  <TableCell width={40}></TableCell>
                                  <TableCell width={200}>
                                    <Chip 
                                      label={perm.key}
                                      size="small"
                                      variant="outlined"
                                      color="default"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title={perm.description || ''}>
                                      <Typography variant="body2">
                                        {perm.name}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell align="center" width={120}>
                                    <Chip 
                                      label={perm.action}
                                      size="small"
                                      color={getActionColor(perm.action)}
                                      icon={<span>{getActionIcon(perm.action)}</span>}
                                    />
                                  </TableCell>
                                  <TableCell align="center" width={100}>
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={() => togglePermission(perm.id)}
                                      color="success"
                                    />
                                  </TableCell>
                                  <TableCell align="center" width={100}>
                                    <Tooltip title={isHidden ? 'Показать в UI' : 'Скрыть в UI'}>
                                      <span>
                                        <IconButton
                                          size="small"
                                          onClick={() => toggleHidden(perm.id)}
                                          disabled={!isChecked}
                                          color={isHidden ? 'warning' : 'default'}
                                        >
                                          {isHidden ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Подсказка */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Подсказка:</strong> Включите разрешение чекбоксом "Включено", затем используйте иконку глаза 
        для скрытия элемента из UI. Скрытые элементы не будут отображаться в меню, но разрешение остается активным.
      </Alert>
    </Box>
  );
};

PermissionsMatrix.propTypes = {
  roleId: PropTypes.string.isRequired,
  roleName: PropTypes.string.isRequired,
  roleKey: PropTypes.string.isRequired,
  onPermissionsChange: PropTypes.func
};

export default PermissionsMatrix;
