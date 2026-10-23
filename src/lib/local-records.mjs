/** Browser-local record validation and persistence. No server or multi-user security. */
export const STORAGE_KEY = "taleemlink-local-v2";
export const SCHEMA_VERSION = 1;

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const identifier = (value) => (typeof value === "string" && value.length > 0) || (typeof value === "number" && Number.isFinite(value));
const string = (value) => typeof value === "string";
const recordList = (value, required) => Array.isArray(value) && value.every((item) => object(item) && identifier(item.id) && required.every((field) => string(item[field])));
const optionalString = (value) => value === undefined || string(value);

/** Reject incomplete or malformed data instead of silently replacing existing records. */
export function validateRecords(value) {
  if (!object(value)) throw new Error("Saved learning data is not a valid object.");
  if (value.schemaVersion !== undefined && value.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Saved learning data uses an unsupported format version.");
  }
  if (!Object.keys(value).some((key) => ["tasks", "submissions", "studySessions", "lessons", "lessonDone", "quizzes", "quizResults", "studyTrack", "studyLevel"].includes(key))) {
    throw new Error("Saved learning data does not contain any recognizable records. Original data was not overwritten.");
  }
  const fields = {
    tasks: recordList(value.tasks ?? [], ["title", "subject", "due"]),
    studySessions: recordList(value.studySessions ?? [], ["title", "subject", "date", "start"]),
    lessons: recordList(value.lessons ?? [], ["title", "subject"]),
    quizzes: Array.isArray(value.quizzes ?? []) && (value.quizzes ?? []).every((quiz) =>
      object(quiz) && identifier(quiz.id) && string(quiz.title) && string(quiz.subject) &&
      Array.isArray(quiz.questions) && quiz.questions.length > 0 && quiz.questions.every((q) =>
        object(q) && string(q.prompt) && Array.isArray(q.options) && q.options.length >= 2 &&
        q.options.every(string) && Number.isInteger(Number(q.answer)) && Number(q.answer) >= 0 && Number(q.answer) < q.options.length)),
    quizResults: Array.isArray(value.quizResults ?? []) && (value.quizResults ?? []).every((r) =>
      object(r) && identifier(r.id) && identifier(r.quizId) && string(r.title) &&
      Number.isFinite(r.score) && Number.isFinite(r.total) && r.total > 0 &&
      r.score >= 0 && r.score <= r.total && Number.isFinite(r.percent)),
    lessonDone: Array.isArray(value.lessonDone ?? []) && (value.lessonDone ?? []).every(identifier),
    submissions: object(value.submissions ?? {}) && Object.values(value.submissions ?? {}).every((s) =>
      object(s) && string(s.text) && optionalString(s.status) && optionalString(s.grade) && optionalString(s.feedback)),
    studyTrack: optionalString(value.studyTrack),
    studyLevel: optionalString(value.studyLevel),
  };
  const bad = Object.entries(fields).find(([, good]) => !good);
  if (bad) throw new Error(`Saved learning data has an invalid ${bad[0]} field. Original data was not overwritten.`);
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: value.tasks ?? [], submissions: value.submissions ?? {},
    studySessions: value.studySessions ?? [], lessons: value.lessons ?? [],
    lessonDone: value.lessonDone ?? [], quizzes: value.quizzes ?? [],
    quizResults: value.quizResults ?? [],
    studyTrack: value.studyTrack ?? "Choose your stream",
    studyLevel: value.studyLevel ?? "Choose your level",
  };
}

export function readLocalRecords(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? null : validateRecords(JSON.parse(raw));
}

export function writeLocalRecords(storage, records) {
  const validated = validateRecords(records);
  storage.setItem(STORAGE_KEY, JSON.stringify(validated));
}

export function subjectProgress(subject, lessons, lessonDone) {
  const matching = lessons.filter((lesson) => lesson.subject === subject);
  const done = new Set(lessonDone);
  const finished = matching.filter((lesson) => done.has(lesson.id)).length;
  return { total: matching.length, finished, percent: matching.length ? Math.round((finished / matching.length) * 100) : null };
}

export function assignmentStats(tasks, submissions) {
  const completed = tasks.filter((task) => Boolean(task.done) || Boolean(submissions[task.id]?.submittedAt)).length;
  return { completed, pending: tasks.length - completed, completion: tasks.length ? Math.round(completed * 100 / tasks.length) : 0 };
}

export function validateAttachment(file) {
  if (!file || typeof file.name !== "string" || !Number.isFinite(file.size)) return "Select a valid file.";
  if (!/\.(pdf|txt|md|png|jpg|jpeg|webp|mp4|webm|mov|ppt|pptx|doc|docx)$/i.test(file.name)) return "This file type is not supported.";
  if (file.size === 0) return "Empty files cannot be attached.";
  if (file.size > 150 * 1024 * 1024) return "Please choose a file no larger than 150 MB.";
  return null;
}
