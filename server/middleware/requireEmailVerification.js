/**
 * Middleware для проверки подтверждения email
 * Блокирует доступ к защищенным роутам для пользователей с неподтвержденным email
 */

export const requireEmailVerification = (req, res, next) => {
  try {
    const { userId } = req.user; // Из JWT токена (auth middleware)
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Необходима авторизация'
      });
    }

    // Проверяем статус email_verified из токена или делаем запрос к БД
    // Если есть в токене - используем его
    if (req.user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Требуется подтверждение email',
        requiresEmailVerification: true,
        email: req.user.email
      });
    }

    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки email'
    });
  }
};

export default requireEmailVerification;
