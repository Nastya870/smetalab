// assets
import { IconDashboard } from '@tabler/icons-react';

// constant
const icons = { IconDashboard };

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
  id: 'dashboard',
  title: 'Главная',
  type: 'group',
  children: [
    {
      id: 'default',
      title: 'Главная панель',
      type: 'item',
      url: '/app/dashboard/default',
      icon: icons.IconDashboard,
      breadcrumbs: false,
      permission: { resource: 'dashboard', action: 'view_menu' }
    }
  ]
};

export default dashboard;
