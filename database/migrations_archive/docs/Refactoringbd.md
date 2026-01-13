В вашем случае (живой PostgreSQL на Render, 456k строк, RLS/функции/политики) правильная цель — не “удалить миграции”, а сделать baseline (squash) для новых деплоев, сохранив совместимость с уже развернутыми БД.

Ниже — конкретный план, с учетом того, что у вас много объектов уровня БД (116 функций, 51 RLS политика, 213 индексов).

1) Что НЕ делать

Не удалять старые миграции “в ноль”, если есть хоть одно окружение, поднятое по старой цепочке.

Не пытаться применить “одну большую миграцию” на существующую БД с данными: baseline должен применяться только на пустую БД.

2) Правильная схема: baseline + новые миграции
Конечная структура (как вы и описали) — нормальная:

001_initial_schema.sql (таблицы/типы/расширения)

002_functions.sql

003_rls_policies.sql

004_indexes.sql

seeds/...

Ключевой момент: baseline должен создавать всю текущую схему так, чтобы пустая БД стала эквивалентна продовой по структуре.

3) Как сгенерировать baseline надежно (не руками)

Самый практичный способ — собрать baseline из pg_dump --schema-only, а потом разрезать на файлы.

Команда (подключаясь к Render):
pg_dump "<RENDER_DATABASE_URL>" \
  --schema-only \
  --no-owner --no-privileges \
  --quote-all-identifiers \
  --verbose \
  > 001_full_schema.sql


Дальше:

вырезаете из этого дампа функции в 002_functions.sql

RLS/ALTER TABLE ENABLE RLS/CREATE POLICY — в 003_rls_policies.sql

индексы/констрейнты, которые идут в post-data — в 004_indexes.sql

Почему так: руками собрать 51 политику + security definer функции + гранты/rls-режимы без ошибок обычно дороже, чем стартовать от pg_dump.

Проверка “baseline корректен”

Создать пустую БД (локально/в отдельном Render instance).

Применить 001..004 + сиды.

Сравнить схему с продом.

Минимальный “diff” без внешних тулзов:

сравнить список таблиц/индексов/политик/функций:

-- таблицы
select tablename from pg_tables where schemaname='public' order by 1;

-- индексы
select indexname, tablename from pg_indexes where schemaname='public' order by 2,1;

-- политики RLS
select schemaname, tablename, policyname
from pg_policies
order by 1,2,3;

-- функции (public)
select proname
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by 1;


Идеально — использовать migra/skeema/sqldef или аналогичный schema-diff, но даже эти запросы быстро покажут расхождения.

4) Как внедрить baseline, не ломая текущий прод

Зависит от того, чем вы запускаете миграции (Flyway/Prisma/Alembic/свой runner на SQL). Общий принцип такой:

Для новых окружений: применять baseline 001..004, затем сиды, затем новые миграции.

Для существующих окружений: baseline не выполнять, а миграционному инструменту объяснить “считай, что baseline уже пройден”.

Если у вас “свой SQL-runner” с таблицей учета миграций (часто migrations/schema_migrations):

добавьте в нее запись вида 001_complete_schema.sql как “applied” (без исполнения)

или в коде мигратора добавьте правило: если БД не пустая/есть таблица миграций — не применять baseline.

Если скажете, какой у вас инструмент/таблица учета миграций — дам точный вариант “stamp/fake/baseline” под него.

5) Таблица suppliers без миграции: как правильно убрать

То, что она “без миграции”, означает, что ваши окружения могут расходиться. Правильный ход: сделать отдельную миграцию drop_suppliers.sql, но сначала проверить зависимости.

Проверить, есть ли зависимости на suppliers
-- FK на suppliers
select conrelid::regclass as table_from, conname
from pg_constraint
where contype='f'
  and confrelid='public.suppliers'::regclass;

-- есть ли views/матвьюхи
select schemaname, viewname
from pg_views
where definition ilike '%suppliers%';

-- функции, где упоминается suppliers
select p.oid::regprocedure
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and pg_get_functiondef(p.oid) ilike '%suppliers%';


Если зависимостей нет:

drop table if exists public.suppliers;


Важно: делайте это именно миграцией, чтобы все окружения пришли к одному состоянию.

6) “Пустые” таблицы удалять или нет

По вашему описанию эти таблицы в коде используются: global_purchases, work_materials, act_signatories, email_verification_tokens. При нулевых данных это не “мусор”, а просто неиспользованный функционал. Их трогать не надо.

Удаление имеет смысл только если:

нет ссылок в коде/эндпоинтах/джобах

нет FK/триггеров/политик/функций на них

вы готовы удалить функциональность

7) Очистка sessions и email_verification_tokens: нюанс с RLS

Очистка через cron — верно, но проверьте:

есть ли индекс на expires_at (иначе DELETE будет делать seq scan на больших таблицах)

кто выполняет джобу: сервисная роль должна иметь доступ (часто нужно обходить RLS)

Рекомендуемый вариант:

delete from sessions where expires_at < now();
delete from email_verification_tokens where expires_at < now();


Если хотите “аккуратно” на больших объемах — батчами (limit через ctid), но у вас объемы небольшие.

8) Архив миграций: как безопасно оформить

Оставить старые 32 миграции в migrations_archive/original/ (в репозитории).

Новый pipeline миграций указывает на database/migrations/ (baseline + новые).

В README/DATABASE_STATUS.md явно зафиксировать: “до версии X миграции были legacy, после — baseline”.

Что сделать прямо сейчас (минимальный набор)

Сгенерировать 001_full_schema.sql через pg_dump --schema-only.

Разрезать на 001..004, прогнать на пустой БД, сверить списки объектов.

Добавить миграцию drop_suppliers.sql (после проверок зависимостей).

Настроить cron на очистку sessions/email_verification_tokens (с учетом RLS/роли).

Зафиксировать правило деплоя: новые окружения стартуют с baseline, старые — “stamp”.

Если вы напишете, чем вы запускаете SQL-миграции (конкретная либра/скрипт) и как называется таблица учета примененных миграций — можно дать точный рецепт “как именно сделать stamp/baseline” без догадок.