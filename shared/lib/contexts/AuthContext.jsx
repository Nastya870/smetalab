import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем данные пользователя из localStorage
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedTenant = localStorage.getItem('tenant');
        const token = localStorage.getItem('accessToken');

        console.log('[AuthContext] Loading user from localStorage');
        console.log('[AuthContext] Stored user:', storedUser);
        console.log('[AuthContext] Has token:', !!token);

        if (storedUser && token) {
          const userData = JSON.parse(storedUser);
          const tenantData = storedTenant ? JSON.parse(storedTenant) : null;

          const userWithVerification = {
            ...userData,
            tenant: tenantData,
            emailVerified: userData.emailVerified || false
          };

          console.log('[AuthContext] Setting user:', userWithVerification);
          setUser(userWithVerification);
        }
      } catch (error) {
        console.error('[AuthContext] Ошибка загрузки пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Слушаем события storage для синхронизации между вкладками
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'tenant') {
        loadUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (userData, tenantData, accessToken) => {
    console.log('[AuthContext] Login called with userData:', userData);
    
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenant', JSON.stringify(tenantData));
    localStorage.setItem('accessToken', accessToken);

    setUser({
      ...userData,
      tenant: tenantData,
      emailVerified: userData.emailVerified || false
    });
  };

  const logout = () => {
    console.log('[AuthContext] Logout called');
    
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    const { tenant, ...userWithoutTenant } = updatedUser;
    localStorage.setItem('user', JSON.stringify(userWithoutTenant));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
