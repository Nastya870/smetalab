# Typography System - Quick Reference

## 🎯 Быстрый выбор варианта

### Когда использовать какой вариант?

```jsx
// 📌 ЗАГОЛОВКИ СТРАНИЦ
<Typography variant="h1">Проекты</Typography>          // Главная страница
<Typography variant="h2">Активные проекты</Typography> // Секция
<Typography variant="h3">Проект "Вернадского"</Typography> // Подсекция

// 📌 ЗАГОЛОВКИ КОМПОНЕНТОВ
<Typography variant="h4">Смета: Вернадского пр-т</Typography> // Заголовок карточки
<Typography variant="h5">Параметры объекта</Typography>      // Заголовок формы
<Typography variant="h6">Фильтры</Typography>               // Плотный UI

// 📌 ОСНОВНОЙ ТЕКСТ
<Typography variant="body1">
  Это основной текст документа или описания
</Typography>

<Typography variant="body2">
  Второстепенная информация или метаданные
</Typography>

// 📌 ПОДЗАГОЛОВКИ
<Typography variant="subtitle1">Важный подзаголовок</Typography>
<Typography variant="subtitle2">Дата создания: 28.12.2025</Typography>

// 📌 ВСПОМОГАТЕЛЬНЫЙ ТЕКСТ
<Typography variant="caption">Последнее изменение 2 часа назад</Typography>
<Typography variant="overline">КАТЕГОРИЯ</Typography>
```

## 📊 Размеры в пикселях

| Variant | Desktop | Mobile | Usage |
|---------|---------|--------|-------|
| h1 | 32px | 24px | Главные страницы |
| h2 | 24px | 20px | Секции |
| h3 | 20px | 18px | Подсекции |
| h4 | 18px | 16px | Карточки |
| h5 | 16px | 16px | Формы |
| h6 | 14px | 14px | Плотные UI |
| body1 | 16px | 16px | Основной текст |
| body2 | 14px | 14px | Второстепенный |
| subtitle1 | 16px | 16px | Подзаголовки |
| subtitle2 | 14px | 14px | Метаинфо |
| caption | 12px | 12px | Подписи |
| button | 14px | 16px | Кнопки |

## 🎨 Примеры из проекта

### Dashboard
```jsx
// Заголовок страницы
<Typography variant="h1" sx={{ mb: 3 }}>
  Дашборд проектов
</Typography>

// Заголовки карточек
<Typography variant="h4" sx={{ fontWeight: 600 }}>
  Активные проекты
</Typography>

// Статистика
<Typography variant="h2" sx={{ color: 'primary.main' }}>
  12
</Typography>
<Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
  Проектов в работе
</Typography>
```

### Таблица сметы
```jsx
// Заголовок таблицы
<Typography variant="h4" sx={{ mb: 2 }}>
  Смета: Вернадского пр-т
</Typography>

// Заголовки столбцов (кастомный стиль)
<Typography sx={{ 
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'grey.600'
}}>
  Наименование
</Typography>

// Данные в ячейках
<Typography variant="body2">
  Монтаж временного освещения
</Typography>

// Числовые данные
<Typography variant="body2" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
  115,70 ₽
</Typography>
```

### Формы
```jsx
// Заголовок формы
<Typography variant="h5" sx={{ mb: 2 }}>
  Добавить проект
</Typography>

// Лейбл поля
<Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 500 }}>
  Название проекта
</Typography>

// Подсказка
<Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
  Введите уникальное название проекта
</Typography>

// Ошибка валидации
<Typography variant="caption" sx={{ color: 'error.main', mt: 0.5 }}>
  Поле обязательно для заполнения
</Typography>
```

### Кнопки
```jsx
<Button 
  variant="contained"
  sx={{
    textTransform: 'none',      // Отключить UPPERCASE
    fontSize: '0.875rem',       // 14px
    fontWeight: 500
  }}
>
  Сохранить
</Button>
```

### Карточки
```jsx
<Card>
  <CardContent>
    {/* Заголовок */}
    <Typography variant="h4" sx={{ mb: 1 }}>
      Проект "Вернадского пр-т"
    </Typography>
    
    {/* Описание */}
    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
      Ремонт квартиры, 2 комнаты, 65 м²
    </Typography>
    
    {/* Метаданные */}
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      Создан 28 декабря 2025
    </Typography>
  </CardContent>
</Card>
```

## 🔧 Кастомные стили с sx

### Комбинирование с цветами
```jsx
<Typography 
  variant="body1" 
  sx={{ 
    color: 'primary.main',     // Основной цвет
    fontWeight: 600            // Жирнее
  }}
>
  Важный текст
</Typography>

<Typography 
  variant="subtitle2" 
  sx={{ 
    color: 'text.secondary',   // Серый текст
    fontStyle: 'italic'        // Курсив
  }}
>
  Дополнительная информация
</Typography>
```

### Обрезка длинного текста
```jsx
<Typography 
  variant="body2" 
  sx={{ 
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 200
  }}
>
  Очень длинный текст который будет обрезан...
</Typography>

// Многострочное обрезание
<Typography 
  variant="body2" 
  sx={{ 
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  }}
>
  Длинный текст который займет две строки и обрежется
</Typography>
```

### Адаптивные размеры
```jsx
<Typography 
  variant="h3"
  sx={{ 
    fontSize: { xs: '1.125rem', md: '1.25rem', lg: '1.5rem' }
  }}
>
  Адаптивный заголовок
</Typography>
```

## 🚫 Что НЕ делать

```jsx
// ❌ НЕ ДЕЛАЙ ТАК
<Typography sx={{ fontSize: '13px' }}>Текст</Typography>           // Не px
<Typography sx={{ fontSize: 14 }}>Текст</Typography>               // Не число без rem
<Typography variant="body1" sx={{ fontSize: '0.5rem' }}>Текст</Typography> // Слишком мелко
<Button sx={{ textTransform: 'uppercase' }}>КНОПКА</Button>        // Плохо читается

// ✅ ДЕЛАЙ ТАК
<Typography variant="body2">Текст</Typography>                      // Используй variant
<Typography sx={{ fontSize: '0.875rem' }}>Текст</Typography>        // rem units
<Typography variant="caption">Мелкий текст</Typography>             // Минимум 12px
<Button sx={{ textTransform: 'none' }}>Кнопка</Button>             // Нормальный регистр
```

## 📱 Адаптивность

### Автоматическая
Все варианты автоматически адаптируются для мобильных устройств благодаря media queries в теме.

### Ручная настройка
```jsx
<Typography 
  sx={{ 
    fontSize: { 
      xs: '0.875rem',  // mobile
      sm: '1rem',       // tablet
      md: '1.125rem'    // desktop
    },
    lineHeight: { xs: 1.5, md: 1.6 }
  }}
>
  Кастомный адаптивный текст
</Typography>
```

## 📚 Полная документация

См. [TYPOGRAPHY_SYSTEM.md](./TYPOGRAPHY_SYSTEM.md) для подробной информации о системе типографики.
