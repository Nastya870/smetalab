import { createBrowserRouter } from 'react-router-dom';

// routes
import LandingRoutes from './LandingRoutes';
import AuthenticationRoutes from './AuthenticationRoutes';
import MainRoutes from './MainRoutes';

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter([MainRoutes, AuthenticationRoutes, LandingRoutes], {
  basename: import.meta.env.VITE_APP_BASE_NAME
});

export default router;
