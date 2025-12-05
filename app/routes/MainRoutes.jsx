import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import ProtectedRoute from './ProtectedRoute';

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('views/dashboard/Default')));

// projects routing
const ProjectsPage = Loadable(lazy(() => import('views/projects')));
const ProjectDashboard = Loadable(lazy(() => import('views/projects/ProjectDashboard')));

// estimates routing
const EstimateView = Loadable(lazy(() => import('views/estimates/EstimateView')));

// references routing
const WorksReferencePage = Loadable(lazy(() => import('views/references/works')));
const MaterialsReferencePage = Loadable(lazy(() => import('views/references/materials')));

// estimate templates routing
const EstimateTemplatesPage = Loadable(lazy(() => import('views/estimate-templates')));

// counterparties routing
const CounterpartiesPage = Loadable(lazy(() => import('views/counterparties/Counterparties')));

// purchases routing
const GlobalPurchases = Loadable(lazy(() => import('views/purchases/GlobalPurchases')));

// account routing
const AccountSettings = Loadable(lazy(() => import('views/pages/account/AccountSettings')));
const SocialProfile = Loadable(lazy(() => import('views/pages/account/SocialProfile')));

// admin routing
const UsersManagement = Loadable(lazy(() => import('views/admin/users')));
const PermissionsManagement = Loadable(lazy(() => import('views/admin/permissions')));

// utilities routing
const UtilsTypography = Loadable(lazy(() => import('views/utilities/Typography')));
const UtilsColor = Loadable(lazy(() => import('views/utilities/Color')));
const UtilsShadow = Loadable(lazy(() => import('views/utilities/Shadow')));

// sample page routing
const SamplePage = Loadable(lazy(() => import('views/sample-page')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/app',
  element: (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  ),
  children: [
    {
      path: '/app',
      element: <DashboardDefault />
    },
    {
      path: '/app/dashboard',
      children: [
        {
          path: 'default',
          element: <DashboardDefault />
        }
      ]
    },
    {
      path: '/app/projects',
      element: <ProjectsPage />
    },
    {
      path: '/app/projects/:id',
      element: <ProjectDashboard />
    },
    {
      path: '/app/projects/:projectId/estimates/:estimateId',
      element: <EstimateView />
    },
    {
      path: '/app/references/works',
      element: <WorksReferencePage />
    },
    {
      path: '/app/references/materials',
      element: <MaterialsReferencePage />
    },
    {
      path: '/app/estimate-templates',
      element: <EstimateTemplatesPage />
    },
    {
      path: '/app/counterparties',
      element: <CounterpartiesPage />
    },
    {
      path: '/app/purchases/global',
      element: <GlobalPurchases />
    },
    {
      path: '/app/account/settings',
      element: <AccountSettings />
    },
    {
      path: '/app/account/profile',
      element: <SocialProfile />
    },
    {
      path: '/app/admin/users',
      element: <UsersManagement />
    },
    {
      path: '/app/admin/permissions',
      element: <PermissionsManagement />
    },
    {
      path: '/app/typography',
      element: <UtilsTypography />
    },
    {
      path: '/app/color',
      element: <UtilsColor />
    },
    {
      path: '/app/shadow',
      element: <UtilsShadow />
    },
    {
      path: '/app/sample-page',
      element: <SamplePage />
    }
  ]
};

export default MainRoutes;
