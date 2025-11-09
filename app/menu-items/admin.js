// assets
import { IconUsers, IconUserPlus, IconShield } from '@tabler/icons-react';

// constant
const icons = {
  IconUsers,
  IconUserPlus,
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
      breadcrumbs: true
    }
  ]
};

export default admin;
