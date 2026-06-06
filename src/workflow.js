export const DEFAULT_WORKFLOW_COLUMN_ID = "po";

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
      ...template,
      completed: Boolean(existing?.completed),
      comment: template.commentable ? String(existing?.comment || "") : "",
    };
  });
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

export function moveTaskToWorkflowColumn(task, columnId) {
  const nextColumnId = resolveWorkflowColumnId(columnId);
  if (task.columnId === nextColumnId) return task;

  return {
    ...task,
    columnId: nextColumnId,
    objectives: createWorkflowObjectives(nextColumnId),
  };
}
