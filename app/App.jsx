import { RouterProvider } from 'react-router-dom';

// MUI Date Pickers
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ru';

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
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
        <NavigationScroll>
          <AuthProvider>
            <PermissionsProvider>
              <RouterProvider router={router} />
            </PermissionsProvider>
          </AuthProvider>
        </NavigationScroll>
      </LocalizationProvider>
    </ThemeCustomization>
  );
}
