# Supabase schema cho Kieu Assistant

## Mo hinh du lieu dung chung

Tat ca tai khoan Supabase Auth da dang nhap doc va ghi cung mot bo du lieu.
Schema khong con bang `workspaces`, khong con `workspace_id` va khong chia du
lieu theo user.

## Cac bang

1. `members`: Nguoi phu trach trong app. `user_id` lien ket tai khoan dang
   nhap; gia tri nay co the de trong cho nguoi phu trach khong co tai khoan.
2. `companies`: Danh muc Seller.
3. `chemicals`: Danh muc hoa chat.
4. `labels`: Danh muc nhan.
5. `workflow_columns`: Sau trang thai `po`, `ps-coa`, `payment`, `documents`,
   `etd`, `completed`.
6. `tasks`: Thong tin chinh cua cong viec/PO. Khong luu `task_type` va
   `priority`; do uu tien duoc tinh truc tiep tren frontend tu deadline.
7. `task_chemicals`: Bang noi nhieu-nhieu giua task va hoa chat.
8. `task_labels`: Bang noi nhieu-nhieu giua task va nhan.
9. `task_workflow_steps`: Moi task co mot row; cot `steps` luu ngay du kien
    va ngay thuc te cua tat ca trang thai duoi dang JSON object.
10. `task_objectives`: Moi task co mot row; cot `objectives` luu toan bo
    checklist theo tung trang thai duoi dang JSON object.
11. `task_comments`: Ghi chu/hoat dong cua task.

Bao cao lead time va thanh toan duoc tinh tu cac bang tren.

## Mapping tu IndexedDB

| Du lieu hien tai | Bang/cot Supabase |
| --- | --- |
| `members[]` | `members.display_name` |
| `companies[]` | `companies`; ID cu duoc map sang UUID moi khi import |
| `chemicals[]` | `chemicals`; ID cu duoc map sang UUID moi khi import |
| `labels[]` | `labels` |
| `columns[]` | `workflow_columns` |
| `tasks[].id` | `tasks.id`; ID cu duoc thay bang UUID neu can |
| `tasks[].key` | `tasks.task_key`; Supabase tu cap bang sequence |
| `tasks[].createdAt` | `tasks.created_at` |
| `assignee` | `tasks.assignee_member_id` |
| `companyId` | `tasks.company_id` |
| `chemicals[]` | `task_chemicals` |
| `labels[]` | `task_labels` |
| `columnId` | `tasks.current_column_code` |
| `columnDueDates` | `task_workflow_steps.steps[*].due_on` |
| `columnActualDates` | `task_workflow_steps.steps[*].actual_on` |
| `objectivesByColumn` | `task_objectives.objectives` |
| `comments[]` | `task_comments` |
| `completedArchivedAt` | `tasks.completed_archived_on` |

## RLS va tai khoan

Tat ca bang public van bat RLS. Moi tai khoan thuoc role `authenticated` co
quyen doc va ghi toan bo du lieu dung chung; role `anon` khong co quyen.

RPC `ensure_app_user` tao record trong `members` cho tai khoan dang nhap neu
chua co. Frontend goi RPC nay truoc khi tai du lieu. Ung dung khong con luong
khoi tao hay import du lieu tu IndexedDB.

## Migration bo workspace

Migration `202606080004_remove_workspaces.sql`:

1. Gop du lieu cua tat ca workspace dang ton tai.
2. Bo bang `workspaces`, `app_settings`, cac ham workspace va moi cot
   `workspace_id`.
3. Doi `workspace_members` thanh `members`.
4. Tao lai khoa ngoai, unique index va RLS cho mo hinh dung chung.
5. Neu ten danh muc hoac task key bi trung giua cac workspace cu, migration
   them hau to UUID vao ban ghi trung de khong lam mat du lieu.

Can chay migration Supabase truoc khi deploy frontend moi.

## Cau truc objectives JSON

Bang `task_objectives` van duoc giu lai, nhung moi `task_id` chi co mot row.
Cot `objectives jsonb` luon co du 6 trang thai va toan bo chi tieu mac dinh
cua tung trang thai. Database khong luu `text`; frontend dung `id` de lay noi
dung tu `workflowObjectiveTemplates`. Ung dung chi thay doi `completed` va
`comment`. Vi du:

```json
{
  "po": [
    {
      "id": "po-create-sap",
      "optional": false,
      "commentable": false,
      "completed": true,
      "comment": ""
    }
  ],
  "payment": []
}
```

Migration `202606080007_task_objectives_json.sql` gom du lieu cu theo
`task_id` va `column_code`, sau do chuyen bang sang mot row cho moi task.
Migration `202606080008_fill_objective_templates.sql` backfill day du template
va them constraint de ngan JSON bi thieu trang thai hoac thieu chi tieu.
Migration `202606090010_remove_objective_text_and_legacy_comment_date.sql`
loai `text` khoi JSON objective, hydrate text tu template tren frontend, va
bo `task_comments.legacy_created_at_text` de chi dung `created_at`.

## Cau truc workflow steps JSON

Bang `task_workflow_steps` van duoc giu lai, nhung moi `task_id` chi co mot
row. Cot `steps jsonb` luon co du 6 trang thai; moi trang thai chi luu
`due_on` va `actual_on`. Vi du:

```json
{
  "po": {
    "due_on": "2026-06-10",
    "actual_on": "2026-06-09"
  },
  "ps-coa": {
    "due_on": "2026-06-12",
    "actual_on": ""
  }
}
```

Migration `202606090009_simplify_tasks_and_workflow_steps.sql` gom cac row
step cu thanh JSON theo task, bo `started_on`, va xoa `task_type` cung
`priority` khoi bang `tasks`.

Migration `202606090011_remove_initialization_and_generate_task_keys.sql` xoa
`app_state`, don gian hoa `ensure_app_user`, va cap `task_key` bang sequence
trong PostgreSQL de tranh trung ma khi nhieu user tao task cung luc.
