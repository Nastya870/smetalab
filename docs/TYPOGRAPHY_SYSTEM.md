# Система типографики Smeta Pro

## 📐 Основные принципы

### Базовый размер
- **Base size**: 16px (1rem) - стандарт для веба и мобильных устройств
- **Минимальный размер**: 14px (0.875rem) - для второстепенного текста
- **Touch target**: 44px - минимальная высота для кликабельных элементов (Apple HIG)

### Шрифт
- **Font Family**: `'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif`
- **Font Weights**:
  - Regular: 400 (основной текст)
  - Medium: 500 (подзаголовки, акценты)
  - Semibold: 600 (заголовки)
  - Bold: 700 (важные заголовки)

---

## 🎯 Иерархия типографики

### Заголовки (Headings)

#### H1 - Главные страницы
```jsx
fontSize: '2rem' (32px desktop) → '1.5rem' (24px mobile)
fontWeight: 700
lineHeight: 1.2
usage: "Страницы проектов", "Главный дашборд"
```

#### H2 - Секции страниц
```jsx
fontSize: '1.5rem' (24px desktop) → '1.25rem' (20px mobile)
fontWeight: 700
lineHeight: 1.3
usage: "Заголовки карточек", "Названия разделов"
```

#### H3 - Подсекции
```jsx
fontSize: '1.25rem' (20px desktop) → '1.125rem' (18px mobile)
fontWeight: 600
lineHeight: 1.4
usage: "Подразделы", "Названия блоков"
```

#### H4 - Карточки и компоненты
```jsx
fontSize: '1.125rem' (18px desktop) → '1rem' (16px mobile)
fontWeight: 600
lineHeight: 1.5
usage: "Заголовки карточек", "Названия компонентов"
```

#### H5 - Мелкие заголовки
```jsx
fontSize: '1rem' (16px)
fontWeight: 600
lineHeight: 1.5
usage: "Названия форм", "Подзаголовки таблиц"
```

#### H6 - Минимальные заголовки
```jsx
fontSize: '0.875rem' (14px)
fontWeight: 600
lineHeight: 1.5
usage: "Заголовки в плотных интерфейсах"
```

---

### Основной текст (Body)

#### Body1 - Основной текст
```jsx
fontSize: '1rem' (16px desktop) → '1rem' (16px mobile)
fontWeight: 400
lineHeight: 1.6
usage: "Описания", "Основной контент", "Формы"
```

#### Body2 - Второстепенный текст
```jsx
fontSize: '0.875rem' (14px)
fontWeight: 400
lineHeight: 1.5
usage: "Вспомогательный текст", "Метаданные"
```

---

### Подзаголовки (Subtitles)

#### Subtitle1 - Важные подзаголовки
```jsx
fontSize: '1rem' (16px)
fontWeight: 500
lineHeight: 1.5
usage: "Подзаголовки карточек", "Описания под заголовками"
```

#### Subtitle2 - Вторичные подзаголовки
```jsx
fontSize: '0.875rem' (14px)
fontWeight: 500
lineHeight: 1.5
usage: "Метаинформация", "Категории"
```

---

### Вспомогательный текст (Captions & Overline)

#### Caption - Подписи
```jsx
fontSize: '0.75rem' (12px)
fontWeight: 400
lineHeight: 1.4
usage: "Подписи к изображениям", "Временные метки", "Хинты"
```

#### Overline - Надписи
```jsx
fontSize: '0.75rem' (12px)
fontWeight: 500
letterSpacing: '0.5px'
textTransform: 'uppercase'
lineHeight: 1.4
usage: "Категории", "Лейблы секций"
```

---

### Интерактивные элементы

#### Button - Кнопки
```jsx
fontSize: '0.875rem' (14px desktop) → '1rem' (16px mobile)
fontWeight: 500
textTransform: 'none'
minHeight: '36px' (desktop) → '44px' (mobile)
letterSpacing: '0.3px'
usage: "Все кнопки в приложении"
```

#### Link - Ссылки
```jsx
fontSize: inherit (от родителя)
fontWeight: 500
textDecoration: 'none'
'&:hover': textDecoration: 'underline'
usage: "Текстовые ссылки"
```

---

### Таблицы

#### Table Header
```jsx
fontSize: '0.75rem' (12px)
fontWeight: 600
textTransform: 'uppercase'
letterSpacing: '0.5px'
color: grey[600]
usage: "Заголовки столбцов таблиц"
```

#### Table Cell
```jsx
fontSize: '0.875rem' (14px)
fontWeight: 400
lineHeight: 1.5
usage: "Ячейки таблиц"
```

#### Table Cell Numeric
```jsx
fontSize: '0.875rem' (14px)
fontWeight: 500
fontVariantNumeric: 'tabular-nums'
usage: "Числовые данные в таблицах"
```

---

### Формы и инпуты

#### Input Label
```jsx
fontSize: '0.875rem' (14px)
fontWeight: 500
lineHeight: 1.5
usage: "Лейблы полей ввода"
```

#### Input Text
```jsx
fontSize: '1rem' (16px) - важно для iOS (предотвращает зум)
fontWeight: 400
lineHeight: 1.5
usage: "Текст в полях ввода"
```

#### Helper Text
```jsx
fontSize: '0.75rem' (12px)
fontWeight: 400
lineHeight: 1.4
usage: "Подсказки под полями", "Ошибки валидации"
```

---

## 📱 Адаптивная типографика

### Breakpoints
```jsx
xs: 0-599px (mobile)
sm: 600-899px (tablet)
md: 900-1199px (small desktop)
lg: 1200-1535px (desktop)
xl: 1536px+ (large desktop)
```

### Масштабирование
- **Mobile (xs)**: Базовый размер 16px, минимум 14px
- **Tablet (sm)**: Базовый размер 16px
- **Desktop (md+)**: Базовый размер 16px, возможен рост до 18px для основного текста

---

## 🎨 Применение в коде

### Использование Typography компонента
```jsx
import { Typography } from '@mui/material';

// Заголовки
<Typography variant="h1">Главный заголовок</Typography>
<Typography variant="h2">Секция страницы</Typography>
<Typography variant="h3">Подсекция</Typography>

// Основной текст
<Typography variant="body1">Основной текст</Typography>
<Typography variant="body2">Второстепенный текст</Typography>

// Подзаголовки
<Typography variant="subtitle1">Важный подзаголовок</Typography>
<Typography variant="subtitle2">Вторичный подзаголовок</Typography>

// Вспомогательный текст
<Typography variant="caption">Подпись</Typography>
<Typography variant="overline">КАТЕГОРИЯ</Typography>

// Кастомные стили
<Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
  Кастомный текст
</Typography>
```

### Использование через sx prop
```jsx
<Box sx={{ 
  fontSize: '0.875rem',  // 14px
  fontWeight: 500,       // medium
  lineHeight: 1.5,
  color: 'text.secondary'
}}>
  Текст с кастомными стилями
</Box>
```

---

## ✅ Best Practices

### DO ✅
- Используйте `variant` Typography компонента
- Соблюдайте иерархию (H1 → H2 → H3...)
- Используйте `fontWeight: 500` для акцентов
- Минимум 16px для инпутов (iOS zoom prevention)
- Минимум 44px height для кнопок на мобильных

### DON'T ❌
- Не используйте px напрямую, используйте rem
- Не используйте размеры меньше 12px
- Не смешивайте много разных размеров
- Не игнорируйте mobile breakpoints
- Не забывайте про line-height для читаемости

---

## 🔧 Конфигурация темы

Файл: `shared/ui/themes/typography.jsx`

```jsx
export default function Typography(theme, borderRadius, fontFamily) {
  return {
    fontFamily: fontFamily || "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    fontSize: 16, // base size
    
    // Headings
    h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.5 },
    h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
    
    // Body
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    
    // Subtitles
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
    
    // Supporting
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
    overline: { 
      fontSize: '0.75rem', 
      fontWeight: 500, 
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      lineHeight: 1.4
    },
    
    // Interactive
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.3px'
    }
  };
}
```

---

## 📊 Сводная таблица

| Вариант | Desktop | Mobile | Weight | Usage |
|---------|---------|--------|--------|-------|
| **h1** | 32px | 24px | 700 | Главные страницы |
| **h2** | 24px | 20px | 700 | Секции |
| **h3** | 20px | 18px | 600 | Подсекции |
| **h4** | 18px | 16px | 600 | Карточки |
| **h5** | 16px | 16px | 600 | Формы |
| **h6** | 14px | 14px | 600 | Плотные UI |
| **body1** | 16px | 16px | 400 | Основной текст |
| **body2** | 14px | 14px | 400 | Второстепенный |
| **subtitle1** | 16px | 16px | 500 | Подзаголовки |
| **subtitle2** | 14px | 14px | 500 | Метаинфо |
| **caption** | 12px | 12px | 400 | Подписи |
| **button** | 14px | 16px | 500 | Кнопки |

---

**Версия**: 1.0  
**Дата**: 28 декабря 2025  
**Автор**: Smeta Pro Team
