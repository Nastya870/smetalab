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
      '@': path.resolve(__dirname, './'),
      'app': path.resolve(__dirname, './app'),
      'shared': path.resolve(__dirname, './shared'),
      'routes': path.resolve(__dirname, './app/routes'),
      'layout': path.resolve(__dirname, './app/layout'),
      'themes': path.resolve(__dirname, './shared/ui/themes'),
      'config': path.resolve(__dirname, './app/config.js'),
      'hooks': path.resolve(__dirname, './shared/lib/hooks'),
      'contexts': path.resolve(__dirname, './shared/lib/contexts'),
      'assets': path.resolve(__dirname, './shared/assets'),
      'serviceWorker': path.resolve(__dirname, './shared/lib/serviceWorker.jsx'),
      'reportWebVitals': path.resolve(__dirname, './shared/lib/reportWebVitals.js'),
      'views': path.resolve(__dirname, './app'),
      'ui-component': path.resolve(__dirname, './shared/ui/components'),
      'components': path.resolve(__dirname, './shared/ui/components'),
      'api': path.resolve(__dirname, './shared/lib/api'),
      'store': path.resolve(__dirname, './shared/lib/store'),
      'services': path.resolve(__dirname, './shared/lib/services'),
      'menu-items': path.resolve(__dirname, './app/menu-items'),
      'pages': path.resolve(__dirname, './app/pages'),
      'utils': path.resolve(__dirname, './shared/lib'),
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs'
    }
  }
});
