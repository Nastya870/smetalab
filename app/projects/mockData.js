// Демо-данные для проектов
export const initialProjects = [
  {
    id: 1,
    name: 'Строительство жилого комплекса',
    client: 'ООО "Строй-Инвест"',
    contractor: 'ООО "СтройМастер"',
    address: 'г. Москва, ул. Ленина, д. 1',
    objectName: 'Жилой комплекс "Солнечный"',
    startDate: '2025-01-15',
    endDate: '2026-12-31',
    status: 'active',
    progress: 35
  },
  {
    id: 2,
    name: 'Реконструкция офисного здания',
    client: 'ПАО "Недвижимость+"',
    contractor: 'АО "РемонтСтрой"',
    address: 'г. Санкт-Петербург, Невский проспект, 100',
    objectName: 'Офисное здание "Бизнес Центр"',
    startDate: '2025-03-01',
    endDate: '2025-09-30',
    status: 'active',
    progress: 60
  },
  {
    id: 3,
    name: 'Торговый центр "Европа"',
    client: 'ТОО "Retail Group"',
    contractor: 'ООО "МегаСтрой"',
    address: 'г. Казань, ул. Баумана, 50',
    objectName: 'Торговый центр "Европа"',
    startDate: '2025-06-01',
    endDate: '2027-05-31',
    status: 'planning',
    progress: 10
  },
  {
    id: 4,
    name: 'Промышленный склад',
    client: 'АО "Логистика-Сервис"',
    contractor: 'ООО "ПромСтрой"',
    address: 'Московская область, г. Химки, Промзона',
    objectName: 'Логистический комплекс',
    startDate: '2024-01-10',
    endDate: '2024-12-20',
    status: 'completed',
    progress: 100
  },
  {
    id: 5,
    name: 'Детский сад на 150 мест',
    client: 'Администрация города',
    contractor: 'ООО "ГорСтрой"',
    address: 'г. Екатеринбург, ул. Мира, 25',
    objectName: 'Детский сад "Солнышко"',
    startDate: '2025-04-01',
    endDate: '2025-11-30',
    status: 'active',
    progress: 45
  }
];

// Начальное состояние проекта
export const emptyProject = {
  id: null,
  name: '',
  client: '',
  contractor: '',
  address: '',
  objectName: '',
  startDate: '',
  endDate: '',
  status: 'planning',
  progress: 0
};
