import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // depending on your application, base can also be "/"
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = `${env.VITE_APP_BASE_NAME}`;
  const PORT = 3000;

  return {
    server: {
      // this ensures that the browser opens upon server start
      open: true,
      // this sets a default port to 3000
      port: PORT,
      host: true,
      // proxy API requests to Express server
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 1600
    },
    preview: {
      open: true,
      host: true
    },
    define: {
      global: 'window'
    },
    resolve: {
      alias: {
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
        // Новые alias для views и components
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
    },
    // FIX: Use relative paths for Vercel deployment with Root Directory
    base: './',
    plugins: [
      react(), 
      jsconfigPaths(),
      // Bundle size analyzer (только в production build)
      mode === 'production' && visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean)
  };
});
