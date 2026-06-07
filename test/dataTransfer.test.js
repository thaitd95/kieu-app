import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createSystemBackup,
  mergeSystemBackup,
} from "../src/dataTransfer.js";

function createEmptyData() {
  return {
    members: [],
    companies: [],
    chemicals: [],
    labels: [],
    columns: [],
    tasks: [],
  };
}

test("creates version 2 backups and still imports version 1 data", () => {
  assert.equal(createSystemBackup(createEmptyData()).version, BACKUP_VERSION);
  assert.equal(BACKUP_VERSION, 2);

  const result = mergeSystemBackup(createEmptyData(), {
    format: BACKUP_FORMAT,
    version: 1,
    data: {
      companies: [{ id: "seller-1", name: "Seller A", address: "Legacy address" }],
      tasks: [
        {
          id: "task-1",
          key: "KA-200",
          title: "Imported task",
          companyId: "seller-1",
          columnId: "payment",
          paymentMethod: "advance",
          shippingMethod: "air",
          columnActualDates: { po: "2026-05-30", "ps-coa": "2026-06-01" },
        },
      ],
    },
  });

  assert.equal(result.data.companies[0].officeAddress, "Legacy address");
  assert.equal(result.data.tasks[0].paymentMethod, "advance");
  assert.equal(result.data.tasks[0].shippingMethod, "air");
  assert.equal(result.data.tasks[0].columnActualDates["ps-coa"], "2026-06-01");
  assert.equal(result.data.tasks[0].columnStartedDates.payment, "2026-06-01");
});
