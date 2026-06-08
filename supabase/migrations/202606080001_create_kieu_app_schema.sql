create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (length(btrim(display_name)) > 0),
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  unique (workspace_id, id)
);

create unique index workspace_members_name_unique
  on public.workspace_members (workspace_id, lower(btrim(display_name)));

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legacy_id text,
  name text not null check (length(btrim(name)) > 0),
  account_number text not null default '',
  office_address text not null default '',
  producer_address text not null default '',
  description_html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create unique index companies_name_unique
  on public.companies (workspace_id, lower(btrim(name)));

create unique index companies_legacy_id_unique
  on public.companies (workspace_id, legacy_id)
  where legacy_id is not null;

create table public.chemicals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legacy_id text,
  name text not null check (length(btrim(name)) > 0),
  color text not null default '#0c66e4'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create unique index chemicals_name_unique
  on public.chemicals (workspace_id, lower(btrim(name)));

create unique index chemicals_legacy_id_unique
  on public.chemicals (workspace_id, legacy_id)
  where legacy_id is not null;

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  color text not null default '#0c66e4'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create unique index labels_name_unique
  on public.labels (workspace_id, lower(btrim(name)));

create table public.workflow_columns (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null,
  title text not null check (length(btrim(title)) > 0),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position smallint not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, code),
  unique (workspace_id, position)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legacy_id text,
  task_key text not null,
  created_on date,
  title text not null check (length(btrim(title)) > 0),
  description_html text not null default '',
  task_type text not null default 'task',
  priority text not null default 'low' check (priority in ('low', 'high')),
  assignee_member_id uuid,
  po_number text not null default '',
  quantity_text text not null default '',
  amount_text text not null default '',
  incoterm text not null default '',
  payment_method text not null default ''
    check (payment_method in ('', 'advance', 'against-shipping-docs', '30-days')),
  shipping_method text not null default ''
    check (shipping_method in ('', 'air', 'sea')),
  company_id uuid,
  current_column_code text not null default 'po',
  completed_archived_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, task_key),
  foreign key (workspace_id, assignee_member_id)
    references public.workspace_members(workspace_id, id) on delete restrict,
  foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  foreign key (workspace_id, current_column_code)
    references public.workflow_columns(workspace_id, code) on delete restrict
);

create unique index tasks_legacy_id_unique
  on public.tasks (workspace_id, legacy_id)
  where legacy_id is not null;

create table public.task_chemicals (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  chemical_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (task_id, chemical_id),
  foreign key (workspace_id, task_id)
    references public.tasks(workspace_id, id) on delete cascade,
  foreign key (workspace_id, chemical_id)
    references public.chemicals(workspace_id, id) on delete restrict
);

create table public.task_labels (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  label_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id),
  foreign key (workspace_id, task_id)
    references public.tasks(workspace_id, id) on delete cascade,
  foreign key (workspace_id, label_id)
    references public.labels(workspace_id, id) on delete restrict
);

create table public.task_workflow_steps (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  column_code text not null,
  due_on date,
  started_on date,
  actual_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (task_id, column_code),
  foreign key (workspace_id, task_id)
    references public.tasks(workspace_id, id) on delete cascade,
  foreign key (workspace_id, column_code)
    references public.workflow_columns(workspace_id, code) on delete restrict
);

create table public.task_objectives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  column_code text not null,
  objective_code text not null,
  text text not null check (length(btrim(text)) > 0),
  is_optional boolean not null default false,
  is_commentable boolean not null default false,
  is_completed boolean not null default false,
  comment text not null default '',
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, column_code, objective_code),
  foreign key (workspace_id, task_id)
    references public.tasks(workspace_id, id) on delete cascade,
  foreign key (workspace_id, column_code)
    references public.workflow_columns(workspace_id, code) on delete restrict
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  legacy_id text,
  author_member_id uuid references public.workspace_members(id) on delete set null,
  author_name text not null default '',
  body text not null check (length(btrim(body)) > 0),
  legacy_created_at_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, task_id)
    references public.tasks(workspace_id, id) on delete cascade
);

create unique index task_comments_legacy_id_unique
  on public.task_comments (task_id, legacy_id)
  where legacy_id is not null;

create index workspace_members_user_id_idx
  on public.workspace_members (user_id);
create index companies_workspace_id_idx
  on public.companies (workspace_id);
create index chemicals_workspace_id_idx
  on public.chemicals (workspace_id);
create index labels_workspace_id_idx
  on public.labels (workspace_id);
create index tasks_workspace_column_idx
  on public.tasks (workspace_id, current_column_code);
create index tasks_workspace_company_idx
  on public.tasks (workspace_id, company_id);
create index tasks_workspace_assignee_idx
  on public.tasks (workspace_id, assignee_member_id);
create index tasks_workspace_po_number_idx
  on public.tasks (workspace_id, po_number);
create index task_chemicals_chemical_id_idx
  on public.task_chemicals (chemical_id);
create index task_labels_label_id_idx
  on public.task_labels (label_id);
create index task_workflow_steps_column_idx
  on public.task_workflow_steps (workspace_id, column_code);
create index task_objectives_task_id_idx
  on public.task_objectives (task_id);
create index task_comments_task_created_idx
  on public.task_comments (task_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger chemicals_set_updated_at
before update on public.chemicals
for each row execute function public.set_updated_at();

create trigger labels_set_updated_at
before update on public.labels
for each row execute function public.set_updated_at();

create trigger workflow_columns_set_updated_at
before update on public.workflow_columns
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger task_workflow_steps_set_updated_at
before update on public.task_workflow_steps
for each row execute function public.set_updated_at();

create trigger task_objectives_set_updated_at
before update on public.task_objectives
for each row execute function public.set_updated_at();

create trigger task_comments_set_updated_at
before update on public.task_comments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_name text;
begin
  select coalesce(
    nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(email, '@', 1), ''),
    'Owner'
  )
  into owner_name
  from auth.users
  where id = new.owner_user_id;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    display_name,
    role
  )
  values (
    new.id,
    new.owner_user_id,
    coalesce(owner_name, 'Owner'),
    'owner'
  );

  insert into public.workflow_columns (
    workspace_id,
    code,
    title,
    color,
    position
  )
  values
    (new.id, 'po', 'PO', '#0c66e4', 0),
    (new.id, 'ps-coa', 'PS COA', '#6e5dc6', 1),
    (new.id, 'payment', 'Payment', '#a54800', 2),
    (new.id, 'documents', 'Documents', '#227d9b', 3),
    (new.id, 'etd', 'ETD', '#1f845a', 4),
    (new.id, 'completed', 'Hoàn thành', '#22a06b', 5);

  return new;
end;
$$;

create trigger on_workspace_created
after insert on public.workspaces
for each row execute function public.handle_new_workspace();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
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

create policy workspaces_select
on public.workspaces for select
to authenticated
using (
  public.is_workspace_member(id)
  or owner_user_id = (select auth.uid())
);

create policy workspaces_insert
on public.workspaces for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

create policy workspaces_update
on public.workspaces for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy workspaces_delete
on public.workspaces for delete
to authenticated
using (owner_user_id = (select auth.uid()));

create policy workspace_members_select
on public.workspace_members for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  or public.is_workspace_owner(workspace_id)
);

create policy workspace_members_insert
on public.workspace_members for insert
to authenticated
with check (public.is_workspace_owner(workspace_id));

create policy workspace_members_update
on public.workspace_members for update
to authenticated
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy workspace_members_delete
on public.workspace_members for delete
to authenticated
using (
  public.is_workspace_owner(workspace_id)
  and role <> 'owner'
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
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
      'create policy %1$I_select on public.%1$I for select to authenticated using (public.is_workspace_member(workspace_id))',
      table_name
    );
    execute format(
      'create policy %1$I_insert on public.%1$I for insert to authenticated with check (public.is_workspace_member(workspace_id))',
      table_name
    );
    execute format(
      'create policy %1$I_update on public.%1$I for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))',
      table_name
    );
    execute format(
      'create policy %1$I_delete on public.%1$I for delete to authenticated using (public.is_workspace_member(workspace_id))',
      table_name
    );
  end loop;
end;
$$;

grant select, insert, update, delete
on table
  public.workspaces,
  public.workspace_members,
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
