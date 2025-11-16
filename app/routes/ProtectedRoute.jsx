import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import RequireEmailVerification from 'components/RequireEmailVerification';

/**
 * Protected Route Component
 * Проверяет авторизацию пользователя перед доступом к защищенным маршрутам
 * Также требует подтверждения email
 */
export default function ProtectedRoute({ children }) {
  // Проверяем наличие access token и пользователя в localStorage
  const accessToken = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  
  // Если токен или пользователь отсутствуют, перенаправляем на страницу входа
  if (!accessToken || !userStr) {// Сохраняем текущий путь для возврата после входа
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('redirectAfterLogin', currentPath);
    
    return <Navigate to="/pages/login" replace />;
  }

  // Базовая проверка токена - он должен иметь правильный формат JWT
  const tokenParts = accessToken.split('.');
  if (tokenParts.length !== 3) {localStorage.clear(); // Очищаем некорректные данные
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
