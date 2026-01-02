import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import RequireEmailVerification from 'components/RequireEmailVerification';
import storageService from '@/shared/lib/services/storageService';

/**
 * Protected Route Component
 * Проверяет авторизацию пользователя перед доступом к защищенным маршрутам
 * Также требует подтверждения email
 */
export default function ProtectedRoute({ children }) {
  // Проверяем наличие access token и пользователя в localStorage
  const accessToken = storageService.get('accessToken');
  const userStr = storageService.get('user');
  
  // Если токен или пользователь отсутствуют, перенаправляем на страницу входа
  if (!accessToken || !userStr) {
    // Сохраняем текущий путь для возврата после входа
    const currentPath = window.location.pathname + window.location.search;
    storageService.set('redirectAfterLogin', currentPath);
    
    return <Navigate to="/pages/login" replace />;
  }

  // Базовая проверка токена - он должен иметь правильный формат JWT
  const tokenParts = accessToken.split('.');
  if (tokenParts.length !== 3) {
    storageService.clear(); // Очищаем некорректные данные
    return <Navigate to="/pages/login" replace />;
  }

  // Если токен есть, проверяем подтверждение email
  // RequireEmailVerification сам решит показать блокирующую страницу или пропустить дальше
  return (
    <RequireEmailVerification>
      {children}
    </RequireEmailVerification>
  );
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};
