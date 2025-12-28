import { RouterProvider } from 'react-router-dom';

// MUI Date Pickers
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ru';

// Notistack для уведомлений
import { SnackbarProvider } from 'notistack';

// routing
import router from 'routes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';
import CustomToast from 'shared/ui/components/CustomToast';

import ThemeCustomization from 'themes';

// auth provider
import { AuthProvider } from 'contexts/AuthContext';
import { PermissionsProvider } from 'shared/lib/contexts/PermissionsContext';
import { NotificationsProvider } from 'shared/lib/contexts/NotificationsContext';

// ==============================|| APP ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        autoHideDuration={2000}
        Components={{
          success: CustomToast,
          error: CustomToast,
          warning: CustomToast,
          info: CustomToast
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
          <NavigationScroll>
            <AuthProvider>
              <PermissionsProvider>
                <NotificationsProvider>
                  <RouterProvider router={router} />
                </NotificationsProvider>
              </PermissionsProvider>
            </AuthProvider>
          </NavigationScroll>
        </LocalizationProvider>
      </SnackbarProvider>
    </ThemeCustomization>
  );
}
