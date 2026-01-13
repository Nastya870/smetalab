import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Хэширует пароль
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Проверяет пароль
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Валидация пароля
 * Минимум 8 символов, буквы, цифры, спецсимволы
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Пароль должен содержать минимум 8 символов'
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase) {
    return {
      valid: false,
      message: 'Пароль должен содержать заглавные и строчные буквы'
    };
  }

  if (!hasNumber) {
    return {
      valid: false,
      message: 'Пароль должен содержать хотя бы одну цифру'
    };
  }

  if (!hasSpecialChar) {
    return {
      valid: false,
      message: 'Пароль должен содержать хотя бы один спецсимвол'
    };
  }

  return { valid: true };
};

export default {
  hashPassword,
  comparePassword,
  validatePassword
};
