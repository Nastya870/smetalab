import { lazy } from 'react';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';

// landing page
const LandingPage = Loadable(lazy(() => import('pages/Landing')));

// ==============================|| LANDING ROUTING ||============================== //

const LandingRoutes = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    {
      path: '/',
      element: <LandingPage />,
      index: true
    }
  ]
};

export default LandingRoutes;
