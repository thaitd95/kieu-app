export const currentUser = { name: "Mỹ Kiều", role: "App Owner" };
export const defaultMembers = [currentUser.name];
export const legacyDefaultMembers = ["Minh Anh", "Quang Huy", "Bảo Ngọc", "Đức Long", "Thu Hà"];

export const columnColors = [
  "#8590a2",
  "#0c66e4",
  "#1f845a",
  "#7f5f01",
  "#6e5dc6",
  "#c9372c",
  "#227d9b",
  "#a54800",
  "#ae4787",
  "#5e4db2",
];

export const chemicalColors = [
  "#0c66e4",
  "#1f845a",
  "#7f5f01",
  "#6e5dc6",
  "#c9372c",
  "#227d9b",
  "#a54800",
  "#ae4787",
];

export const defaultChemicalColor = chemicalColors[0];
export const labelColors = [
  "#0c66e4",
  "#1f845a",
  "#7f5f01",
  "#6e5dc6",
  "#c9372c",
  "#227d9b",
  "#a54800",
  "#ae4787",
];
export const defaultLabelColor = labelColors[0];

export const priorityColors = {
  low: "#0c66e4",
  medium: "#7f5f01",
  high: "#e06c00",
  highest: "#c9372c",
};

export const fixedColumns = [
  { id: "todo", title: "To do", color: "#0c66e4" },
  { id: "done", title: "Done", color: "#1f845a" },
];

export const initialData = {
  companies: [],
  chemicals: [],
  labels: [],
  columns: fixedColumns,
  tasks: [
    {
      id: "task-1",
      key: "KA-124",
      title: "Thiết kế luồng onboarding cho người dùng mới",
      description:
        "Xây dựng luồng hướng dẫn ngắn gọn để người dùng mới hiểu các chức năng chính của sản phẩm trong lần đăng nhập đầu tiên.",
      type: "story",
      priority: "high",
      assignee: "Mỹ Kiều",
      dueDate: "2026-06-05",
      labels: ["UX", "Product"],
      columnId: "todo",
      comments: [
        {
          id: "comment-1",
          author: "Thu Hà",
          text: "Mình đã bổ sung bản wireframe đầu tiên. Nhờ team review trước buổi sync chiều nay.",
          createdAt: "29/05/2026, 14:32",
        },
      ],
    },
    {
      id: "task-2",
      key: "KA-125",
      title: "Tối ưu tốc độ tải trang dashboard",
      description: "Đo và giảm thời gian tải dashboard, ưu tiên phần thống kê tổng quan.",
      type: "bug",
      priority: "highest",
      assignee: "Quang Huy",
      dueDate: "2026-06-02",
      labels: ["Frontend"],
      columnId: "todo",
      comments: [],
    },
    {
      id: "task-3",
      key: "KA-126",
      title: "Chuẩn hóa bộ component form",
      description: "Rà soát input, select và validation message để thống nhất trải nghiệm trên toàn hệ thống.",
      type: "task",
      priority: "medium",
      assignee: "Bảo Ngọc",
      dueDate: "2026-06-10",
      labels: ["Design system"],
      columnId: "todo",
      comments: [],
    },
    {
      id: "task-4",
      key: "KA-127",
      title: "Viết tài liệu API cho module notification",
      description: "Cập nhật tài liệu tích hợp notification cho các nhóm frontend.",
      type: "task",
      priority: "low",
      assignee: "Đức Long",
      dueDate: "2026-06-12",
      labels: ["Docs"],
      columnId: "todo",
      comments: [],
    },
    {
      id: "task-5",
      key: "KA-128",
      title: "Review checklist phát hành phiên bản 2.4",
      description: "Kiểm tra checklist release và xác nhận owner cho từng hạng mục.",
      type: "story",
      priority: "medium",
      assignee: "Thu Hà",
      dueDate: "2026-06-01",
      labels: ["Release"],
      columnId: "todo",
      comments: [],
    },
    {
      id: "task-6",
      key: "KA-129",
      title: "Cập nhật thông báo lỗi đăng nhập",
      description: "Thay nội dung lỗi chung bằng thông báo cụ thể theo từng tình huống.",
      type: "bug",
      priority: "high",
      assignee: "Mỹ Kiều",
      dueDate: "2026-05-30",
      labels: ["Auth"],
      columnId: "done",
      comments: [],
    },
    {
      id: "task-7",
      key: "KA-130",
      title: "Bổ sung tracking cho trang thanh toán",
      description: "Bổ sung event analytics cho các bước chính của luồng thanh toán.",
      type: "task",
      priority: "medium",
      assignee: "Quang Huy",
      dueDate: "2026-06-08",
      labels: ["Analytics"],
      columnId: "todo",
      comments: [],
    },
  ],
};
