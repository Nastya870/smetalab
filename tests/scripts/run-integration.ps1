# Запуск integration тестов из папки проекта (PowerShell)
# Запустить из любого места: .\run-integration.ps1

Set-Location "$PSScriptRoot\.."
Write-Host "Working directory: $(Get-Location)"
npm run test:integration
