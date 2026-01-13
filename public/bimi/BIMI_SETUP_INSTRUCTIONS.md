# Настройка BIMI (Brand Indicators for Message Identification)

## Что такое BIMI
BIMI позволяет отображать логотип компании рядом с именем отправителя в почтовых клиентах (Gmail, Yahoo, Apple Mail).

## Требования для BIMI

### 1. Формат логотипа
- **Обязательно SVG формат** (PNG не поддерживается)
- Размер: точно 512x512 пикселей
- Квадратная форма (соотношение сторон 1:1)
- Максимальный размер файла: 32KB

### 2. Конвертация логотипа
Текущий файл: `smeta-lab-logo.png` (240KB)

**Способы конвертации PNG → SVG:**

#### Онлайн конвертеры:
- https://convertio.co/png-svg/
- https://cloudconvert.com/png-to-svg
- https://www.freeconvert.com/png-to-svg

#### Локальные инструменты:
- Adobe Illustrator
- Inkscape (бесплатный)
- GIMP с плагином

### 3. DNS настройка

Добавить BIMI запись в DNS для домена `smeta-lab.ru`:

```
Тип записи: TXT
Имя: default._bimi.smeta-lab.ru
Значение: v=BIMI1; l=https://smeta-lab.ru/bimi/logo.svg
```

### 4. DMARC политика
BIMI требует активной DMARC политики. Проверить существующую:

```bash
nslookup -type=TXT _dmarc.smeta-lab.ru
```

Если DMARC нет, добавить:
```
Тип записи: TXT
Имя: _dmarc.smeta-lab.ru
Значение: v=DMARC1; p=quarantine; rua=mailto:admin@smeta-lab.ru
```

### 5. Проверка BIMI
После настройки проверить на:
- https://bimigroup.org/bimi-generator/
- https://dmarc.org/bimi-tools/

## Пошаговая инструкция

1. **Конвертировать логотип:**
   - Открыть `smeta-lab-logo.png`
   - Обрезать до квадрата 512x512px
   - Сохранить как SVG в папку `public/bimi/logo.svg`

2. **Настроить DNS:**
   - Добавить BIMI запись
   - Проверить/добавить DMARC
   - Подождать распространения DNS (до 24 часов)

3. **Протестировать:**
   - Отправить тестовое письмо на Gmail
   - Проверить отображение логотипа

## Статус файлов
- ✅ PNG логотип скопирован в `/public/bimi/logo.png`
- ❌ SVG версия логотипа (требуется конвертация)
- ❌ DNS BIMI запись (требуется настройка)
- ❌ DMARC политика (требуется проверка)

## Альтернативное решение
Если BIMI сложно настроить, можно использовать favicon.ico для некоторых почтовых клиентов:
- Создать favicon.ico из логотипа
- Разместить в корне домена `https://smeta-lab.ru/favicon.ico`