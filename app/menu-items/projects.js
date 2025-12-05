// assets
import { IconBriefcase, IconTemplate } from '@tabler/icons-react';

// constant
const icons = { IconBriefcase, IconTemplate };

// ==============================|| PROJECTS MENU ITEMS ||============================== //

const projects = {
  id: 'projects',
  title: 'Проекты',
  type: 'group',
  children: [
    {
      id: 'projects-list',
      title: 'Проекты',
      type: 'item',
      url: '/app/projects',
      icon: icons.IconBriefcase,
      breadcrumbs: false,
      permission: { resource: 'projects', action: 'view_menu' }
    },
    {
      id: 'estimate-templates',
      title: 'Шаблоны смет',
      type: 'item',
      url: '/app/estimate-templates',
      icon: icons.IconTemplate,
      breadcrumbs: false,
      permission: { resource: 'estimate_templates', action: 'view_menu' }
    }
  ]
};

export default projects;
