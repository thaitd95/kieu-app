alter table public.task_objectives
  drop constraint if exists task_objectives_full_template_check;

create or replace function public.normalize_task_objectives(source_objectives jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  with templates (
    column_code,
    objective_position,
    objective_id,
    is_optional,
    is_commentable
  ) as (
    values
      ('po', 0, 'po-create-sap', false, false),
      ('po', 1, 'po-update-hs-code', false, false),
      ('po', 2, 'po-send-email', false, false),
      ('ps-coa', 0, 'ps-coa-send-sales-admin', false, false),
      ('ps-coa', 1, 'ps-coa-feedback', true, false),
      ('ps-coa', 2, 'ps-coa-confirm', false, false),
      ('payment', 0, 'payment-pi', false, false),
      ('payment', 1, 'payment-sc', false, false),
      ('payment', 2, 'payment-loa', false, false),
      ('payment', 3, 'payment-dntt', false, false),
      ('documents', 0, 'documents-awb-bl', false, false),
      ('documents', 1, 'documents-sc', false, false),
      ('documents', 2, 'documents-inv', false, false),
      ('documents', 3, 'documents-pl', false, false),
      ('documents', 4, 'documents-coa', false, false),
      ('documents', 5, 'documents-coo', false, false),
      ('documents', 6, 'documents-ins', false, false),
      ('documents', 7, 'documents-msds', false, false),
      ('etd', 0, 'etd-awb-bl-number', false, true),
      ('etd', 1, 'etd-date', false, true),
      ('etd', 2, 'etd-tt', false, true),
      ('completed', 0, 'completed-outlook-calendar', false, false),
      ('completed', 1, 'completed-original-bct', false, false)
  ),
  normalized_objectives as (
    select
      templates.column_code,
      templates.objective_position,
      jsonb_build_object(
        'id', templates.objective_id,
        'optional', templates.is_optional,
        'commentable', templates.is_commentable,
        'completed',
          case
            when existing.value -> 'completed' = 'true'::jsonb then true
            else false
          end,
        'comment',
          case
            when templates.is_commentable then coalesce(existing.value ->> 'comment', '')
            else ''
          end
      ) as objective
    from templates
    left join lateral (
      select item.value
      from jsonb_array_elements(
        case
          when jsonb_typeof(source_objectives -> templates.column_code) = 'array'
            then source_objectives -> templates.column_code
          else '[]'::jsonb
        end
      ) as item(value)
      where item.value ->> 'id' = templates.objective_id
      limit 1
    ) as existing on true
  ),
  objective_groups as (
    select
      column_code,
      jsonb_agg(objective order by objective_position) as objectives
    from normalized_objectives
    group by column_code
  )
  select jsonb_object_agg(column_code, objectives order by column_code)
  from objective_groups;
$$;

update public.task_objectives
set objectives = public.normalize_task_objectives(objectives);

alter table public.task_objectives
  add constraint task_objectives_full_template_check
  check (objectives = public.normalize_task_objectives(objectives));

with parsed_comments as (
  select
    id,
    regexp_match(
      legacy_created_at_text,
      '^([0-9]{2}):([0-9]{2})[[:space:]]+([0-9]{2})/([0-9]{2})/([0-9]{4})$'
    ) as date_parts
  from public.task_comments
  where coalesce(legacy_created_at_text, '') <> ''
)
update public.task_comments as comment
set created_at = make_timestamptz(
  parsed_comments.date_parts[5]::integer,
  parsed_comments.date_parts[4]::integer,
  parsed_comments.date_parts[3]::integer,
  parsed_comments.date_parts[1]::integer,
  parsed_comments.date_parts[2]::integer,
  0,
  'Asia/Bangkok'
)
from parsed_comments
where comment.id = parsed_comments.id
  and parsed_comments.date_parts is not null;

alter table public.task_comments
  drop column if exists legacy_created_at_text;
