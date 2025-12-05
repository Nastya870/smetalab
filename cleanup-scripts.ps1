# Скрипт для очистки служебных файлов
# Переносит временные скрипты в архив

$archiveDir = "_archived-scripts"
$rootDir = "."

# Создаем папку архива, если её нет
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
    Write-Host "✅ Создана папка $archiveDir" -ForegroundColor Green
}

# Списки файлов для архивации
$filesToArchive = @(
    # Миграции (применены)
    "add-child-reference-permissions.cjs",
    "add-estimate-templates-view-menu.cjs",
    "add-hierarchical-permissions.cjs",
    "add-manager-permissions.cjs",
    "add-missing-view-menu-permissions.cjs",
    "add-purchases-templates-permissions.cjs",
    "add-tenant-id-to-roles.mjs",
    "add-updated-at-to-roles.mjs",
    "add-users-view-menu-permission.cjs",
    
    # Исправления (применены)
    "fix-admin-role-permissions.cjs",
    "fix-roles-unique-constraint.mjs",
    "fix-supplier-name.cjs",
    "fix-user-role.cjs",
    
    # Очистка (выполнена)
    "cleanup-old-admin-role.cjs",
    "cleanup-unused-permissions.cjs",
    
    # Создание данных (выполнено)
    "create-admin-for-smeta-lab.cjs",
    "create-counterparty-permissions.cjs",
    "create-default-roles-for-existing-tenants.mjs",
    "create-global-admin-template.cjs",
    
    # Удаление (выполнено)
    "delete-smeta-lab-roles.cjs",
    "delete-users-except-main.mjs",
    
    # Синхронизация (выполнена)
    "sync-admin-roles-with-template.cjs",
    "simplify-permissions-hierarchy.cjs",
    "ensure-all-roles.cjs",
    "copy-permissions-to-all-roles.cjs",
    "update-roles.cjs",
    
    # Check-скрипты (избыточные)
    "check-admin-middleware.cjs",
    "check-admin-permissions.cjs",
    "check-admin-roles.cjs",
    "check-all-estimates.cjs",
    "check-all-permissions-in-db.cjs",
    "check-all-roles.cjs",
    "check-all-users-roles.cjs",
    "check-counterparty-perms.cjs",
    "check-estimate-data.cjs",
    "check-isknewcity-permissions.cjs",
    "check-last-user-roles.cjs",
    "check-manager-permissions.cjs",
    "check-manager-perms.cjs",
    "check-permissions-schema.cjs",
    "check-permissions-structure.cjs",
    "check-permissions-table-structure.cjs",
    "check-purchases-templates-permissions.cjs",
    "check-roles-keys.cjs",
    "check-roles-structure.cjs",
    "check-roles-structure.mjs",
    "check-roles-table.mjs",
    "check-supplier.cjs",
    "check-template-and-tenant-permissions.cjs",
    "check-template-materials-structure.mjs",
    "check-tenant-admin-permissions.cjs",
    "check-tenant-roles-permissions.cjs",
    "check-user-menu-permissions.cjs",
    "check-user-permissions-issue.cjs",
    "check-user-permissions.cjs",
    "check-user-permissions.mjs",
    "check-user-role-assignments.cjs",
    "check-user-role-final.cjs",
    "check-user-role.cjs",
    "check-user-structure.cjs",
    "check-user-tenant.cjs",
    "check-user-tenants-link.cjs",
    "check-user-via-api.cjs",
    "check-users-schema-quick.cjs",
    "check-users-schema.cjs",
    "check-users-view-menu.cjs",
    "check-view-menu-permissions.cjs",
    
    # Test-скрипты (избыточные)
    "test-all-users-permissions.cjs",
    "test-current-token.cjs",
    "test-final.cjs",
    "test-hierarchical-permissions.cjs",
    "test-permissions-access.cjs",
    "test-permissions-api.mjs",
    "test-permissions-checkboxes.cjs",
    "test-permissions-ui.cjs",
    "test-permissions-update-rights.cjs",
    "test-real-permissions.cjs",
    "test-roles-access.cjs",
    "test-security-system.cjs",
    "test-tenant-admin-view.cjs",
    "test-ui-permissions-full.cjs",
    "test-user-api-permissions.cjs",
    
    # Диагностика (избыточная)
    "diagnose-permissions-issue.cjs",
    "diagnose-user-permissions.cjs",
    "debug-super-admin-roles.cjs",
    "quick-check-permissions.cjs",
    "quick-check.cjs",
    "count-user-permissions.cjs",
    "final-roles-check.cjs",
    "final-roles-permissions-check.cjs",
    "verify-roles-fix.cjs",
    "verify-user-permissions.cjs",
    "list-all-tables.cjs",
    
    # Устаревшая документация
    "API_SECURITY_IMPLEMENTED.md",
    "API_SECURITY_PLAN.md",
    "FILES_CREATED_LIST.md",
    "FINAL_REPORT.md",
    "HIERARCHY_WORKING_CONFIRMED.md",
    "MENU_UPDATES.md",
    "PERMISSIONS_API_STATUS.md",
    "PERMISSIONS_FIX_INSTRUCTIONS.md",
    "PERMISSIONS_PAGE_READY.md",
    "PERMISSIONS_PROBLEM_SOLVED.md",
    "PERMISSIONS_SYSTEM.md",
    "PERMISSIONS_UI_GUIDE.md",
    "PERMISSIONS_WORKING.md",
    "QUICK_START_UI_PERMISSIONS.md",
    "README_PERMISSIONS.md",
    "ROLES_AND_PERMISSIONS_SETUP_COMPLETE.md",
    "ROLES_UPDATE_COMPLETE.md",
    "TENANT_ISOLATION_COMPLETED.md",
    "UI_PERMISSIONS_READY.md"
)

$movedCount = 0
$notFoundCount = 0

Write-Host "`n🗂️  Начинаем архивацию..." -ForegroundColor Cyan
Write-Host "Всего файлов в списке: $($filesToArchive.Count)`n" -ForegroundColor Yellow

foreach ($file in $filesToArchive) {
    $sourcePath = Join-Path $rootDir $file
    $destPath = Join-Path $archiveDir $file
    
    if (Test-Path $sourcePath) {
        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "✅ Перемещен: $file" -ForegroundColor Green
            $movedCount++
        }
        catch {
            Write-Host "❌ Ошибка при перемещении: $file" -ForegroundColor Red
            Write-Host "   $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⚠️  Не найден: $file" -ForegroundColor DarkGray
        $notFoundCount++
    }
}

Write-Host "`n📊 Итоги:" -ForegroundColor Cyan
Write-Host "✅ Перемещено файлов: $movedCount" -ForegroundColor Green
Write-Host "⚠️  Не найдено файлов: $notFoundCount" -ForegroundColor Yellow
Write-Host "`n🎉 Очистка завершена!" -ForegroundColor Green

# Создаем README в архиве
$readmeContent = @"
# 📦 Архив служебных скриптов

Эта папка содержит временные скрипты, созданные во время разработки системы разрешений.

## 📅 Дата архивации: $(Get-Date -Format "dd.MM.yyyy HH:mm")

## 📋 Содержимое

Все скрипты уже были выполнены и больше не нужны для работы системы:
- **Миграционные скрипты** - применены к БД
- **Диагностические скрипты** - использованы для отладки
- **Тестовые скрипты** - проверка функциональности (пройдена)
- **Устаревшая документация** - заменена актуальными файлами

## ⚠️ Важно

Эти файлы можно безопасно удалить, но сохранены на случай необходимости восстановления или анализа истории разработки.

## 🔍 Актуальные утилиты

Полезные скрипты остались в корне проекта:
- \`check-super-admin-roles.cjs\` - проверка ролей супер-админа
- \`check-global-roles.cjs\` - проверка глобальных ролей
- \`test-get-all-roles.cjs\` - тест логики getAllRoles
- \`decode-jwt-token.cjs\` - декодирование JWT
- \`list-users.mjs\` - список пользователей
- \`list-tenants.mjs\` - список компаний

## 📚 Актуальная документация

- \`PROJECT_OVERVIEW.md\` - главная справка проекта ⭐
- \`PERMISSIONS_REFERENCE.md\` - справка по разрешениям
- \`ROLES_ARCHITECTURE.md\` - архитектура ролей
- \`SECURITY_IMPLEMENTATION_STATUS.md\` - статус безопасности
- \`SUPER_ADMIN_ROLES_DIAGNOSTIC.md\` - диагностика проблемы
"@

$readmePath = Join-Path $archiveDir "README.md"
Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8

Write-Host "`n📄 Создан README.md в архиве" -ForegroundColor Cyan
Write-Host "`nПапка архива: $archiveDir" -ForegroundColor Yellow
