# Запускает backend и frontend в отдельных процессах (PowerShell)
# Запуск: .\run-servers.ps1

$root = "$PSScriptRoot\.."
Write-Host "Starting servers from: $root"

# Backend (npm run server)
Start-Process -FilePath npm -ArgumentList 'run','server' -WorkingDirectory $root -NoNewWindow
# Frontend (npm run dev)
Start-Process -FilePath npm -ArgumentList 'run','dev' -WorkingDirectory $root -NoNewWindow

Write-Host "Servers запущены (проверьте окна/процессы)."