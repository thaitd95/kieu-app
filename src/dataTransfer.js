import { normalizeData } from "./model";

export const BACKUP_FORMAT = "kieu-assistant-backup";
export const BACKUP_VERSION = 1;

function normalizeName(value) {
  return String(value || "").trim().toLocaleLowerCase("vi");
}

function reserveUniqueId(requestedId, prefix, reservedIds) {
  const baseId = String(requestedId || `${prefix}-imported`).trim() || `${prefix}-imported`;
  if (!reservedIds.has(baseId)) {
    reservedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  let nextId = `${baseId}-imported`;
  while (reservedIds.has(nextId)) {
    nextId = `${baseId}-imported-${suffix}`;
    suffix += 1;
  }
  reservedIds.add(nextId);
  return nextId;
}

function mergeCatalog(currentItems, importedItems, prefix) {
  const items = [...currentItems];
  const reservedIds = new Set(items.map((item) => item.id));
  const idMap = new Map();
  let addedCount = 0;

  importedItems.forEach((importedItem) => {
    const matchedItem = items.find(
      (item) => normalizeName(item.name) === normalizeName(importedItem.name),
    );
    if (matchedItem) {
      idMap.set(importedItem.id, matchedItem.id);
      return;
    }

    const id = reserveUniqueId(importedItem.id, prefix, reservedIds);
    items.push({ ...importedItem, id });
    idMap.set(importedItem.id, id);
    addedCount += 1;
  });

  return { addedCount, idMap, items };
}

function mergeLabels(currentLabels, importedLabels) {
  const labels = [...currentLabels];
  const nameMap = new Map();
  let addedCount = 0;

  importedLabels.forEach((importedLabel) => {
    const matchedLabel = labels.find(
      (label) => normalizeName(label.name) === normalizeName(importedLabel.name),
    );
    if (matchedLabel) {
      nameMap.set(importedLabel.name, matchedLabel.name);
      return;
    }

    labels.push(importedLabel);
    nameMap.set(importedLabel.name, importedLabel.name);
    addedCount += 1;
  });

  return { addedCount, labels, nameMap };
}

function mergeColumns(currentColumns, importedColumns) {
  const columns = [...currentColumns];
  const reservedIds = new Set(columns.map((column) => column.id));
  const idMap = new Map([
    ["todo", "todo"],
    ["done", "done"],
  ]);
  let addedCount = 0;

  importedColumns.forEach((importedColumn) => {
    if (["todo", "done"].includes(importedColumn.id)) return;

    const matchedColumn = columns.find(
      (column) => normalizeName(column.title) === normalizeName(importedColumn.title),
    );
    if (matchedColumn) {
      idMap.set(importedColumn.id, matchedColumn.id);
      return;
    }

    const id = reserveUniqueId(importedColumn.id, "column", reservedIds);
    columns.splice(columns.length - 1, 0, { ...importedColumn, id });
    idMap.set(importedColumn.id, id);
    addedCount += 1;
  });

  return { addedCount, columns, idMap };
}

function createTaskKey(tasks) {
  const sequence = Math.max(
    130,
    ...tasks.map((task) => Number(String(task.key || "").split("-")[1]) || 0),
  ) + 1;

  return `KA-${sequence}`;
}

export function createSystemBackup(data) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function mergeSystemBackup(currentData, backup) {
  if (
    !backup ||
    backup.format !== BACKUP_FORMAT ||
    backup.version !== BACKUP_VERSION ||
    !backup.data ||
    typeof backup.data !== "object" ||
    Array.isArray(backup.data)
  ) {
    throw new Error("File không đúng định dạng backup của KieuAssistant.");
  }

  const importedData = normalizeData(backup.data);
  const members = [...new Set([...(currentData.members || []), ...(importedData.members || [])])];
  const companies = mergeCatalog(currentData.companies, importedData.companies, "company");
  const chemicals = mergeCatalog(currentData.chemicals, importedData.chemicals, "chemical");
  const labels = mergeLabels(currentData.labels, importedData.labels);
  const columns = mergeColumns(currentData.columns, importedData.columns);
  const tasks = [...currentData.tasks];
  const taskIds = new Set(tasks.map((task) => task.id));
  const taskKeys = new Set(tasks.map((task) => task.key).filter(Boolean));
  let addedTaskCount = 0;
  let skippedTaskCount = 0;

  importedData.tasks.forEach((importedTask) => {
    if (
      (importedTask.id && taskIds.has(importedTask.id)) ||
      (importedTask.key && taskKeys.has(importedTask.key))
    ) {
      skippedTaskCount += 1;
      return;
    }

    const id = reserveUniqueId(importedTask.id, "task", taskIds);
    const key = importedTask.key || createTaskKey(tasks);
    tasks.push({
      ...importedTask,
      id,
      key,
      companyId: companies.idMap.get(importedTask.companyId) || "",
      chemicals: importedTask.chemicals
        .map((chemicalId) => chemicals.idMap.get(chemicalId))
        .filter(Boolean),
      labels: importedTask.labels
        .map((label) => labels.nameMap.get(label))
        .filter(Boolean),
      columnId: columns.idMap.get(importedTask.columnId) || "todo",
    });
    taskKeys.add(key);
    addedTaskCount += 1;
  });

  return {
    data: {
      ...currentData,
      members,
      companies: companies.items,
      chemicals: chemicals.items,
      labels: labels.labels,
      columns: columns.columns,
      tasks,
    },
    summary: {
      members: members.length - (currentData.members || []).length,
      companies: companies.addedCount,
      chemicals: chemicals.addedCount,
      labels: labels.addedCount,
      columns: columns.addedCount,
      tasks: addedTaskCount,
      skippedTasks: skippedTaskCount,
    },
  };
}
