/**
 * Глобальная настройка для Vitest тестов
 * Подключается через vitest.config.mjs: setupFiles: ['./tests/setup.js']
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ============================================
// Mock window.matchMedia (только для jsdom)
// ============================================
// MUI и другие библиотеки используют window.matchMedia для responsive логики
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // ============================================
  // Mock localStorage
  // ============================================
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };

  global.localStorage = localStorageMock;

  // ============================================
  // Mock sessionStorage
  // ============================================
  global.sessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };

  // ============================================
  // Mock window.scrollTo
  // ============================================
  global.scrollTo = vi.fn();
}

// ============================================
// Подавление ненужных warning в консоли
// ============================================
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Подавляем React warnings о ReactDOM.render (React 18+)
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// ============================================
// Очистка моков после каждого теста
// ============================================
afterEach(() => {
  vi.clearAllMocks();
  // localStorage моки существуют только в jsdom
  if (typeof window !== 'undefined' && global.localStorage && global.localStorage.getItem) {
    global.localStorage.getItem.mockClear?.();
    global.localStorage.setItem.mockClear?.();
    global.localStorage.removeItem.mockClear?.();
    global.localStorage.clear.mockClear?.();
  }
});

// ============================================
// Global test utilities
// ============================================
global.testUtils = {
  // Задержка для асинхронных операций
  wait: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Мокирование environment variables
  mockEnv: (vars) => {
    Object.keys(vars).forEach(key => {
      process.env[key] = vars[key];
    });
  },

  // Восстановление environment variables
  restoreEnv: (vars) => {
    Object.keys(vars).forEach(key => {
      delete process.env[key];
    });
  },
};

console.log('✅ Vitest setup completed');
