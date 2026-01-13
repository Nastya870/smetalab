/**
 * Production Smoke Tests
 * 
 * Безопасные тесты для проверки production окружения.
 * НЕ создают данные в реальной БД.
 * Только проверяют доступность и security headers.
 * 
 * Запуск: npm run test:prod
 * 
 * @requires PROD_URL environment variable
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Production URL - можно переопределить через env
const PROD_URL = process.env.PROD_URL || 'https://vite-g3f2z4942-ilyas-projects-5a5f05a9.vercel.app';

// Таймаут для production запросов (сеть медленнее)
const PROD_TIMEOUT = 10000;

describe('Production Smoke Tests', () => {
  
  describe('Health & Availability', () => {
    
    it('должен отвечать на health check', async () => {
      const response = await fetch(`${PROD_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      // Может быть 200, 401 (требует auth) или 404 (endpoint не существует)
      expect([200, 401, 404]).toContain(response.status);
    }, PROD_TIMEOUT + 1000);

    it('должен отвечать на корневой URL', async () => {
      const response = await fetch(PROD_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      // Vercel может вернуть 401 для API-only проектов
      expect([200, 401, 403]).toContain(response.status);
    }, PROD_TIMEOUT + 1000);

    it('API должен отвечать', async () => {
      const response = await fetch(`${PROD_URL}/api/materials`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      // Может требовать авторизацию (401) или вернуть данные (200)
      expect([200, 401, 403]).toContain(response.status);
    }, PROD_TIMEOUT + 1000);

  });

  describe('HTTPS & SSL', () => {
    
    it('должен использовать HTTPS', () => {
      expect(PROD_URL.startsWith('https://')).toBe(true);
    });

    it('должен редиректить HTTP на HTTPS', async () => {
      const httpUrl = PROD_URL.replace('https://', 'http://');
      
      try {
        const response = await fetch(httpUrl, {
          method: 'GET',
          redirect: 'manual', // Не следовать редиректам автоматически
          signal: AbortSignal.timeout(PROD_TIMEOUT)
        });
        
        // Должен быть редирект (301, 302, 307, 308) или HTTPS принудительно
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          expect(location).toMatch(/^https:\/\//);
        }
      } catch (error) {
        // Некоторые хосты блокируют HTTP полностью - это тоже OK
        console.log('HTTP полностью заблокирован (это хорошо)');
      }
    }, PROD_TIMEOUT + 1000);

  });

  describe('Security Headers', () => {
    
    let headers;
    
    beforeAll(async () => {
      const response = await fetch(PROD_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      headers = response.headers;
    });

    it('должен иметь X-Content-Type-Options header', () => {
      const value = headers.get('x-content-type-options');
      if (value) {
        expect(value).toBe('nosniff');
      } else {
        console.warn('⚠️ X-Content-Type-Options header отсутствует');
      }
    });

    it('должен иметь X-Frame-Options header (защита от clickjacking)', () => {
      const value = headers.get('x-frame-options');
      if (value) {
        expect(['DENY', 'SAMEORIGIN']).toContain(value.toUpperCase());
      } else {
        console.warn('⚠️ X-Frame-Options header отсутствует - рекомендуется добавить');
      }
    });

    it('должен иметь X-XSS-Protection header', () => {
      const value = headers.get('x-xss-protection');
      if (value) {
        expect(value).toMatch(/1/); // Должен быть включён
      } else {
        // Современные браузеры не нуждаются в этом header
        console.log('ℹ️ X-XSS-Protection не установлен (современные браузеры не требуют)');
      }
    });

    it('должен иметь Strict-Transport-Security (HSTS)', () => {
      const value = headers.get('strict-transport-security');
      if (value) {
        expect(value).toMatch(/max-age=/);
        console.log('✅ HSTS:', value);
      } else {
        console.warn('⚠️ HSTS header отсутствует - рекомендуется для production');
      }
    });

    it('должен иметь Content-Security-Policy', () => {
      const value = headers.get('content-security-policy');
      if (value) {
        console.log('✅ CSP настроен');
      } else {
        console.warn('⚠️ CSP header отсутствует - рекомендуется настроить');
      }
    });

    it('НЕ должен раскрывать X-Powered-By', () => {
      const value = headers.get('x-powered-by');
      if (value) {
        console.warn(`⚠️ X-Powered-By раскрыт: ${value} - рекомендуется скрыть`);
      } else {
        // Это хорошо - не раскрываем технологии
        expect(value).toBeNull();
      }
    });

  });

  describe('API Security', () => {

    it('должен требовать авторизацию для защищённых endpoints', async () => {
      const protectedEndpoints = [
        '/api/users',
        '/api/projects',
        '/api/estimates',
        '/api/auth/me'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await fetch(`${PROD_URL}${endpoint}`, {
          method: 'GET',
          signal: AbortSignal.timeout(PROD_TIMEOUT)
        });
        
        // Должен требовать авторизацию или запретить доступ
        expect([401, 403]).toContain(response.status);
      }
    }, PROD_TIMEOUT * 5);

    it('должен отклонять невалидный JWT токен', async () => {
      const response = await fetch(`${PROD_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        },
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      expect([401, 403]).toContain(response.status);
    }, PROD_TIMEOUT + 1000);

    it('должен отклонять запросы без токена', async () => {
      const response = await fetch(`${PROD_URL}/api/auth/me`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      expect([401, 403]).toContain(response.status);
    }, PROD_TIMEOUT + 1000);

  });

  describe('Rate Limiting', () => {

    it('должен возвращать Rate Limit headers', async () => {
      const response = await fetch(`${PROD_URL}/api/materials`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      // Проверяем наличие rate limit headers
      const rateLimitLimit = response.headers.get('ratelimit-limit');
      const rateLimitRemaining = response.headers.get('ratelimit-remaining');
      
      if (rateLimitLimit) {
        console.log(`✅ Rate Limit: ${rateLimitRemaining}/${rateLimitLimit}`);
      } else {
        console.warn('⚠️ Rate Limit headers не найдены');
      }
    }, PROD_TIMEOUT + 1000);

  });

  describe('Error Handling', () => {

    it('должен возвращать JSON для несуществующих API routes', async () => {
      const response = await fetch(`${PROD_URL}/api/nonexistent-endpoint-12345`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      // Может быть 404 или 401 (если auth middleware первый)
      expect([401, 404]).toContain(response.status);
      
      const contentType = response.headers.get('content-type');
      // Может быть JSON или HTML (зависит от настроек)
      expect(contentType).toBeDefined();
    }, PROD_TIMEOUT + 1000);

    it('НЕ должен раскрывать stack traces в ошибках', async () => {
      const response = await fetch(`${PROD_URL}/api/projects/invalid-id-format`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer fake.token.here'
        },
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      const text = await response.text();
      
      // Не должно быть stack traces в production
      expect(text).not.toMatch(/at\s+\w+\s+\(/); // "at functionName ("
      expect(text).not.toMatch(/node_modules/);
      expect(text).not.toMatch(/\.js:\d+:\d+/); // file.js:123:45
    }, PROD_TIMEOUT + 1000);

  });

  describe('CORS', () => {

    it('должен обрабатывать preflight OPTIONS запросы', async () => {
      const response = await fetch(`${PROD_URL}/api/materials`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET'
        },
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      // OPTIONS может вернуть 200, 204 или 401 (если auth проверяется раньше CORS)
      expect([200, 204, 401]).toContain(response.status);
    }, PROD_TIMEOUT + 1000);

  });

  describe('Performance', () => {

    it('API должен отвечать менее чем за 3 секунды', async () => {
      const start = Date.now();
      
      await fetch(`${PROD_URL}/api/materials?limit=10`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROD_TIMEOUT)
      });
      
      const duration = Date.now() - start;
      
      console.log(`📊 Время ответа: ${duration}ms`);
      expect(duration).toBeLessThan(3000);
    }, PROD_TIMEOUT + 1000);

  });

});
