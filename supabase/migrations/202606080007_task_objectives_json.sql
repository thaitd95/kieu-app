create temporary table migration_task_objectives_json (
  task_id uuid primary key,
  objectives jsonb not null
) on commit drop;

insert into migration_task_objectives_json (task_id, objectives)
with objective_sets as (
  select
    grouped.task_id,
    jsonb_object_agg(grouped.column_code, grouped.objectives order by grouped.column_code)
      as objectives
  from (
    select
      task_id,
      column_code,
      jsonb_agg(
        jsonb_build_object(
          'id', objective_code,
          'text', text,
          'optional', is_optional,
          'commentable', is_commentable,
          'completed', is_completed,
          'comment', comment
        )
        order by position, created_at, id
      ) as objectives
    from public.task_objectives
    group by task_id, column_code
  ) as grouped
  group by grouped.task_id
)
select
  task.id,
  jsonb_build_object(
    'po', '[]'::jsonb,
    'ps-coa', '[]'::jsonb,
    'payment', '[]'::jsonb,
    'documents', '[]'::jsonb,
    'etd', '[]'::jsonb,
    'completed', '[]'::jsonb
  ) || coalesce(objective_sets.objectives, '{}'::jsonb)
from public.tasks as task
left join objective_sets on objective_sets.task_id = task.id;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_catalog.pg_constraint
    where conrelid = 'public.task_objectives'::regclass
      and contype in ('f', 'u')
  loop
    execute format(
      'alter table public.task_objectives drop constraint %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

drop index if exists public.task_objectives_task_id_idx;

delete from public.task_objectives;

alter table public.task_objectives
  add column if not exists objectives jsonb not null default '{}'::jsonb,
  drop column if exists column_code,
  drop column if exists objective_code,
  drop column if exists text,
  drop column if exists is_optional,
  drop column if exists is_commentable,
  drop column if exists is_completed,
  drop column if exists comment,
  drop column if exists position;

insert into public.task_objectives (task_id, objectives)
select task_id, objectives
from migration_task_objectives_json;

alter table public.task_objectives
  add constraint task_objectives_task_id_key unique (task_id),
  add constraint task_objectives_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade;
