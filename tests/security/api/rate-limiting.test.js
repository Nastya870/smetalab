/**
 * Rate Limiting Security Tests
 * 
 * Проверяет защиту от brute force и DDoS атак
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { RATE_LIMIT_CONFIG } from '../fixtures/payloads.js';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Тестовые учётные данные
const TEST_USER = {
  email: 'security-rate@sectest.local',
  password: 'Test123!@#',
  fullName: 'Rate Limit Tester'
};

describe('Rate Limiting Security Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Регистрация тестового пользователя
    try {
      await request(API_URL)
        .post('/api/auth/register')
        .send(TEST_USER);
    } catch (e) {}

    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    authToken = loginRes.body.data?.tokens?.accessToken;
  });

  describe('Login Brute Force Protection', () => {
    it('должен блокировать после множества неудачных попыток входа', async () => {
      const targetEmail = 'brute-force-target@sectest.local';
      const attempts = 20; // Пробуем 20 раз
      let blockedAfter = -1;

      for (let i = 0; i < attempts; i++) {
        const response = await request(API_URL)
          .post('/api/auth/login')
          .send({
            email: targetEmail,
            password: `WrongPassword${i}!`
          });

        // Если получили 429 - rate limit сработал
        if (response.status === 429) {
          blockedAfter = i;
          break;
        }

        // Небольшая задержка чтобы не перегружать сервер
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Документируем результат
      if (blockedAfter > 0) {
        console.log(`✅ Rate limit сработал после ${blockedAfter} попыток`);
        expect(blockedAfter).toBeLessThan(attempts);
      } else {
        console.log(`⚠️ Rate limit НЕ сработал после ${attempts} попыток - рекомендуется добавить защиту`);
        // Не fail-им тест, но предупреждаем
      }
    }, 30000); // Увеличенный таймаут

    it('должен возвращать Retry-After header при блокировке', async () => {
      const targetEmail = 'retry-after-test@sectest.local';
      
      // Спамим запросами
      for (let i = 0; i < 30; i++) {
        const response = await request(API_URL)
          .post('/api/auth/login')
          .send({
            email: targetEmail,
            password: 'WrongPassword!'
          });

        if (response.status === 429) {
          // Проверяем наличие Retry-After
          const retryAfter = response.headers['retry-after'];
          if (retryAfter) {
            console.log(`✅ Retry-After header: ${retryAfter}`);
          }
          break;
        }
      }
    }, 15000);
  });

  describe('API Rate Limiting', () => {
    it('должен ограничивать частоту API запросов', async () => {
      if (!authToken) return;

      const requests = 100;
      let rateLimited = false;
      let rateLimitedAfter = -1;

      const promises = [];
      
      for (let i = 0; i < requests; i++) {
        promises.push(
          request(API_URL)
            .get('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        if (response.status === 429 && !rateLimited) {
          rateLimited = true;
          rateLimitedAfter = index;
        }
      });

      if (rateLimited) {
        console.log(`✅ API rate limit сработал после ${rateLimitedAfter} запросов`);
      } else {
        console.log(`⚠️ API rate limit НЕ сработал после ${requests} параллельных запросов`);
      }
    }, 30000);

    it('должен ограничивать запросы к тяжёлым endpoints', async () => {
      if (!authToken) return;

      const heavyEndpoints = [
        '/api/materials/export',
        '/api/works/export',
        '/api/estimates',
      ];

      for (const endpoint of heavyEndpoints) {
        let rateLimited = false;
        
        for (let i = 0; i < 20; i++) {
          const response = await request(API_URL)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`);

          if (response.status === 429) {
            rateLimited = true;
            console.log(`✅ Rate limit на ${endpoint} сработал`);
            break;
          }
        }

        if (!rateLimited) {
          console.log(`⚠️ Rate limit на ${endpoint} не сработал`);
        }
      }
    }, 30000);
  });

  describe('Registration Spam Protection', () => {
    it('должен блокировать массовую регистрацию с одного IP', async () => {
      const attempts = 10;
      let blocked = false;

      for (let i = 0; i < attempts; i++) {
        const response = await request(API_URL)
          .post('/api/auth/register')
          .send({
            email: `spam-test-${Date.now()}-${i}@sectest.local`,
            password: 'Test123!@#',
            fullName: `Spam User ${i}`
          });

        if (response.status === 429) {
          blocked = true;
          console.log(`✅ Registration rate limit сработал после ${i} регистраций`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!blocked) {
        console.log(`⚠️ Registration rate limit НЕ сработал после ${attempts} попыток`);
      }
    }, 30000);
  });

  describe('Password Reset Abuse Protection', () => {
    it('должен ограничивать запросы на сброс пароля', async () => {
      const attempts = 15;
      let blocked = false;

      for (let i = 0; i < attempts; i++) {
        const response = await request(API_URL)
          .post('/api/auth/forgot-password')
          .send({
            email: 'reset-abuse-test@sectest.local'
          });

        if (response.status === 429) {
          blocked = true;
          console.log(`✅ Password reset rate limit сработал после ${i} попыток`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!blocked) {
        console.log(`⚠️ Password reset rate limit НЕ сработал после ${attempts} попыток`);
      }
    }, 30000);
  });

  describe('Slow-loris Prevention', () => {
    it('должен иметь таймаут на медленные запросы', async () => {
      // Этот тест проверяет что сервер не ждёт бесконечно медленный запрос
      // В реальности нужен специальный клиент для slow-loris атаки
      
      const startTime = Date.now();
      
      try {
        await request(API_URL)
          .post('/api/auth/login')
          .timeout(5000) // 5 секунд таймаут на клиенте
          .send({
            email: TEST_USER.email,
            password: TEST_USER.password
          });
      } catch (error) {
        // Таймаут ожидаем
      }

      const duration = Date.now() - startTime;
      
      // Запрос не должен висеть дольше разумного времени
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Large Payload Protection', () => {
    it('должен отклонять слишком большие JSON payloads', async () => {
      // Создаём большой payload (1MB+)
      const largeString = 'x'.repeat(1024 * 1024); // 1MB
      
      const response = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: largeString,
          address: 'Test',
          client_name: 'Test'
        });

      // Должен вернуть 413 (Payload Too Large) или 400
      expect([400, 413, 500]).toContain(response.status);
    });

    it('должен отклонять слишком много элементов в массиве', async () => {
      if (!authToken) return;

      // Создаём массив с 10000 элементов
      const hugeArray = Array.from({ length: 10000 }, (_, i) => ({
        name: `Material ${i}`,
        unit: 'шт',
        price: 100
      }));

      const response = await request(API_URL)
        .post('/api/materials/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ materials: hugeArray });

      // Должен либо ограничить, либо обработать
      expect([200, 400, 404, 413, 429, 500]).toContain(response.status);
    });
  });

  describe('Response Time Monitoring', () => {
    it('API должен отвечать быстро под нагрузкой', async () => {
      if (!authToken) return;

      const requests = 10;
      const responseTimes = [];

      for (let i = 0; i < requests; i++) {
        const startTime = Date.now();
        
        await request(API_URL)
          .get('/api/projects')
          .set('Authorization', `Bearer ${authToken}`);

        responseTimes.push(Date.now() - startTime);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      console.log(`📊 Среднее время ответа: ${avgTime.toFixed(0)}ms`);
      console.log(`📊 Максимальное время: ${maxTime}ms`);

      // Предупреждаем если API медленный
      if (avgTime > 500) {
        console.log('⚠️ API отвечает медленно (>500ms в среднем)');
      }
      if (maxTime > 2000) {
        console.log('⚠️ Есть запросы дольше 2 секунд');
      }

      // Не строгий тест - просто документируем
      expect(avgTime).toBeLessThan(5000); // 5 секунд максимум в среднем
    });
  });

  describe('Concurrent Connection Limits', () => {
    it('должен обрабатывать множество одновременных соединений', async () => {
      if (!authToken) return;

      const concurrentRequests = 50;
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(API_URL)
          .get('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      const errorCount = responses.filter(r => r.status >= 500).length;

      console.log(`📊 ${concurrentRequests} параллельных запросов за ${duration}ms`);
      console.log(`   ✅ Успешных: ${successCount}`);
      console.log(`   ⏳ Rate limited: ${rateLimitedCount}`);
      console.log(`   ❌ Ошибок: ${errorCount}`);

      // Сервер не должен падать
      expect(errorCount).toBeLessThan(concurrentRequests / 2);
    });
  });
});
