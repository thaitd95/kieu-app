# Supabase schema cho Kieu Assistant

## Cac bang can co

1. `workspaces`: Nhom du lieu doc lap. Moi workspace thuoc mot tai khoan Supabase Auth.
2. `workspace_members`: Nguoi phu trach trong app. `user_id` co the de trong cho thanh vien chua co tai khoan dang nhap.
3. `companies`: Danh muc Seller.
4. `chemicals`: Danh muc hoa chat.
5. `labels`: Danh muc nhan.
6. `workflow_columns`: Sau trang thai `po`, `ps-coa`, `payment`, `documents`, `etd`, `completed`.
7. `tasks`: Thong tin chinh cua cong viec/PO.
8. `task_chemicals`: Bang noi nhieu-nhieu giua task va hoa chat.
9. `task_labels`: Bang noi nhieu-nhieu giua task va nhan.
10. `task_workflow_steps`: Ngay du kien, ngay bat dau va ngay thuc te cua tung trang thai.
11. `task_objectives`: Checklist chi tieu cua task theo tung trang thai.
12. `task_comments`: Ghi chu/hoat dong cua task.

Bao cao lead time va thanh toan la du lieu tinh tu cac bang tren, khong can luu thanh bang rieng.

## Mapping tu IndexedDB hien tai

| Du lieu hien tai | Bang/cot Supabase |
| --- | --- |
| `members[]` | `workspace_members.display_name` |
| `companies[]` | `companies`; ID cu luu trong `legacy_id` |
| `chemicals[]` | `chemicals`; ID cu luu trong `legacy_id` |
| `labels[]` | `labels` |
| `columns[]` | `workflow_columns` |
| `tasks[].id` | `tasks.legacy_id` |
| `tasks[].key` | `tasks.task_key` |
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

`memberListVersion` chi phuc vu migrate local data cu, khong can luu trong database.

`workspaces.data_initialized` danh dau workspace da duoc khoi tao. App chi nhap
IndexedDB len Supabase mot lan khi cot nay la `false`; workspace da bi xoa sach
co chu y se khong tu nap lai du lieu mau.

## Thu tu import du lieu

1. Dang nhap bang Supabase Auth va tao mot row trong `workspaces`.
2. Trigger se tu tao owner trong `workspace_members` va sau workflow columns.
3. Import them members, companies, chemicals va labels.
4. Import tasks sau khi da map ID cu sang UUID moi.
5. Import cac bang noi, workflow steps, objectives va comments.

Migration nam tai:

`supabase/migrations/202606080001_create_kieu_app_schema.sql`

Tat ca bang public da bat RLS. Nguoi dung chi doc/ghi duoc du lieu cua workspace ma ho la thanh vien; chi owner duoc quan ly danh sach thanh vien.

Sau khi khoi tao, Supabase la nguon du lieu chinh. Cac thao tac task, Seller,
hoa chat, nhan, thanh vien, workflow, checklist va comment duoc ghi vao bang
tuong ung; IndexedDB chi duoc doc trong lan migrate dau tien.
