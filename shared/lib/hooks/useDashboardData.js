/**
 * Dashboard Data Hook
 * 
 * Оптимизированная загрузка данных дашборда с использованием SWR.
 * 
 * Особенности:
 * - Один запрос вместо 7 отдельных
 * - Кеширование с умной инвалидацией
 * - Автообновление при возврате на страницу
 * - Возможность принудительного обновления через mutate
 * 
 * @example
 * // В компоненте дашборда:
 * const { data, isLoading, error, refresh } = useDashboardData();
 * 
 * // После изменения проекта вызвать refresh():
 * await projectsAPI.update(id, data);
 * refresh(); // Обновит данные дашборда
 */

import useSWR, { mutate as globalMutate } from 'swr';
import { projectsAPI } from 'api/projects';

// Ключ для SWR кеша
const DASHBOARD_CACHE_KEY = '/api/projects/dashboard-summary';

/**
 * Fetcher для SWR
 */
const fetchDashboardData = async () => {
  const response = await projectsAPI.getDashboardSummary();
  if (!response.success) {
    throw new Error(response.message || 'Ошибка загрузки данных дашборда');
  }
  return response.data;
};

/**
 * Хук для загрузки данных дашборда
 * 
 * @param {Object} options - Опции SWR
 * @returns {Object} { data, isLoading, error, refresh, isValidating }
 */
export function useDashboardData(options = {}) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(DASHBOARD_CACHE_KEY, fetchDashboardData, {
    // Обновлять при возврате на страницу (решает проблему устаревших данных)
    revalidateOnFocus: true,
    // Обновлять при восстановлении соединения
    revalidateOnReconnect: true,
    // НЕ обновлять автоматически по интервалу (данные меняются редко)
    refreshInterval: 0,
    // Показывать устаревшие данные пока загружаются новые
    keepPreviousData: true,
    // Повторять при ошибке
    errorRetryCount: 3,
    // Дедупликация запросов в течение 2 секунд
    dedupingInterval: 2000,
    // Пользовательские опции
    ...options
  });

  return {
    // Данные дашборда
    data,
    // Первичная загрузка
    isLoading,
    // Фоновое обновление данных
    isValidating,
    // Ошибка загрузки
    error,
    // Функция для принудительного обновления данных
    // Вызывать после изменения проекта, сметы, акта и т.д.
    refresh: () => mutate(),
    // Функция для оптимистичного обновления
    // Пример: mutate(newData, false) - обновит локально без запроса
    mutate
  };
}

/**
 * Функция для инвалидации кеша дашборда из любого места
 * 
 * Использовать когда данные проекта изменились:
 * - После создания/редактирования проекта
 * - После создания/редактирования сметы
 * - После создания акта выполненных работ
 * - После изменения закупок
 * 
 * @example
 * import { invalidateDashboardCache } from 'hooks/useDashboardData';
 * 
 * // После сохранения проекта:
 * await projectsAPI.update(id, data);
 * invalidateDashboardCache();
 */
export function invalidateDashboardCache() {
  globalMutate(DASHBOARD_CACHE_KEY);
}

export default useDashboardData;
