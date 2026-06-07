import test from "node:test";
import assert from "node:assert/strict";
import {
  compareTasksByBoardPriority,
  getTaskDeadlineInfo,
  getTaskPriority,
} from "../src/deadline.js";

test("calculates priority from remaining percentage of the current status", () => {
  const task = {
    columnId: "payment",
    createdAt: "2026-06-01",
    columnDueDates: { "ps-coa": "2026-06-07", payment: "2026-06-17" },
  };

  assert.equal(getTaskPriority(task, new Date(2026, 5, 13)), "low");
  assert.equal(getTaskPriority(task, new Date(2026, 5, 14)), "high");
  assert.equal(getTaskDeadlineInfo(task, new Date(2026, 5, 14)).remainingRatio, 0.3);
});

test("uses created date as the base for the PO milestone", () => {
  const task = {
    columnId: "po",
    createdAt: "2026-06-01",
    columnDueDates: { po: "2026-06-11" },
  };

  assert.equal(getTaskPriority(task, new Date(2026, 5, 7)), "low");
  assert.equal(getTaskPriority(task, new Date(2026, 5, 8)), "high");
});

test("uses previous planned milestone as the base for the current milestone", () => {
  const task = {
    columnId: "payment",
    createdAt: "2026-06-01",
    columnDueDates: { payment: "2026-06-17" },
  };

  assert.equal(getTaskDeadlineInfo(task, new Date(2026, 5, 14)).remainingRatio, null);
});

test("marks overdue work high and ignores completed work", () => {
  assert.equal(
    getTaskPriority(
      {
        columnId: "etd",
        createdAt: "2026-06-01",
        columnDueDates: { etd: "2026-06-06" },
      },
      new Date(2026, 5, 7),
    ),
    "high",
  );
  assert.equal(getTaskDeadlineInfo({ columnId: "completed" }, new Date(2026, 5, 7)), null);
  assert.equal(getTaskPriority({ columnId: "completed" }, new Date(2026, 5, 7)), "low");
});

test("sorts board tasks by high priority then fewer remaining days", () => {
  const now = new Date(2026, 5, 17);
  const tasks = [
    {
      id: "low-sooner",
      columnId: "payment",
      columnDueDates: { "ps-coa": "2026-06-16", payment: "2026-06-18" },
    },
    {
      id: "missing-date",
      columnId: "payment",
      columnDueDates: {},
    },
    {
      id: "high-three-days",
      columnId: "payment",
      columnDueDates: { "ps-coa": "2026-05-21", payment: "2026-06-20" },
    },
    {
      id: "high-overdue",
      columnId: "payment",
      columnDueDates: { "ps-coa": "2026-06-01", payment: "2026-06-16" },
    },
  ];

  const sortedIds = tasks
    .map((task, index) => ({ index, task }))
    .sort((first, second) =>
      compareTasksByBoardPriority(first.task, second.task, now, first.index, second.index),
    )
    .map(({ task }) => task.id);

  assert.deepEqual(sortedIds, [
    "high-overdue",
    "high-three-days",
    "low-sooner",
    "missing-date",
  ]);
});
