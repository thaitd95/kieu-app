create or replace function public.normalize_task_workflow_steps(source_steps jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  with workflow_columns (column_code, column_position) as (
    values
      ('po', 0),
      ('ps-coa', 1),
      ('payment', 2),
      ('documents', 3),
      ('etd', 4),
      ('completed', 5)
  )
  select jsonb_object_agg(
    column_code,
    jsonb_build_object(
      'due_on',
        case
          when coalesce(source_steps -> column_code ->> 'due_on', '')
            ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            then source_steps -> column_code ->> 'due_on'
          else ''
        end,
      'actual_on',
        case
          when coalesce(source_steps -> column_code ->> 'actual_on', '')
            ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            then source_steps -> column_code ->> 'actual_on'
          else ''
        end
    )
    order by column_position
  )
  from workflow_columns;
$$;

create temporary table migration_task_workflow_steps_json (
  task_id uuid primary key,
  steps jsonb not null
) on commit drop;

insert into migration_task_workflow_steps_json (task_id, steps)
with step_sets as (
  select
    task_id,
    jsonb_object_agg(
      column_code,
      jsonb_build_object(
        'due_on', coalesce(due_on::text, ''),
        'actual_on', coalesce(actual_on::text, '')
      )
      order by column_code
    ) as steps
  from public.task_workflow_steps
  group by task_id
)
select
  task.id,
  public.normalize_task_workflow_steps(coalesce(step_sets.steps, '{}'::jsonb))
from public.tasks as task
left join step_sets on step_sets.task_id = task.id;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_catalog.pg_constraint
    where conrelid = 'public.task_workflow_steps'::regclass
      and contype in ('f', 'p', 'u')
  loop
    execute format(
      'alter table public.task_workflow_steps drop constraint %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

drop index if exists public.task_workflow_steps_column_idx;

delete from public.task_workflow_steps;

alter table public.task_workflow_steps
  add column if not exists steps jsonb not null
    default public.normalize_task_workflow_steps('{}'::jsonb),
  drop column if exists column_code,
  drop column if exists due_on,
  drop column if exists started_on,
  drop column if exists actual_on;

insert into public.task_workflow_steps (task_id, steps)
select task_id, steps
from migration_task_workflow_steps_json;

alter table public.task_workflow_steps
  add constraint task_workflow_steps_task_id_key unique (task_id),
  add constraint task_workflow_steps_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade,
  add constraint task_workflow_steps_full_shape_check
    check (steps = public.normalize_task_workflow_steps(steps));

alter table public.tasks
  drop column if exists task_type,
  drop column if exists priority;
