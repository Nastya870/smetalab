import React from 'react';
import { useNotifications, NOTIFICATION_CATEGORIES } from 'shared/lib/contexts/NotificationsContext';

// material-ui
import {
  Box,
  Button,
  Stack,
  Typography,
  Paper,
  Divider
} from '@mui/material';
import {
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconTrash
} from '@tabler/icons-react';

// ==============================|| NOTIFICATION TEST PAGE ||============================== //

export default function NotificationTestPage() {
  const { success, error, warning, info, notifications, markAllAsRead, clearAll, unreadCount } = useNotifications();

  const testSuccess = () => {
    success('Проект создан', 'Новый проект "ЖК Северный" успешно добавлен в систему', {
      category: NOTIFICATION_CATEGORIES.PROJECT
    });
  };

  const testError = () => {
    error('Ошибка сохранения', 'Не удалось сохранить изменения. Проверьте подключение к интернету', {
      category: NOTIFICATION_CATEGORIES.SYSTEM
    });
  };

  const testWarning = () => {
    warning('Внимание', 'Срок выполнения проекта истекает через 3 дня', {
      category: NOTIFICATION_CATEGORIES.PROJECT
    });
  };

  const testInfo = () => {
    info('Новый материал', 'В каталог добавлено 25 новых материалов', {
      category: NOTIFICATION_CATEGORIES.MATERIAL
    });
  };

  const testMultiple = () => {
    success('Материал создан', 'Цемент М500 добавлен', {
      category: NOTIFICATION_CATEGORIES.MATERIAL
    });
    
    setTimeout(() => {
      info('Смета обновлена', 'Смета №123 пересчитана', {
        category: NOTIFICATION_CATEGORIES.ESTIMATE
      });
    }, 500);

    setTimeout(() => {
      warning('Проверьте данные', 'В смете №456 обнаружены несоответствия', {
        category: NOTIFICATION_CATEGORIES.ESTIMATE
      });
    }, 1000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          🔔 Тестирование системы уведомлений
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Нажимайте кнопки ниже, чтобы протестировать разные типы уведомлений. 
          Уведомления появятся справа вверху (Toast) и в колокольчике в Header.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Статистика */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter' }}>
          <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" color="primary.main">{notifications.length}</Typography>
              <Typography variant="caption">Всего уведомлений</Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="error.main">{unreadCount}</Typography>
              <Typography variant="caption">Непрочитанных</Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                sx={{ mr: 1 }}
              >
                Отметить все
              </Button>
              <Button 
                variant="outlined" 
                color="error" 
                size="small" 
                onClick={clearAll}
                startIcon={<IconTrash size={16} />}
                disabled={notifications.length === 0}
              >
                Очистить
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* Кнопки тестирования */}
        <Typography variant="h5" sx={{ mb: 2 }}>
          Одиночные уведомления
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<IconCheck />}
            onClick={testSuccess}
            sx={{ minWidth: 200 }}
          >
            Success (Успех)
          </Button>

          <Button
            variant="contained"
            color="error"
            startIcon={<IconAlertCircle />}
            onClick={testError}
            sx={{ minWidth: 200 }}
          >
            Error (Ошибка)
          </Button>

          <Button
            variant="contained"
            color="warning"
            startIcon={<IconAlertTriangle />}
            onClick={testWarning}
            sx={{ minWidth: 200 }}
          >
            Warning (Предупреждение)
          </Button>

          <Button
            variant="contained"
            color="info"
            startIcon={<IconInfoCircle />}
            onClick={testInfo}
            sx={{ minWidth: 200 }}
          >
            Info (Информация)
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" sx={{ mb: 2 }}>
          Множественные уведомления
        </Typography>

        <Button
          variant="contained"
          onClick={testMultiple}
          sx={{ minWidth: 200 }}
        >
          Отправить 3 уведомления
        </Button>

        <Divider sx={{ my: 3 }} />

        {/* Инструкции */}
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            📋 Что проверить:
          </Typography>
          <Typography component="div" variant="body2" sx={{ pl: 2 }}>
            <ol>
              <li><strong>Toast уведомления</strong> - появляются справа вверху с градиентами</li>
              <li><strong>Колокольчик в Header</strong> - показывает badge с количеством непрочитанных</li>
              <li><strong>Список уведомлений</strong> - клик на колокольчик открывает dropdown</li>
              <li><strong>Прочитанные/непрочитанные</strong> - клик по уведомлению помечает прочитанным</li>
              <li><strong>Удаление</strong> - кнопка X удаляет конкретное уведомление</li>
              <li><strong>Время</strong> - показывается относительное время ("только что", "5 минут назад")</li>
              <li><strong>localStorage</strong> - перезагрузите страницу - уведомления сохранятся</li>
              <li><strong>Категории</strong> - иконки категорий отображаются слева от заголовка</li>
            </ol>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
