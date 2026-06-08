create temporary table migration_app_state (
  data_initialized boolean not null,
  primary_workspace_id uuid
) on commit drop;

insert into migration_app_state (data_initialized, primary_workspace_id)
select
  coalesce(bool_or(workspace.data_initialized), false),
  (
    select candidate.id
    from public.workspaces as candidate
    order by (
      select count(*)
      from public.tasks
      where tasks.workspace_id = candidate.id
    ) desc, candidate.created_at, candidate.id
    limit 1
  )
from public.workspaces as workspace;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'workspaces',
        'workspace_members',
        'companies',
        'chemicals',
        'labels',
        'workflow_columns',
        'tasks',
        'task_chemicals',
        'task_labels',
        'task_workflow_steps',
        'task_objectives',
        'task_comments'
      )
  loop
    execute format(
      'drop policy %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end;
$$;

drop function if exists public.ensure_shared_workspace(text);
drop function if exists public.is_workspace_member(uuid);
drop function if exists public.is_workspace_owner(uuid);
drop trigger if exists on_workspace_created on public.workspaces;
drop function if exists public.handle_new_workspace();

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select
      constraint_table.relname as table_name,
      constraint_definition.conname as constraint_name
    from pg_catalog.pg_constraint as constraint_definition
    join pg_catalog.pg_class as constraint_table
      on constraint_table.oid = constraint_definition.conrelid
    join pg_catalog.pg_namespace as table_schema
      on table_schema.oid = constraint_table.relnamespace
    where table_schema.nspname = 'public'
      and constraint_definition.contype = 'f'
      and constraint_table.relname in (
        'workspace_members',
        'companies',
        'chemicals',
        'labels',
        'workflow_columns',
        'tasks',
        'task_chemicals',
        'task_labels',
        'task_workflow_steps',
        'task_objectives',
        'task_comments'
      )
  loop
    execute format(
      'alter table public.%I drop constraint %I',
      constraint_record.table_name,
      constraint_record.constraint_name
    );
  end loop;
end;
$$;

create temporary table migration_member_map (
  duplicate_id uuid primary key,
  keeper_id uuid not null
) on commit drop;

insert into migration_member_map (duplicate_id, keeper_id)
select id, keeper_id
from (
  select
    id,
    first_value(id) over (
      partition by user_id
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by user_id
      order by created_at, id
    ) as duplicate_position
  from public.workspace_members
  where user_id is not null
) as ranked_members
where duplicate_position > 1;

update public.tasks as task
set assignee_member_id = member_map.keeper_id
from migration_member_map as member_map
where task.assignee_member_id = member_map.duplicate_id;

update public.task_comments as comment
set author_member_id = member_map.keeper_id
from migration_member_map as member_map
where comment.author_member_id = member_map.duplicate_id;

delete from public.workspace_members as member
using migration_member_map as member_map
where member.id = member_map.duplicate_id;

with ranked_members as (
  select
    id,
    row_number() over (
      partition by lower(btrim(display_name))
      order by created_at, id
    ) as duplicate_position
  from public.workspace_members
)
update public.workspace_members as member
set display_name = member.display_name || ' [' || member.id::text || ']'
from ranked_members
where member.id = ranked_members.id
  and ranked_members.duplicate_position > 1;

with ranked_companies as (
  select
    id,
    row_number() over (
      partition by lower(btrim(name))
      order by created_at, id
    ) as duplicate_position
  from public.companies
)
update public.companies as company
set name = company.name || ' [' || company.id::text || ']'
from ranked_companies
where company.id = ranked_companies.id
  and ranked_companies.duplicate_position > 1;

with ranked_chemicals as (
  select
    id,
    row_number() over (
      partition by lower(btrim(name))
      order by created_at, id
    ) as duplicate_position
  from public.chemicals
)
update public.chemicals as chemical
set name = chemical.name || ' [' || chemical.id::text || ']'
from ranked_chemicals
where chemical.id = ranked_chemicals.id
  and ranked_chemicals.duplicate_position > 1;

with ranked_labels as (
  select
    id,
    row_number() over (
      partition by lower(btrim(name))
      order by created_at, id
    ) as duplicate_position
  from public.labels
)
update public.labels as label
set name = label.name || ' [' || label.id::text || ']'
from ranked_labels
where label.id = ranked_labels.id
  and ranked_labels.duplicate_position > 1;

with ranked_tasks as (
  select
    id,
    row_number() over (
      partition by task_key
      order by created_at, id
    ) as duplicate_position
  from public.tasks
)
update public.tasks as task
set task_key = task.task_key || '-' || left(task.id::text, 8)
from ranked_tasks
where task.id = ranked_tasks.id
  and ranked_tasks.duplicate_position > 1;

with ranked_legacy_ids as (
  select
    id,
    row_number() over (
      partition by legacy_id
      order by created_at, id
    ) as duplicate_position
  from public.companies
  where legacy_id is not null
)
update public.companies as company
set legacy_id = null
from ranked_legacy_ids
where company.id = ranked_legacy_ids.id
  and ranked_legacy_ids.duplicate_position > 1;

with ranked_legacy_ids as (
  select
    id,
    row_number() over (
      partition by legacy_id
      order by created_at, id
    ) as duplicate_position
  from public.chemicals
  where legacy_id is not null
)
update public.chemicals as chemical
set legacy_id = null
from ranked_legacy_ids
where chemical.id = ranked_legacy_ids.id
  and ranked_legacy_ids.duplicate_position > 1;

with ranked_legacy_ids as (
  select
    id,
    row_number() over (
      partition by legacy_id
      order by created_at, id
    ) as duplicate_position
  from public.tasks
  where legacy_id is not null
)
update public.tasks as task
set legacy_id = null
from ranked_legacy_ids
where task.id = ranked_legacy_ids.id
  and ranked_legacy_ids.duplicate_position > 1;

with ranked_columns as (
  select
    ctid,
    row_number() over (
      partition by code
      order by
        (workspace_id = (
          select primary_workspace_id
          from migration_app_state
        )) desc,
        created_at,
        workspace_id
    ) as duplicate_position
  from public.workflow_columns
)
delete from public.workflow_columns as workflow_column
using ranked_columns
where workflow_column.ctid = ranked_columns.ctid
  and ranked_columns.duplicate_position > 1;

alter table public.workspace_members drop column workspace_id cascade;
alter table public.workspace_members drop column role;
alter table public.companies drop column workspace_id cascade;
alter table public.chemicals drop column workspace_id cascade;
alter table public.labels drop column workspace_id cascade;
alter table public.workflow_columns drop column workspace_id cascade;
alter table public.tasks drop column workspace_id cascade;
alter table public.task_chemicals drop column workspace_id cascade;
alter table public.task_labels drop column workspace_id cascade;
alter table public.task_workflow_steps drop column workspace_id cascade;
alter table public.task_objectives drop column workspace_id cascade;
alter table public.task_comments drop column workspace_id cascade;

alter table public.workspace_members rename to members;
alter trigger workspace_members_set_updated_at on public.members
rename to members_set_updated_at;

drop index if exists public.workspace_members_user_id_idx;

create unique index members_user_id_unique
  on public.members (user_id)
  where user_id is not null;
create unique index members_name_unique
  on public.members (lower(btrim(display_name)));
create unique index companies_name_unique
  on public.companies (lower(btrim(name)));
create unique index companies_legacy_id_unique
  on public.companies (legacy_id)
  where legacy_id is not null;
create unique index chemicals_name_unique
  on public.chemicals (lower(btrim(name)));
create unique index chemicals_legacy_id_unique
  on public.chemicals (legacy_id)
  where legacy_id is not null;
create unique index labels_name_unique
  on public.labels (lower(btrim(name)));

with ranked_columns as (
  select
    code,
    row_number() over (order by position, created_at, code) - 1 as next_position
  from public.workflow_columns
)
update public.workflow_columns as workflow_column
set position = ranked_columns.next_position
from ranked_columns
where workflow_column.code = ranked_columns.code;

alter table public.workflow_columns
  add primary key (code),
  add unique (position);

insert into public.workflow_columns (code, title, color, position)
select defaults.code, defaults.title, defaults.color, defaults.position
from (
  values
    ('po', 'PO', '#0c66e4', 0),
    ('ps-coa', 'PS COA', '#6e5dc6', 1),
    ('payment', 'Payment', '#a54800', 2),
    ('documents', 'Documents', '#227d9b', 3),
    ('etd', 'ETD', '#1f845a', 4),
    ('completed', 'Hoan thanh', '#22a06b', 5)
) as defaults(code, title, color, position)
where not exists (select 1 from public.workflow_columns);

alter table public.tasks
  add unique (task_key),
  add foreign key (assignee_member_id)
    references public.members(id) on delete restrict,
  add foreign key (company_id)
    references public.companies(id) on delete restrict,
  add foreign key (current_column_code)
    references public.workflow_columns(code) on delete restrict;

create unique index tasks_legacy_id_unique
  on public.tasks (legacy_id)
  where legacy_id is not null;
create index tasks_column_idx
  on public.tasks (current_column_code);
create index tasks_company_idx
  on public.tasks (company_id);
create index tasks_assignee_idx
  on public.tasks (assignee_member_id);
create index tasks_po_number_idx
  on public.tasks (po_number);

alter table public.task_chemicals
  add foreign key (task_id)
    references public.tasks(id) on delete cascade,
  add foreign key (chemical_id)
    references public.chemicals(id) on delete restrict;

alter table public.task_labels
  add foreign key (task_id)
    references public.tasks(id) on delete cascade,
  add foreign key (label_id)
    references public.labels(id) on delete restrict;

alter table public.task_workflow_steps
  add foreign key (task_id)
    references public.tasks(id) on delete cascade,
  add foreign key (column_code)
    references public.workflow_columns(code) on delete restrict;

create index task_workflow_steps_column_idx
  on public.task_workflow_steps (column_code);

alter table public.task_objectives
  add foreign key (task_id)
    references public.tasks(id) on delete cascade,
  add foreign key (column_code)
    references public.workflow_columns(code) on delete restrict;

alter table public.task_comments
  add foreign key (task_id)
    references public.tasks(id) on delete cascade,
  add foreign key (author_member_id)
    references public.members(id) on delete set null;

create table public.app_state (
  singleton boolean primary key default true check (singleton),
  data_initialized boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_state (singleton, data_initialized)
select true, data_initialized
from migration_app_state;

create trigger app_state_set_updated_at
before update on public.app_state
for each row execute function public.set_updated_at();

drop table if exists public.app_settings;
drop table public.workspaces;

alter table public.members enable row level security;
alter table public.companies enable row level security;
alter table public.chemicals enable row level security;
alter table public.labels enable row level security;
alter table public.workflow_columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_chemicals enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_workflow_steps enable row level security;
alter table public.task_objectives enable row level security;
alter table public.task_comments enable row level security;
alter table public.app_state enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'members',
    'companies',
    'chemicals',
    'labels',
    'workflow_columns',
    'tasks',
    'task_chemicals',
    'task_labels',
    'task_workflow_steps',
    'task_objectives',
    'task_comments'
  ]
  loop
    execute format(
      'create policy %1$I_select on public.%1$I for select to authenticated using (true)',
      table_name
    );
    execute format(
      'create policy %1$I_insert on public.%1$I for insert to authenticated with check (true)',
      table_name
    );
    execute format(
      'create policy %1$I_update on public.%1$I for update to authenticated using (true) with check (true)',
      table_name
    );
    execute format(
      'create policy %1$I_delete on public.%1$I for delete to authenticated using (true)',
      table_name
    );
  end loop;
end;
$$;

grant select, insert, update, delete
on table
  public.members,
  public.companies,
  public.chemicals,
  public.labels,
  public.workflow_columns,
  public.tasks,
  public.task_chemicals,
  public.task_labels,
  public.task_workflow_steps,
  public.task_objectives,
  public.task_comments
to authenticated;

create policy app_state_select
on public.app_state for select
to authenticated
using (true);

create policy app_state_update
on public.app_state for update
to authenticated
using (true)
with check (true);

grant select, update on table public.app_state to authenticated;

create or replace function public.ensure_app_user(requested_display_name text default null)
returns table (data_initialized boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(831927451);

  if not exists (
    select 1
    from public.members
    where user_id = current_user_id
  ) then
    select coalesce(
      nullif(btrim(requested_display_name), ''),
      nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(users.email, '@', 1), ''),
      'Member'
    )
    into member_name
    from auth.users as users
    where users.id = current_user_id;

    member_name := coalesce(member_name, 'Member');

    if exists (
      select 1
      from public.members
      where lower(btrim(display_name)) = lower(btrim(member_name))
    ) then
      member_name := member_name || ' [' || current_user_id::text || ']';
    end if;

    insert into public.members (user_id, display_name)
    values (current_user_id, member_name)
    on conflict (user_id) where user_id is not null do nothing;
  end if;

  return query
  select state.data_initialized
  from public.app_state as state
  where state.singleton = true;
end;
$$;

revoke all on function public.ensure_app_user(text) from public;
grant execute on function public.ensure_app_user(text) to authenticated;
