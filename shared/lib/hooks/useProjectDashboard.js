/**
 * Project Dashboard Data Hook
 * 
 * Оптимизированная загрузка данных страницы проекта с использованием SWR.
 * 
 * Особенности:
 * - Один запрос вместо 4+ отдельных (project, team, estimates, financial N×2)
 * - Кеширование с умной инвалидацией
 * - Автообновление при возврате на страницу (вместо интервала 3 сек)
 * - Возможность принудительного обновления через mutate
 * 
 * @example
 * // В компоненте ProjectDashboard:
 * const { project, team, estimates, financialSummary, isLoading, error, refresh } = useProjectDashboard(id);
 * 
 * // После изменения данных вызвать refresh():
 * await estimatesAPI.update(estimateId, data);
 * refresh(); // Обновит данные страницы проекта
 */

import useSWR, { mutate as globalMutate } from 'swr';
import { projectsAPI } from 'api/projects';

/**
 * Генерация ключа кеша для конкретного проекта
 */
const getProjectDashboardKey = (projectId) => 
  projectId ? `/api/projects/${projectId}/full-dashboard` : null;

/**
 * Fetcher для SWR с обработкой ошибок авторизации
 */
const fetchProjectDashboard = async (projectId) => {
  try {
    const response = await projectsAPI.getFullDashboard(projectId);
    return response;
  } catch (error) {
    // Если 401 - пользователь будет перенаправлен на логин через axiosInstance
    // Не бросаем ошибку в SWR чтобы не показывать error state
    if (error.response?.status === 401) {
      console.log('useProjectDashboard: Auth error, redirecting to login...');
      return null;
    }
    throw error;
  }
};

/**
 * Хук для загрузки данных дашборда проекта
 * 
 * @param {string} projectId - UUID проекта
 * @param {Object} options - Опции SWR
 * @returns {Object} { project, team, estimates, financialSummary, isLoading, error, refresh, isValidating }
 */
export function useProjectDashboard(projectId, options = {}) {
  const cacheKey = getProjectDashboardKey(projectId);
  
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    cacheKey,
    () => fetchProjectDashboard(projectId),
    {
      // Обновлять при возврате на страницу (решает проблему устаревших данных)
      // Заменяет интервал 3 секунды на более умное поведение
      revalidateOnFocus: true,
      // Обновлять при восстановлении соединения
      revalidateOnReconnect: true,
      // НЕ обновлять автоматически по интервалу
      // Раньше было: setInterval(() => refreshProject(), 3000)
      refreshInterval: 0,
      // Показывать устаревшие данные пока загружаются новые
      keepPreviousData: true,
      // Повторять при ошибке (уменьшено для 401)
      errorRetryCount: 1,
      // Задержка между retry (не спамить при 401)
      errorRetryInterval: 5000,
      // Не retry для 401/403 ошибок
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Не retry для ошибок авторизации
        if (error?.response?.status === 401 || error?.response?.status === 403) return;
        // Не retry больше 2 раз
        if (retryCount >= 2) return;
        // Retry через 5 секунд
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
      // Дедупликация запросов в течение 2 секунд
      dedupingInterval: 2000,
      // Пользовательские опции
      ...options
    }
  );

  return {
    // Данные проекта
    project: data?.project || null,
    // Команда проекта
    team: data?.team || [],
    // Сметы проекта
    estimates: data?.estimates || [],
    // Финансовая сводка
    financialSummary: data?.financialSummary || {
      incomeWorks: 0,
      expenseWorks: 0,
      incomeMaterials: 0,
      expenseMaterials: 0
    },
    // Первичная загрузка
    isLoading,
    // Фоновое обновление данных
    isValidating,
    // Ошибка загрузки
    error,
    // Функция для принудительного обновления данных
    refresh: () => mutate(),
    // Функция для оптимистичного обновления
    mutate
  };
}

/**
 * Функция для инвалидации кеша проекта из любого места
 * 
 * Использовать когда данные проекта изменились:
 * - После редактирования проекта
 * - После создания/редактирования/удаления сметы
 * - После создания акта выполненных работ
 * - После изменения закупок
 * 
 * @param {string} projectId - UUID проекта
 * 
 * @example
 * import { invalidateProjectDashboard } from 'hooks/useProjectDashboard';
 * 
 * // После создания сметы:
 * await estimatesAPI.create(projectId, data);
 * invalidateProjectDashboard(projectId);
 */
export function invalidateProjectDashboard(projectId) {
  const cacheKey = getProjectDashboardKey(projectId);
  if (cacheKey) {
    globalMutate(cacheKey);
  }
}

export default useProjectDashboard;
