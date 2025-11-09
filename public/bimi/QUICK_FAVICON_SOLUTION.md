# Быстрое решение для иконки отправителя

## Простой способ (без BIMI)

### 1. Создать favicon.ico
Использовать онлайн конвертер:
- Перейти на https://www.favicon.cc/ или https://favicon.io/
- Загрузить `smeta-lab-logo.png`
- Создать favicon размером 16x16, 32x32, 48x48px
- Скачать как `favicon.ico`

### 2. Разместить файлы
Скопировать favicon.ico в корень сайта:
```
public/
├── favicon.ico        ← основной favicon
├── favicon.png        ← PNG версия (уже есть)
└── bimi/
    ├── logo.png       ← PNG логотип (уже есть)
    └── logo.svg       ← SVG логотип (нужно создать)
```

### 3. Обновить HTML meta теги
В файле `index.html` добавить:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
```

## Результат
- Gmail и другие клиенты могут показывать favicon домена рядом с именем отправителя
- Работает быстрее чем BIMI (не требует DNS настройки)
- Поддерживается не всеми клиентами (BIMI более надежный)

## Для полного решения
Рекомендуется всё же настроить BIMI по инструкции из `BIMI_SETUP_INSTRUCTIONS.md`