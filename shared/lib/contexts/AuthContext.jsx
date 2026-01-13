import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import storageService from '../services/storageService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем данные пользователя из localStorage
    const loadUser = () => {
      try {
        const storedUser = storageService.get('user');
        const storedTenant = storageService.get('tenant');
        const token = storageService.get('accessToken');
if (storedUser && token) {
          const userWithVerification = {
            ...storedUser,
            tenant: storedTenant,
            emailVerified: storedUser.emailVerified || false
          };
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
storageService.set('user', userData);
    storageService.set('tenant', tenantData);
    storageService.set('accessToken', accessToken);

    setUser({
      ...userData,
      tenant: tenantData,
      emailVerified: userData.emailVerified || false
    });
  };

  const logout = () => {
storageService.remove('user');
    storageService.remove('tenant');
    storageService.remove('accessToken');
    storageService.remove('refreshToken');
    setUser(null);
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    const { tenant, ...userWithoutTenant } = updatedUser;
    storageService.set('user', userWithoutTenant);
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
