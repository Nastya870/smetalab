// assets
import { IconShoppingCart } from '@tabler/icons-react';

// constant
const icons = { IconShoppingCart };

// ==============================|| PURCHASES MENU ITEMS ||============================== //

const purchases = {
  id: 'purchases',
  title: 'Закупки',
  type: 'group',
  children: [
    {
      id: 'global-purchases',
      title: 'Общие закупки',
      type: 'item',
      url: '/app/purchases/global',
      icon: icons.IconShoppingCart,
      breadcrumbs: false,
      permission: { resource: 'purchases', action: 'view_menu' }
    }
  ]
};

export default purchases;
