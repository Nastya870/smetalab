// assets
import { IconTool, IconBox, IconUsers } from '@tabler/icons-react';

// constant
const icons = { IconTool, IconBox, IconUsers };

// ==============================|| REFERENCES MENU ITEMS ||============================== //

const references = {
  id: 'references',
  title: 'Справочники',
  type: 'group',
  children: [
    {
      id: 'works-reference',
      title: 'Работы',
      type: 'item',
      url: '/app/references/works',
      icon: icons.IconTool,
      breadcrumbs: false
    },
    {
      id: 'materials-reference',
      title: 'Материалы',
      type: 'item',
      url: '/app/references/materials',
      icon: icons.IconBox,
      breadcrumbs: false
    },
    {
      id: 'counterparties',
      title: 'Контрагенты',
      type: 'item',
      url: '/app/counterparties',
      icon: icons.IconUsers,
      breadcrumbs: false
    }
  ]
};

export default references;
