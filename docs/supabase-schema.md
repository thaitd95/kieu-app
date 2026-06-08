# Supabase schema cho Kieu Assistant

## Mo hinh du lieu dung chung

Tat ca tai khoan Supabase Auth da dang nhap doc va ghi cung mot bo du lieu.
Schema khong con bang `workspaces`, khong con `workspace_id` va khong chia du
lieu theo user.

## Cac bang

1. `app_state`: Trang thai khoi tao du lieu dung chung.
2. `members`: Nguoi phu trach trong app. `user_id` lien ket tai khoan dang
   nhap; gia tri nay co the de trong cho nguoi phu trach khong co tai khoan.
3. `companies`: Danh muc Seller.
4. `chemicals`: Danh muc hoa chat.
5. `labels`: Danh muc nhan.
6. `workflow_columns`: Sau trang thai `po`, `ps-coa`, `payment`, `documents`,
   `etd`, `completed`.
7. `tasks`: Thong tin chinh cua cong viec/PO.
8. `task_chemicals`: Bang noi nhieu-nhieu giua task va hoa chat.
9. `task_labels`: Bang noi nhieu-nhieu giua task va nhan.
10. `task_workflow_steps`: Ngay du kien, ngay bat dau va ngay thuc te cua tung
    trang thai.
11. `task_objectives`: Checklist chi tieu cua task theo tung trang thai.
12. `task_comments`: Ghi chu/hoat dong cua task.

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
| `tasks[].key` | `tasks.task_key` |
| `tasks[].createdAt` | `tasks.created_at` |
| `assignee` | `tasks.assignee_member_id` |
| `companyId` | `tasks.company_id` |
| `chemicals[]` | `task_chemicals` |
| `labels[]` | `task_labels` |
| `columnId` | `tasks.current_column_code` |
| `columnDueDates` | `task_workflow_steps.due_on` |
| `columnStartedDates` | `task_workflow_steps.started_on` |
| `columnActualDates` | `task_workflow_steps.actual_on` |
| `objectives[]` | `task_objectives` |
| `comments[]` | `task_comments` |
| `completedArchivedAt` | `tasks.completed_archived_on` |

`app_state.data_initialized` dam bao IndexedDB chi duoc nhap len Supabase mot
lan khi database chua co du lieu.

## RLS va tai khoan

Tat ca bang public van bat RLS. Moi tai khoan thuoc role `authenticated` co
quyen doc va ghi toan bo du lieu dung chung; role `anon` khong co quyen.

RPC `ensure_app_user` tao record trong `members` cho tai khoan dang nhap neu
chua co. Frontend goi RPC nay truoc khi tai du lieu.

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
