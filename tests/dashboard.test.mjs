import test from "node:test";
import assert from "node:assert/strict";
import { dashboardSnapshot, localDateKey } from "../src/lib/dashboard.mjs";

const blank = () => dashboardSnapshot({}, "2026-10-24");

test("new learner has zero records and no misleading performance percentages", () => {
  const data = blank();
  assert.equal(data.lessons.percent, null);
  assert.equal(data.assignments.percent, null);
  assert.equal(data.quizzes.average, null);
  assert.equal(data.today.plannedMinutes, 0);
  assert.deepEqual(data.assignments.upcoming, []);
});

test("assignments: ignore completed records, prioritize overdue, and avoid duplicate submission count", () => {
  const tasks = [
    { id: "c", title: "Already submitted", subject: "Math", due: "2026-10-22", done: true },
    { id: "d", title: "Overdue", subject: "Chemistry", due: "2026-10-21" },
    { id: "b", title: "Today", subject: "Math", due: "2026-10-24" },
    { id: "a", title: "Future", subject: "Physics", due: "2026-10-28" },
  ];
  const data = dashboardSnapshot({ tasks, submissions: { c: { submittedAt: "2026-10-22T10:00:00Z" } } }, "2026-10-24");
  assert.equal(data.assignments.completed, 1);
  assert.equal(data.assignments.percent, 25);
  assert.equal(data.assignments.overdueCount, 1);
  assert.equal(data.assignments.dueTodayCount, 1);
  assert.deepEqual(data.assignments.upcoming.map(({ id }) => id), ["d", "b", "a"]);
  assert.deepEqual(data.assignments.upcoming.map(({ timing }) => timing), ["overdue", "today", "upcoming"]);
});

test("only distinct actual lessons in library count toward completion", () => {
  const data = dashboardSnapshot({ lessons: [ { id: "l1", title: "A" }, { id: "l2", title: "B" } ], lessonDone: ["l1", "l1", "deleted"] });
  assert.equal(data.lessons.completed, 1);
  assert.equal(data.lessons.percent, 50);
});

test("today's sessions sort by start time and do not impersonate recorded study minutes", () => {
  const data = dashboardSnapshot({ studySessions: [
    { id: 1, date: "2026-10-24", start: "17:00", title: "Evening", duration: "25", done: true },
    { id: 2, date: "2026-10-25", start: "08:00", title: "Tomorrow", duration: "60", done: false },
    { id: 3, date: "2026-10-24", start: "09:00", title: "Morning", duration: "45", done: false },
  ] }, "2026-10-24");
  assert.deepEqual(data.today.sessions.map((session) => session.id), [3, 1]);
  assert.equal(data.today.plannedMinutes, 70);
  assert.equal(data.today.completed, 1);
  assert.equal(data.study.completedPlannedMinutes, 25);
});

test("quiz attempts average only actual results and unattempted quizzes are not pending grades", () => {
  const data = dashboardSnapshot({ quizzes: [{ id: "q1", title: "Once" }, { id: "q2", title: "Not started" }], quizResults: [
    { id: "r1", quizId: "q1", score: 1, total: 2, percent: 50, date: "2026-10-20T07:00:00Z" },
    { id: "r2", quizId: "q1", score: 2, total: 2, percent: 100, date: "2026-10-23T07:00:00Z" },
  ] }, "2026-10-24");
  assert.equal(data.quizzes.average, 75);
  assert.equal(data.quizzes.latestAttempt.id, "r2");
  assert.deepEqual(data.quizzes.unattempted.map((item) => item.id), ["q2"]);
});

test("bad calendar dates are never treated as overdue assignments", () => {
  const data = dashboardSnapshot({ tasks: [ { id: 1, title: "Invalid", due: "2026-02-30" }, { id: 2, title: "Unscheduled", due: "" } ] }, "2026-10-24");
  assert.equal(data.assignments.overdueCount, 0);
  assert.equal(data.assignments.upcoming[0].due, "");
});

test("date key uses local calendar day without UTC truncation", () => {
  const date = new Date(2026, 9, 24, 23, 50, 0);
  assert.equal(localDateKey(date), "2026-10-24");
  assert.equal(localDateKey(new Date("invalid")), "");
});

test("dashboard does not mutate saved arrays", () => {
  const tasks = Object.freeze([{ id: "1", title: "Tomorrow", due: "2026-10-25" }, { id: "2", title: "Today", due: "2026-10-24" }]);
  dashboardSnapshot({ tasks }, "2026-10-24");
  assert.equal(tasks[0].id, "1");
});
