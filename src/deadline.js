const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

export function getDeadlineInfo(dueDate, now = Date.now()) {
  if (!dueDate) return null;

  const deadlineDay = toUtcDay(dueDate);
  if (deadlineDay === null) return null;

  const remainingDays = Math.round((deadlineDay - currentUtcDay(now)) / DAY_IN_MS);
  const isOverdue = remainingDays < 0;

  return {
    isOverdue,
    remainingDays,
    label:
      remainingDays === 0
        ? "Đến hạn hôm nay"
        : isOverdue
          ? `Quá hạn ${Math.abs(remainingDays)} ngày`
          : `Còn ${remainingDays} ngày`,
  };
}

export function getTaskDeadlineInfo(task, now = Date.now()) {
  if (!task || task.columnId === "completed") return null;

  const dueDate = task.columnDueDates?.[task.columnId];
  const deadlineInfo = getDeadlineInfo(dueDate, now);
  if (!deadlineInfo) return null;

  const milestoneOrder = ["po", "ps-coa", "payment", "documents", "etd", "completed"];
  const columnIndex = milestoneOrder.indexOf(task.columnId);
  const previousColumnId = milestoneOrder[columnIndex - 1];
  const baseDate = previousColumnId ? task.columnDueDates?.[previousColumnId] : task.createdAt;
  const startedDay = toUtcDay(baseDate);
  const deadlineDay = toUtcDay(dueDate);
  const totalDays =
    startedDay === null || deadlineDay === null
      ? null
      : Math.max(0, Math.round((deadlineDay - startedDay) / DAY_IN_MS));
  const remainingRatio =
    totalDays && totalDays > 0 ? deadlineInfo.remainingDays / totalDays : null;
  const isHighPriority =
    deadlineInfo.isOverdue ||
    deadlineInfo.remainingDays === 0 ||
    (remainingRatio !== null && remainingRatio <= 0.3);

  return {
    ...deadlineInfo,
    dueDate,
    totalDays,
    remainingRatio,
    isHighPriority,
    priority: isHighPriority ? "high" : "low",
  };
}

export function getTaskPriority(task, now = Date.now()) {
  if (task?.columnId === "completed") return "low";
  return getTaskDeadlineInfo(task, now)?.priority || "low";
}

export function compareTasksByBoardPriority(
  firstTask,
  secondTask,
  now = Date.now(),
  firstIndex = 0,
  secondIndex = 0,
) {
  const firstDeadlineInfo = getTaskDeadlineInfo(firstTask, now);
  const secondDeadlineInfo = getTaskDeadlineInfo(secondTask, now);
  const firstPriorityRank = firstDeadlineInfo?.isHighPriority ? 0 : 1;
  const secondPriorityRank = secondDeadlineInfo?.isHighPriority ? 0 : 1;

  if (firstPriorityRank !== secondPriorityRank) {
    return firstPriorityRank - secondPriorityRank;
  }

  const firstRemainingDays =
    typeof firstDeadlineInfo?.remainingDays === "number"
      ? firstDeadlineInfo.remainingDays
      : Number.POSITIVE_INFINITY;
  const secondRemainingDays =
    typeof secondDeadlineInfo?.remainingDays === "number"
      ? secondDeadlineInfo.remainingDays
      : Number.POSITIVE_INFINITY;

  if (firstRemainingDays !== secondRemainingDays) {
    return firstRemainingDays - secondRemainingDays;
  }

  return firstIndex - secondIndex;
}
