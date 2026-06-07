import ExcelJS from "exceljs";
import {
  createLeadTimeRows,
  createPaymentRows,
  REPORT_TYPES,
  toLocalDateString,
} from "./reportData.js";
import { formatDateForFileName, formatDisplayDate } from "./dateFormat.js";

export { REPORT_TYPES };

const COLORS = {
  border: "FFD9E2F2",
  danger: "FFFFE2E0",
  dangerText: "FFAE2E24",
  header: "FF0C66E4",
  high: "FFFFF0B3",
  highText: "FF7F5F01",
  muted: "FFF1F2F4",
  title: "FF172B4D",
  white: "FFFFFFFF",
};

function styleSheet(sheet, title, subtitle, columnWidths) {
  const lastColumn = columnWidths.length;
  const lastColumnLetter = sheet.getColumn(lastColumn).letter;

  sheet.mergeCells(`A1:${lastColumnLetter}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, color: { argb: COLORS.white }, size: 16 };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.title },
  };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(`A2:${lastColumnLetter}2`);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { color: { argb: "FF626F86" }, italic: true, size: 10 };
  sheet.getRow(2).height = 20;

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: COLORS.white } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.header } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 30;

  columnWidths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.views = [{ state: "frozen", ySplit: 4 }];
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: Math.max(4, sheet.rowCount), column: lastColumn },
  };

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 4) return;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: COLORS.border } },
        left: { style: "thin", color: { argb: COLORS.border } },
        right: { style: "thin", color: { argb: COLORS.border } },
        top: { style: "thin", color: { argb: COLORS.border } },
      };
      if (rowNumber > 4) cell.alignment = { vertical: "top", wrapText: true };
    });
  });
}

function styleDataRow(row, fillColor, fontColor) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
    if (fontColor) cell.font = { ...cell.font, color: { argb: fontColor } };
  });
}

function addLeadTimeSheet(workbook, data, reportDate) {
  const sheet = workbook.addWorksheet("Lead time records");
  const rows = createLeadTimeRows(data);
  const displayReportDate = formatDisplayDate(toLocalDateString(reportDate));

  sheet.addRows([
    [],
    [],
    [],
    ["Số PO", "Seller", "PO => COA", "PS COA => Payment", "Payment => ETD", "ETD => ETA"],
  ]);

  rows.forEach((row) => {
    const excelRow = sheet.addRow([
      row.poNumber,
      row.seller,
      row.poToCoa,
      row.psCoaToPayment,
      row.paymentToEtd,
      row.etdToEta,
    ]);

    [3, 4, 5].forEach((columnNumber) => {
      const cell = excelRow.getCell(columnNumber);
      if (typeof cell.value === "number" && cell.value < 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.danger } };
        cell.font = { color: { argb: COLORS.dangerText }, bold: true };
      }
    });
  });

  styleSheet(
    sheet,
    "Báo cáo lead time records",
    `Ngày xuất: ${displayReportDate} | Đơn vị thời gian: ngày lịch`,
    [18, 28, 16, 22, 20, 16],
  );
}

function addPaymentSheet(workbook, data, reportDate) {
  const sheet = workbook.addWorksheet("Báo cáo thanh toán");
  const rows = createPaymentRows(data, reportDate);
  const displayReportDate = formatDisplayDate(toLocalDateString(reportDate));

  sheet.addRows([
    [],
    [],
    [],
    ["Số PO", "Seller", "Tên SP", "Số tiền", "Phương thức thanh toán", "Phương thức vận chuyển", "Thời gian còn lại"],
  ]);

  rows.forEach((row) => {
    const excelRow = sheet.addRow([
      row.poNumber,
      row.seller,
      row.productName,
      row.amount,
      row.paymentMethod,
      row.shippingMethod,
      row.remainingDays,
    ]);

    if (row.remainingDays !== null && row.remainingDays < 0) {
      styleDataRow(excelRow, COLORS.danger, COLORS.dangerText);
    } else if (row.isHighPriority) {
      styleDataRow(excelRow, COLORS.high, COLORS.highText);
    } else if (row.remainingDays === null) {
      styleDataRow(excelRow, COLORS.muted);
    }
  });

  styleSheet(
    sheet,
    "Báo cáo thanh toán",
    `Ngày xuất: ${displayReportDate} | Thời gian còn lại = ngày đến Payment dự kiến - thời gian vận chuyển`,
    [18, 26, 30, 18, 30, 24, 20],
  );
}

export function createReportWorkbook(data, type, reportDate = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KieuAssistant";
  workbook.created = reportDate;

  if (type === REPORT_TYPES.leadTime) {
    addLeadTimeSheet(workbook, data, reportDate);
  }
  if (type === REPORT_TYPES.payment) {
    addPaymentSheet(workbook, data, reportDate);
  }
  if (workbook.worksheets.length === 0) throw new Error("Loại báo cáo không hợp lệ.");
  return workbook;
}

function getReportFileName(type, reportDate) {
  const prefix = {
    [REPORT_TYPES.leadTime]: "bao-cao-lead-time",
    [REPORT_TYPES.payment]: "bao-cao-thanh-toan",
  }[type];
  return `${prefix}-${formatDateForFileName(toLocalDateString(reportDate))}.xlsx`;
}

export async function downloadReportWorkbook(data, type, reportDate = new Date()) {
  const workbook = createReportWorkbook(data, type, reportDate);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getReportFileName(type, reportDate);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
