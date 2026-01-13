# E2E Testing Script
# Запуск E2E тестов (убедитесь что dev сервер запущен!)

Write-Host "🧪 Запуск E2E тестов..." -ForegroundColor Cyan
Write-Host ""

# Проверка что сервер запущен
Write-Host "📡 Проверка серверов..." -ForegroundColor Yellow
try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Frontend: http://localhost:3000 - OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend не запущен на http://localhost:3000" -ForegroundColor Red
    Write-Host "   Запустите: npm run dev" -ForegroundColor Yellow
    exit 1
}

try {
    $backendCheck = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend: http://localhost:3001 - OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend не запущен на http://localhost:3001" -ForegroundColor Red
    Write-Host "   Запустите: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🚀 Серверы работают! Запускаем тесты..." -ForegroundColor Green
Write-Host ""

# Запуск тестов
npx playwright test @args

Write-Host ""
Write-Host "✅ Тесты завершены!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Для просмотра HTML отчёта:" -ForegroundColor Cyan
Write-Host "   npx playwright show-report tests/e2e/reports" -ForegroundColor Yellow
