// assets
import { IconUsers, IconShield } from '@tabler/icons-react';

// constant
const icons = {
  IconUsers,
  IconShield
};

// ==============================|| ADMIN MENU ITEMS ||============================== //

const admin = {
  id: 'administration',
  title: 'Администрирование',
  type: 'group',
  children: [
    {
      id: 'users-management',
      title: 'Управление пользователями',
      type: 'item',
      url: '/app/admin/users',
      icon: icons.IconUsers,
      breadcrumbs: true,
      permission: { resource: 'users', action: 'view_menu' }
    },
    {
      id: 'permissions-management',
      title: 'Управление разрешениями',
      type: 'item',
      url: '/app/admin/permissions',
      icon: icons.IconShield,
      breadcrumbs: true,
      permission: { resource: 'admin', action: 'view_menu' }
    }
  ]
};

export default admin;
