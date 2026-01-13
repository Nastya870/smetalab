/**
 * Утилиты для форматирования данных для Excel документов
 */

/**
 * Форматирует число с пробелами тысяч и запятой для десятичных
 * @param {number} number - Число для форматирования
 * @param {number} decimals - Количество знаков после запятой (по умолчанию 2)
 * @returns {string} - Отформатированное число
 * @example
 * formatNumber(1432500.00, 2) // "1 432 500,00"
 * formatNumber(95.5, 2) // "95,50"
 * formatNumber(1000) // "1 000,00"
 */
export function formatNumber(number, decimals = 2) {
  if (number === null || number === undefined || isNaN(number)) {
    return '0,00';
  }

  const num = parseFloat(number);
  
  // Разделяем на целую и дробную часть
  const parts = num.toFixed(decimals).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '0'.repeat(decimals);
  
  // Добавляем пробелы тысяч к целой части
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  // Объединяем с запятой вместо точки
  return `${formattedInteger},${decimalPart}`;
}

/**
 * Форматирует дату в формат dd.mm.yyyy
 * @param {string|Date} dateString - Дата в формате ISO или объект Date
 * @returns {string} - Дата в формате dd.mm.yyyy
 * @example
 * formatDate('2025-11-05') // "05.11.2025"
 * formatDate('2025-11-05T00:00:00.000Z') // "05.11.2025"
 * formatDate(new Date('2025-11-05')) // "05.11.2025"
 */
export function formatDate(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Преобразует число в текст прописью (для рублей)
 * @param {number} amount - Сумма в рублях
 * @returns {string} - Сумма прописью
 * @example
 * numberToWords(1432500.00)
 * // "Один миллион четыреста тридцать две тысячи пятьсот рублей 00 копеек"
 */
export function numberToWords(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Ноль рублей 00 копеек';
  }

  const num = parseFloat(amount);
  const rubles = Math.floor(num);
  const kopecks = Math.round((num - rubles) * 100);

  const rublesText = convertNumberToWords(rubles);
  const rublesWord = getRubleWord(rubles);
  const kopecksStr = String(kopecks).padStart(2, '0');
  const kopecksWord = getKopeckWord(kopecks);

  return `${rublesText} ${rublesWord} ${kopecksStr} ${kopecksWord}`;
}

/**
 * Преобразует целое число в текст прописью
 * @private
 */
function convertNumberToWords(num) {
  if (num === 0) return 'Ноль';

  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 
                 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 
                'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 
                    'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  const onesForThousands = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];

  const convertGroup = (n, isFeminine = false) => {
    if (n === 0) return '';
    
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    
    const onesList = isFeminine ? onesForThousands : ones;
    
    let result = hundreds[h];
    
    if (t === 1) {
      result += (result ? ' ' : '') + teens[o];
    } else {
      if (t > 0) result += (result ? ' ' : '') + tens[t];
      if (o > 0) result += (result ? ' ' : '') + onesList[o];
    }
    
    return result;
  };

  const getThousandWord = (n) => {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'тысяч';
    if (lastDigit === 1) return 'тысяча';
    if (lastDigit >= 2 && lastDigit <= 4) return 'тысячи';
    return 'тысяч';
  };

  const getMillionWord = (n) => {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'миллионов';
    if (lastDigit === 1) return 'миллион';
    if (lastDigit >= 2 && lastDigit <= 4) return 'миллиона';
    return 'миллионов';
  };

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  let result = '';

  if (millions > 0) {
    result += convertGroup(millions) + ' ' + getMillionWord(millions);
  }

  if (thousands > 0) {
    result += (result ? ' ' : '') + convertGroup(thousands, true) + ' ' + getThousandWord(thousands);
  }

  if (remainder > 0 || num === 0) {
    result += (result ? ' ' : '') + convertGroup(remainder);
  }

  // Первая буква заглавная
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Возвращает правильное склонение слова "рубль"
 * @private
 */
function getRubleWord(n) {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'рублей';
  if (lastDigit === 1) return 'рубль';
  if (lastDigit >= 2 && lastDigit <= 4) return 'рубля';
  return 'рублей';
}

/**
 * Возвращает правильное склонение слова "копейка"
 * @private
 */
function getKopeckWord(n) {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'копеек';
  if (lastDigit === 1) return 'копейка';
  if (lastDigit >= 2 && lastDigit <= 4) return 'копейки';
  return 'копеек';
}
