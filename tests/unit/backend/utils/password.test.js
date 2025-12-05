/**
 * Unit тесты для server/utils/password.js
 * Тестирует валидацию и хэширование паролей
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validatePassword, hashPassword, comparePassword } from '../../../../server/utils/password.js';

describe('validatePassword', () => {
  // ============================================
  // Тест 1: Валидные пароли
  // ============================================
  it('должен принять валидный пароль с заглавными, строчными, цифрами и спецсимволами', () => {
    const result = validatePassword('Test123!@#');
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('должен принять пароль с минимум 8 символов', () => {
    const result = validatePassword('Aa1!Aa1!'); // ровно 8
    expect(result.valid).toBe(true);
  });

  it('должен принять длинный сложный пароль', () => {
    const result = validatePassword('MyV3ry$ecureP@ssw0rd2025');
    expect(result.valid).toBe(true);
  });

  it('должен принять пароль с различными спецсимволами', () => {
    const passwords = [
      'Test123!',
      'Test123@',
      'Test123#',
      'Test123$',
      'Test123%',
      'Test123^',
      'Test123&',
      'Test123*',
      'Test123(',
      'Test123)',
      'Test123.',
      'Test123,',
      'Test123?',
      'Test123:',
      'Test123"',
      'Test123{',
      'Test123|',
      'Test123<',
      'Test123>',
    ];

    passwords.forEach(pwd => {
      const result = validatePassword(pwd);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Тест 2: Слишком короткие пароли
  // ============================================
  it('должен отклонить пароль короче 8 символов', () => {
    const result = validatePassword('Test1!');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать минимум 8 символов');
  });

  it('должен отклонить пустой пароль', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать минимум 8 символов');
  });

  it('должен отклонить null пароль', () => {
    const result = validatePassword(null);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать минимум 8 символов');
  });

  it('должен отклонить undefined пароль', () => {
    const result = validatePassword(undefined);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать минимум 8 символов');
  });

  // ============================================
  // Тест 3: Без заглавных/строчных букв
  // ============================================
  it('должен отклонить пароль без заглавных букв', () => {
    const result = validatePassword('test123!@#');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать заглавные и строчные буквы');
  });

  it('должен отклонить пароль без строчных букв', () => {
    const result = validatePassword('TEST123!@#');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать заглавные и строчные буквы');
  });

  it('должен отклонить пароль только из заглавных букв и цифр', () => {
    const result = validatePassword('TESTTEST123!');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать заглавные и строчные буквы');
  });

  // ============================================
  // Тест 4: Без цифр
  // ============================================
  it('должен отклонить пароль без цифр', () => {
    const result = validatePassword('TestTest!@#');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать хотя бы одну цифру');
  });

  it('должен отклонить пароль только из букв и спецсимволов', () => {
    const result = validatePassword('AbcDefGh!@#');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать хотя бы одну цифру');
  });

  // ============================================
  // Тест 5: Без спецсимволов
  // ============================================
  it('должен отклонить пароль без спецсимволов', () => {
    const result = validatePassword('Test12345');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать хотя бы один спецсимвол');
  });

  it('должен отклонить пароль только из букв и цифр', () => {
    const result = validatePassword('TestTest123');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Пароль должен содержать хотя бы один спецсимвол');
  });

  // ============================================
  // Тест 6: Граничные случаи
  // ============================================
  it('должен отклонить пароль из 7 символов (граница)', () => {
    const result = validatePassword('Aa1!Aa1');
    expect(result.valid).toBe(false);
  });

  it('должен принять пароль из 8 символов (граница)', () => {
    const result = validatePassword('Aa1!Aa1!');
    expect(result.valid).toBe(true);
  });

  // ============================================
  // Тест 7: Реальные пароли пользователей
  // ============================================
  it('должен принять пароль из production: !!!Apsni09332', () => {
    const result = validatePassword('!!!Apsni09332');
    expect(result.valid).toBe(true);
  });

  it('должен отклонить слабый пароль: password', () => {
    const result = validatePassword('password');
    expect(result.valid).toBe(false);
  });

  it('должен отклонить слабый пароль: 12345678', () => {
    const result = validatePassword('12345678');
    expect(result.valid).toBe(false);
  });

  it('должен отклонить слабый пароль: qwerty123', () => {
    const result = validatePassword('qwerty123');
    expect(result.valid).toBe(false);
  });
});

// ============================================
// Тесты для hashPassword и comparePassword
// ============================================
describe('hashPassword and comparePassword', () => {
  it('должен хэшировать пароль', async () => {
    const password = 'Test123!@#';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20); // bcrypt хэш длинный
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt формат
  });

  it('должен создавать разные хэши для одного пароля (salt)', async () => {
    const password = 'Test123!@#';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // Разные соли
  });

  it('должен верифицировать правильный пароль', async () => {
    const password = 'Test123!@#';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);

    expect(isMatch).toBe(true);
  });

  it('должен отклонить неправильный пароль', async () => {
    const password = 'Test123!@#';
    const wrongPassword = 'Wrong123!@#';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(wrongPassword, hash);

    expect(isMatch).toBe(false);
  });

  it('должен работать с длинными паролями', async () => {
    const password = 'ThisIsAVeryLongPasswordWith123!@#$%^&*()Numbers';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);

    expect(isMatch).toBe(true);
  });

  it('должен работать с паролями со спецсимволами', async () => {
    const password = '!!!Apsni09332'; // Реальный пароль из production
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);

    expect(isMatch).toBe(true);
  });

  it('должен отклонить пароль с одним неверным символом', async () => {
    const password = 'Test123!@#';
    const almostCorrect = 'Test123!@$'; // $ вместо #
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(almostCorrect, hash);

    expect(isMatch).toBe(false);
  });

  it('должен отклонить пустой пароль при сравнении', async () => {
    const password = 'Test123!@#';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword('', hash);

    expect(isMatch).toBe(false);
  });

  it('должен работать быстро (performance test)', async () => {
    const password = 'Test123!@#';
    
    const start = Date.now();
    const hash = await hashPassword(password);
    const hashTime = Date.now() - start;

    const start2 = Date.now();
    await comparePassword(password, hash);
    const compareTime = Date.now() - start2;

    // Хэширование должно быть < 500ms
    expect(hashTime).toBeLessThan(500);
    // Сравнение должно быть < 500ms
    expect(compareTime).toBeLessThan(500);
  });
});
