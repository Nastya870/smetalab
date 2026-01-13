// Этот скрипт поможет декодировать JWT токен пользователя
// Попросите пользователя:
// 1. Открыть DevTools (F12)
// 2. Перейти в Application → Local Storage
// 3. Найти ключ с токеном (обычно 'token' или 'authToken')
// 4. Скопировать значение токена
// 5. Вставить его ниже

const jwt = require('jsonwebtoken');

// ВСТАВЬТЕ ТОКЕН СЮДА (между кавычками):
const token = '';

if (!token) {
  console.log('❌ Токен не указан!');
  console.log('\n📋 ИНСТРУКЦИЯ:');
  console.log('1. Откройте браузер где залогинен i.sknewcity@gmail.com');
  console.log('2. Нажмите F12 (откроется DevTools)');
  console.log('3. Перейдите во вкладку Application');
  console.log('4. В левой панели найдите Local Storage → http://localhost:3000');
  console.log('5. Найдите ключ "token" или "authToken"');
  console.log('6. Скопируйте значение (длинная строка)');
  console.log('7. Вставьте в этот файл на строке 10 между кавычками');
  console.log('8. Запустите скрипт снова: node decode-jwt-token.cjs\n');
  process.exit(1);
}

console.log('🔍 Декодирование JWT токена...\n');

try {
  // Декодировать без проверки подписи
  const decoded = jwt.decode(token);
  
  console.log('=' .repeat(80));
  console.log('📋 СОДЕРЖИМОЕ JWT ТОКЕНА:');
  console.log('=' .repeat(80));
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 АНАЛИЗ:');
  console.log('=' .repeat(80));
  
  if (decoded.userId) {
    console.log(`✅ User ID: ${decoded.userId}`);
  }
  
  if (decoded.email) {
    console.log(`✅ Email: ${decoded.email}`);
  }
  
  if (decoded.tenantId) {
    console.log(`✅ Tenant ID: ${decoded.tenantId}`);
  }
  
  if (decoded.roleKey) {
    console.log(`✅ Role Key: ${decoded.roleKey}`);
  }
  
  if (decoded.permissions) {
    console.log(`\n📋 Разрешения в токене: ${decoded.permissions.length}`);
    console.log('\nСписок разрешений:');
    decoded.permissions.forEach((perm, idx) => {
      console.log(`   ${idx + 1}. ${perm}`);
    });
    
    if (decoded.permissions.length !== 46) {
      console.log(`\n⚠️  ПРОБЛЕМА: В токене ${decoded.permissions.length} разрешений вместо 46!`);
      console.log('🔧 РЕШЕНИЕ: Пользователь должен разлогиниться и залогиниться заново');
    } else {
      console.log('\n✅ В токене все 46 разрешений!');
    }
  } else {
    console.log('\n❌ В токене НЕТ разрешений!');
    console.log('🔧 РЕШЕНИЕ: Пользователь должен разлогиниться и залогиниться заново');
  }
  
  if (decoded.exp) {
    const expirationDate = new Date(decoded.exp * 1000);
    const now = new Date();
    const isExpired = expirationDate < now;
    
    console.log(`\n📅 Срок действия токена: ${expirationDate.toLocaleString('ru-RU')}`);
    
    if (isExpired) {
      console.log('❌ Токен ИСТЁК!');
    } else {
      const minutesLeft = Math.floor((expirationDate - now) / 60000);
      console.log(`✅ Токен действителен ещё ${minutesLeft} минут`);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('💡 РЕКОМЕНДАЦИЯ:');
  console.log('=' .repeat(80));
  console.log('Даже если в токене есть 46 разрешений, если пользователь не видит');
  console.log('нужные разделы меню - попросите его:');
  console.log('1. Нажать на аватар в правом верхнем углу');
  console.log('2. Выбрать "Выход" или "Logout"');
  console.log('3. Залогиниться заново с теми же учетными данными');
  console.log('4. Проверить что все разделы меню появились\n');

} catch (error) {
  console.error('❌ Ошибка декодирования токена:', error.message);
  console.log('\n💡 Убедитесь что токен скопирован полностью (может быть очень длинным)');
}
