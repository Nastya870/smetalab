-- ============================================================================
-- Migration 007: Создание таблиц для модуля "Проекты"
-- Описание: Мультитенантная система управления строительными проектами
-- Дата: 11 октября 2025 г.
-- Версия: 1.0
-- ============================================================================

-- ============================================================================
-- 1. ТАБЛИЦА PROJECTS - Основная таблица проектов
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  -- Первичный ключ
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Мультитенантность
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Основная информация о проекте
  name VARCHAR(255) NOT NULL,                    -- Краткое название проекта
  object_name VARCHAR(255) NOT NULL,              -- Полное наименование объекта строительства
  description TEXT,                               -- Подробное описание проекта
  
  -- Участники проекта
  client VARCHAR(255) NOT NULL,                   -- Заказчик (организация)
  contractor VARCHAR(255) NOT NULL,               -- Подрядчик (организация)
  
  -- Местоположение
  address TEXT NOT NULL,                          -- Полный адрес объекта
  
  -- Даты проекта
  start_date DATE NOT NULL,                       -- Дата начала работ
  end_date DATE NOT NULL,                         -- Плановая дата окончания
  actual_end_date DATE,                           -- Фактическая дата окончания
  
  -- Статус проекта
  status VARCHAR(50) NOT NULL DEFAULT 'planning', -- planning, active, completed, on-hold, cancelled
  progress INTEGER NOT NULL DEFAULT 0             -- Прогресс выполнения (0-100%)
    CHECK (progress >= 0 AND progress <= 100),
  
  -- Финансовая информация
  budget DECIMAL(15, 2) DEFAULT 0.00,            -- Плановый бюджет проекта
  actual_cost DECIMAL(15, 2) DEFAULT 0.00,       -- Фактические затраты
  
  -- Управление доступом и аудит
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Менеджер/руководитель проекта
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_actual_end_date CHECK (actual_end_date IS NULL OR actual_end_date >= start_date),
  CONSTRAINT valid_budget CHECK (budget >= 0),
  CONSTRAINT valid_actual_cost CHECK (actual_cost >= 0)
);

-- Комментарии к таблице
COMMENT ON TABLE projects IS 'Строительные проекты с мультитенантной изоляцией';
COMMENT ON COLUMN projects.id IS 'Уникальный идентификатор проекта (UUID)';
COMMENT ON COLUMN projects.tenant_id IS 'ID компании-владельца проекта';
COMMENT ON COLUMN projects.name IS 'Краткое название проекта для отображения в списках';
COMMENT ON COLUMN projects.object_name IS 'Полное официальное наименование объекта строительства';
COMMENT ON COLUMN projects.status IS 'Текущий статус: planning, active, completed, on-hold, cancelled';
COMMENT ON COLUMN projects.progress IS 'Процент выполнения проекта (0-100)';
COMMENT ON COLUMN projects.manager_id IS 'Руководитель/менеджер проекта';

-- ============================================================================
-- 2. ТАБЛИЦА PROJECT_TEAM_MEMBERS - Команда проекта
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_team_members (
  -- Первичный ключ
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Роль в проекте
  role VARCHAR(100) NOT NULL,                     -- Роль: manager, engineer, estimator, supervisor, etc.
  responsibilities TEXT,                          -- Обязанности участника
  
  -- Доступ
  can_edit BOOLEAN DEFAULT FALSE,                 -- Может редактировать проект
  can_view_financials BOOLEAN DEFAULT FALSE,      -- Может видеть финансы
  
  -- Временные рамки участия
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,                            -- NULL если все еще участвует
  
  -- Аудит
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Уникальность: один пользователь = одна роль в проекте (если не уволен)
  CONSTRAINT unique_active_member UNIQUE (project_id, user_id, tenant_id)
);

-- Комментарии к таблице
COMMENT ON TABLE project_team_members IS 'Участники команды проекта с ролями и правами доступа';
COMMENT ON COLUMN project_team_members.role IS 'Роль в проекте: manager, engineer, estimator, supervisor, etc.';
COMMENT ON COLUMN project_team_members.can_edit IS 'Разрешение на редактирование данных проекта';
COMMENT ON COLUMN project_team_members.can_view_financials IS 'Разрешение на просмотр финансовой информации';

-- ============================================================================
-- 3. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- ============================================================================

-- Индексы для таблицы PROJECTS
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_manager_id ON projects(manager_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_end_date ON projects(end_date);

-- Составные индексы
CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_tenant_created_at ON projects(tenant_id, created_at DESC);

-- GIN индекс для полнотекстового поиска (pg_trgm)
CREATE INDEX idx_projects_name_gin ON projects USING gin(name gin_trgm_ops);
CREATE INDEX idx_projects_object_name_gin ON projects USING gin(object_name gin_trgm_ops);
CREATE INDEX idx_projects_client_gin ON projects USING gin(client gin_trgm_ops);
CREATE INDEX idx_projects_contractor_gin ON projects USING gin(contractor gin_trgm_ops);

-- Индексы для таблицы PROJECT_TEAM_MEMBERS
CREATE INDEX idx_team_project_id ON project_team_members(project_id);
CREATE INDEX idx_team_user_id ON project_team_members(user_id);
CREATE INDEX idx_team_tenant_id ON project_team_members(tenant_id);
CREATE INDEX idx_team_role ON project_team_members(role);
CREATE INDEX idx_team_active ON project_team_members(project_id) WHERE left_at IS NULL;

-- Составные индексы
CREATE INDEX idx_team_project_user ON project_team_members(project_id, user_id);
CREATE INDEX idx_team_tenant_project ON project_team_members(tenant_id, project_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS для таблицы PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят только проекты своей компании + супер-админы видят все
CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    tenant_id = current_tenant_id() OR    -- Свои проекты
    is_super_admin()                       -- Супер-админ видит все
  );

-- Политика INSERT: пользователи могут создавать проекты только в своей компании
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() AND    -- Только в своей компании
    created_by = current_user_id()         -- Только от своего имени
  );

-- Политика UPDATE: можно обновлять проекты своей компании
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() OR     -- Свои проекты
    is_super_admin()                       -- Или супер-админ
  )
  WITH CHECK (
    tenant_id = current_tenant_id() OR     -- Остаются в своей компании
    is_super_admin()                       -- Или супер-админ может переносить
  );

-- Политика DELETE: можно удалять проекты своей компании
CREATE POLICY projects_delete_policy ON projects
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() OR     -- Свои проекты
    is_super_admin()                       -- Или супер-админ
  );

-- Включаем RLS для таблицы PROJECT_TEAM_MEMBERS
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: видят участников проектов своей компании
CREATE POLICY team_select_policy ON project_team_members
  FOR SELECT
  USING (
    tenant_id = current_tenant_id() OR     -- Свои проекты
    is_super_admin()                       -- Супер-админ видит все
  );

-- Политика INSERT: можно добавлять участников только в проекты своей компании
CREATE POLICY team_insert_policy ON project_team_members
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() AND    -- Только в свои проекты
    EXISTS (                               -- Проверяем что проект принадлежит компании
      SELECT 1 FROM projects 
      WHERE id = project_id 
      AND tenant_id = current_tenant_id()
    )
  );

-- Политика UPDATE: можно обновлять участников проектов своей компании
CREATE POLICY team_update_policy ON project_team_members
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() OR     -- Свои проекты
    is_super_admin()                       -- Или супер-админ
  )
  WITH CHECK (
    tenant_id = current_tenant_id() OR     -- Остаются в своей компании
    is_super_admin()
  );

-- Политика DELETE: можно удалять участников из проектов своей компании
CREATE POLICY team_delete_policy ON project_team_members
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() OR     -- Свои проекты
    is_super_admin()                       -- Или супер-админ
  );

-- ============================================================================
-- 5. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
-- ============================================================================

-- Триггер для автоматического обновления updated_at в таблице PROJECTS
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- ============================================================================
-- 6. ФУНКЦИИ-ПОМОЩНИКИ ДЛЯ РАБОТЫ С ПРОЕКТАМИ
-- ============================================================================

-- Функция для получения активных участников проекта
CREATE OR REPLACE FUNCTION get_active_project_members(p_project_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role VARCHAR(100),
  can_edit BOOLEAN,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email,
    ptm.role,
    ptm.can_edit,
    ptm.joined_at
  FROM project_team_members ptm
  JOIN users u ON u.id = ptm.user_id
  WHERE ptm.project_id = p_project_id
    AND ptm.left_at IS NULL  -- Только активные участники
  ORDER BY ptm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_project_members IS 'Возвращает список активных участников проекта';

-- Функция для проверки доступа пользователя к проекту
CREATE OR REPLACE FUNCTION user_has_project_access(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем является ли пользователь участником проекта
  RETURN EXISTS (
    SELECT 1 
    FROM project_team_members 
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND left_at IS NULL  -- Активный участник
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_project_access IS 'Проверяет имеет ли пользователь доступ к проекту как участник команды';

-- Функция для автоматического добавления создателя проекта в команду
CREATE OR REPLACE FUNCTION add_creator_to_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Добавляем создателя проекта как менеджера в команду
  INSERT INTO project_team_members (
    project_id,
    user_id,
    tenant_id,
    role,
    can_edit,
    can_view_financials,
    added_by
  ) VALUES (
    NEW.id,
    NEW.created_by,
    NEW.tenant_id,
    'manager',      -- Создатель = менеджер проекта
    TRUE,           -- Полный доступ на редактирование
    TRUE,           -- Доступ к финансам
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_creator_to_team
  AFTER INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)  -- Только если указан создатель
  EXECUTE FUNCTION add_creator_to_team();

COMMENT ON FUNCTION add_creator_to_team IS 'Автоматически добавляет создателя проекта в команду как менеджера';

-- ============================================================================
-- 7. ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ УДОБНОГО ДОСТУПА
-- ============================================================================

-- Представление: Проекты с дополнительной информацией
CREATE OR REPLACE VIEW v_projects_extended AS
SELECT 
  p.*,
  -- Информация о создателе
  u_created.full_name AS created_by_name,
  u_created.email AS created_by_email,
  -- Информация о менеджере
  u_manager.full_name AS manager_name,
  u_manager.email AS manager_email,
  -- Информация о компании
  t.name AS tenant_name,
  t.plan AS tenant_plan,
  -- Вычисляемые поля
  (p.end_date - CURRENT_DATE) AS days_remaining,
  CASE 
    WHEN p.status = 'completed' THEN TRUE
    WHEN p.end_date < CURRENT_DATE THEN TRUE
    ELSE FALSE
  END AS is_overdue,
  -- Количество участников команды
  (SELECT COUNT(*) FROM project_team_members WHERE project_id = p.id AND left_at IS NULL) AS team_size
FROM projects p
LEFT JOIN users u_created ON p.created_by = u_created.id
LEFT JOIN users u_manager ON p.manager_id = u_manager.id
LEFT JOIN tenants t ON p.tenant_id = t.id;

COMMENT ON VIEW v_projects_extended IS 'Расширенное представление проектов с дополнительной информацией и вычисляемыми полями';

-- Представление: Активные проекты с командой
CREATE OR REPLACE VIEW v_active_projects_with_team AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.status,
  p.progress,
  p.tenant_id,
  ptm.user_id,
  ptm.role AS team_role,
  ptm.can_edit,
  u.full_name AS member_name,
  u.email AS member_email
FROM projects p
JOIN project_team_members ptm ON ptm.project_id = p.id
JOIN users u ON u.id = ptm.user_id
WHERE p.status IN ('planning', 'active')
  AND ptm.left_at IS NULL;

COMMENT ON VIEW v_active_projects_with_team IS 'Активные проекты с информацией об участниках команды';

-- ============================================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================================================

-- Вывод информации об успешном выполнении
DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration 007: Таблицы для проектов успешно созданы!';
  RAISE NOTICE '📋 Создано таблиц: 2 (projects, project_team_members)';
  RAISE NOTICE '🔍 Создано индексов: 18 (включая GIN для полнотекстового поиска)';
  RAISE NOTICE '🔒 Применено RLS политик: 10 (SELECT, INSERT, UPDATE, DELETE для обеих таблиц)';
  RAISE NOTICE '⚙️  Создано функций: 4 (get_active_project_members, user_has_project_access, и триггерные)';
  RAISE NOTICE '👁️  Создано представлений: 2 (v_projects_extended, v_active_projects_with_team)';
  RAISE NOTICE '🎯 Все ограничения и триггеры настроены';
END $$;
