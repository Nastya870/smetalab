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
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  IconEye,
  IconPlus,
  IconPencil,
  IconTrash,
  IconMenu2,
  IconCheck
} from '@tabler/icons-react';

// API
import * as permissionsAPI from 'shared/lib/api/permissions';

// ==============================|| SIMPLIFIED PERMISSIONS MATRIX ||============================== //

const PermissionsMatrixSimple = ({ roleId, roleName, roleKey, onPermissionsChange }) => {
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [hiddenPermissions, setHiddenPermissions] = useState(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPermissions();
  }, [roleId]);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allPermsRes, rolePermsRes] = await Promise.all([
        permissionsAPI.getAllPermissions(),
        permissionsAPI.getRolePermissions(roleId)
      ]);

      if (allPermsRes.success && rolePermsRes.success) {
        setAllPermissions(allPermsRes.data || []);
        setRolePermissions(rolePermsRes.data.permissionIds || []);
        setHiddenPermissions(new Set(rolePermsRes.data.hiddenPermissionIds || []));
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

  const getResourceActions = (resourceGroup) => {
    const actions = {
      view_menu: null,
      read: null,
      create: null,
      update: null,
      delete: null
    };

    resourceGroup.permissions.forEach(perm => {
      if (perm.action === 'view_menu') {
        actions.view_menu = perm;
      } else if (perm.action === 'read' || perm.action === 'view') {
        actions.read = perm;
      } else if (perm.action === 'create') {
        actions.create = perm;
      } else if (perm.action === 'update') {
        actions.update = perm;
      } else if (perm.action === 'delete') {
        actions.delete = perm;
      } else if (perm.action === 'manage') {
        if (!actions.create) actions.create = perm;
        if (!actions.update) actions.update = perm;
      }
    });

    return actions;
  };

  const togglePermission = (permissionId, shouldCheck) => {
    const newPermissions = shouldCheck
      ? [...rolePermissions, permissionId]
      : rolePermissions.filter(id => id !== permissionId);
    
    setRolePermissions(newPermissions);
    setHasChanges(true);
    
    if (onPermissionsChange) {
      onPermissionsChange(newPermissions, hiddenPermissions);
    }
  };

  const handleActionToggle = (action) => {
    if (!action) return;
    const isChecked = rolePermissions.includes(action.id);
    togglePermission(action.id, !isChecked);
  };

  const toggleAllForResource = (resourceGroup) => {
    const actions = getResourceActions(resourceGroup);
    const allActions = Object.values(actions).filter(a => a !== null);
    const allChecked = allActions.every(a => rolePermissions.includes(a.id));

    allActions.forEach(action => {
      togglePermission(action.id, !allChecked);
    });
  };

  const getSortedPermissions = (permissions) => {
    const resourceOrder = {
      'admin': 1, 'users': 2, 'roles': 3, 'tenants': 4, 'settings': 5,
      'references': 10, 'materials': 11, 'works': 12, 'counterparties': 13, 'suppliers': 14,
      'projects': 20, 'estimates': 21, 'estimate_templates': 22, 'purchases': 23, 'reports': 24,
      'dashboard': 30, 'default': 100
    };

    return [...permissions].sort((a, b) => {
      const orderA = resourceOrder[a.resource] || resourceOrder.default;
      const orderB = resourceOrder[b.resource] || resourceOrder.default;
      return orderA - orderB;
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress size={28} sx={{ color: '#6B7280' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ fontSize: '12px', py: 0.5 }}>
        {error}
      </Alert>
    );
  }

  const isSuperAdmin = roleKey === 'super_admin';
  const sortedPermissions = getSortedPermissions(allPermissions);
  const parentResources = ['admin', 'references', 'projects'];
  const childResourcesMap = {
    'admin': ['users', 'roles', 'tenants', 'settings'],
    'references': ['materials', 'works', 'counterparties', 'suppliers'],
    'projects': ['estimates', 'purchases', 'reports']
  };

  // Monochrome checkbox style - unified color
  const checkboxSx = {
    p: 0.5,
    color: '#D1D5DB',
    '&.Mui-checked': { color: '#4F46E5' },
    '&.MuiCheckbox-indeterminate': { color: '#4F46E5' },
    '& .MuiSvgIcon-root': { fontSize: 18 }
  };

  return (
    <Box>
      {/* Super admin warning */}
      {isSuperAdmin && (
        <Typography sx={{ fontSize: '11px', color: '#DC2626', mb: 1 }}>
          ⚠ Вы редактируете роль super_admin с полным доступом к системе
        </Typography>
      )}

      {/* Role name + badge - single line */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        mb: 1.5
      }}>
        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          {roleName}
        </Typography>
        <Typography sx={{ 
          fontSize: '10px', 
          fontWeight: 500,
          color: '#6D28D9',
          bgcolor: '#F5F3FF',
          px: 0.75,
          py: 0.125,
          borderRadius: '3px',
          lineHeight: '16px'
        }}>
          {rolePermissions.length} активно
        </Typography>
        {hasChanges && (
          <Typography sx={{ 
            fontSize: '10px', 
            fontWeight: 500,
            color: '#DC2626',
            bgcolor: '#FEF2F2',
            px: 0.75,
            py: 0.125,
            borderRadius: '3px',
            lineHeight: '16px'
          }}>
            Не сохранено
          </Typography>
        )}
      </Box>

      {/* Permissions Table - only table has border */}
      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{ 
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          overflow: 'hidden'
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
              <TableCell sx={{ 
                fontWeight: 600, 
                fontSize: '12px', 
                color: '#6B7280',
                py: 1,
                pl: 2,
                width: '30%',
                borderBottom: '1px solid #E5E7EB'
              }}>
                Раздел
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '12px', color: '#6B7280', py: 1, width: '12%', borderBottom: '1px solid #E5E7EB' }}>
                <Tooltip title="Видимость в меню">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <IconMenu2 size={14} />
                    <span>Меню</span>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '12px', color: '#6B7280', py: 1, width: '12%', borderBottom: '1px solid #E5E7EB' }}>
                <Tooltip title="Просмотр данных">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <IconEye size={14} />
                    <span>Просмотр</span>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '12px', color: '#6B7280', py: 1, width: '12%', borderBottom: '1px solid #E5E7EB' }}>
                <Tooltip title="Создание записей">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <IconPlus size={14} />
                    <span>Создание</span>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '12px', color: '#6B7280', py: 1, width: '12%', borderBottom: '1px solid #E5E7EB' }}>
                <Tooltip title="Редактирование">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <IconPencil size={14} />
                    <span>Изменение</span>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '12px', color: '#6B7280', py: 1, width: '12%', borderBottom: '1px solid #E5E7EB' }}>
                <Tooltip title="Удаление записей">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <IconTrash size={14} />
                    <span>Удаление</span>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '12px', color: '#6B7280', py: 1, width: '10%', borderBottom: '1px solid #E5E7EB' }}>
                <Tooltip title="Выбрать все">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <IconCheck size={14} />
                    <span>Все</span>
                  </Box>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPermissions.map((resourceGroup) => {
              const actions = getResourceActions(resourceGroup);
              const hasAnyAction = Object.values(actions).some(a => a !== null);
              
              if (!hasAnyAction) return null;

              const allResourcePerms = Object.values(actions).filter(a => a !== null);
              const allChecked = allResourcePerms.every(a => rolePermissions.includes(a.id));
              const someChecked = allResourcePerms.some(a => rolePermissions.includes(a.id));
              const isParentResource = parentResources.includes(resourceGroup.resource);
              const childResources = childResourcesMap[resourceGroup.resource] || [];

              return (
                <TableRow 
                  key={resourceGroup.resource}
                  sx={{
                    '&:hover': { bgcolor: '#FAFAFA' },
                    borderLeft: isParentResource ? '2px solid #4F46E5' : 'none',
                    bgcolor: isParentResource ? '#FAFAFA' : '#FFFFFF'
                  }}
                >
                  {/* Resource name - two-line compact */}
                  <TableCell sx={{ py: 0.75, pl: 1.5, borderBottom: '1px solid #F3F4F6' }}>
                    <Box>
                      <Typography sx={{ 
                        fontSize: '13px', 
                        fontWeight: isParentResource ? 600 : 500, 
                        color: '#374151',
                        lineHeight: 1.3
                      }}>
                        {resourceGroup.resourceName}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '11px', 
                        color: '#9CA3AF',
                        lineHeight: 1.2
                      }}>
                        {resourceGroup.resource}
                        {isParentResource && childResources.length > 0 && (
                          <span> → {childResources.join(', ')}</span>
                        )}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Menu visibility */}
                  <TableCell align="center" sx={{ py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                    {actions.view_menu ? (
                      <Checkbox
                        checked={rolePermissions.includes(actions.view_menu.id)}
                        onChange={() => handleActionToggle(actions.view_menu)}
                        sx={checkboxSx}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                    )}
                  </TableCell>

                  {/* Read */}
                  <TableCell align="center" sx={{ py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                    {actions.read ? (
                      <Checkbox
                        checked={rolePermissions.includes(actions.read.id)}
                        onChange={() => handleActionToggle(actions.read)}
                        sx={checkboxSx}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                    )}
                  </TableCell>

                  {/* Create */}
                  <TableCell align="center" sx={{ py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                    {actions.create ? (
                      <Checkbox
                        checked={rolePermissions.includes(actions.create.id)}
                        onChange={() => handleActionToggle(actions.create)}
                        sx={checkboxSx}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                    )}
                  </TableCell>

                  {/* Update */}
                  <TableCell align="center" sx={{ py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                    {actions.update ? (
                      <Checkbox
                        checked={rolePermissions.includes(actions.update.id)}
                        onChange={() => handleActionToggle(actions.update)}
                        sx={checkboxSx}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                    )}
                  </TableCell>

                  {/* Delete */}
                  <TableCell align="center" sx={{ py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                    {actions.delete ? (
                      <Checkbox
                        checked={rolePermissions.includes(actions.delete.id)}
                        onChange={() => handleActionToggle(actions.delete)}
                        sx={checkboxSx}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                    )}
                  </TableCell>

                  {/* Select all */}
                  <TableCell align="center" sx={{ py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onChange={() => toggleAllForResource(resourceGroup)}
                      sx={checkboxSx}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Muted help text - no container */}
      <Typography sx={{ 
        mt: 1.5, 
        fontSize: '11px', 
        color: '#9CA3AF', 
        lineHeight: 1.4 
      }}>
        Меню — навигация • Просмотр — чтение • Создание — добавление • Изменение — редактирование • Удаление — удаление
      </Typography>

      {hasChanges && (
        <Typography sx={{ mt: 1, fontSize: '11px', color: '#DC2626' }}>
          ⚠ Есть несохраненные изменения
        </Typography>
      )}
    </Box>
  );
};

PermissionsMatrixSimple.propTypes = {
  roleId: PropTypes.string.isRequired,
  roleName: PropTypes.string.isRequired,
  roleKey: PropTypes.string.isRequired,
  onPermissionsChange: PropTypes.func
};

export default PermissionsMatrixSimple;
