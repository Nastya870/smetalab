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
        setNotifications(parsed);
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

      const notification = {
        id: Date.now() + Math.random(),
        title,
        message,
        type,
        category,
        action,
        link,
        read: false,
        createdAt: new Date().toISOString()
      };

      // Добавляем в список уведомлений
      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Храним максимум 50

      // Показываем toast если нужно
      if (showToast) {
        enqueueSnackbar(title || message, {
          variant: type,
          autoHideDuration: 4000
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
   * Получить количество непрочитанных
   */
  const unreadCount = notifications.filter((n) => !n.read).length;

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
