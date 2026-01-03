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

/**
 * Хук для загрузки данных дашборда с фильтрами периода
 * 
 * @param {Object} params - Параметры фильтрации
 * @param {string} params.period - Период для KPI (month, quarter, year, all)
 * @param {string} params.chartPeriod - Период для графика (month, quarter, halfyear, year)
 * @param {Object} options - Опции SWR
 * @returns {Object} { data, isLoading, error, refresh, isValidating }
 */
export function useDashboardData(params = {}, options = {}) {
  const { period = 'year', chartPeriod = 'year' } = params;
  
  // Ключ для SWR кеша с параметрами
  const cacheKey = `/api/projects/dashboard-summary?period=${period}&chartPeriod=${chartPeriod}`;
  
  /**
   * Fetcher для SWR с параметрами
   */
  const fetchDashboardData = async () => {
    const response = await projectsAPI.getDashboardSummary(period, chartPeriod);
    if (!response.success) {
      throw new Error(response.message || 'Ошибка загрузки данных дашборда');
    }
    return response.data;
  };

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(cacheKey, fetchDashboardData, {
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
