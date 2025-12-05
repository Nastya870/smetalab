import { RouterProvider } from 'react-router-dom';

// routing
import router from 'routes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';

import ThemeCustomization from 'themes';

// auth provider
import { AuthProvider } from 'contexts/AuthContext';
import { PermissionsProvider } from 'shared/lib/contexts/PermissionsContext';

// ==============================|| APP ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      <NavigationScroll>
        <AuthProvider>
          <PermissionsProvider>
            <RouterProvider router={router} />
          </PermissionsProvider>
        </AuthProvider>
      </NavigationScroll>
    </ThemeCustomization>
  );
}
