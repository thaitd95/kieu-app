import test from "node:test";
import assert from "node:assert/strict";
import { createReportWorkbook } from "../src/excelReports.js";
import { REPORT_TYPES } from "../src/reportData.js";

const reportData = {
  companies: [{ id: "seller-1", name: "Seller A" }],
  chemicals: [{ id: "chemical-1", name: "Product A" }],
  tasks: [
    {
      poNumber: "PO-COMPLETE",
      companyId: "seller-1",
      chemicals: ["chemical-1"],
      amount: "1,000 USD",
      columnId: "completed",
      paymentMethod: "advance",
      shippingMethod: "air",
      columnDueDates: { payment: "2026-06-10" },
      columnActualDates: {
        po: "2026-05-01",
        "ps-coa": "2026-05-03",
        payment: "2026-05-05",
        etd: "2026-05-08",
      },
    },
    {
      poNumber: "PO-UNPAID",
      companyId: "seller-1",
      chemicals: ["chemical-1"],
      amount: "2,000 USD",
      columnId: "payment",
      paymentMethod: "against-shipping-docs",
      shippingMethod: "sea",
      columnDueDates: { payment: "2026-06-20" },
      columnActualDates: {},
    },
  ],
};

test("creates each supported workbook layout", async () => {
  const reportDate = new Date(2026, 5, 7);
  const leadTime = createReportWorkbook(reportData, REPORT_TYPES.leadTime, reportDate);
  const payment = createReportWorkbook(reportData, REPORT_TYPES.payment, reportDate);

  assert.deepEqual(leadTime.worksheets.map((sheet) => sheet.name), ["Lead time records"]);
  assert.deepEqual(payment.worksheets.map((sheet) => sheet.name), ["Báo cáo thanh toán"]);

  assert.equal(leadTime.getWorksheet("Lead time records").getCell("A5").value, "PO-COMPLETE");
  assert.match(leadTime.getWorksheet("Lead time records").getCell("A2").value, /07\/06\/2026/);
  assert.equal(payment.getWorksheet("Báo cáo thanh toán").getCell("A5").value, "PO-UNPAID");
  assert.equal(payment.getWorksheet("Báo cáo thanh toán").getCell("G5").value, -7);
  assert.equal(
    payment.getWorksheet("Báo cáo thanh toán").getCell("A5").fill.fgColor.argb,
    "FFFFE2E0",
  );

  assert.throws(() => createReportWorkbook(reportData, "combined", reportDate), /không hợp lệ/i);

  const buffer = await payment.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 0);
});
