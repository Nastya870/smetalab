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
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  IconEye,
  IconEyeOff,
  IconPencil,
  IconTrash
} from '@tabler/icons-react';

// API
import * as permissionsAPI from 'shared/lib/api/permissions';

// ==============================|| SIMPLIFIED PERMISSIONS MATRIX ||============================== //

/**
 * Упрощенная матрица разрешений с группировкой по разделам
 * Показывает только основные действия: Видимость в меню, Просмотр, Редактирование, Удаление
 */
const PermissionsMatrixSimple = ({ roleId, roleName, roleKey, onPermissionsChange }) => {
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState([]); // Все разрешения из БД
  const [rolePermissions, setRolePermissions] = useState([]); // ID включенных разрешений
  const [hiddenPermissions, setHiddenPermissions] = useState(new Set()); // ID скрытых в UI
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);
  const [compactView, setCompactView] = useState(false);

  // Загрузка данных
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

  // Группировка разрешений по действиям для каждого ресурса
  const getResourceActions = (resourceGroup) => {
    const actions = {
      view_menu: null,    // Видимость в меню
      read: null,         // Просмотр (чтение)
      create: null,       // Создание
      update: null,       // Редактирование
      delete: null        // Удаление
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
        // manage заменяет create + update если их нет
        if (!actions.create) actions.create = perm;
        if (!actions.update) actions.update = perm;
      }
    });

    return actions;
  };

  // Переключение разрешения
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

  // Переключение видимости в меню (is_hidden для view_menu)
  const toggleMenuVisibility = (permissionId, shouldHide) => {
    const newHidden = new Set(hiddenPermissions);
    if (shouldHide) {
      newHidden.add(permissionId);
    } else {
      newHidden.delete(permissionId);
    }
    
    setHiddenPermissions(newHidden);
    setHasChanges(true);
    
    if (onPermissionsChange) {
      onPermissionsChange(rolePermissions, newHidden);
    }
  };

  // Обработка чекбокса для действия
  const handleActionToggle = (action) => {
    if (!action) return;

    const isChecked = rolePermissions.includes(action.id);
    togglePermission(action.id, !isChecked);
  };

  // Обработка переключателя видимости меню
  const handleMenuVisibilityToggle = (viewMenuAction) => {
    if (!viewMenuAction) return;

    const isEnabled = rolePermissions.includes(viewMenuAction.id);

    // Простая логика: чекбокс включает/выключает разрешение
    togglePermission(viewMenuAction.id, !isEnabled);
  };

  // Быстрое переключение всех разрешений для раздела
  const toggleAllForResource = (resourceGroup) => {
    const actions = getResourceActions(resourceGroup);
    const allActions = Object.values(actions).filter(a => a !== null);
    const allChecked = allActions.every(a => rolePermissions.includes(a.id));

    allActions.forEach(action => {
      togglePermission(action.id, !allChecked);
    });
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

  // Определяем родительские ресурсы для подсказки
  const parentResources = ['admin', 'references', 'projects'];
  const childResourcesMap = {
    'admin': ['users', 'roles', 'tenants', 'settings'],
    'references': ['materials', 'works', 'counterparties', 'suppliers'],
    'projects': ['estimates', 'purchases', 'reports']
  };

  // Функция для сортировки ресурсов в иерархическом порядке
  const getSortedPermissions = (permissions) => {
    // Определяем порядок отображения
    const resourceOrder = {
      // Родительские ресурсы
      'admin': 1,
      // Дочерние admin
      'users': 2,
      'roles': 3,
      'tenants': 4,
      'settings': 5,
      
      // Родительский references
      'references': 10,
      // Дочерние references
      'materials': 11,
      'works': 12,
      'counterparties': 13,
      'suppliers': 14,
      
      // Родительский projects
      'projects': 20,
      // Дочерние projects
      'estimates': 21,
      'estimate_templates': 22,
      'purchases': 23,
      'reports': 24,
      
      // Отдельные ресурсы
      'dashboard': 30,
      
      // Все остальное в конец
      'default': 100
    };

    return [...permissions].sort((a, b) => {
      const orderA = resourceOrder[a.resource] || resourceOrder.default;
      const orderB = resourceOrder[b.resource] || resourceOrder.default;
      return orderA - orderB;
    });
  };

  // Сортируем разрешения для отображения
  const sortedPermissions = getSortedPermissions(allPermissions);

  return (
    <Box>
      {/* Предупреждение для super_admin */}
      {isSuperAdmin && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Внимание!</strong> Вы редактируете разрешения роли <strong>super_admin</strong>. 
          Эта роль имеет полный доступ ко всей системе.
        </Alert>
      )}

      {/* Информация про иерархию разрешений */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
          🔗 Как работает иерархия разрешений
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Некоторые разделы являются <strong>родительскими</strong> и автоматически дают доступ к связанным с ними подразделам:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
          <li>
            <strong>🔐 admin</strong> (Администрирование) → даёт доступ к: Пользователи, Роли, Тенанты, Настройки
          </li>
          <li>
            <strong>📚 references</strong> (Справочники) → даёт доступ к: Материалы, Работы, Контрагенты, Поставщики
          </li>
          <li>
            <strong>📊 projects</strong> (Проекты) → даёт доступ к: Сметы, Закупки, Отчёты
          </li>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          ⚠️ <strong>Важно:</strong> Для работы иерархии обязательно включите ВСЕ 4 действия (📋 Меню, 👁️ Просмотр, ➕ Создание, ✏️ Изменение) для родительского раздела!
          <br />
          Особенно важно разрешение <strong>👁️ Просмотр</strong> — без него доступ к дочерним разделам работать не будет.
        </Typography>
      </Alert>

      {/* Статистика и настройки вида */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Роль: {roleName}
          </Typography>
          <Chip 
            label={`${rolePermissions.length} разрешений активно`}
            color="success"
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {hasChanges && (
            <Chip 
              icon={<span>⚠️</span>}
              label="Не сохранено"
              color="error"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        
        <FormControlLabel
          control={
            <Switch 
              checked={compactView}
              onChange={(e) => setCompactView(e.target.checked)}
              size="small"
            />
          }
          label={<Typography variant="body2">Компактный вид</Typography>}
        />
      </Box>

      {/* Таблица разрешений - АДАПТИВНАЯ ШИРИНА */}
      <TableContainer 
        component={Paper} 
        elevation={3}
        sx={{ 
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto'
        }}
      >
        <Table 
          size={compactView ? 'small' : 'medium'}
          sx={{ 
            minWidth: 900,
            width: '100%'
          }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.lighter' }}>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  minWidth: { xs: 180, sm: 220, md: 250 },
                  width: '25%'
                }}
              >
                Раздел системы
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  width: '13%',
                  minWidth: 120
                }}
              >
                <Tooltip title="Отображать раздел в главном меню">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    📋 Меню
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  width: '13%',
                  minWidth: 120
                }}
              >
                <Tooltip title="Просматривать данные (только чтение)">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    👁️ Просмотр
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  width: '13%',
                  minWidth: 120
                }}
              >
                <Tooltip title="Создавать новые записи">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    ➕ Создание
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  width: '14%',
                  minWidth: 130
                }}
              >
                <Tooltip title="Изменять существующие записи">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    ✏️ Изменение
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  width: '13%',
                  minWidth: 120
                }}
              >
                <Tooltip title="Удалять записи">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    🗑️ Удаление
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  width: '9%',
                  minWidth: 90
                }}
              >
                <Tooltip title="Выбрать все разрешения для раздела">
                  <Box>Все</Box>
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

              // Проверяем, является ли ресурс родительским
              const isParentResource = parentResources.includes(resourceGroup.resource);
              const childResources = childResourcesMap[resourceGroup.resource] || [];

              return (
                <TableRow 
                  key={resourceGroup.resource}
                  hover
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    // Выделяем родительские ресурсы
                    bgcolor: isParentResource ? 'success.lighter' : 'inherit',
                    borderLeft: isParentResource ? '4px solid' : 'none',
                    borderColor: isParentResource ? 'success.main' : 'transparent'
                  }}
                >
                  {/* Название раздела */}
                  <TableCell sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box 
                        sx={{ 
                          fontSize: '1.5rem',
                          minWidth: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {resourceGroup.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {resourceGroup.resourceName}
                          </Typography>
                          {isParentResource && (
                            <Chip 
                              label="Родительский" 
                              size="small" 
                              color="success"
                              sx={{ 
                                height: 18, 
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                '& .MuiChip-label': { px: 0.75 }
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {resourceGroup.resource}
                          {isParentResource && childResources.length > 0 && (
                            <> → {childResources.join(', ')}</>
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Видимость в меню */}
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    {actions.view_menu ? (
                      <Tooltip 
                        title={
                          rolePermissions.includes(actions.view_menu.id)
                            ? '✅ Раздел виден в меню (кликните чтобы скрыть)'
                            : '❌ Раздел скрыт в меню (кликните чтобы показать)'
                        }
                        arrow
                      >
                        <Checkbox
                          checked={rolePermissions.includes(actions.view_menu.id)}
                          onChange={() => handleMenuVisibilityToggle(actions.view_menu)}
                          color="info"
                          size={compactView ? 'small' : 'medium'}
                          sx={{
                            '& .MuiSvgIcon-root': { fontSize: compactView ? 20 : 24 }
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>

                  {/* Просмотр */}
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    {actions.read ? (
                      <Tooltip 
                        title={rolePermissions.includes(actions.read.id) ? 'Разрешено' : 'Запрещено'}
                        arrow
                      >
                        <Checkbox
                          checked={rolePermissions.includes(actions.read.id)}
                          onChange={() => handleActionToggle(actions.read)}
                          color="primary"
                          size={compactView ? 'small' : 'medium'}
                          sx={{
                            '& .MuiSvgIcon-root': { fontSize: compactView ? 20 : 24 }
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>

                  {/* Создание */}
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    {actions.create ? (
                      <Tooltip 
                        title={rolePermissions.includes(actions.create.id) ? 'Разрешено' : 'Запрещено'}
                        arrow
                      >
                        <Checkbox
                          checked={rolePermissions.includes(actions.create.id)}
                          onChange={() => handleActionToggle(actions.create)}
                          color="success"
                          size={compactView ? 'small' : 'medium'}
                          sx={{
                            '& .MuiSvgIcon-root': { fontSize: compactView ? 20 : 24 }
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>

                  {/* Редактирование */}
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    {actions.update ? (
                      <Tooltip 
                        title={rolePermissions.includes(actions.update.id) ? 'Разрешено' : 'Запрещено'}
                        arrow
                      >
                        <Checkbox
                          checked={rolePermissions.includes(actions.update.id)}
                          onChange={() => handleActionToggle(actions.update)}
                          color="warning"
                          size={compactView ? 'small' : 'medium'}
                          sx={{
                            '& .MuiSvgIcon-root': { fontSize: compactView ? 20 : 24 }
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>

                  {/* Удаление */}
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    {actions.delete ? (
                      <Tooltip 
                        title={rolePermissions.includes(actions.delete.id) ? 'Разрешено' : 'Запрещено'}
                        arrow
                      >
                        <Checkbox
                          checked={rolePermissions.includes(actions.delete.id)}
                          onChange={() => handleActionToggle(actions.delete)}
                          color="error"
                          size={compactView ? 'small' : 'medium'}
                          sx={{
                            '& .MuiSvgIcon-root': { fontSize: compactView ? 20 : 24 }
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>

                  {/* Выбрать все для раздела */}
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    <Tooltip 
                      title={
                        allChecked 
                          ? 'Снять все разрешения' 
                          : someChecked 
                            ? 'Выбрать все разрешения'
                            : 'Выбрать все разрешения'
                      }
                      arrow
                    >
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked && !allChecked}
                        onChange={() => toggleAllForResource(resourceGroup)}
                        color="secondary"
                        size={compactView ? 'small' : 'medium'}
                        sx={{
                          '& .MuiSvgIcon-root': { fontSize: compactView ? 20 : 24 }
                        }}
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Подсказки */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
          📖 Как работают разрешения:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
          <li>
            <strong>📋 Меню</strong> — показывать раздел в боковом меню навигации
          </li>
          <li>
            <strong>👁️ Просмотр</strong> — просматривать записи (только чтение, без изменений)
          </li>
          <li>
            <strong>➕ Создание</strong> — добавлять новые записи
          </li>
          <li>
            <strong>✏️ Изменение</strong> — редактировать существующие записи
          </li>
          <li>
            <strong>🗑️ Удаление</strong> — удалять записи (безвозвратно)
          </li>
          <li>
            <strong>Все</strong> — быстро включить/отключить все разрешения для раздела одновременно
          </li>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          💡 <em>Совет:</em> Обычно дают «Меню» + «Просмотр» для базового доступа к разделу
        </Typography>
      </Alert>

      {hasChanges && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            ⚠️ <strong>У вас есть несохраненные изменения!</strong>
          </Typography>
          <Typography variant="caption">
            Нажмите кнопку <strong>«Сохранить изменения»</strong> в правом верхнем углу, чтобы применить их.
          </Typography>
        </Alert>
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
