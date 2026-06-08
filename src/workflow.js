export const DEFAULT_WORKFLOW_COLUMN_ID = "po";
export const COMPLETED_ARCHIVE_DAYS = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const workflowColumns = [
  { id: "po", title: "PO", color: "#0c66e4" },
  { id: "ps-coa", title: "PS COA", color: "#6e5dc6" },
  { id: "payment", title: "Payment", color: "#a54800" },
  { id: "documents", title: "Documents", color: "#227d9b" },
  { id: "etd", title: "ETD", color: "#1f845a" },
  { id: "completed", title: "Hoàn thành", color: "#22a06b" },
];

export const workflowObjectiveTemplates = {
  po: [
    { id: "po-create-sap", text: "Tạo PO NSX (SAP)" },
    { id: "po-update-hs-code", text: "Sửa HS code" },
    { id: "po-send-email", text: "Gửi PO by email" },
  ],
  "ps-coa": [
    { id: "ps-coa-send-sales-admin", text: "Gửi Sales admin" },
    { id: "ps-coa-feedback", text: "Feedback", optional: true },
    { id: "ps-coa-confirm", text: "Confirm COA" },
  ],
  payment: [
    { id: "payment-pi", text: "PI" },
    { id: "payment-sc", text: "SC" },
    { id: "payment-loa", text: "LOA" },
    { id: "payment-dntt", text: "DNTT" },
  ],
  documents: [
    { id: "documents-awb-bl", text: "AWB/BL" },
    { id: "documents-sc", text: "SC" },
    { id: "documents-inv", text: "INV" },
    { id: "documents-pl", text: "PL" },
    { id: "documents-coa", text: "COA" },
    { id: "documents-coo", text: "COO" },
    { id: "documents-ins", text: "INS" },
    { id: "documents-msds", text: "MSDS" },
  ],
  etd: [
    { id: "etd-awb-bl-number", text: "AWB/BL Number", commentable: true },
    { id: "etd-date", text: "ETD", commentable: true },
    { id: "etd-tt", text: "TT", commentable: true },
  ],
  completed: [
    { id: "completed-outlook-calendar", text: "Outlook calendar" },
    { id: "completed-original-bct", text: "BCT gốc" },
  ],
};

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function resolveWorkflowColumnId(columnId, columnTitle = "") {
  const requestedId = String(columnId || "");
  if (workflowColumns.some((column) => column.id === requestedId)) return requestedId;

  const normalizedName = normalizeName(columnTitle || requestedId);
  const matchingColumn = workflowColumns.find(
    (column) => normalizeName(column.title) === normalizedName,
  );
  if (matchingColumn) return matchingColumn.id;

  if (requestedId === "done") return "completed";
  return DEFAULT_WORKFLOW_COLUMN_ID;
}

export function createWorkflowObjectives(columnId, currentObjectives = []) {
  const templates = workflowObjectiveTemplates[columnId] || [];

  return templates.map((template) => {
    const existing = currentObjectives.find(
      (objective) =>
        objective.id === template.id ||
        normalizeName(objective.text) === normalizeName(template.text),
    );

    return {
      id: template.id,
      text: template.text,
      optional: Boolean(template.optional),
      commentable: Boolean(template.commentable),
      completed: Boolean(existing?.completed),
      comment: template.commentable ? String(existing?.comment || "") : "",
    };
  });
}

export function createWorkflowObjectiveMap(
  columnId = DEFAULT_WORKFLOW_COLUMN_ID,
  currentObjectives = [],
  currentObjectiveMap = {},
) {
  const resolvedColumnId = resolveWorkflowColumnId(columnId);
  const objectiveMap = Object.fromEntries(
    workflowColumns.map((column) => [
      column.id,
      createWorkflowObjectives(
        column.id,
        Array.isArray(currentObjectiveMap?.[column.id]) ? currentObjectiveMap[column.id] : [],
      ),
    ]),
  );

  objectiveMap[resolvedColumnId] = createWorkflowObjectives(
    resolvedColumnId,
    Array.isArray(currentObjectives) && currentObjectives.length
      ? currentObjectives
      : objectiveMap[resolvedColumnId],
  );

  return objectiveMap;
}

export function serializeWorkflowObjectiveMap(objectiveMap = {}) {
  return Object.fromEntries(
    workflowColumns.map((column) => [
      column.id,
      createWorkflowObjectives(column.id, objectiveMap[column.id]).map(
        ({ id, optional, commentable, completed, comment }) => ({
          id,
          optional,
          commentable,
          completed,
          comment,
        }),
      ),
    ]),
  );
}

export function createWorkflowDueDates(currentDueDates = {}) {
  return Object.fromEntries(
    workflowColumns.map((column) => [
      column.id,
      /^\d{4}-\d{2}-\d{2}$/.test(currentDueDates?.[column.id] || "")
        ? currentDueDates[column.id]
        : "",
    ]),
  );
}

export function createWorkflowActualDates(currentActualDates = {}) {
  return createWorkflowDueDates(currentActualDates);
}

export function getLocalDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toUtcDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? timestamp
    : null;
}

function currentUtcDay(now) {
  const currentDate = new Date(now);
  return Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );
}

export function getCompletedArchiveInfo(task, now = new Date()) {
  if (!task || task.columnId !== "completed") {
    return { completedDate: "", isArchived: false, reason: "" };
  }

  const manualArchiveDate = /^\d{4}-\d{2}-\d{2}$/.test(task.completedArchivedAt || "")
    ? task.completedArchivedAt
    : "";
  if (manualArchiveDate) {
    return {
      archivedAt: manualArchiveDate,
      completedDate: task.columnActualDates?.completed || "",
      isArchived: true,
      reason: "manual",
    };
  }

  const completedDate = task.columnActualDates?.completed || "";
  const completedDay = toUtcDay(completedDate);
  if (completedDay === null) {
    return { completedDate, isArchived: false, reason: "" };
  }

  const daysSinceCompleted = Math.round((currentUtcDay(now) - completedDay) / DAY_IN_MS);
  return {
    completedDate,
    daysSinceCompleted,
    isArchived: daysSinceCompleted >= COMPLETED_ARCHIVE_DAYS,
    reason: daysSinceCompleted >= COMPLETED_ARCHIVE_DAYS ? "auto" : "",
  };
}

export function isTaskInCompletedArchive(task, now = new Date()) {
  return getCompletedArchiveInfo(task, now).isArchived;
}

export function archiveCompletedTask(task, now = new Date()) {
  if (task?.columnId !== "completed") return task;

  const archiveDate = getLocalDateString(now);
  const columnActualDates = createWorkflowActualDates(task.columnActualDates);
  if (!columnActualDates.completed) columnActualDates.completed = archiveDate;

  return {
    ...task,
    columnActualDates,
    completedArchivedAt: archiveDate,
  };
}

export function getRequiredObjectiveProgress(task) {
  const requiredObjectives = (task?.objectives || []).filter((objective) => !objective.optional);
  const completedRequiredObjectives = requiredObjectives.filter((objective) => objective.completed);

  return {
    completed: completedRequiredObjectives.length,
    isComplete: completedRequiredObjectives.length === requiredObjectives.length,
    total: requiredObjectives.length,
  };
}

export function canMoveTaskToWorkflowColumn(task, columnId, options = {}) {
  if (!task) return false;

  const nextColumnId = resolveWorkflowColumnId(columnId);
  if (task.columnId === nextColumnId) return true;

  const currentIndex = workflowColumns.findIndex((column) => column.id === task.columnId);
  const nextIndex = workflowColumns.findIndex((column) => column.id === nextColumnId);
  const isMovingForward = nextIndex > currentIndex && currentIndex >= 0;
  const canBypassForNewCompletedTask =
    options.isNewTask === true && nextColumnId === "completed";

  if (!isMovingForward || canBypassForNewCompletedTask) return true;
  return getRequiredObjectiveProgress(task).isComplete;
}

export function getWorkflowMoveBlockReason(task, columnId, options = {}) {
  if (!task) return "Không tìm thấy công việc cần chuyển trạng thái.";
  if (canMoveTaskToWorkflowColumn(task, columnId, options)) return "";

  const progress = getRequiredObjectiveProgress(task);
  return `Cần hoàn thành tất cả chỉ tiêu bắt buộc của trạng thái hiện tại trước khi chuyển trạng thái (${progress.completed}/${progress.total}).`;
}

export function moveTaskToWorkflowColumn(task, columnId, options = {}) {
  const nextColumnId = resolveWorkflowColumnId(columnId);
  if (task.columnId === nextColumnId) return task;

  const currentIndex = workflowColumns.findIndex((column) => column.id === task.columnId);
  const nextIndex = workflowColumns.findIndex((column) => column.id === nextColumnId);
  const transitionDate = getLocalDateString(options.now);
  const shouldRecordCompletion =
    options.recordCompletion !== false && nextIndex > currentIndex && currentIndex >= 0;
  const columnActualDates = createWorkflowActualDates(task.columnActualDates);

  if (shouldRecordCompletion) {
    columnActualDates[task.columnId] = transitionDate;
  }
  if (nextColumnId === "completed" && !columnActualDates.completed) {
    columnActualDates.completed = transitionDate;
  }
  const objectiveMap = createWorkflowObjectiveMap(
    task.columnId,
    task.objectives,
    task.objectivesByColumn,
  );
  const nextObjectives = createWorkflowObjectives(nextColumnId, objectiveMap[nextColumnId]);

  return {
    ...task,
    columnId: nextColumnId,
    columnActualDates,
    completedArchivedAt: nextColumnId === "completed" ? task.completedArchivedAt || "" : "",
    objectives: nextObjectives,
    objectivesByColumn: {
      ...objectiveMap,
      [task.columnId]: createWorkflowObjectives(task.columnId, task.objectives),
      [nextColumnId]: nextObjectives,
    },
  };
}
