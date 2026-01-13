import { useState, useEffect } from 'react';
import { getCurrentUser, getCurrentTenant, getUserRoles, isAuthenticated } from 'services/authService';

/**
 * Custom hook для доступа к данным аутентификации
 * @returns {Object} - Данные пользователя и методы аутентификации
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = () => {
      try {
        if (isAuthenticated()) {
          const userData = getCurrentUser();
          const tenantData = getCurrentTenant();
          const userRoles = getUserRoles();

          setUser(userData);
          setTenant(tenantData);
          setRoles(userRoles);
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();

    // Слушаем изменения в localStorage (например, при логине/логауте в другой вкладке)
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'tenant' || e.key === 'roles') {
        loadAuthData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Получить основную роль пользователя
   * @returns {string|null}
   */
  const getPrimaryRole = () => {
    if (!roles || roles.length === 0) return null;
    
    // Приоритет ролей
    const rolePriority = ['super_admin', 'admin', 'manager', 'estimator', 'supplier'];
    
    for (const role of rolePriority) {
      const found = roles.find((r) => r.key === role);
      if (found) return found.key;
    }
    
    return roles[0]?.key || null;
  };

  /**
   * Получить отображаемое имя роли
   * @returns {string}
   */
  const getRoleDisplayName = () => {
    const role = getPrimaryRole();
    
    const roleNames = {
      super_admin: 'Системный администратор',
      admin: 'Администратор',
      manager: 'Менеджер',
      estimator: 'Сметчик',
      supplier: 'Снабженец'
    };
    
    return roleNames[role] || 'Пользователь';
  };

  /**
   * Проверить, имеет ли пользователь определенную роль
   * @param {string} roleName - Название роли
   * @returns {boolean}
   */
  const hasRole = (roleName) => {
    return roles.some((r) => r.name === roleName);
  };

  /**
   * Проверить, имеет ли пользователь определенное разрешение
   * @param {string} permissionName - Название разрешения
   * @returns {boolean}
   */
  const hasPermission = (permissionName) => {
    return roles.some((role) => role.permissions?.some((p) => p.name === permissionName));
  };

  /**
   * Получить приветствие в зависимости от времени суток
   * @returns {string}
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'Доброе утро';
    if (hour >= 12 && hour < 18) return 'Добрый день';
    if (hour >= 18 && hour < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  };

  return {
    user,
    tenant,
    roles,
    loading,
    isAuthenticated: isAuthenticated(),
    getPrimaryRole,
    getRoleDisplayName,
    hasRole,
    hasPermission,
    getGreeting
  };
};

export default useAuth;
