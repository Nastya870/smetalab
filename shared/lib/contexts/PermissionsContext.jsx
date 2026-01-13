import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';
import axiosInstance from '../axiosInstance';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка разрешений при изменении пользователя
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.id) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Используем endpoint getUserPermissions
        const response = await axiosInstance.get(`/permissions/users/${user.id}`);
        
        if (response.data.success) {
          // Сохраняем плоский список разрешений для быстрого поиска
          // Нам нужны и visible и hidden, но с флагом isHidden
          const allPerms = [
            ...(response.data.data.visible || []),
            ...(response.data.data.hidden || [])
          ];
          setPermissions(allPerms);
          setError(null);
        }
      } catch (err) {
        console.warn('Permissions not loaded, using default access:', err.message);
        // Не блокируем UI при ошибке загрузки разрешений
        // Оставляем permissions пустым массивом - это даст доступ ко всему
        setPermissions([]);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.id]);

  // Проверка наличия разрешения на действие
  const checkPermission = useCallback((resource, action) => {
    // Если пользователь не авторизован - нет доступа
    if (!user) return false;
    
    // Если разрешения еще загружаются - разрешаем доступ по умолчанию
    if (loading) return true;
    
    // Если разрешений нет (пустой массив) - разрешаем все (для обратной совместимости)
    if (permissions.length === 0) return true;
    
    // Проверяем наличие роли super_admin в разрешениях
    const isSuperAdmin = permissions.some(p => p.fromRole?.key === 'super_admin');
    if (isSuperAdmin) return true; // super_admin может всё

    return permissions.some(p => 
      p.resource === resource && 
      p.action === action
    );
  }, [permissions, user, loading]);

  // Проверка видимости элемента UI (учитывает isHidden)
  const checkVisibility = useCallback((resource, action = 'view') => {
    // Если пользователь не авторизован - не показываем
    if (!user) return false;
    
    // Если разрешения еще загружаются - показываем все по умолчанию
    if (loading) return true;
    
    // Если разрешений нет (пустой массив) - показываем все (для обратной совместимости)
    if (permissions.length === 0) return true;
    
    // Проверяем наличие роли super_admin в разрешениях
    const isSuperAdmin = permissions.some(p => p.fromRole?.key === 'super_admin');
    if (isSuperAdmin) return true; // super_admin видит всё

    const permission = permissions.find(p => 
      p.resource === resource && 
      p.action === action
    );

    // Если разрешения нет вообще - не видим
    if (!permission) return false;

    // Если разрешение есть, проверяем флаг isHidden
    // isHidden = true значит элемент скрыт в UI, но действие может быть разрешено API
    return !permission.isHidden;
  }, [permissions, user, loading]);

  const value = {
    permissions,
    loading,
    error,
    checkPermission,
    checkVisibility
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

PermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

export default PermissionsContext;
