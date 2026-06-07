const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const REPORT_TYPES = {
  leadTime: "lead-time",
  payment: "payment",
};

export const paymentMethods = [
  { value: "advance", label: "TT advance" },
  { value: "against-shipping-docs", label: "TT against shipping docts" },
  { value: "30-days", label: "TT 30 days" },
];

export const shippingMethods = [
  { value: "air", label: "Air", transitDays: 3 },
  { value: "sea", label: "Sea", transitDays: 20 },
];

export function normalizePaymentMethod(value) {
  return paymentMethods.some((method) => method.value === value) ? value : "";
}

export function normalizeShippingMethod(value) {
  return shippingMethods.some((method) => method.value === value) ? value : "";
}

export function getPaymentMethodLabel(value) {
  return paymentMethods.find((method) => method.value === value)?.label || "";
}

export function getShippingMethodLabel(value) {
  return shippingMethods.find((method) => method.value === value)?.label || "";
}

export function getShippingDays(value) {
  return shippingMethods.find((method) => method.value === value)?.transitDays ?? null;
}

function parseDateParts(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;

  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, timestamp, year };
}

export function differenceInCalendarDays(endDate, startDate) {
  const end = parseDateParts(endDate);
  const start = parseDateParts(startDate);
  if (!end || !start) return null;
  return Math.round((end.timestamp - start.timestamp) / DAY_IN_MS);
}

export function toLocalDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculatePaymentRemainingDays(task, reportDate = new Date()) {
  const paymentDueDate = task.columnDueDates?.payment || "";
  const shippingDays = getShippingDays(task.shippingMethod);
  if (!paymentDueDate || shippingDays === null) return null;

  const daysUntilPayment = differenceInCalendarDays(
    paymentDueDate,
    toLocalDateString(reportDate),
  );
  return daysUntilPayment === null ? null : daysUntilPayment - shippingDays;
}

export function isHighPaymentPriority(paymentMethod, remainingDays) {
  if (remainingDays === null) return false;
  if (paymentMethod === "advance") return remainingDays <= 12;
  if (paymentMethod === "against-shipping-docs") return remainingDays <= 20;
  return false;
}

export function createLeadTimeRows(data) {
  return data.tasks
    .filter((task) => task.columnId === "completed" && String(task.poNumber || "").trim())
    .map((task) => {
      const company = data.companies.find((item) => item.id === task.companyId);
      const actualDates = task.columnActualDates || {};

      return {
        poNumber: task.poNumber,
        seller: company?.name || "",
        poToCoa: differenceInCalendarDays(actualDates["ps-coa"], actualDates.po),
        psCoaToPayment: differenceInCalendarDays(
          actualDates.payment,
          actualDates["ps-coa"],
        ),
        paymentToEtd: differenceInCalendarDays(actualDates.etd, actualDates.payment),
        etdToEta: getShippingDays(task.shippingMethod),
      };
    });
}

function getPaymentSortGroup(row) {
  if (row.remainingDays === null || !row.paymentMethodValue || !row.shippingMethodValue) {
    return 3;
  }
  if (row.paymentMethodValue === "30-days") return 2;
  return row.isHighPriority ? 0 : 1;
}

export function createPaymentRows(data, reportDate = new Date()) {
  return data.tasks
    .filter(
      (task) =>
        String(task.poNumber || "").trim() &&
        !task.columnActualDates?.payment,
    )
    .map((task, originalIndex) => {
      const company = data.companies.find((item) => item.id === task.companyId);
      const productNames = task.chemicals
        .map((chemicalId) => data.chemicals.find((item) => item.id === chemicalId)?.name)
        .filter(Boolean)
        .join(", ");
      const remainingDays = calculatePaymentRemainingDays(task, reportDate);

      return {
        poNumber: task.poNumber,
        seller: company?.name || "",
        productName: productNames,
        amount: task.amount || "",
        paymentMethod: getPaymentMethodLabel(task.paymentMethod),
        shippingMethod: getShippingMethodLabel(task.shippingMethod),
        remainingDays,
        isHighPriority: isHighPaymentPriority(task.paymentMethod, remainingDays),
        paymentMethodValue: task.paymentMethod,
        shippingMethodValue: task.shippingMethod,
        originalIndex,
      };
    })
    .sort((first, second) => {
      const groupDifference = getPaymentSortGroup(first) - getPaymentSortGroup(second);
      if (groupDifference) return groupDifference;

      if (first.remainingDays !== null && second.remainingDays !== null) {
        const dayDifference = first.remainingDays - second.remainingDays;
        if (dayDifference) return dayDifference;
      }

      return first.originalIndex - second.originalIndex;
    });
}
