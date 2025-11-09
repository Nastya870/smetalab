// Функция для определения цвета статуса
export const getStatusColor = (status) => {
  switch (status) {
    case 'planning':
      return 'warning'; // Желтый
    case 'approval':
      return 'orange'; // Оранжевый (custom color в теме MUI)
    case 'in_progress':
      return 'secondary'; // Фиолетовый
    case 'rejected':
      return 'error'; // Красный
    case 'completed':
      return 'success'; // Зеленый
    // Старые статусы для обратной совместимости
    case 'active':
      return 'secondary'; // Фиолетовый (как in_progress)
    case 'on-hold':
      return 'error';
    default:
      return 'default';
  }
};

// Функция для получения текста статуса
export const getStatusText = (status) => {
  switch (status) {
    case 'planning':
      return 'Планирование';
    case 'approval':
      return 'Согласование';
    case 'in_progress':
      return 'В работе';
    case 'rejected':
      return 'Отказ';
    case 'completed':
      return 'Завершён';
    // Старые статусы для обратной совместимости
    case 'active':
      return 'В работе';
    case 'on-hold':
      return 'Приостановлен';
    default:
      return status;
  }
};

// Форматирование суммы
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Форматирование даты
export const formatDate = (dateString) => {
  if (!dateString) return 'Не указана';
  
  const date = new Date(dateString);
  
  // Проверка валидности даты
  if (isNaN(date.getTime())) {
    return 'Не указана';
  }
  
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Вычисление статистики
export const calculateStats = (projects) => {
  return {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active' || p.status === 'in_progress').length,
    planning: projects.filter((p) => p.status === 'planning').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  };
};
