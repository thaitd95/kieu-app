import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDateForFileName,
  formatDisplayDate,
  isIsoDate,
  parseDisplayDate,
} from "../src/dateFormat.js";

test("formats and parses dates as DD/MM/YYYY", () => {
  assert.equal(formatDisplayDate("2026-06-07"), "07/06/2026");
  assert.equal(parseDisplayDate("7/6/2026"), "2026-06-07");
  assert.equal(formatDateForFileName("2026-06-07"), "07-06-2026");
});

test("rejects invalid dates", () => {
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(parseDisplayDate("31/02/2026"), "");
  assert.equal(formatDisplayDate("not-a-date"), "");
});
