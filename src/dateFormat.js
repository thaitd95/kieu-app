const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function isIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(value || "")) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function formatDisplayDate(value) {
  if (!isIsoDate(value)) return "";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function parseDisplayDate(value) {
  const match = DISPLAY_DATE_PATTERN.exec(String(value || "").trim());
  if (!match) return "";

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const isoDate = `${yearValue}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return isIsoDate(isoDate) ? isoDate : "";
}

export function formatDateForFileName(value) {
  return formatDisplayDate(value).replaceAll("/", "-");
}
