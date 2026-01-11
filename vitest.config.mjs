import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    // globalSetup убран - миграции НЕ нужны для unit тестов
    // Для integration тестов миграции запускаются вручную или через отдельный конфиг
    // Запускаем integration тесты последовательно
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    hookTimeout: 30000,
    testTimeout: 30000,
    include: [
      'tests/unit/**/*.test.{js,jsx}',
      'tests/integration/**/*.test.{js,jsx}',
      'tests/security/**/*.test.{js,jsx}',
      'tests/production/**/*.test.{js,jsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['app/**/*.{js,jsx}', 'shared/**/*.{js,jsx}', 'server/**/*.{js,jsx}'],
      exclude: [
        'app/index.jsx',
        'app/config.js',
        '**/*.config.js',
        '**/mockData.js'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  },
  resolve: {
    alias: {
      app: path.resolve(__dirname, './app'),
      shared: path.resolve(__dirname, './shared')
    }
  }
});
