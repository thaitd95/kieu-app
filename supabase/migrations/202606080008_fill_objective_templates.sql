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
    objective_text,
    is_optional,
    is_commentable
  ) as (
    values
      ('po', 0, 'po-create-sap', 'Tạo PO NSX (SAP)', false, false),
      ('po', 1, 'po-update-hs-code', 'Sửa HS code', false, false),
      ('po', 2, 'po-send-email', 'Gửi PO by email', false, false),
      ('ps-coa', 0, 'ps-coa-send-sales-admin', 'Gửi Sales admin', false, false),
      ('ps-coa', 1, 'ps-coa-feedback', 'Feedback', true, false),
      ('ps-coa', 2, 'ps-coa-confirm', 'Confirm COA', false, false),
      ('payment', 0, 'payment-pi', 'PI', false, false),
      ('payment', 1, 'payment-sc', 'SC', false, false),
      ('payment', 2, 'payment-loa', 'LOA', false, false),
      ('payment', 3, 'payment-dntt', 'DNTT', false, false),
      ('documents', 0, 'documents-awb-bl', 'AWB/BL', false, false),
      ('documents', 1, 'documents-sc', 'SC', false, false),
      ('documents', 2, 'documents-inv', 'INV', false, false),
      ('documents', 3, 'documents-pl', 'PL', false, false),
      ('documents', 4, 'documents-coa', 'COA', false, false),
      ('documents', 5, 'documents-coo', 'COO', false, false),
      ('documents', 6, 'documents-ins', 'INS', false, false),
      ('documents', 7, 'documents-msds', 'MSDS', false, false),
      ('etd', 0, 'etd-awb-bl-number', 'AWB/BL Number', false, true),
      ('etd', 1, 'etd-date', 'ETD', false, true),
      ('etd', 2, 'etd-tt', 'TT', false, true),
      ('completed', 0, 'completed-outlook-calendar', 'Outlook calendar', false, false),
      ('completed', 1, 'completed-original-bct', 'BCT gốc', false, false)
  ),
  normalized_objectives as (
    select
      templates.column_code,
      templates.objective_position,
      jsonb_build_object(
        'id', templates.objective_id,
        'text', templates.objective_text,
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

insert into public.task_objectives (task_id, objectives)
select task.id, public.normalize_task_objectives('{}'::jsonb)
from public.tasks as task
where not exists (
  select 1
  from public.task_objectives
  where task_objectives.task_id = task.id
);

update public.task_objectives
set objectives = public.normalize_task_objectives(objectives);

alter table public.task_objectives
  add constraint task_objectives_full_template_check
  check (objectives = public.normalize_task_objectives(objectives));
