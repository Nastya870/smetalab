import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';

const NotificationsContext = createContext(null);

/**
 * Типы уведомлений
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Категории уведомлений
 */
export const NOTIFICATION_CATEGORIES = {
  PROJECT: 'project',
  ESTIMATE: 'estimate',
  MATERIAL: 'material',
  WORK: 'work',
  PURCHASE: 'purchase',
  USER: 'user',
  SYSTEM: 'system'
};

/**
 * Фильтр технических сообщений, которые НЕ нужно показывать пользователю
 */
const IGNORED_PATTERNS = [
  /загружено из БД/i,
  /создано/i,
  /обновлено/i,
  /статус изменён/i,
  /request failed/i,
  /status code \d+/i,
  /network error/i,
  /axios/i
];

/**
 * Проверяет, является ли сообщение техническим (не для пользователя)
 */
const isTechnicalMessage = (title, message) => {
  const text = `${title || ''} ${message || ''}`.toLowerCase();
  return IGNORED_PATTERNS.some(pattern => pattern.test(text));
};

/**
 * Группирует одинаковые уведомления
 */
const groupNotifications = (notifications) => {
  const groups = new Map();

  notifications.forEach(notification => {
    const key = `${notification.type}-${notification.title}-${notification.message}`;

    if (groups.has(key)) {
      const existing = groups.get(key);
      existing.count = (existing.count || 1) + 1;
      existing.createdAt = notification.createdAt; // Обновляем время последнего
    } else {
      groups.set(key, { ...notification, count: 1 });
    }
  });

  return Array.from(groups.values());
};

/**
 * Provider для системы уведомлений
 */
export function NotificationsProvider({ children }) {
  const { enqueueSnackbar } = useSnackbar();
  const [notifications, setNotifications] = useState([]);

  // Загрузка уведомлений из localStorage при монтировании
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smeta_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Фильтруем технические сообщения при загрузке
        const filtered = parsed.filter(n => !isTechnicalMessage(n.title, n.message));
        setNotifications(filtered);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  }, []);

  // Сохранение в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem('smeta_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Ошибка сохранения уведомлений:', error);
    }
  }, [notifications]);

  /**
   * Добавить новое уведомление
   */
  const addNotification = useCallback(
    (config) => {
      const {
        title,
        message,
        type = NOTIFICATION_TYPES.INFO,
        category = NOTIFICATION_CATEGORIES.SYSTEM,
        action = null,
        link = null,
        showToast = true
      } = config;

      // ❌ Игнорируем технические сообщения
      if (isTechnicalMessage(title, message)) {
        console.log('🚫 Техническое уведомление отфильтровано:', { title, message });
        return null;
      }

      // ❌ Не показываем info уведомления вообще (по требованию)
      if (type === NOTIFICATION_TYPES.INFO) {
        console.log('🚫 Info уведомление пропущено:', { title, message });
        return null;
      }

      const notification = {
        id: Date.now() + Math.random(),
        title,
        message,
        type,
        category,
        action,
        link,
        read: false,
        createdAt: new Date().toISOString(),
        count: 1 // Для группировки
      };

      // Добавляем в список уведомлений
      setNotifications((prev) => {
        const updated = [notification, ...prev];
        // Группируем одинаковые
        const grouped = groupNotifications(updated);
        // Храним максимум 50
        return grouped.slice(0, 50);
      });

      // Показываем toast если нужно
      if (showToast) {
        const displayText = (title && message) ? `${title}: ${message}` : (title || message);
        enqueueSnackbar(displayText, {
          variant: type,
          autoHideDuration: type === NOTIFICATION_TYPES.ERROR ? 6000 : 4000
        });
      }

      return notification;
    },
    [enqueueSnackbar]
  );

  /**
   * Удобные методы для разных типов уведомлений
   */
  const success = useCallback(
    (title, message, options = {}) => {
      return addNotification({
        title,
        message,
        type: NOTIFICATION_TYPES.SUCCESS,
        ...options
      });
    },
    [addNotification]
  );

  const error = useCallback(
    (title, message, options = {}) => {
      return addNotification({
        title,
        message,
        type: NOTIFICATION_TYPES.ERROR,
        ...options
      });
    },
    [addNotification]
  );

  const warning = useCallback(
    (title, message, options = {}) => {
      return addNotification({
        title,
        message,
        type: NOTIFICATION_TYPES.WARNING,
        ...options
      });
    },
    [addNotification]
  );

  const info = useCallback(
    (title, message, options = {}) => {
      return addNotification({
        title,
        message,
        type: NOTIFICATION_TYPES.INFO,
        ...options
      });
    },
    [addNotification]
  );

  /**
   * Пометить уведомление как прочитанное
   */
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  /**
   * Пометить все как прочитанные
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  /**
   * Удалить уведомление
   */
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  /**
   * Очистить все уведомления
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Получить количество непрочитанных (только error + warning)
   */
  const unreadCount = notifications.filter(
    (n) => !n.read && (n.type === NOTIFICATION_TYPES.ERROR || n.type === NOTIFICATION_TYPES.WARNING)
  ).reduce((sum, n) => sum + (n.count || 1), 0); // Учитываем count для сгруппированных

  const value = {
    notifications,
    unreadCount,
    addNotification,
    success,
    error,
    warning,
    info,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

NotificationsProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Hook для использования уведомлений
 */
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

export default NotificationsContext;
