import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Box, Typography, Button, Stack, Alert, AlertTitle } from '@mui/material';
import { IconRefresh, IconAlertTriangle } from '@tabler/icons-react';

// ==============================|| ELEMENT ERROR - COMMON ||============================== //

export default function ErrorBoundary() {
  const error = useRouteError();
  console.error('❌ [RouteError]:', error);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isRouteErrorResponse(error)) {
    let message = 'Произошла ошибка при загрузке страницы';
    let title = `Ошибка ${error.status}`;

    if (error.status === 404) {
      title = 'Страница не найдена';
      message = 'Запрошенная страница не существует или была перемещена.';
    } else if (error.status === 401) {
      title = 'Доступ запрещен';
      message = 'У вас недостаточно прав для просмотра этого раздела.';
    } else if (error.status === 503) {
      title = 'Сервис недоступен';
      message = 'Похоже, наш API временно не отвечает. Попробуйте позже.';
    }

    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Alert
          severity="error"
          variant="outlined"
          sx={{ maxWidth: 600, width: '100%', bgcolor: '#FFF5F5' }}
          action={
            <Button color="error" size="small" startIcon={<IconRefresh size={16} />} onClick={handleRefresh}>
              Обновить
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 700 }}>{title}</AlertTitle>
          <Typography variant="body2">{message}</Typography>
        </Alert>
      </Box>
    );
  }

  // Handle generic errors (like "Failed to fetch module")
  const errorMessage = error?.message || 'Неизвестная ошибка';
  const isModuleError = errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('module');

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Alert
        severity="error"
        icon={<IconAlertTriangle size={24} />}
        sx={{ maxWidth: 600, width: '100%', borderRadius: 2 }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>Критическая ошибка приложения</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {isModuleError
            ? 'Не удалось загрузить модуль приложения. Это может произойти после обновления сервера.'
            : 'Произошла непредвиденная ошибка в работе компонента.'}
        </Typography>

        <Box sx={{
          p: 1.5,
          bgcolor: 'rgba(0,0,0,0.05)',
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          mb: 2,
          wordBreak: 'break-all'
        }}>
          {errorMessage}
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<IconRefresh size={18} />}
            onClick={handleRefresh}
          >
            Перезагрузить страницу
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.location.href = '/'}
          >
            На главную
          </Button>
        </Stack>
      </Alert>
    </Box>
  );
}
