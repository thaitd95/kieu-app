import test from "node:test";
import assert from "node:assert/strict";
import {
  archiveCompletedTask,
  canMoveTaskToWorkflowColumn,
  getWorkflowMoveBlockReason,
  isTaskInCompletedArchive,
  moveTaskToWorkflowColumn,
} from "../src/workflow.js";

test("records previous status actual date when moving forward", () => {
  const task = {
    columnId: "po",
    columnActualDates: {},
    columnStartedDates: { po: "2026-06-01" },
    objectives: [],
  };

  const moved = moveTaskToWorkflowColumn(task, "ps-coa", { now: new Date(2026, 5, 7) });
  assert.equal(moved.columnId, "ps-coa");
  assert.equal(moved.columnActualDates.po, "2026-06-07");
  assert.equal(moved.columnStartedDates["ps-coa"], "2026-06-07");
});

test("does not backfill previous actual dates when setting status for a new task", () => {
  const task = {
    columnId: "po",
    columnActualDates: {},
    columnStartedDates: { po: "2026-06-01" },
    objectives: [],
  };

  const moved = moveTaskToWorkflowColumn(task, "completed", {
    now: new Date(2026, 5, 7),
    recordCompletion: false,
  });
  assert.equal(moved.columnId, "completed");
  assert.equal(moved.columnActualDates.po, "");
  assert.equal(moved.columnActualDates.completed, "2026-06-07");
  assert.equal(moved.columnStartedDates.completed, "2026-06-07");
});

test("blocks forward moves until required current objectives are completed", () => {
  const task = {
    columnId: "po",
    objectives: [
      { id: "required-done", completed: true },
      { id: "required-open", completed: false },
      { id: "optional-open", completed: false, optional: true },
    ],
  };

  assert.equal(canMoveTaskToWorkflowColumn(task, "ps-coa"), false);
  assert.match(getWorkflowMoveBlockReason(task, "ps-coa"), /1\/2/);
});

test("allows forward moves when required current objectives are completed", () => {
  const task = {
    columnId: "po",
    objectives: [
      { id: "required-done", completed: true },
      { id: "optional-open", completed: false, optional: true },
    ],
  };

  assert.equal(canMoveTaskToWorkflowColumn(task, "ps-coa"), true);
});

test("allows new tasks to be created directly as completed without objective checks", () => {
  const task = {
    columnId: "po",
    objectives: [{ id: "required-open", completed: false }],
  };

  assert.equal(canMoveTaskToWorkflowColumn(task, "completed"), false);
  assert.equal(canMoveTaskToWorkflowColumn(task, "completed", { isNewTask: true }), true);
});

test("moves completed work to completed archive after fourteen days", () => {
  const task = {
    columnId: "completed",
    columnActualDates: { completed: "2026-06-01" },
  };

  assert.equal(isTaskInCompletedArchive(task, new Date(2026, 5, 14)), false);
  assert.equal(isTaskInCompletedArchive(task, new Date(2026, 5, 15)), true);
});

test("archives completed work manually and clears archive when status changes", () => {
  const task = {
    columnId: "completed",
    columnActualDates: {},
    columnStartedDates: { completed: "2026-06-01" },
  };

  const archived = archiveCompletedTask(task, new Date(2026, 5, 7));
  assert.equal(archived.completedArchivedAt, "2026-06-07");
  assert.equal(archived.columnActualDates.completed, "2026-06-07");
  assert.equal(isTaskInCompletedArchive(archived, new Date(2026, 5, 7)), true);

  const reopened = moveTaskToWorkflowColumn(archived, "etd", { now: new Date(2026, 5, 8) });
  assert.equal(reopened.columnId, "etd");
  assert.equal(reopened.completedArchivedAt, "");
  assert.equal(isTaskInCompletedArchive(reopened, new Date(2026, 5, 8)), false);
});
