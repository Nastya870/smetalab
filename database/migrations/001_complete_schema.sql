-- =====================================
-- BASELINE SCHEMA - SmetaLab
-- Сгенерировано: 2026-01-13T11:17:24.660Z
-- 
-- Этот файл содержит полную схему БД
-- Использовать ТОЛЬКО для новых деплоев!
-- =====================================

-- =====================================
-- РАСШИРЕНИЯ
-- =====================================

CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================
-- ПОСЛЕДОВАТЕЛЬНОСТИ
-- =====================================

CREATE SEQUENCE IF NOT EXISTS "works_id_seq";
CREATE SEQUENCE IF NOT EXISTS "materials_id_seq";
CREATE SEQUENCE IF NOT EXISTS "work_hierarchy_id_seq";
CREATE SEQUENCE IF NOT EXISTS "work_materials_id_seq";

-- =====================================
-- ФУНКЦИИ
-- =====================================

CREATE OR REPLACE FUNCTION public.add_creator_to_team()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_estimate_item_final_price()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Расчёт: базовая цена + накладные + прибыль + НДС
  NEW.final_price := NEW.total_price * 
    (1 + COALESCE(NEW.overhead_percent, 0) / 100) * 
    (1 + COALESCE(NEW.profit_percent, 0) / 100) * 
    (1 + COALESCE(NEW.tax_percent, 0) / 100);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_tenant_data(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    -- Супер-админ имеет доступ ко всем данным
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Проверяем, что пользователь член тенанта
    -- И что текущий tenant_id сессии совпадает с tenant_id записи
    RETURN is_member_of_tenant(p_tenant_id) AND 
           (current_tenant_id() = p_tenant_id OR current_tenant_id() IS NULL);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_ui_visibility(p_user_id uuid, p_resource text, p_action text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_is_visible BOOLEAN;
BEGIN
  -- Проверяем, есть ли у пользователя разрешение И оно НЕ скрыто
  SELECT EXISTS(
    SELECT 1
    FROM user_role_assignments ura
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = p_user_id
      AND p.resource = p_resource
      AND p.action = p_action
      AND rp.is_hidden = FALSE
  ) INTO v_is_visible;
  
  RETURN v_is_visible;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.citext(inet)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$network_show$function$
;

CREATE OR REPLACE FUNCTION public.citext(character)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$rtrim1$function$
;

CREATE OR REPLACE FUNCTION public.citext(boolean)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$booltext$function$
;

CREATE OR REPLACE FUNCTION public.citext_cmp(citext, citext)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_cmp$function$
;

CREATE OR REPLACE FUNCTION public.citext_eq(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_eq$function$
;

CREATE OR REPLACE FUNCTION public.citext_ge(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_ge$function$
;

CREATE OR REPLACE FUNCTION public.citext_gt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_gt$function$
;

CREATE OR REPLACE FUNCTION public.citext_hash(citext)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_hash$function$
;

CREATE OR REPLACE FUNCTION public.citext_hash_extended(citext, bigint)
 RETURNS bigint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_hash_extended$function$
;

CREATE OR REPLACE FUNCTION public.citext_larger(citext, citext)
 RETURNS citext
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_larger$function$
;

CREATE OR REPLACE FUNCTION public.citext_le(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_le$function$
;

CREATE OR REPLACE FUNCTION public.citext_lt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_lt$function$
;

CREATE OR REPLACE FUNCTION public.citext_ne(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_ne$function$
;

CREATE OR REPLACE FUNCTION public.citext_pattern_cmp(citext, citext)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_cmp$function$
;

CREATE OR REPLACE FUNCTION public.citext_pattern_ge(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_ge$function$
;

CREATE OR REPLACE FUNCTION public.citext_pattern_gt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_gt$function$
;

CREATE OR REPLACE FUNCTION public.citext_pattern_le(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_le$function$
;

CREATE OR REPLACE FUNCTION public.citext_pattern_lt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_lt$function$
;

CREATE OR REPLACE FUNCTION public.citext_smaller(citext, citext)
 RETURNS citext
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_smaller$function$
;

CREATE OR REPLACE FUNCTION public.citextin(cstring)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$textin$function$
;

CREATE OR REPLACE FUNCTION public.citextout(citext)
 RETURNS cstring
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$textout$function$
;

CREATE OR REPLACE FUNCTION public.citextrecv(internal)
 RETURNS citext
 LANGUAGE internal
 STABLE PARALLEL SAFE STRICT
AS $function$textrecv$function$
;

CREATE OR REPLACE FUNCTION public.citextsend(citext)
 RETURNS bytea
 LANGUAGE internal
 STABLE PARALLEL SAFE STRICT
AS $function$textsend$function$
;

CREATE OR REPLACE FUNCTION public.clear_session_context()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM set_config('app.user_id', '', FALSE);
    PERFORM set_config('app.tenant_id', '', FALSE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.copy_global_materials_to_tenant(target_tenant_id uuid, target_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  copied_count INTEGER := 0;
BEGIN
  -- Копируем все глобальные материалы для нового тенанта
  INSERT INTO materials (
    sku, name, image, unit, price, supplier, weight, 
    category, product_url, show_image, 
    tenant_id, created_by, is_global
  )
  SELECT 
    sku || '-COPY-' || target_tenant_id::TEXT, -- Уникальный SKU
    name,
    image,
    unit,
    price,
    supplier,
    weight,
    category,
    product_url,
    show_image,
    target_tenant_id,
    target_user_id,
    FALSE  -- Копии - это тенантные записи
  FROM materials
  WHERE is_global = TRUE;
  
  GET DIAGNOSTICS copied_count = ROW_COUNT;
  RETURN copied_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.copy_global_works_to_tenant(target_tenant_id uuid, target_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  copied_count INTEGER := 0;
BEGIN
  INSERT INTO works (
    code, name, category, unit, base_price, 
    tenant_id, created_by, is_global
  )
  SELECT 
    code || '-COPY-' || target_tenant_id::TEXT,
    name,
    category,
    unit,
    base_price,
    target_tenant_id,
    target_user_id,
    FALSE
  FROM works
  WHERE is_global = TRUE;
  
  GET DIAGNOSTICS copied_count = ROW_COUNT;
  RETURN copied_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.copy_material_weight()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Копируем вес из справочника materials, если не указан явно
  IF NEW.weight IS NULL OR NEW.weight = 0 THEN
    SELECT COALESCE(weight, 0) INTO NEW.weight
    FROM materials
    WHERE id = NEW.material_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_contract_number(p_tenant_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_date_part VARCHAR(8);
    v_counter INTEGER;
    v_contract_number VARCHAR(50);
BEGIN
    -- Формируем дату YYYYMMDD
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Получаем следующий номер для этой даты
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(contract_number FROM 'ДОГ-[0-9]+-([0-9]+)') 
            AS INTEGER
        )
    ), 0) + 1
    INTO v_counter
    FROM projects
    WHERE tenant_id = p_tenant_id
      AND contract_number LIKE 'ДОГ-' || v_date_part || '-%';
    
    -- Формируем итоговый номер
    v_contract_number := 'ДОГ-' || v_date_part || '-' || LPAD(v_counter::TEXT, 3, '0');
    
    RETURN v_contract_number;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_contract_number_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Если номер договора не указан, генерируем автоматически
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := generate_contract_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_project_members(p_project_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, email text, role character varying, can_edit boolean, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_estimate_statistics(p_estimate_id uuid)
 RETURNS TABLE(items_count bigint, works_count bigint, materials_count bigint, total_quantity numeric, base_total numeric, final_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS items_count,
    COUNT(*) FILTER (WHERE item_type = 'work')::BIGINT AS works_count,
    COUNT(*) FILTER (WHERE item_type = 'material')::BIGINT AS materials_count,
    COALESCE(SUM(quantity), 0) AS total_quantity,
    COALESCE(SUM(total_price), 0) AS base_total,
    COALESCE(SUM(final_price), 0) AS final_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

CREATE OR REPLACE FUNCTION public.is_member_of_tenant(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_is_member BOOLEAN;
BEGIN
    v_user_id := current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Супер-админ имеет доступ ко всем тенантам
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    SELECT EXISTS (
        SELECT 1
        FROM user_tenants ut
        WHERE ut.user_id = v_user_id
          AND ut.tenant_id = p_tenant_id
    ) INTO v_is_member;
    
    RETURN COALESCE(v_is_member, FALSE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_is_super BOOLEAN;
BEGIN
    v_user_id := current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = v_user_id
          AND r.key = 'super_admin'
    ) INTO v_is_super;
    
    RETURN COALESCE(v_is_super, FALSE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.populate_counterparty_details()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Если указан contractor_id, заполняем данные подрядчика
    IF NEW.contractor_id IS NOT NULL AND NEW.contractor_name IS NULL THEN
        SELECT 
            COALESCE(company_name, full_name),
            inn,
            kpp,
            ogrn,
            COALESCE(legal_address, registration_address)
        INTO 
            NEW.contractor_name,
            NEW.contractor_inn,
            NEW.contractor_kpp,
            NEW.contractor_ogrn,
            NEW.contractor_address
        FROM counterparties
        WHERE id = NEW.contractor_id
          AND tenant_id = NEW.tenant_id;
    END IF;
    
    -- Если указан customer_id, заполняем данные заказчика
    IF NEW.customer_id IS NOT NULL AND NEW.customer_name IS NULL THEN
        SELECT 
            COALESCE(company_name, full_name),
            inn,
            kpp,
            ogrn,
            COALESCE(legal_address, registration_address)
        INTO 
            NEW.customer_name,
            NEW.customer_inn,
            NEW.customer_kpp,
            NEW.customer_ogrn,
            NEW.customer_address
        FROM counterparties
        WHERE id = NEW.customer_id
          AND tenant_id = NEW.tenant_id;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_estimate_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE estimates
  SET total_amount = (
    SELECT COALESCE(SUM(COALESCE(final_price, total_price)), 0)
    FROM estimate_items
    WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id)
  )
  WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.regexp_match(string citext, pattern citext, flags text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_match((string)::text, (pattern)::text, CASE WHEN (strpos(flags, 'c'::text) = 0) THEN (flags || 'i'::text) ELSE flags END)
;

CREATE OR REPLACE FUNCTION public.regexp_match(string citext, pattern citext)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_match((string)::text, (pattern)::text, 'i'::text)
;

CREATE OR REPLACE FUNCTION public.regexp_matches(string citext, pattern citext, flags text)
 RETURNS SETOF text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT ROWS 10
RETURN regexp_matches((string)::text, (pattern)::text, CASE WHEN (strpos(flags, 'c'::text) = 0) THEN (flags || 'i'::text) ELSE flags END)
;

CREATE OR REPLACE FUNCTION public.regexp_matches(string citext, pattern citext)
 RETURNS SETOF text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT ROWS 1
RETURN regexp_matches((string)::text, (pattern)::text, 'i'::text)
;

CREATE OR REPLACE FUNCTION public.regexp_replace(string citext, pattern citext, replacement text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_replace((string)::text, (pattern)::text, replacement, 'i'::text)
;

CREATE OR REPLACE FUNCTION public.regexp_replace(string citext, pattern citext, replacement text, flags text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_replace((string)::text, (pattern)::text, replacement, CASE WHEN (strpos(flags, 'c'::text) = 0) THEN (flags || 'i'::text) ELSE flags END)
;

CREATE OR REPLACE FUNCTION public.regexp_split_to_array(string citext, pattern citext)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_split_to_array((string)::text, (pattern)::text, 'i'::text)
;

CREATE OR REPLACE FUNCTION public.regexp_split_to_array(string citext, pattern citext, flags text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_split_to_array((string)::text, (pattern)::text, CASE WHEN (strpos(flags, 'c'::text) = 0) THEN (flags || 'i'::text) ELSE flags END)
;

CREATE OR REPLACE FUNCTION public.regexp_split_to_table(string citext, pattern citext)
 RETURNS SETOF text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_split_to_table((string)::text, (pattern)::text, 'i'::text)
;

CREATE OR REPLACE FUNCTION public.regexp_split_to_table(string citext, pattern citext, flags text)
 RETURNS SETOF text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_split_to_table((string)::text, (pattern)::text, CASE WHEN (strpos(flags, 'c'::text) = 0) THEN (flags || 'i'::text) ELSE flags END)
;

CREATE OR REPLACE FUNCTION public.replace(citext, citext, citext)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN regexp_replace(($1)::text, regexp_replace(($2)::text, '([^a-zA-Z_0-9])'::text, '\\\1'::text, 'g'::text), ($3)::text, 'gi'::text)
;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

CREATE OR REPLACE FUNCTION public.set_session_context(p_user_id uuid, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM set_config('app.user_id', p_user_id::TEXT, FALSE);
    
    IF p_tenant_id IS NOT NULL THEN
        PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, FALSE);
    ELSE
        PERFORM set_config('app.tenant_id', '', FALSE);
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.split_part(citext, citext, integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN (regexp_split_to_array(($1)::text, regexp_replace(($2)::text, '([^a-zA-Z_0-9])'::text, '\\\1'::text, 'g'::text), 'i'::text))[$3]
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.strpos(citext, citext)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN strpos(lower(($1)::text), lower(($2)::text))
;

CREATE OR REPLACE FUNCTION public.texticlike(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticlike$function$
;

CREATE OR REPLACE FUNCTION public.texticlike(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticlike$function$
;

CREATE OR REPLACE FUNCTION public.texticnlike(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticnlike$function$
;

CREATE OR REPLACE FUNCTION public.texticnlike(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticnlike$function$
;

CREATE OR REPLACE FUNCTION public.texticregexeq(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexeq$function$
;

CREATE OR REPLACE FUNCTION public.texticregexeq(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexeq$function$
;

CREATE OR REPLACE FUNCTION public.texticregexne(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexne$function$
;

CREATE OR REPLACE FUNCTION public.texticregexne(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexne$function$
;

CREATE OR REPLACE FUNCTION public.translate(citext, citext, text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
RETURN translate(translate(($1)::text, lower(($2)::text), $3), upper(($2)::text), $3)
;

CREATE OR REPLACE FUNCTION public.update_contracts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_estimate_item_materials_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_estimates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_materials_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_work_completion_acts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_work_completions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_project_access(p_user_id uuid, p_project_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

CREATE OR REPLACE FUNCTION public.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

CREATE OR REPLACE FUNCTION public.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

CREATE OR REPLACE FUNCTION public.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

CREATE OR REPLACE FUNCTION public.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

CREATE OR REPLACE FUNCTION public.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

CREATE OR REPLACE FUNCTION public.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

CREATE OR REPLACE FUNCTION public.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

CREATE OR REPLACE FUNCTION public.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;

-- =====================================
-- ТАБЛИЦЫ
-- =====================================

-- act_signatories
CREATE TABLE IF NOT EXISTS act_signatories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  act_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  signed_at date,
  created_at timestamp with time zone DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  parent_id uuid,
  name text NOT NULL,
  type text DEFAULT 'work',
  tenant_id uuid,
  is_global boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- contracts
CREATE TABLE IF NOT EXISTS contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  estimate_id uuid NOT NULL,
  contract_number VARCHAR(50) NOT NULL,
  contract_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid,
  contractor_id uuid,
  total_amount numeric NOT NULL DEFAULT 0.00,
  materials_amount numeric DEFAULT 0.00,
  warranty_period VARCHAR(100) DEFAULT '1 год',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  template_data jsonb NOT NULL DEFAULT '{}',
  file_url text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- counterparties
CREATE TABLE IF NOT EXISTS counterparties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entity_type VARCHAR(20) NOT NULL,
  full_name VARCHAR(255),
  birth_date date,
  birth_place text,
  passport_series_number VARCHAR(50),
  passport_issued_by text,
  passport_issue_date date,
  registration_address text,
  company_name VARCHAR(500),
  inn VARCHAR(12),
  ogrn VARCHAR(15),
  kpp VARCHAR(9),
  legal_address text,
  actual_address text,
  bank_account VARCHAR(20),
  correspondent_account VARCHAR(20),
  bank_bik VARCHAR(9),
  bank_name VARCHAR(500),
  director_name VARCHAR(255),
  accountant_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  passport_series VARCHAR(4),
  passport_number VARCHAR(6),
  passport_issued_by_code VARCHAR(7)
);

-- email_verification_tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token VARCHAR(64) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- email_verifications
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email citext NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- estimate_item_materials
CREATE TABLE IF NOT EXISTS estimate_item_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  estimate_item_id uuid NOT NULL,
  material_id integer NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric,
  consumption_coefficient numeric DEFAULT 1.0,
  is_required boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  auto_calculate boolean DEFAULT true,
  weight numeric DEFAULT 0,
  total_weight numeric,
  material_name VARCHAR(255),
  material_sku VARCHAR(100),
  material_unit VARCHAR(50)
);

-- estimate_items
CREATE TABLE IF NOT EXISTS estimate_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL,
  position_number integer NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description text,
  code VARCHAR(100),
  unit VARCHAR(50) NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric,
  overhead_percent numeric DEFAULT 0,
  profit_percent numeric DEFAULT 0,
  tax_percent numeric DEFAULT 0,
  final_price numeric,
  notes text,
  is_optional boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source_type text NOT NULL DEFAULT 'tenant',
  phase VARCHAR(100),
  section VARCHAR(100),
  subsection VARCHAR(100),
  work_id integer
);

-- estimate_template_materials
CREATE TABLE IF NOT EXISTS estimate_template_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  material_id integer NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  template_work_id uuid
);

-- estimate_template_works
CREATE TABLE IF NOT EXISTS estimate_template_works (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  work_id integer NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  phase VARCHAR(100),
  section VARCHAR(100),
  subsection VARCHAR(100),
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now()
);

-- estimate_templates
CREATE TABLE IF NOT EXISTS estimate_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name VARCHAR(255) NOT NULL,
  description text,
  category VARCHAR(100),
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- estimates
CREATE TABLE IF NOT EXISTS estimates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name VARCHAR(255) NOT NULL,
  description text,
  estimate_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  total_amount numeric DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'RUB',
  estimate_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  approved_at timestamp with time zone,
  approved_by uuid,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- global_purchases
CREATE TABLE IF NOT EXISTS global_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  estimate_id uuid NOT NULL,
  material_id integer NOT NULL,
  material_sku VARCHAR(100),
  material_name text NOT NULL,
  material_image text,
  unit VARCHAR(50) NOT NULL,
  category VARCHAR(255),
  quantity numeric NOT NULL,
  purchase_price numeric NOT NULL,
  total_price numeric NOT NULL,
  source_purchase_id uuid,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  project_name text,
  estimate_name text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_extra_charge boolean DEFAULT false
);

-- materials
CREATE TABLE IF NOT EXISTS materials (
  id integer NOT NULL DEFAULT nextval('materials_id_seq'),
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  image text,
  unit VARCHAR(50) NOT NULL,
  price numeric NOT NULL DEFAULT 0.00,
  supplier VARCHAR(255),
  weight numeric,
  category VARCHAR(100) NOT NULL,
  product_url text,
  show_image boolean DEFAULT true,
  tenant_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_global boolean DEFAULT false,
  sku_number integer
);

-- object_openings
CREATE TABLE IF NOT EXISTS object_openings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  parameter_id uuid NOT NULL,
  opening_type VARCHAR(50) NOT NULL,
  position_number integer NOT NULL,
  height numeric NOT NULL,
  width numeric NOT NULL,
  slope_length numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- object_parameters
CREATE TABLE IF NOT EXISTS object_parameters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  estimate_id uuid NOT NULL,
  position_number integer NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  perimeter numeric,
  height numeric,
  floor_area numeric,
  wall_area numeric,
  ceiling_area numeric,
  ceiling_slopes numeric,
  doors_count integer DEFAULT 0,
  baseboards numeric,
  total_window_slopes numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- password_resets
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email citext NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- permissions
CREATE TABLE IF NOT EXISTS permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_hidden boolean DEFAULT false
);

-- project_team_members
CREATE TABLE IF NOT EXISTS project_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role VARCHAR(100) NOT NULL,
  responsibilities text,
  can_edit boolean DEFAULT false,
  can_view_financials boolean DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  added_by uuid
);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name VARCHAR(255) NOT NULL,
  object_name VARCHAR(255) NOT NULL,
  description text,
  client VARCHAR(255) NOT NULL,
  contractor VARCHAR(255) NOT NULL,
  address text NOT NULL,
  start_date date,
  end_date date,
  actual_end_date date,
  status VARCHAR(50) NOT NULL DEFAULT 'planning',
  progress integer NOT NULL DEFAULT 0,
  budget numeric DEFAULT 0.00,
  actual_cost numeric DEFAULT 0.00,
  created_by uuid,
  updated_by uuid,
  manager_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  contract_number VARCHAR(50)
);

-- purchases
CREATE TABLE IF NOT EXISTS purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  estimate_id uuid NOT NULL,
  material_id integer NOT NULL,
  material_sku VARCHAR(100),
  material_name text NOT NULL,
  category VARCHAR(255),
  unit VARCHAR(50) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  material_image text,
  purchased_quantity numeric DEFAULT 0,
  is_extra_charge boolean DEFAULT false
);

-- role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_hidden boolean DEFAULT false
);

-- roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid
);

-- schedules
CREATE TABLE IF NOT EXISTS schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  estimate_id uuid NOT NULL,
  phase VARCHAR(255) NOT NULL,
  work_id uuid,
  work_code VARCHAR(50),
  work_name text NOT NULL,
  unit VARCHAR(50) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  position_number integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- schema_version
CREATE TABLE IF NOT EXISTS schema_version (
  id integer NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  description text NOT NULL
);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  refresh_token text NOT NULL,
  device_info text,
  ip_address inet,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone DEFAULT now()
);

-- tenants
CREATE TABLE IF NOT EXISTS tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text DEFAULT 'free',
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_full_name text,
  inn VARCHAR(12),
  ogrn VARCHAR(15),
  kpp VARCHAR(9),
  legal_address text,
  actual_address text,
  bank_account VARCHAR(20),
  correspondent_account VARCHAR(20),
  bank_bik VARCHAR(9),
  bank_name text,
  director_name text,
  accountant_name text,
  logo_url text
);

-- user_role_assignments
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid
);

-- user_tenants
CREATE TABLE IF NOT EXISTS user_tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_default boolean DEFAULT false,
  joined_at timestamp with time zone DEFAULT now()
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email citext NOT NULL,
  phone text,
  pass_hash text NOT NULL,
  full_name text,
  avatar_url text,
  status text DEFAULT 'active',
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- vector_index_state
CREATE TABLE IF NOT EXISTS vector_index_state (
  document_id VARCHAR(255) NOT NULL,
  scope VARCHAR(10) NOT NULL,
  tenant_id uuid,
  entity_type VARCHAR(20) NOT NULL,
  db_id text NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- work_completion_act_items
CREATE TABLE IF NOT EXISTS work_completion_act_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  act_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  estimate_item_id uuid NOT NULL,
  work_id integer,
  work_code VARCHAR(50),
  work_name text NOT NULL,
  section VARCHAR(255),
  subsection VARCHAR(255),
  unit VARCHAR(50),
  planned_quantity numeric,
  actual_quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  position_number integer,
  created_at timestamp with time zone DEFAULT now()
);

-- work_completion_acts
CREATE TABLE IF NOT EXISTS work_completion_acts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  estimate_id uuid NOT NULL,
  project_id uuid NOT NULL,
  act_type VARCHAR(20) NOT NULL,
  act_number VARCHAR(50) NOT NULL,
  act_date date NOT NULL DEFAULT CURRENT_DATE,
  period_from date,
  period_to date,
  total_amount numeric NOT NULL DEFAULT 0,
  total_quantity numeric NOT NULL DEFAULT 0,
  work_count integer DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  contractor_id uuid,
  contractor_name VARCHAR(500),
  contractor_inn VARCHAR(12),
  contractor_kpp VARCHAR(9),
  contractor_ogrn VARCHAR(15),
  contractor_address text,
  customer_id uuid,
  customer_name VARCHAR(500),
  customer_inn VARCHAR(12),
  customer_kpp VARCHAR(9),
  customer_ogrn VARCHAR(15),
  customer_address text,
  contract_number VARCHAR(100),
  contract_date date,
  contract_subject text,
  construction_object VARCHAR(500),
  construction_address text,
  construction_okpd VARCHAR(20),
  form_type VARCHAR(10) DEFAULT 'ks2-ks3',
  chief_contractor_name VARCHAR(255),
  chief_contractor_position VARCHAR(255),
  chief_customer_name VARCHAR(255),
  chief_customer_position VARCHAR(255),
  inspector_name VARCHAR(255),
  inspector_position VARCHAR(255),
  total_amount_ytd numeric,
  prev_period_amount numeric,
  current_period_amount numeric
);

-- work_completions
CREATE TABLE IF NOT EXISTS work_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL,
  estimate_item_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  completed boolean DEFAULT false,
  actual_quantity numeric DEFAULT 0,
  actual_total numeric DEFAULT 0,
  completion_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  last_act_id uuid
);

-- work_hierarchy
CREATE TABLE IF NOT EXISTS work_hierarchy (
  id integer NOT NULL DEFAULT nextval('work_hierarchy_id_seq'),
  level VARCHAR(20) NOT NULL,
  parent_value VARCHAR(100),
  value VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  sort_order integer DEFAULT 0,
  is_global boolean DEFAULT false,
  tenant_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- work_materials
CREATE TABLE IF NOT EXISTS work_materials (
  id integer NOT NULL DEFAULT nextval('work_materials_id_seq'),
  work_id integer NOT NULL,
  material_id integer NOT NULL,
  consumption numeric NOT NULL DEFAULT 1.0,
  is_required boolean DEFAULT true,
  notes text,
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid
);

-- works
CREATE TABLE IF NOT EXISTS works (
  id integer NOT NULL DEFAULT nextval('works_id_seq'),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  base_price numeric NOT NULL DEFAULT 0.00,
  tenant_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_global boolean DEFAULT false,
  phase VARCHAR(100),
  section VARCHAR(100),
  subsection VARCHAR(100),
  category VARCHAR(100),
  category_id uuid
);

-- =====================================
-- PRIMARY KEYS & UNIQUE CONSTRAINTS
-- =====================================

ALTER TABLE categories ADD CONSTRAINT categories_parent_id_name_tenant_id_is_global_key UNIQUE (parent_id, name, tenant_id, is_global);
ALTER TABLE categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE counterparties ADD CONSTRAINT counterparties_pkey PRIMARY KEY (id);
ALTER TABLE estimate_items ADD CONSTRAINT estimate_items_pkey PRIMARY KEY (id);
ALTER TABLE estimates ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);
ALTER TABLE materials ADD CONSTRAINT materials_pkey PRIMARY KEY (id);
ALTER TABLE permissions ADD CONSTRAINT permissions_key_unique UNIQUE (key);
ALTER TABLE permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE permissions ADD CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action);
ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id);
ALTER TABLE roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE schema_version ADD CONSTRAINT schema_version_pkey PRIMARY KEY (id);
ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
ALTER TABLE tenants ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);
ALTER TABLE user_role_assignments ADD CONSTRAINT user_role_assignments_unique UNIQUE (tenant_id, user_id, role_id);
ALTER TABLE user_tenants ADD CONSTRAINT user_tenants_unique UNIQUE (tenant_id, user_id);
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE vector_index_state ADD CONSTRAINT mixedbread_index_state_pkey PRIMARY KEY (document_id);
ALTER TABLE work_hierarchy ADD CONSTRAINT work_hierarchy_pkey PRIMARY KEY (id);
ALTER TABLE work_materials ADD CONSTRAINT work_materials_pkey PRIMARY KEY (id);
ALTER TABLE works ADD CONSTRAINT works_code_scope_unique UNIQUE (code, is_global, tenant_id);
ALTER TABLE works ADD CONSTRAINT works_pkey PRIMARY KEY (id);

-- =====================================
-- FOREIGN KEYS
-- =====================================

ALTER TABLE categories ADD CONSTRAINT categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE categories ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE materials ADD CONSTRAINT materials_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE work_materials ADD CONSTRAINT work_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;
ALTER TABLE work_materials ADD CONSTRAINT work_materials_work_id_fkey FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE;
ALTER TABLE works ADD CONSTRAINT works_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE works ADD CONSTRAINT works_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id);

-- =====================================
-- ИНДЕКСЫ
-- =====================================

CREATE INDEX IF NOT EXISTS idx_act_signatories_act_id ON public.act_signatories USING btree (act_id);
CREATE INDEX IF NOT EXISTS idx_act_signatories_role ON public.act_signatories USING btree (role);
CREATE INDEX IF NOT EXISTS idx_act_signatories_tenant_id ON public.act_signatories USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories USING btree (type);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_date ON public.contracts USING btree (contract_date DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON public.contracts USING btree (contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON public.contracts USING btree (contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON public.contracts USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_estimate_status ON public.contracts USING btree (estimate_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON public.contracts USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contracts_template_data ON public.contracts USING gin (template_data);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_company_name ON public.counterparties USING btree (company_name) WHERE ((entity_type)::text = 'legal'::text);
CREATE INDEX IF NOT EXISTS idx_counterparties_email ON public.counterparties USING btree (email);
CREATE INDEX IF NOT EXISTS idx_counterparties_entity_type ON public.counterparties USING btree (entity_type);
CREATE INDEX IF NOT EXISTS idx_counterparties_full_name ON public.counterparties USING btree (full_name) WHERE ((entity_type)::text = 'individual'::text);
CREATE INDEX IF NOT EXISTS idx_counterparties_inn ON public.counterparties USING btree (inn) WHERE ((entity_type)::text = 'legal'::text);
CREATE INDEX IF NOT EXISTS idx_counterparties_phone ON public.counterparties USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_counterparties_tenant_id ON public.counterparties USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON public.email_verification_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications USING btree (email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON public.email_verifications USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON public.email_verifications USING btree (token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON public.email_verifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_item_materials_material_id ON public.estimate_item_materials USING btree (material_id);
CREATE UNIQUE INDEX idx_estimate_item_materials_unique ON public.estimate_item_materials USING btree (estimate_item_id, material_id);
CREATE INDEX IF NOT EXISTS idx_estimate_item_materials_weight ON public.estimate_item_materials USING btree (weight) WHERE (weight > (0)::numeric);
CREATE INDEX IF NOT EXISTS idx_estimate_items_item_type ON public.estimate_items USING btree (item_type);
CREATE INDEX IF NOT EXISTS idx_estimate_items_position ON public.estimate_items USING btree (estimate_id, position_number);
CREATE INDEX IF NOT EXISTS idx_estimate_template_materials_material_id ON public.estimate_template_materials USING btree (material_id);
CREATE INDEX IF NOT EXISTS idx_estimate_template_materials_sort_order ON public.estimate_template_materials USING btree (template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_estimate_template_works_sort_order ON public.estimate_template_works USING btree (template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_estimate_template_works_work_id ON public.estimate_template_works USING btree (work_id);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_category ON public.estimate_templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_created_by ON public.estimate_templates USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_tenant_id ON public.estimate_templates USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON public.estimates USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON public.estimates USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_estimate_date ON public.estimates USING btree (estimate_date DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_name_gin ON public.estimates USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_estimates_project_status ON public.estimates USING btree (project_id, status);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates USING btree (status);
CREATE INDEX IF NOT EXISTS idx_estimates_tenant_project ON public.estimates USING btree (tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_tenant_status ON public.estimates USING btree (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_global_purchases_date ON public.global_purchases USING btree (purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_global_purchases_estimate ON public.global_purchases USING btree (estimate_id);
CREATE INDEX IF NOT EXISTS idx_global_purchases_material ON public.global_purchases USING btree (material_id);
CREATE INDEX IF NOT EXISTS idx_global_purchases_project ON public.global_purchases USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_global_purchases_tenant_date ON public.global_purchases USING btree (tenant_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_materials_category_gin ON public.materials USING gin (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_category_global ON public.materials USING btree (category, is_global, sku_number);
CREATE INDEX IF NOT EXISTS idx_materials_global_only ON public.materials USING btree (sku_number) WHERE (is_global = true);
CREATE INDEX IF NOT EXISTS idx_materials_is_global_category ON public.materials USING btree (is_global, category);
CREATE INDEX IF NOT EXISTS idx_materials_is_global_sku ON public.materials USING btree (is_global DESC, sku);
CREATE INDEX IF NOT EXISTS idx_materials_name_trgm ON public.materials USING gin (lower((name)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_sku ON public.materials USING btree (sku);
CREATE INDEX IF NOT EXISTS idx_materials_sku_trgm ON public.materials USING gin (lower((sku)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_supplier_trgm ON public.materials USING gin (lower((supplier)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON public.materials USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_only ON public.materials USING btree (tenant_id, sku_number) WHERE (is_global = false);
CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_sku_scope_unique ON public.materials USING btree (sku, is_global, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'));
CREATE INDEX IF NOT EXISTS idx_object_openings_tenant_parameter ON public.object_openings USING btree (tenant_id, parameter_id);
CREATE INDEX IF NOT EXISTS idx_object_parameters_tenant_estimate ON public.object_parameters USING btree (tenant_id, estimate_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets USING btree (email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON public.password_resets USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets USING btree (token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON public.password_resets USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_is_hidden ON public.permissions USING btree (is_hidden);
CREATE INDEX IF NOT EXISTS idx_team_active ON public.project_team_members USING btree (project_id) WHERE (left_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_team_project_user ON public.project_team_members USING btree (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_role ON public.project_team_members USING btree (role);
CREATE INDEX IF NOT EXISTS idx_team_tenant_project ON public.project_team_members USING btree (tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_team_user_id ON public.project_team_members USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_gin ON public.projects USING gin (client gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_contract_number ON public.projects USING btree (contract_number) WHERE (contract_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_projects_contractor_gin ON public.projects USING gin (contractor gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON public.projects USING btree (end_date);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON public.projects USING btree (manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_name_gin ON public.projects USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_object_name_gin ON public.projects USING gin (object_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON public.projects USING btree (start_date);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects USING btree (status);
CREATE UNIQUE INDEX idx_projects_tenant_contract_number ON public.projects USING btree (tenant_id, contract_number) WHERE (contract_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_created_at ON public.projects USING btree (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON public.projects USING btree (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_with_remainder ON public.purchases USING btree (estimate_id) WHERE ((quantity - purchased_quantity) > (0)::numeric);
CREATE INDEX IF NOT EXISTS idx_role_permissions_is_hidden ON public.role_permissions USING btree (role_id, is_hidden);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);
CREATE UNIQUE INDEX idx_roles_key_global ON public.roles USING btree (key) WHERE (tenant_id IS NULL);
CREATE UNIQUE INDEX idx_roles_key_tenant ON public.roles USING btree (key, tenant_id) WHERE (tenant_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_schedules_estimate_phase_position ON public.schedules USING btree (estimate_id, phase, position_number);
CREATE INDEX IF NOT EXISTS idx_schedules_phase ON public.schedules USING btree (phase);
CREATE INDEX IF NOT EXISTS idx_schedules_position ON public.schedules USING btree (position_number);
CREATE INDEX IF NOT EXISTS idx_schedules_project_id ON public.schedules USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_schedules_tenant_id ON public.schedules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON public.sessions USING btree (refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON public.sessions USING btree (tenant_id) WHERE (tenant_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_inn ON public.tenants USING btree (inn) WHERE (inn IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tenants_ogrn ON public.tenants USING btree (ogrn) WHERE (ogrn IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON public.user_role_assignments USING btree (role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_default ON public.user_tenants USING btree (user_id, is_default) WHERE (is_default = true);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON public.user_tenants USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users USING btree (phone) WHERE (phone IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users USING btree (status);
CREATE INDEX IF NOT EXISTS idx_mixedbread_state_entity_type ON public.vector_index_state USING btree (entity_type, scope);
CREATE INDEX IF NOT EXISTS idx_mixedbread_state_scope_tenant ON public.vector_index_state USING btree (scope, tenant_id, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_mixedbread_state_tenant_id ON public.vector_index_state USING btree (tenant_id) WHERE (tenant_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_vector_index_state_entity ON public.vector_index_state USING btree (entity_type, db_id);
CREATE INDEX IF NOT EXISTS idx_vector_index_state_last_seen ON public.vector_index_state USING btree (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_vector_index_state_tenant ON public.vector_index_state USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_act_items_act_id ON public.work_completion_act_items USING btree (act_id);
CREATE INDEX IF NOT EXISTS idx_act_items_estimate_item_id ON public.work_completion_act_items USING btree (estimate_item_id);
CREATE INDEX IF NOT EXISTS idx_act_items_section ON public.work_completion_act_items USING btree (section);
CREATE INDEX IF NOT EXISTS idx_act_items_tenant_id ON public.work_completion_act_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_acts_contract_number ON public.work_completion_acts USING btree (contract_number);
CREATE INDEX IF NOT EXISTS idx_acts_contractor_id ON public.work_completion_acts USING btree (contractor_id);
CREATE INDEX IF NOT EXISTS idx_acts_customer_id ON public.work_completion_acts USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_acts_date ON public.work_completion_acts USING btree (act_date);
CREATE INDEX IF NOT EXISTS idx_acts_estimate_id ON public.work_completion_acts USING btree (estimate_id);
CREATE INDEX IF NOT EXISTS idx_acts_form_type ON public.work_completion_acts USING btree (form_type);
CREATE INDEX IF NOT EXISTS idx_acts_project_id ON public.work_completion_acts USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_acts_status ON public.work_completion_acts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_acts_tenant_id ON public.work_completion_acts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_acts_type ON public.work_completion_acts USING btree (act_type);
CREATE INDEX IF NOT EXISTS idx_work_completions_completed ON public.work_completions USING btree (completed);
CREATE INDEX IF NOT EXISTS idx_work_completions_estimate_id ON public.work_completions USING btree (estimate_id);
CREATE INDEX IF NOT EXISTS idx_work_completions_tenant_id ON public.work_completions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_materials_composite ON public.work_materials USING btree (work_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_materials_material_id ON public.work_materials USING btree (material_id);
CREATE INDEX IF NOT EXISTS idx_work_materials_tenant_id ON public.work_materials USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_works_category ON public.works USING btree (category);
CREATE INDEX IF NOT EXISTS idx_works_category_gin ON public.works USING gin (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_works_code_gin ON public.works USING gin (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_works_global_code ON public.works USING btree (code) WHERE (is_global = true);
CREATE INDEX IF NOT EXISTS idx_works_hierarchy ON public.works USING btree (phase, section, subsection) WHERE (phase IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_works_is_global_category ON public.works USING btree (is_global, category);
CREATE INDEX IF NOT EXISTS idx_works_is_global_code ON public.works USING btree (is_global DESC, code);
CREATE INDEX IF NOT EXISTS idx_works_name_gin ON public.works USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_works_phase ON public.works USING btree (phase) WHERE (phase IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_works_section ON public.works USING btree (section) WHERE (section IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_works_subsection ON public.works USING btree (subsection) WHERE (subsection IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_works_tenant_code ON public.works USING btree (tenant_id, code) WHERE (is_global = false);

-- =====================================
-- ROW LEVEL SECURITY
-- =====================================

ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_completion_act_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_completion_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY act_signatories_tenant_insert ON act_signatories AS PERMISSIVE FOR INSERT TO public WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY act_signatories_tenant_isolation ON act_signatories AS PERMISSIVE FOR ALL TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY contracts_delete_policy ON contracts AS PERMISSIVE FOR DELETE TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY contracts_insert_policy ON contracts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY contracts_select_policy ON contracts AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY contracts_update_policy ON contracts AS PERMISSIVE FOR UPDATE TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)) WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY counterparties_delete_policy ON counterparties AS PERMISSIVE FOR DELETE TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY counterparties_insert_policy ON counterparties AS PERMISSIVE FOR INSERT TO public WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY counterparties_select_policy ON counterparties AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY counterparties_update_policy ON counterparties AS PERMISSIVE FOR UPDATE TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)) WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY estimate_items_delete_policy ON estimate_items AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM estimates e
  WHERE ((e.id = estimate_items.estimate_id) AND ((e.tenant_id = current_tenant_id()) OR is_super_admin())))));
CREATE POLICY estimate_items_insert_policy ON estimate_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM estimates e
  WHERE ((e.id = estimate_items.estimate_id) AND (e.tenant_id = current_tenant_id())))));
CREATE POLICY estimate_items_select_policy ON estimate_items AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM estimates e
  WHERE ((e.id = estimate_items.estimate_id) AND ((e.tenant_id = current_tenant_id()) OR is_super_admin())))));
CREATE POLICY estimate_items_update_policy ON estimate_items AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM estimates e
  WHERE ((e.id = estimate_items.estimate_id) AND ((e.tenant_id = current_tenant_id()) OR is_super_admin()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM estimates e
  WHERE ((e.id = estimate_items.estimate_id) AND ((e.tenant_id = current_tenant_id()) OR is_super_admin())))));
CREATE POLICY estimates_delete_policy ON estimates AS PERMISSIVE FOR DELETE TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY estimates_insert_policy ON estimates AS PERMISSIVE FOR INSERT TO public WITH CHECK (((tenant_id = current_tenant_id()) AND (created_by = current_user_id()) AND (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = estimates.project_id) AND (projects.tenant_id = current_tenant_id()))))));
CREATE POLICY estimates_select_policy ON estimates AS PERMISSIVE FOR SELECT TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY estimates_update_policy ON estimates AS PERMISSIVE FOR UPDATE TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin())) WITH CHECK (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY global_purchases_admin_delete ON global_purchases AS PERMISSIVE FOR DELETE TO public USING (((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND (current_setting('app.current_user_role'::text) = 'admin'::text)));
CREATE POLICY global_purchases_owner_update ON global_purchases AS PERMISSIVE FOR UPDATE TO public USING (((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND ((created_by = (current_setting('app.current_user_id'::text))::uuid) OR (current_setting('app.current_user_role'::text) = 'admin'::text))));
CREATE POLICY global_purchases_tenant_isolation ON global_purchases AS PERMISSIVE FOR ALL TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY materials_delete_policy ON materials AS PERMISSIVE FOR DELETE TO public USING ((((is_global = false) AND (tenant_id = current_tenant_id())) OR ((is_global = true) AND is_super_admin())));
CREATE POLICY materials_insert_policy ON materials AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((is_global = false) AND (tenant_id = current_tenant_id())) OR ((is_global = true) AND is_super_admin())));
CREATE POLICY materials_tenant_isolation ON materials AS PERMISSIVE FOR SELECT TO public USING (((is_global = true) OR (tenant_id IS NULL) OR (tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY materials_update_policy ON materials AS PERMISSIVE FOR UPDATE TO public USING ((((is_global = false) AND (tenant_id = current_tenant_id())) OR ((is_global = true) AND is_super_admin())));
CREATE POLICY team_delete_policy ON project_team_members AS PERMISSIVE FOR DELETE TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY team_insert_policy ON project_team_members AS PERMISSIVE FOR INSERT TO public WITH CHECK (((tenant_id = current_tenant_id()) AND (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_team_members.project_id) AND (projects.tenant_id = current_tenant_id()))))));
CREATE POLICY team_select_policy ON project_team_members AS PERMISSIVE FOR SELECT TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY team_update_policy ON project_team_members AS PERMISSIVE FOR UPDATE TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin())) WITH CHECK (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY projects_delete_policy ON projects AS PERMISSIVE FOR DELETE TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY projects_insert_policy ON projects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((tenant_id = current_tenant_id()) AND (created_by = current_user_id())));
CREATE POLICY projects_select_policy ON projects AS PERMISSIVE FOR SELECT TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY projects_update_policy ON projects AS PERMISSIVE FOR UPDATE TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin())) WITH CHECK (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY schedules_admin_delete ON schedules AS PERMISSIVE FOR DELETE TO public USING (((tenant_id = current_tenant_id()) AND is_super_admin()));
CREATE POLICY schedules_owner_update ON schedules AS PERMISSIVE FOR UPDATE TO public USING (((tenant_id = current_tenant_id()) AND ((created_by = current_user_id()) OR is_super_admin())));
CREATE POLICY schedules_tenant_isolation ON schedules AS PERMISSIVE FOR ALL TO public USING (((tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY sessions_delete_policy ON sessions AS PERMISSIVE FOR DELETE TO public USING ((is_super_admin() OR (user_id = current_user_id())));
CREATE POLICY sessions_insert_policy ON sessions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = current_user_id()));
CREATE POLICY sessions_select_policy ON sessions AS PERMISSIVE FOR SELECT TO public USING ((is_super_admin() OR (user_id = current_user_id())));
CREATE POLICY sessions_update_policy ON sessions AS PERMISSIVE FOR UPDATE TO public USING ((is_super_admin() OR (user_id = current_user_id())));
CREATE POLICY work_completion_act_items_tenant_insert ON work_completion_act_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY work_completion_act_items_tenant_isolation ON work_completion_act_items AS PERMISSIVE FOR ALL TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY work_completion_acts_tenant_insert ON work_completion_acts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY work_completion_acts_tenant_isolation ON work_completion_acts AS PERMISSIVE FOR ALL TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY work_completions_tenant_insert ON work_completions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY work_completions_tenant_isolation ON work_completions AS PERMISSIVE FOR ALL TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
CREATE POLICY work_materials_tenant_isolation ON work_materials AS PERMISSIVE FOR ALL TO public USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
CREATE POLICY works_delete_policy ON works AS PERMISSIVE FOR DELETE TO public USING ((((is_global = false) AND (tenant_id = current_tenant_id())) OR ((is_global = true) AND is_super_admin())));
CREATE POLICY works_insert_policy ON works AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((is_global = false) AND (tenant_id = current_tenant_id())) OR ((is_global = true) AND is_super_admin())));
CREATE POLICY works_tenant_isolation ON works AS PERMISSIVE FOR SELECT TO public USING (((is_global = true) OR (tenant_id IS NULL) OR (tenant_id = current_tenant_id()) OR is_super_admin()));
CREATE POLICY works_update_policy ON works AS PERMISSIVE FOR UPDATE TO public USING ((((is_global = false) AND (tenant_id = current_tenant_id())) OR ((is_global = true) AND is_super_admin())));

-- =====================================
-- VIEWS
-- =====================================

CREATE OR REPLACE VIEW materials_with_global AS
SELECT id,
    sku,
    name,
    image,
    unit,
    price,
    supplier,
    weight,
    category,
    product_url,
    show_image,
    tenant_id,
    created_by,
    created_at,
    updated_at,
    is_global,
    sku_number,
        CASE
            WHEN is_global THEN 'global'::text
            ELSE 'tenant'::text
        END AS source_type
   FROM materials m;;

CREATE OR REPLACE VIEW v_estimate_items_extended AS
SELECT ei.id,
    ei.estimate_id,
    ei.position_number,
    ei.item_type,
    ei.name,
    ei.description,
    ei.code,
    ei.unit,
    ei.quantity,
    ei.unit_price,
    ei.total_price,
    ei.overhead_percent,
    ei.profit_percent,
    ei.tax_percent,
    ei.final_price,
    ei.notes,
    ei.is_optional,
    ei.created_at,
    ei.updated_at,
    ei.source_type,
    ei.phase,
    ei.section,
    ei.subsection,
    ei.work_id,
    e.name AS estimate_name,
    e.status AS estimate_status,
    e.project_id,
    p.name AS project_name,
    e.tenant_id
   FROM ((estimate_items ei
     JOIN estimates e ON ((ei.estimate_id = e.id)))
     JOIN projects p ON ((e.project_id = p.id)));;

CREATE OR REPLACE VIEW v_active_users_with_tenants AS
SELECT u.id AS user_id,
    u.email,
    u.full_name,
    u.status AS user_status,
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.status AS tenant_status,
    ut.is_default,
    ut.joined_at
   FROM ((users u
     JOIN user_tenants ut ON ((u.id = ut.user_id)))
     JOIN tenants t ON ((t.id = ut.tenant_id)))
  WHERE ((u.status = 'active'::text) AND (t.status = 'active'::text));;

CREATE OR REPLACE VIEW v_user_permissions AS
SELECT u.id AS user_id,
    u.email,
    t.id AS tenant_id,
    t.name AS tenant_name,
    r.id AS role_id,
    r.key AS role_key,
    r.name AS role_name,
    p.id AS permission_id,
    p.key AS permission_key,
    p.name AS permission_name,
    p.resource,
    p.action
   FROM (((((users u
     JOIN user_role_assignments ura ON ((u.id = ura.user_id)))
     JOIN roles r ON ((r.id = ura.role_id)))
     LEFT JOIN tenants t ON ((t.id = ura.tenant_id)))
     JOIN role_permissions rp ON ((rp.role_id = r.id)))
     JOIN permissions p ON ((p.id = rp.permission_id)))
  WHERE (u.status = 'active'::text);;

CREATE OR REPLACE VIEW v_projects_extended AS
SELECT p.id,
    p.tenant_id,
    p.name,
    p.object_name,
    p.description,
    p.client,
    p.contractor,
    p.address,
    p.start_date,
    p.end_date,
    p.actual_end_date,
    p.status,
    p.progress,
    p.budget,
    p.actual_cost,
    p.created_by,
    p.updated_by,
    p.manager_id,
    p.created_at,
    p.updated_at,
    p.contract_number,
    u_created.full_name AS created_by_name,
    u_created.email AS created_by_email,
    u_manager.full_name AS manager_name,
    u_manager.email AS manager_email,
    t.name AS tenant_name,
    t.plan AS tenant_plan,
    (p.end_date - CURRENT_DATE) AS days_remaining,
        CASE
            WHEN ((p.status)::text = 'completed'::text) THEN true
            WHEN (p.end_date < CURRENT_DATE) THEN true
            ELSE false
        END AS is_overdue,
    ( SELECT count(*) AS count
           FROM project_team_members
          WHERE ((project_team_members.project_id = p.id) AND (project_team_members.left_at IS NULL))) AS team_size
   FROM (((projects p
     LEFT JOIN users u_created ON ((p.created_by = u_created.id)))
     LEFT JOIN users u_manager ON ((p.manager_id = u_manager.id)))
     LEFT JOIN tenants t ON ((p.tenant_id = t.id)));;

CREATE OR REPLACE VIEW v_active_projects_with_team AS
SELECT p.id AS project_id,
    p.name AS project_name,
    p.status,
    p.progress,
    p.tenant_id,
    ptm.user_id,
    ptm.role AS team_role,
    ptm.can_edit,
    u.full_name AS member_name,
    u.email AS member_email
   FROM ((projects p
     JOIN project_team_members ptm ON ((ptm.project_id = p.id)))
     JOIN users u ON ((u.id = ptm.user_id)))
  WHERE (((p.status)::text = ANY ((ARRAY['planning'::character varying, 'active'::character varying])::text[])) AND (ptm.left_at IS NULL));;

CREATE OR REPLACE VIEW v_estimates_with_project AS
SELECT e.id,
    e.tenant_id,
    e.project_id,
    e.name,
    e.description,
    e.estimate_type,
    e.status,
    e.total_amount,
    e.currency,
    e.estimate_date,
    e.valid_until,
    e.approved_at,
    e.approved_by,
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    p.name AS project_name,
    p.object_name AS project_object_name,
    p.client AS project_client,
    p.address AS project_address,
    p.status AS project_status,
    u_created.full_name AS created_by_name,
    u_created.email AS created_by_email,
    u_approved.full_name AS approved_by_name,
    u_approved.email AS approved_by_email,
    t.name AS tenant_name,
    ( SELECT count(*) AS count
           FROM estimate_items
          WHERE (estimate_items.estimate_id = e.id)) AS items_count,
    ( SELECT sum(estimate_items.quantity) AS sum
           FROM estimate_items
          WHERE (estimate_items.estimate_id = e.id)) AS total_quantity
   FROM ((((estimates e
     JOIN projects p ON ((e.project_id = p.id)))
     LEFT JOIN users u_created ON ((e.created_by = u_created.id)))
     LEFT JOIN users u_approved ON ((e.approved_by = u_approved.id)))
     LEFT JOIN tenants t ON ((e.tenant_id = t.id)));;

CREATE OR REPLACE VIEW v_estimate_materials_with_weight AS
SELECT eim.id,
    eim.estimate_item_id,
    eim.material_id,
    m.sku,
    m.name AS material_name,
    m.unit,
    eim.quantity,
    eim.unit_price,
    eim.total_price,
    eim.weight,
    eim.total_weight,
    eim.consumption_coefficient,
    eim.auto_calculate,
    m.supplier,
    m.category
   FROM (estimate_item_materials eim
     JOIN materials m ON ((m.id = eim.material_id)));;

CREATE OR REPLACE VIEW v_user_visible_menu AS
SELECT DISTINCT u.id AS user_id,
    u.email,
    p.resource,
    p.action,
    p.name AS permission_name,
    p.description,
    rp.is_hidden,
    r.key AS role_key,
    r.name AS role_name
   FROM ((((users u
     JOIN user_role_assignments ura ON ((u.id = ura.user_id)))
     JOIN roles r ON ((ura.role_id = r.id)))
     JOIN role_permissions rp ON ((r.id = rp.role_id)))
     JOIN permissions p ON ((rp.permission_id = p.id)))
  WHERE ((p.action = ANY (ARRAY['view'::text, 'view_menu'::text])) AND (rp.is_hidden = false))
  ORDER BY u.email, p.resource;;

CREATE OR REPLACE VIEW works_with_global AS
SELECT id,
    code,
    name,
    unit,
    base_price,
    tenant_id,
    created_by,
    created_at,
    updated_at,
    is_global,
    phase,
    section,
    subsection,
    category,
    category_id,
        CASE
            WHEN is_global THEN 'global'::text
            ELSE 'tenant'::text
        END AS source_type
   FROM works w
  WHERE ((is_global = true) OR (tenant_id = current_tenant_id()) OR is_super_admin());;


