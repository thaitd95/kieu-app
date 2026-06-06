const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getDeadlineInfo(dueDate, now = Date.now()) {
  if (!dueDate) return null;

  const [year, month, day] = dueDate.split("-").map(Number);
  const deadlineDay = Date.UTC(year, month - 1, day);
  const currentDate = new Date(now);
  const currentDay = Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  if (Number.isNaN(deadlineDay)) return null;

  const remainingDays = Math.round((deadlineDay - currentDay) / DAY_IN_MS);
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
