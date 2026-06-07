import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePaymentRemainingDays,
  createLeadTimeRows,
  createPaymentRows,
  differenceInCalendarDays,
  isHighPaymentPriority,
} from "../src/reportData.js";
import { normalizeData } from "../src/model.js";

test("normalizes legacy seller addresses and new task fields", () => {
  const data = normalizeData({
    companies: [{ id: "seller-1", name: "Seller A", address: "Old office" }],
    tasks: [{ id: "task-1", companyId: "seller-1", columnId: "po" }],
  });

  assert.deepEqual(data.companies[0], {
    id: "seller-1",
    name: "Seller A",
    accountNumber: "",
    officeAddress: "Old office",
    producerAddress: "",
    description: "",
  });
  assert.equal(data.tasks[0].paymentMethod, "");
  assert.equal(data.tasks[0].shippingMethod, "");
  assert.equal(data.tasks[0].createdAt, "");
  assert.equal(data.tasks[0].completedArchivedAt, "");
  assert.deepEqual(Object.keys(data.tasks[0].columnActualDates), [
    "po",
    "ps-coa",
    "payment",
    "documents",
    "etd",
    "completed",
  ]);
  assert.deepEqual(Object.keys(data.tasks[0].columnStartedDates), [
    "po",
    "ps-coa",
    "payment",
    "documents",
    "etd",
    "completed",
  ]);
});

test("calculates calendar day differences and shipping deductions", () => {
  assert.equal(differenceInCalendarDays("2026-06-10", "2026-06-07"), 3);
  assert.equal(differenceInCalendarDays("2026-06-06", "2026-06-07"), -1);

  const task = {
    columnDueDates: { payment: "2026-06-20" },
    shippingMethod: "air",
  };
  assert.equal(calculatePaymentRemainingDays(task, new Date(2026, 5, 7)), 10);
  assert.equal(
    calculatePaymentRemainingDays({ ...task, shippingMethod: "sea" }, new Date(2026, 5, 7)),
    -7,
  );
});

test("applies payment priority thresholds", () => {
  assert.equal(isHighPaymentPriority("advance", 12), true);
  assert.equal(isHighPaymentPriority("advance", 13), false);
  assert.equal(isHighPaymentPriority("against-shipping-docs", 20), true);
  assert.equal(isHighPaymentPriority("against-shipping-docs", 21), false);
  assert.equal(isHighPaymentPriority("30-days", -5), false);
});

test("builds lead time rows only for completed purchase orders", () => {
  const data = {
    companies: [{ id: "seller-1", name: "Seller A" }],
    tasks: [
      {
        poNumber: "PO-1",
        companyId: "seller-1",
        columnId: "completed",
        shippingMethod: "sea",
        columnActualDates: {
          po: "2026-05-01",
          "ps-coa": "2026-05-04",
          payment: "2026-05-09",
          etd: "2026-05-12",
        },
      },
      { poNumber: "PO-2", columnId: "etd", columnActualDates: {} },
    ],
  };

  assert.deepEqual(createLeadTimeRows(data), [
    {
      poNumber: "PO-1",
      seller: "Seller A",
      poToCoa: 3,
      psCoaToPayment: 5,
      paymentToEtd: 3,
      etdToEta: 20,
    },
  ]);
});

test("filters and sorts unpaid rows by business priority", () => {
  const data = {
    companies: [{ id: "seller-1", name: "Seller A" }],
    chemicals: [{ id: "chemical-1", name: "Product A" }],
    tasks: [
      {
        poNumber: "REGULAR",
        companyId: "seller-1",
        chemicals: ["chemical-1"],
        amount: "100",
        paymentMethod: "advance",
        shippingMethod: "air",
        columnDueDates: { payment: "2026-06-25" },
        columnActualDates: {},
      },
      {
        poNumber: "HIGH",
        chemicals: [],
        paymentMethod: "against-shipping-docs",
        shippingMethod: "sea",
        columnDueDates: { payment: "2026-06-20" },
        columnActualDates: {},
      },
      {
        poNumber: "THIRTY",
        chemicals: [],
        paymentMethod: "30-days",
        shippingMethod: "air",
        columnDueDates: { payment: "2026-06-08" },
        columnActualDates: {},
      },
      {
        poNumber: "MISSING",
        chemicals: [],
        paymentMethod: "advance",
        shippingMethod: "",
        columnDueDates: { payment: "2026-06-08" },
        columnActualDates: {},
      },
      {
        poNumber: "PAID",
        chemicals: [],
        paymentMethod: "advance",
        shippingMethod: "air",
        columnDueDates: { payment: "2026-06-08" },
        columnActualDates: { payment: "2026-06-07" },
      },
    ],
  };

  const rows = createPaymentRows(data, new Date(2026, 5, 7));
  assert.deepEqual(rows.map((row) => row.poNumber), [
    "HIGH",
    "REGULAR",
    "THIRTY",
    "MISSING",
  ]);
  assert.equal(rows[0].remainingDays, -7);
  assert.equal(rows[0].isHighPriority, true);
  assert.equal(rows[1].productName, "Product A");
  assert.equal(rows[3].remainingDays, null);
});
