import { useState, useEffect } from 'react';
import { getCurrentUser, getCurrentTenant, getUserRoles, isAuthenticated, getMe } from 'services/authService';

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
    const loadAuthData = async () => {
      try {
        if (isAuthenticated()) {
          let userData = getCurrentUser();
          const tenantData = getCurrentTenant();
          const userRoles = getUserRoles();

          setUser(userData);
          setTenant(tenantData);
          setRoles(userRoles);

          // ✨ Если в данных пользователя нет флага isSuperAdmin, пробуем обновить профиль
          if (userData && userData.isSuperAdmin === undefined) {
            try {
              const freshData = await getMe();
              if (freshData && freshData.user) {
                setUser(freshData.user);
              }
            } catch (e) {
              console.error('Failed to auto-refresh user data:', e);
            }
          }
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
   * Проверить наличие роли по ключу или имени
   * @param {string} roleKeyOrName 
   * @returns {boolean}
   */
  const hasRole = (roleKeyOrName) => {
    if (!roles || !Array.isArray(roles)) return false;
    return roles.some(r => {
      if (typeof r === 'string') return r === roleKeyOrName;
      return r.key === roleKeyOrName || r.name === roleKeyOrName;
    });
  };

  /**
   * Получить основную роль пользователя
   * @returns {string|null}
   */
  const getPrimaryRole = () => {
    if (!roles || !Array.isArray(roles) || roles.length === 0) return null;

    // Приоритет ролей
    const rolePriority = ['super_admin', 'admin', 'manager', 'estimator', 'supplier'];

    for (const roleKey of rolePriority) {
      const found = roles.find((r) => {
        if (typeof r === 'string') return r === roleKey;
        return r.key === roleKey;
      });
      if (found) return typeof found === 'string' ? found : found.key;
    }

    const firstRole = roles[0];
    return typeof firstRole === 'string' ? firstRole : firstRole?.key || null;
  };

  /**
   * Вычисляемые флаги ролей
   */
  const isSuperAdmin = user?.isSuperAdmin || roles.some(r => (typeof r === 'string' ? r === 'super_admin' : r.key === 'super_admin'));
  const isAdmin = isSuperAdmin || roles.some(r => (typeof r === 'string' ? r === 'admin' : r.key === 'admin'));

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
   * Проверить, имеет ли пользователь определенное разрешение
   * @param {string} permissionName - Название разрешения
   * @returns {boolean}
   */
  const hasPermission = (permissionName) => {
    if (!roles || !Array.isArray(roles)) return false;
    return roles.some((role) => {
      if (typeof role === 'string') return false; // Строковые роли не содержат разрешений
      return role.permissions?.some((p) => p.key === permissionName || p.name === permissionName);
    });
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
    isSuperAdmin,
    isAdmin,
    getPrimaryRole,
    getRoleDisplayName,
    hasRole,
    hasPermission,
    getGreeting
  };
};

export default useAuth;
