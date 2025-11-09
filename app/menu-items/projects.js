// assets
import { IconBriefcase } from '@tabler/icons-react';

// constant
const icons = { IconBriefcase };

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
      breadcrumbs: false
    }
  ]
};

export default projects;
