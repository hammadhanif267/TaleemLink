/**
 * Read-only derived dashboard. Never fabricate events or count planned minutes as actual study.
 * Local calendar dates use YYYY-MM-DD, preserving the learner's timezone.
 */
export function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const validDateKey = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const doneAssignment = (task, submissions) => Boolean(task.done || submissions?.[task.id]?.submittedAt);
const isDoneLesson = (lesson, done) => done.has(lesson.id);

export function dashboardSnapshot({ tasks = [], submissions = {}, lessons = [], lessonDone = [], quizzes = [], quizResults = [], studySessions = [] }, today = "") {
  const actualToday = validDateKey(today) ? today : "";
  const completedLessonIds = new Set(lessonDone);
  const completedLessons = lessons.filter((lesson) => isDoneLesson(lesson, completedLessonIds)).length;
  const remainingAssignments = tasks.filter((task) => !doneAssignment(task, submissions));
  const datedAssignments = remainingAssignments
    .filter((task) => validDateKey(task.due))
    .slice()
    .sort((a, b) => a.due.localeCompare(b.due) || String(a.title).localeCompare(String(b.title)));
  const undatedAssignments = remainingAssignments.filter((task) => !validDateKey(task.due));
  const orderedAssignments = [...datedAssignments, ...undatedAssignments];
  const allTodaySessions = actualToday ? studySessions
    .filter((session) => session.date === actualToday)
    .slice().sort((a, b) => String(a.start || "").localeCompare(String(b.start || ""))) : [];
  const validAttempts = quizResults
    .filter((attempt) => Number.isFinite(attempt.percent) && Number.isFinite(attempt.score) && Number.isFinite(attempt.total) && attempt.total > 0)
    .slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const attemptedQuizzes = new Set(quizResults.map((attempt) => String(attempt.quizId)));
  const unattemptedQuizzes = quizzes.filter((quiz) => !attemptedQuizzes.has(String(quiz.id)));
  const overdueAssignments = actualToday ? datedAssignments.filter((task) => task.due < actualToday) : [];
  const dueTodayAssignments = actualToday ? datedAssignments.filter((task) => task.due === actualToday) : [];
  const completedSessions = studySessions.filter((session) => session.done);

  return {
    lessons: { total: lessons.length, completed: completedLessons, percent: lessons.length ? Math.round(completedLessons / lessons.length * 100) : null },
    assignments: {
      total: tasks.length, completed: tasks.length - remainingAssignments.length,
      pending: remainingAssignments.length,
      percent: tasks.length ? Math.round((tasks.length - remainingAssignments.length) / tasks.length * 100) : null,
      overdueCount: overdueAssignments.length, dueTodayCount: dueTodayAssignments.length,
      upcoming: orderedAssignments.slice(0, 4).map((task) => ({ id: task.id, title: task.title, subject: task.subject, due: validDateKey(task.due) ? task.due : "", timing: !actualToday || !validDateKey(task.due) ? "upcoming" : task.due < actualToday ? "overdue" : task.due === actualToday ? "today" : "upcoming" })),
    },
    today: {
      sessions: allTodaySessions.map((session) => ({ id: session.id, title: session.title, subject: session.subject, start: session.start, duration: Number(session.duration) || 0, done: Boolean(session.done) })),
      total: allTodaySessions.length,
      completed: allTodaySessions.filter((session) => session.done).length,
      plannedMinutes: allTodaySessions.reduce((sum, session) => sum + (Number(session.duration) > 0 ? Number(session.duration) : 0), 0),
    },
    study: {
      total: studySessions.length, completed: completedSessions.length,
      completedPlannedMinutes: completedSessions.reduce((sum, session) => sum + (Number(session.duration) > 0 ? Number(session.duration) : 0), 0),
    },
    quizzes: { total: quizzes.length, attempts: validAttempts.length, unattempted: unattemptedQuizzes.slice(0, 3).map((quiz) => ({ id: quiz.id, title: quiz.title, subject: quiz.subject })), latestAttempt: validAttempts[0] || null, average: validAttempts.length ? Math.round(validAttempts.reduce((sum, attempt) => sum + attempt.percent, 0) / validAttempts.length) : null },
    latestMaterials: lessons.slice(0, 3).map((lesson) => ({ id: lesson.id, title: lesson.title, subject: lesson.subject, done: isDoneLesson(lesson, completedLessonIds) })),
  };
}
