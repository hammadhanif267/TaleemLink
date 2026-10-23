"use client";

import { useEffect, useMemo, useState } from "react";
import { validateAssignmentDraft, validateStudySessionDraft, sortedSessions, updateEditedRecord } from "../lib/workflows.mjs";
import { STORAGE_KEY, readLocalRecords, writeLocalRecords, subjectProgress, assignmentStats, validateAttachment } from "../lib/local-records.mjs";

const initialTasks = [];
// Shared subject catalogue for multiple education systems and study streams.
const subjectOptions = [
  "Mathematics", "English", "Urdu", "Physics", "Chemistry", "Biology", "Computer Science",
  "General Science", "Islamiat", "Pakistan Studies", "Statistics", "Economics", "Accounting",
  "Business Studies", "Commerce", "Education", "Civics", "Sociology", "Psychology", "History",
  "Geography", "Political Science", "Fine Arts", "Literature", "Environmental Science", "Arabic",
  "Tarjuma-tul-Quran", "Technical Drawing", "Electrical Technology", "Computer Applications", "Other",
];
const subjects = [
  { name: "Mathematics", short: "MTH", color: "blue", progress: 0, icon: "∑", lessons: 0 },
  { name: "English", short: "ENG", color: "orange", progress: 0, icon: "Aa", lessons: 0 },
  { name: "Physics", short: "PHY", color: "green", progress: 0, icon: "⚛", lessons: 0 },
  { name: "Biology", short: "BIO", color: "mint", progress: 0, icon: "❋", lessons: 0 },
  { name: "Chemistry", short: "CHE", color: "peach", progress: 0, icon: "⚗", lessons: 0 },
  { name: "Computer Science", short: "CS", color: "violet", progress: 0, icon: "⌘", lessons: 0 },
  { name: "Economics", short: "ECO", color: "blue", progress: 0, icon: "↗", lessons: 0 },
  { name: "Fine Arts", short: "ART", color: "orange", progress: 0, icon: "✎", lessons: 0 },
];
const starterLessons = [];
const starterQuizzes = [];
const navItems = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "lessons", label: "Lessons & notes", icon: "▤" },
  { id: "assignments", label: "Assignments", icon: "✓" },
  { id: "study-plan", label: "Study planner", icon: "◷" },
  { id: "quizzes", label: "Quizzes & practice", icon: "?" },
  { id: "progress", label: "My progress", icon: "↗" },
];

function Icon({ children, className = "" }) { return <span aria-hidden="true" className={`icon ${className}`}>{children}</span>; }
function prettyDate(date) { const parsed = new Date(`${date}T12:00:00`); return Number.isNaN(parsed.getTime()) ? "Date not set" : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function newId() { return crypto.randomUUID(); }

// Large lesson files live in IndexedDB rather than localStorage, so PDFs and videos
// do not quickly fill the browser's small text-storage quota.
function openMaterialsDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("This browser does not support offline file storage."));
    const request = indexedDB.open("taleemlink-materials-v1", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline file storage."));
  });
}
async function saveMaterialFile(file, id) {
  const db = await openMaterialsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    transaction.objectStore("files").put({ id, name: file.name, type: file.type, size: file.size, blob: file });
    transaction.oncomplete = () => { db.close(); resolve({ id, name: file.name, type: file.type, size: file.size }); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Could not save this file.")); };
  });
}
async function deleteMaterialFile(id) {
  const db = await openMaterialsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    transaction.objectStore("files").delete(id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Could not delete the attachment.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error("Attachment deletion was interrupted.")); };
  });
}
async function readMaterialFile(id) {
  const db = await openMaterialsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("files", "readonly").objectStore("files").get(id);
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { db.close(); reject(request.error || new Error("Could not open this file.")); };
  });
}
function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function Home() {
  const [role, setRole] = useState("student");
  const [studyTrack, setStudyTrack] = useState("Choose your stream");
  const [studyLevel, setStudyLevel] = useState("Choose your level");
  const [active, setActive] = useState("overview");
  const [tasks, setTasks] = useState(initialTasks);
  const [studySessions, setStudySessions] = useState([]);
  const [showStudyForm, setShowStudyForm] = useState(false);
  const [editingStudyId, setEditingStudyId] = useState(null);
  const [studyForm, setStudyForm] = useState({ title: "", subject: "Mathematics", date: "", start: "17:00", duration: "25", goal: "" });
  const [submissions, setSubmissions] = useState({});
  const [submissionDrafts, setSubmissionDrafts] = useState({});
  const [gradingDrafts, setGradingDrafts] = useState({});
  const [lessons, setLessons] = useState(starterLessons);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [storageIssue, setStorageIssue] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All subjects");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizzes, setQuizzes] = useState(starterQuizzes);
  const [quizResults, setQuizResults] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [notice, setNotice] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", subject: "Mathematics", due: "", type: "Homework", detail: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", subject: "Mathematics", kind: "Notes + practice", length: "15 min", description: "" });
  const [lessonFile, setLessonFile] = useState(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState(null);
  const [lessonDone, setLessonDone] = useState([]);
  const [quizForm, setQuizForm] = useState({ title: "", subject: "Mathematics", description: "", questions: [
    { prompt: "", options: ["", "", "", ""], answer: "0" },
    { prompt: "", options: ["", "", "", ""], answer: "0" },
    { prompt: "", options: ["", "", "", ""], answer: "0" },
  ] });

  // Never persist initial empty state until the saved snapshot has been read.
  // This also prevents invalid/corrupted records from being overwritten.
  useEffect(() => {
    try {
      const data = readLocalRecords(localStorage);
      if (data) {
        setTasks(data.tasks);
        setStudySessions(data.studySessions);
        setSubmissions(data.submissions);
        setLessons(data.lessons);
        setLessonDone(data.lessonDone);
        setQuizzes(data.quizzes);
        setQuizResults(data.quizResults);
        setStudyTrack(data.studyTrack);
        setStudyLevel(data.studyLevel);
      }
    } catch (error) {
      setStorageIssue(`${error?.message || "Cannot read saved learning records."} Your original browser data has been preserved. Saving is paused.`);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || storageIssue) return;
    try {
      writeLocalRecords(localStorage, { tasks, submissions, studySessions, lessons, lessonDone, quizzes, quizResults, studyTrack, studyLevel });
      setSaved(true);
    } catch (error) {
      setSaved(false);
      setStorageIssue(`${error?.message || "Cannot save learning records."} Saving is paused to prevent data loss.`);
    }
  }, [hydrated, storageIssue, tasks, submissions, studySessions, lessons, lessonDone, quizzes, quizResults, studyTrack, studyLevel]);

  // Manage keyboard navigation across all four dialog forms.
  useEffect(() => {
    if (!showTaskForm && !showStudyForm && !showLessonForm && !showQuizForm) return;
    const previousFocus = document.activeElement;
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (!dialog) return;
    const first = dialog.querySelector('input:not([type="hidden"]), select, textarea, button');
    first?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowTaskForm(false); setEditingTaskId(null);
        setShowStudyForm(false); setEditingStudyId(null);
        setShowLessonForm(false); setLessonFile(null);
        setShowQuizForm(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')]
        .filter((element) => element.getClientRects().length > 0);
      if (!elements.length) return;
      const firstElement = elements[0], lastElement = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === firstElement || !dialog.contains(document.activeElement))) {
        event.preventDefault(); lastElement.focus();
      } else if (!event.shiftKey && (document.activeElement === lastElement || !dialog.contains(document.activeElement))) {
        event.preventDefault(); firstElement.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [showTaskForm, showStudyForm, showLessonForm, showQuizForm]);

  // A second tab may edit the same browser-local data. Pause writes in this tab.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setSaved(false);
        setStorageIssue("Saved records were changed in another tab. Saving here is paused to avoid overwriting them. Export your latest stored records if needed, then reload this tab.");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { completed, pending, completion } = assignmentStats(tasks, submissions);
  const quizAverage = quizResults.length ? Math.round(quizResults.reduce((sum, result) => sum + result.percent, 0) / quizResults.length) : null;
  const allSubjects = [...subjects, ...[...new Set(lessons.map((lesson) => lesson.subject))].filter((name) => !subjects.some((subject) => subject.name === name)).map((name) => ({ name, short: name, color: "violet", icon: "▤" }))];
  const finishedLessons = lessons.filter((lesson) => lessonDone.includes(lesson.id)).length;
  const lessonCompletion = lessons.length ? Math.round(finishedLessons * 100 / lessons.length) : 0;

  const filteredLessons = useMemo(() => lessons.filter((lesson) => (filter === "All subjects" || lesson.subject === filter) && `${lesson.title} ${lesson.subject} ${lesson.description}`.toLowerCase().includes(search.toLowerCase())), [lessons, filter, search]);
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 4000); };
  function exportBrowserRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { showNotice("There are no saved records to export."); return; }
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `taleemlink-records-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      showNotice("Record export started. Attached files are not included.");
    } catch (error) { showNotice(error?.message || "Could not export records."); }
  }
  async function resetBrowserRecords() {
    if (!window.confirm("Permanently delete all TaleemLink records AND local lesson attachments from this browser? Export records first if needed. This cannot be undone.")) return;
    try {
      if (typeof indexedDB !== "undefined") {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase("taleemlink-materials-v1");
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error || new Error("Could not delete stored lesson files."));
          request.onblocked = () => reject(new Error("Local lesson files are in use. Close other TaleemLink tabs and try again."));
        });
      }
      localStorage.removeItem(STORAGE_KEY);
      setTasks([]); setSubmissions({}); setStudySessions([]); setLessons([]);
      setLessonDone([]); setQuizzes([]); setQuizResults([]);
      setStudyTrack("Choose your stream"); setStudyLevel("Choose your level");
      setStorageIssue(""); setSaved(false);
      showNotice("Local learning records and attachments reset.");
    } catch (error) { showNotice(error?.message || "Could not reset local data. Your records were not intentionally cleared."); }
  }

  function openNewTask() {
    setEditingTaskId(null);
    setTaskForm({ title: "", subject: "Mathematics", due: "", type: "Homework", detail: "" });
    setShowTaskForm(true);
  }
  function editTask(task) {
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, subject: task.subject, due: task.due, type: task.type || "Homework", detail: task.detail || "" });
    setShowTaskForm(true);
  }
  function closeTaskForm() { setShowTaskForm(false); setEditingTaskId(null); }
  function openNewStudy() {
    setEditingStudyId(null);
    setStudyForm({ title: "", subject: "Mathematics", date: "", start: "17:00", duration: "25", goal: "" });
    setShowStudyForm(true);
  }
  function editStudy(session) {
    setEditingStudyId(session.id);
    setStudyForm({ title: session.title, subject: session.subject, date: session.date, start: session.start, duration: String(session.duration), goal: session.goal || "" });
    setShowStudyForm(true);
  }
  function closeStudyForm() { setShowStudyForm(false); setEditingStudyId(null); }
  function deleteAssignment(task) {
    if (!window.confirm(`Delete "${task.title}" and its saved submission and review? This cannot be undone.`)) return;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setSubmissions((current) => { const next = { ...current }; delete next[task.id]; return next; });
    setSubmissionDrafts((current) => { const next = { ...current }; delete next[task.id]; return next; });
    setGradingDrafts((current) => { const next = { ...current }; delete next[task.id]; return next; });
    showNotice("Assignment and linked submission removed.");
  }
  function deleteStudySession(session) {
    if (!window.confirm(`Delete study session "${session.title}"? This cannot be undone.`)) return;
    setStudySessions((current) => current.filter((item) => item.id !== session.id));
    showNotice("Study session removed.");
  }
  function deleteQuiz(quiz) {
    const count = quizResults.filter((result) => result.quizId === quiz.id).length;
    if (!window.confirm(`Delete "${quiz.title}" and its ${count} saved attempt${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setQuizzes((current) => current.filter((item) => item.id !== quiz.id));
    setQuizResults((current) => current.filter((result) => result.quizId !== quiz.id));
    showNotice("Quiz and linked attempt history deleted.");
  }
  async function deleteLesson(lesson) {
    if (deletingLessonId !== null) return;
    if (!window.confirm(`Delete learning material "${lesson.title}"${lesson.attachment ? " and its locally stored attachment" : ""}? Completion progress will also be removed. This cannot be undone.`)) return;
    setDeletingLessonId(lesson.id);
    try {
      if (lesson.attachment?.id) await deleteMaterialFile(lesson.attachment.id);
      setLessons((current) => current.filter((item) => item.id !== lesson.id));
      setLessonDone((current) => current.filter((id) => id !== lesson.id));
      showNotice("Learning material removed from this browser.");
    } catch (error) { showNotice(error?.message || "Could not delete the attachment. Learning material was preserved."); }
    finally { setDeletingLessonId(null); }
  }

  function addTask(event) {
    event.preventDefault();
    const error = validateAssignmentDraft(taskForm);
    if (error) { showNotice(error); return; }
    const fields = { ...taskForm, title: taskForm.title.trim(), detail: taskForm.detail.trim() };
    if (editingTaskId !== null) {
      setTasks((current) => updateEditedRecord(current, editingTaskId, fields));
      showNotice("Assignment changes saved locally.");
    } else {
      setTasks((current) => [{ ...fields, id: newId(), done: false, priority: "Normal" }, ...current]);
      showNotice("Assignment created in this browser.");
    }
    closeTaskForm();
  }
  async function addLesson(event) {
    event.preventDefault();
    if (!lessonForm.title.trim() || fileBusy) return;
    setFileBusy(true);
    const id = newId();
    try {
      let attachment = null;
      if (lessonFile) {
        const error = validateAttachment(lessonFile);
        if (error) { showNotice(error); return; }
        attachment = await saveMaterialFile(lessonFile, `lesson-${id}`);
      }
      setLessons((current) => [{ ...lessonForm, id, attachment, icon: lessonForm.kind.includes("Video") ? "▶" : "▤" }, ...current]);
      setLessonForm({ title: "", subject: "Mathematics", kind: "Notes + practice", length: "15 min", description: "" });
      setLessonFile(null);
      setShowLessonForm(false);
      showNotice(attachment ? "Lesson file stored in this browser; lesson record queued for local save." : "Lesson added to your local library.");
    } catch (error) {
      showNotice(error?.message || "Could not save the file. Try a smaller file or another browser.");
    } finally { setFileBusy(false); }
  }
  async function openLessonAttachment(lesson) {
    if (!lesson.attachment?.id) {
      showNotice("This starter lesson has no attached file yet. The teacher can add a PDF, image or video.");
      return;
    }
    try {
      const savedFile = await readMaterialFile(lesson.attachment.id);
      if (!savedFile?.blob) {
        showNotice("This attachment is missing from this browser. Please upload it again.");
        return;
      }
      const url = URL.createObjectURL(savedFile.blob);
      const link = document.createElement("a");
      link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { showNotice(error?.message || "Could not open this attachment."); }
  }
  function addStudySession(event) {
    event.preventDefault();
    const error = validateStudySessionDraft(studyForm, studySessions, editingStudyId);
    if (error) { showNotice(error); return; }
    const fields = { ...studyForm, title: studyForm.title.trim(), goal: studyForm.goal.trim(), duration: String(studyForm.duration) };
    if (editingStudyId !== null) {
      setStudySessions((current) => sortedSessions(updateEditedRecord(current, editingStudyId, fields)));
      showNotice("Study session updated locally.");
    } else {
      setStudySessions((current) => sortedSessions([{ ...fields, id: newId(), done: false }, ...current]));
      showNotice("Study session added to your local plan.");
    }
    closeStudyForm();
  }
  function toggleStudySession(id) {
    setStudySessions((current) => current.map((session) => session.id === id ? { ...session, done: !session.done } : session));
  }
  function toggleTask(id) {
    if (submissions[id]?.submittedAt) { showNotice("A submitted assignment remains completed. Delete the submission by deleting its assignment, or update the answer."); return; }
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }
  function submitAssignment(event, task) {
    event.preventDefault();
    const text = (submissionDrafts[task.id] ?? submissions[task.id]?.text ?? "").trim();
    if (!text) { showNotice("Write your answer before submitting."); return; }
    if (submissions[task.id]?.status === "Reviewed" && !window.confirm("Resubmitting removes the current review and grade. Continue?")) return;
    setSubmissions((current) => ({ ...current, [task.id]: { text, status: "Submitted", submittedAt: new Date().toISOString(), grade: "", feedback: "" } }));
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: true } : item));
    setSubmissionDrafts((current) => { const next = { ...current }; delete next[task.id]; return next; });
    setGradingDrafts((current) => { const next = { ...current }; delete next[task.id]; return next; });
    showNotice("Assignment submitted in this workspace.");
  }
  function saveAssignmentReview(event, task) {
    event.preventDefault();
    const draft = gradingDrafts[task.id] || {};
    if (!submissions[task.id]?.submittedAt) { showNotice("There is no submitted work to review."); return; }
    if (!(draft.grade ?? submissions[task.id]?.grade ?? "").trim() && !(draft.feedback ?? submissions[task.id]?.feedback ?? "").trim()) { showNotice("Add marks or feedback before completing the review."); return; }
    setSubmissions((current) => ({ ...current, [task.id]: { ...(current[task.id] || {}), grade: (draft.grade ?? current[task.id]?.grade ?? "").trim(), feedback: (draft.feedback ?? current[task.id]?.feedback ?? "").trim(), status: "Reviewed", reviewedAt: new Date().toISOString() } }));
    setGradingDrafts((current) => { const next = { ...current }; delete next[task.id]; return next; });
    showNotice("Review updated in this browser.");
  }
  function toggleLesson(id) { setLessonDone((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function updateQuizQuestion(questionIndex, field, value) {
    setQuizForm((current) => ({ ...current, questions: current.questions.map((question, index) => index === questionIndex ? { ...question, [field]: value } : question) }));
  }
  function updateQuizOption(questionIndex, optionIndex, value) {
    setQuizForm((current) => ({ ...current, questions: current.questions.map((question, index) => index === questionIndex ? { ...question, options: question.options.map((option, i) => i === optionIndex ? value : option) } : question) }));
  }
  function addQuiz(event) {
    event.preventDefault();
    if (!quizForm.title.trim() || quizForm.questions.some((q) => !q.prompt.trim() || q.options.some((option) => !option.trim()) || !Number.isInteger(Number(q.answer)) || Number(q.answer) < 0 || Number(q.answer) >= q.options.length)) { showNotice("Complete each question and choose a valid correct answer."); return; }
    const quiz = { id: newId(), title: quizForm.title.trim(), subject: quizForm.subject, description: quizForm.description.trim(), questions: quizForm.questions.map((q) => ({ ...q, answer: Number(q.answer) })) };
    setQuizzes((current) => [quiz, ...current]);
    setQuizForm({ title: "", subject: "Mathematics", description: "", questions: [
      { prompt: "", options: ["", "", "", ""], answer: "0" },
      { prompt: "", options: ["", "", "", ""], answer: "0" },
      { prompt: "", options: ["", "", "", ""], answer: "0" },
    ] });
    setShowQuizForm(false); showNotice("Quiz created in this browser.");
  }
  function submitQuiz() {
    if (!selectedQuiz) return;
    const score = selectedQuiz.questions.reduce((sum, question, index) => sum + (quizAnswers[index] !== undefined && Number(quizAnswers[index]) === question.answer ? 1 : 0), 0);
    const result = { id: newId(), quizId: selectedQuiz.id, title: selectedQuiz.title, subject: selectedQuiz.subject, score, total: selectedQuiz.questions.length, percent: Math.round((score / selectedQuiz.questions.length) * 100), date: new Date().toISOString() };
    setQuizResults((current) => [result, ...current]);
    setSelectedQuiz(null); setQuizAnswers({}); showNotice(`Quiz submitted: ${score}/${result.total} correct (${result.percent}%).`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); setActive("overview"); }}>
          <span className="brand-mark"><Icon>t</Icon><span className="brand-dot" /></span>
          <span className="brand-copy"><strong>Taleem<span>Link</span></strong><small>LEARN WITH PURPOSE</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="role-switch" aria-label="Switch workspace">
          <button aria-label="Teacher preview workspace" className={role === "teacher" ? "role-active" : ""} aria-pressed={role === "teacher"} onClick={() => setRole("teacher")}><Icon>♙</Icon> Teacher preview</button>
          <button aria-label="Student workspace" className={role === "student" ? "role-active" : ""} aria-pressed={role === "student"} onClick={() => setRole("student")}><Icon>♧</Icon> Student</button>
        </div>
        <div className="nav-label">LEARNING SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.id} aria-label={item.label} aria-current={active === item.id ? "page" : undefined} className={`nav-item ${active === item.id ? "nav-active" : ""}`} onClick={() => setActive(item.id)}><Icon>{item.icon}</Icon><span>{item.label}</span>{item.id === "assignments" && pending > 0 && <b className="nav-count">{pending}</b>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-card"><span className="offline-icon"><Icon>⌁</Icon></span><div><strong>Browser-local workspace</strong><p>Records stay on this device; full offline access is not verified.</p><small><i /> {storageIssue ? "Storage needs attention" : saved ? "Local records saved" : "Checking local storage"}</small></div></div>
          <div className="profile-mini"><div className="avatar">TL</div><div className="profile-meta"><strong>{role === "teacher" ? "Teacher preview" : "Student workspace"}</strong><span>{studyTrack !== "Choose your stream" ? `${studyTrack}${studyLevel !== "Choose your level" ? ` · ${studyLevel}` : ""}` : "Personal learning space"}</span></div></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Learning space</span><b>/</b><strong>{navItems.find((item) => item.id === active)?.label || "Overview"}</strong></div>
          
        </header>

        <div className="content-wrap">
          {storageIssue && <div className="storage-warning" role="alert"><div><strong>Local data needs attention</strong><p>{storageIssue}</p></div><div className="storage-actions"><button className="secondary-button" onClick={exportBrowserRecords}>Export original records</button><button className="secondary-button" onClick={() => window.location.reload()}>Reload saved data</button><button className="secondary-button" onClick={resetBrowserRecords}>Reset local data</button></div></div>}
          {!storageIssue && hydrated && <div className="backup-strip"><span>Local-only prototype. Workspace switching does not provide separate accounts or teacher permissions.</span><button className="text-button" onClick={exportBrowserRecords}>Export learning records (attachments excluded) ↗</button></div>}
          {active === "overview" && <>
            <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> TALEEMLINK WORKSPACE</div><h1>Learning overview</h1><p className="subheading">Manage study materials, assignments and learning progress in one place.</p></div><button className="primary-button" onClick={() => { setActive("assignments"); if (role === "teacher") openNewTask(); }}><Icon>＋</Icon>{role === "teacher" ? "Create assignment" : "View assignments"}</button></div>
            <div className="hero-banner"><div className="hero-copy"><span className="hero-kicker">{role === "teacher" ? "YOUR CLASSROOM, AT A GLANCE" : "YOUR NEXT CHAPTER STARTS HERE"}</span><h2>{role === "teacher" ? "Great teaching starts with a clear plan." : "Build your future, one lesson at a time."}</h2><p>{role === "teacher" ? "Keep lessons organised, set meaningful practice, and follow progress from one simple space." : "Your lessons, tasks and progress — all organised in one browser-local space."}</p><button className="hero-button" onClick={() => setActive(role === "teacher" ? "lessons" : "assignments")}>{role === "teacher" ? "Manage learning materials" : "Continue learning"}<Icon>↗</Icon></button></div><div className="hero-art" aria-hidden="true"><div className="art-sun" /><div className="art-book art-book-back" /><div className="art-book art-book-front"><div /><div /><div /></div><div className="art-pencil" /><div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✧</div><div className="art-plant"><i /><i /><i /><b /></div></div><div className="hero-footnote"><span><Icon>✓</Icon> Learn at your own pace</span><span><Icon>⌁</Icon> Browser-local study records</span></div></div>
            <section className="panel" style={{ marginTop: 22, padding: 22 }}>
              <div className="panel-heading"><div><h3>Personalise your study space</h3><p>For school, college, university, technical studies and different subject groups.</p></div><span className="subject-tag">All study streams</span></div>
              <div className="form-two" style={{ marginTop: 14 }}>
                <label>Study programme / stream<select value={studyTrack} onChange={(e) => setStudyTrack(e.target.value)}>
                  <option>Choose your stream</option><option>Matric / Secondary</option><option>O-Level</option><option>FSc Pre-Medical</option><option>FSc Pre-Engineering</option><option>ICS</option><option>FA / Arts</option><option>I.Com / Commerce</option><option>A-Level</option><option>University / Undergraduate</option><option>Diploma / Technical</option><option>Other study programme</option>
                </select></label>
                <label>Class / year / level<select value={studyLevel} onChange={(e) => setStudyLevel(e.target.value)}>
                  <option>Choose your level</option><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option><option>Grade 9</option><option>Grade 10 / Matric</option><option>Grade 11 / First year</option><option>Grade 12 / Second year</option><option>O-Level</option><option>A-Level</option><option>University year 1</option><option>University year 2</option><option>University year 3+</option><option>Diploma / Certificate</option><option>Other level</option>
                </select></label>
              </div>
              <p className="field-help" style={{ marginTop: 10 }}>Your study preferences are saved in this browser.</p>
            </section>
            <div className="section-heading"><div><h2>Your learning snapshot</h2><p>A little progress adds up to a lot.</p></div><button className="text-button" onClick={() => setActive("progress")}>View full progress <Icon>→</Icon></button></div>
            <div className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-icon lilac"><Icon>▤</Icon></span><span className="stat-trend">Saved locally</span></div><div className="stat-value">{lessons.length.toString().padStart(2, "0")}<span> lessons</span></div><p>Learning materials ready</p><div className="mini-progress"><i style={{ width: `${lessonCompletion}%` }} /></div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon mint"><Icon>✓</Icon></span><span className="stat-trend">{completion}% done</span></div><div className="stat-value">{completed.toString().padStart(2, "0")}<span> tasks</span></div><p>Assignments completed</p><div className="mini-progress mint-progress"><i style={{ width: `${completion}%` }} /></div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon peach"><Icon>◷</Icon></span><span className="stat-trend">Not completed</span></div><div className="stat-value">{pending.toString().padStart(2, "0")}<span> due</span></div><p>Tasks to focus on next</p><div className="stat-footer"><span className="tiny-dot" /> A manageable next step</div></article></div>
            <div className="dashboard-grid"><section className="panel subject-panel"><div className="panel-heading"><div><h3>Browse subjects</h3><p>Choose a subject to find or organise learning materials.</p></div></div><div className="subject-list">{subjects.map((subject) => <button className="subject-row" key={subject.name} onClick={() => { setFilter(subject.name); setActive("lessons"); }}><span className={`subject-icon ${subject.color}`}>{subject.icon}</span><span className="subject-info"><strong>{subject.name}</strong><small>Open subject library</small></span><Icon className="subject-chevron">›</Icon></button>)}</div></section><section className="panel tasks-panel"><div className="panel-heading"><div><h3>Up next</h3><p>Your next few tasks, all in one place.</p></div><button className="text-button compact" onClick={() => setActive("assignments")}>See all <Icon>→</Icon></button></div><div className="task-list">{tasks.filter((task) => !task.done && !submissions[task.id]?.submittedAt).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3).map((task) => <div className="task-row" key={task.id}><button className="task-check" onClick={() => toggleTask(task.id)} aria-label={`Complete ${task.title}`} /><div className="task-info"><strong>{task.title}</strong><span>{task.subject} <i>·</i> Due {prettyDate(task.due)}</span></div><span className={`task-type ${task.type === "Practice" ? "type-practice" : ""}`}>{task.type}</span></div>)}{pending === 0 && <div className="empty-state"><span>✦</span><strong>All caught up!</strong><p>{tasks.length ? "You’ve completed every assignment." : "There are no assignments yet."}</p></div>}</div><button className="add-task-link" onClick={() => { setActive("assignments"); if (role === "teacher") openNewTask(); }}><Icon>＋</Icon> {role === "teacher" ? "Add a new assignment" : "Review all assignments"}</button></section></div>
            <div className="bottom-note"><div className="note-icon">✦</div><div><strong>Consistency beats cramming.</strong><p>Try a 25-minute focused session, then take a short break. You’ve got this.</p></div><span className="note-decoration">✧</span></div>
          </>}

          {active === "lessons" && <>
            <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING LIBRARY</div><h1>Lessons & notes</h1><p className="subheading">Keep study materials organised in this browser.</p></div>{role === "teacher" && <button className="primary-button" onClick={() => setShowLessonForm(true)}><Icon>＋</Icon> Add learning material</button>}</div>
            <div className="library-toolbar"><label className="search-box"><Icon>⌕</Icon><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lessons, notes or subjects…" /></label><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by subject"><option>All subjects</option>{subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}</select></div>
            <div className="lesson-grid">{filteredLessons.map((lesson) => <article className="lesson-card" key={lesson.id}><div className={`lesson-art ${subjects.find((s) => s.name === lesson.subject)?.color || "violet"}`}><span className="lesson-art-mark">{lesson.icon}</span><span className="lesson-art-subject">{lesson.subject}</span><span className="lesson-deco deco-a">✦</span><span className="lesson-deco deco-b">✧</span></div><div className="lesson-card-body"><div className="lesson-meta"><span>{lesson.kind}</span><span><Icon>◷</Icon> {lesson.length}</span></div>{lesson.attachment && <div className="attachment-chip" title={lesson.attachment.name}><span>▧</span><span>{lesson.attachment.name}</span><small>{formatBytes(lesson.attachment.size)}</small></div>}<h3>{lesson.title}</h3><p>{lesson.description || "Study this material, then mark it complete to keep your progress up to date."}</p><div className="lesson-card-actions"><button className={`secondary-button ${lessonDone.includes(lesson.id) ? "completed-button" : ""}`} onClick={() => { toggleLesson(lesson.id); showNotice(lessonDone.includes(lesson.id) ? "Lesson marked as not completed." : "Lesson marked complete."); }}>{lessonDone.includes(lesson.id) ? "✓ Completed" : "Mark complete"}</button><button className="small-icon-button" aria-label={lesson.attachment ? `Open ${lesson.attachment.name}` : `View ${lesson.title}`} title={lesson.attachment ? `Open ${lesson.attachment.name}` : "No file attached yet"} onClick={() => openLessonAttachment(lesson)}>{lesson.attachment ? "↗" : "i"}</button>{role === "teacher" && <button className="delete-button" disabled={deletingLessonId !== null} title="Delete lesson and attachment" aria-label={`Delete ${lesson.title}`} onClick={() => deleteLesson(lesson)}>×</button>}</div></div></article>)}</div>{filteredLessons.length === 0 && <div className="panel empty-library"><span>⌕</span><h3>No lessons found</h3><p>{lessons.length ? "Try a different search or subject filter." : "Use Teacher preview to add your first lesson or note."}</p><button className="secondary-button" onClick={() => { setSearch(""); setFilter("All subjects"); }}>Clear filters</button></div>}
          </>}

          {active === "assignments" && <>
            <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> STAY ON TRACK</div><h1>Assignments</h1><p className="subheading">Clear tasks, realistic deadlines, steady progress.</p></div>{role === "teacher" && <button className="primary-button" onClick={openNewTask}><Icon>＋</Icon> Create assignment</button>}</div>
            <div className="assignment-summary"><div><span className="summary-icon violet">▤</span><span><small>Total assignments</small><strong>{tasks.length}</strong></span></div><div><span className="summary-icon orange">◷</span><span><small>To do</small><strong>{pending}</strong></span></div><div><span className="summary-icon green">✓</span><span><small>Completed</small><strong>{completed}</strong></span></div><div><span className="summary-icon blue">↗</span><span><small>Completion</small><strong>{completion}%</strong></span></div></div>
            <section className="panel assignment-panel"><div className="panel-heading"><div><h3>{role === "teacher" ? "Class assignments" : "Your task list"}</h3><p>{role === "teacher" ? "Create and review the work you’ve set." : "Submit your work to mark an assignment complete."}</p></div><span className="local-badge"><i /> Saved on device</span></div><div className="assignment-list">{tasks.map((task) => {
              const submission = submissions[task.id];
              const gradeDraft = gradingDrafts[task.id] || {};
              return <article className={`assignment-row assignment-row-expanded ${task.done ? "assignment-done" : ""}`} key={task.id}>
                <div className="assignment-check-column"><button className={`task-check ${task.done ? "checked" : ""}`} onClick={() => toggleTask(task.id)} disabled={role === "student" || Boolean(submission?.submittedAt)} aria-label={task.done ? "Completed" : "Assignment status"}>{task.done ? "✓" : ""}</button></div>
                <div className="assignment-main">
                  <div className="assignment-title-line"><h4>{task.title}</h4>{role === "teacher" && task.done && <span className="done-pill">Completed</span>}{submission?.status && <span className={`submission-pill ${submission.status === "Reviewed" ? "reviewed" : ""}`}>{submission.status}</span>}</div>
                  <p>{task.detail || "No extra instructions added."}</p>
                  <div className="assignment-meta"><span className="subject-tag">{task.subject}</span><span><Icon>▤</Icon> {task.type}</span><span><Icon>◷</Icon> Due {prettyDate(task.due)}</span></div>
                  {role === "student" && <form className="submission-form" onSubmit={(event) => submitAssignment(event, task)}>
                    <label htmlFor={`submission-${task.id}`}>Your answer / work</label>
                    <textarea id={`submission-${task.id}`} rows="3" value={submissionDrafts[task.id] ?? submission?.text ?? ""} onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Write your solution, explanation or homework summary…" />
                    <div className="submission-actions"><span>{submission?.submittedAt ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString()}` : "Submit when your work is ready"}</span><button type="submit" className="primary-button">{submission ? "Update submission" : "Submit assignment"} <Icon>→</Icon></button></div>
                    {(submission?.feedback || submission?.grade) && <div className="teacher-feedback"><strong>Teacher review {submission.grade && <span>· Grade: {submission.grade}</span>}</strong>{submission.feedback && <p>{submission.feedback}</p>}</div>}
                  </form>}
                  {role === "teacher" && <div className="teacher-review">
                    {submission ? <><div className="submitted-work-heading"><strong>Student submission</strong><span>{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Saved locally"}</span></div><p className="submitted-work-text">{submission.text}</p><form className="review-form" onSubmit={(event) => saveAssignmentReview(event, task)}>
                      <label>Grade / marks<input value={gradeDraft.grade ?? submission.grade ?? ""} onChange={(event) => setGradingDrafts((current) => ({ ...current, [task.id]: { ...(current[task.id] || {}), grade: event.target.value } }))} placeholder="e.g. 8/10 or A" /></label>
                      <label>Feedback<textarea rows="2" value={gradeDraft.feedback ?? submission.feedback ?? ""} onChange={(event) => setGradingDrafts((current) => ({ ...current, [task.id]: { ...(current[task.id] || {}), feedback: event.target.value } }))} placeholder="Give helpful, specific feedback…" /></label>
                      <button type="submit" className="secondary-button">Save review</button>
                    </form></> : <div className="waiting-submission"><span>◷</span><div><strong>Awaiting student work</strong><p>Switch to Student workspace to submit an answer on this device.</p></div></div>}
                  </div>}
                </div>
                {role === "teacher" && <div className="record-actions"><button className="small-icon-button" aria-label={`Edit ${task.title}`} title="Edit assignment" onClick={() => editTask(task)}>✎</button><button className="delete-button" aria-label={`Delete ${task.title}`} title="Delete assignment" onClick={() => deleteAssignment(task)}>×</button></div>}
              </article>;
            })}{tasks.length === 0 && <div className="empty-state"><span>✦</span><strong>No assignments yet</strong><p>Use Teacher preview to create an assignment on this device.</p></div>}</div></section>
          </>}

          {active === "study-plan" && <>
            <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> MAKE TIME FOR WHAT MATTERS</div><h1>Study planner</h1><p className="subheading">Turn your goals into small, manageable study sessions.</p></div><button className="primary-button" onClick={openNewStudy}><Icon>＋</Icon> Plan a session</button></div>
            <div className="study-plan-hero"><div><span className="hero-kicker">YOUR STUDY ROUTINE</span><h2>Consistency over cramming.</h2><p>Plan a subject, set a time and write one clear goal. Mark each session done when you finish.</p></div><div className="study-plan-stats"><div><strong>{studySessions.length}</strong><span>planned</span></div><div><strong>{studySessions.filter((session) => session.done).length}</strong><span>marked complete</span></div><div><strong>{studySessions.reduce((sum, session) => sum + (session.done ? Number(session.duration) || 0 : 0), 0)}</strong><span>planned minutes completed*</span></div></div></div>
            <section className="panel study-sessions-panel"><div className="panel-heading"><div><h3>Your study sessions</h3><p>Saved locally in this browser. Mark sessions complete or remove them. *Time is planned, not tracked.</p></div><span className="local-badge"><i /> Local plan</span></div>
              {studySessions.length ? <div className="study-session-list">{studySessions.map((session) => <article className={`study-session ${session.done ? "study-session-done" : ""}`} key={session.id}><button className={`task-check ${session.done ? "checked" : ""}`} onClick={() => toggleStudySession(session.id)} aria-label={session.done ? "Mark session incomplete" : "Mark session complete"}>{session.done ? "✓" : ""}</button><div className="study-session-main"><div className="study-session-title"><h4>{session.title}</h4><span className={`session-status ${session.done ? "session-status-done" : ""}`}>{session.done ? "Completed" : "Planned"}</span></div><div className="study-session-meta"><span className="subject-tag">{session.subject}</span><span>◷ {prettyDate(session.date)} · {session.start}</span><span>⌛ {session.duration} min</span></div>{session.goal && <p>{session.goal}</p>}</div><div className="record-actions"><button className="small-icon-button" aria-label={`Edit ${session.title}`} title="Edit study session" onClick={() => editStudy(session)}>✎</button><button className="delete-button" aria-label={`Delete ${session.title}`} title="Delete study session" onClick={() => deleteStudySession(session)}>×</button></div></article>)}</div> : <div className="empty-state study-empty"><span>◷</span><strong>Your study plan starts here</strong><p>Add a short session for any subject. Even 25 minutes can help you make progress.</p><button className="primary-button" onClick={openNewStudy}><Icon>＋</Icon> Plan your first session</button></div>}
            </section>
            <div className="bottom-note"><div className="note-icon">✦</div><div><strong>Try a focused study block.</strong><p>Choose one small goal, put distractions away, and take a short break after the session.</p></div><span className="note-decoration">✧</span></div>
          </>}

          {active === "quizzes" && <>
            <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> PRACTISE AND IMPROVE</div><h1>Quizzes & practice</h1><p className="subheading">Short MCQ checks help you spot what you understand and what to revise.</p></div>{role === "teacher" && <button className="primary-button" onClick={() => setShowQuizForm(true)}><Icon>＋</Icon> Create quiz</button>}</div>
            <div className="quiz-summary"><div><span className="summary-icon violet">?</span><span><small>Available quizzes</small><strong>{quizzes.length}</strong></span></div><div><span className="summary-icon green">✓</span><span><small>Attempts completed</small><strong>{quizResults.length}</strong></span></div><div><span className="summary-icon blue">↗</span><span><small>Average score</small><strong>{quizAverage === null ? "—" : `${quizAverage}%`}</strong></span></div></div>
            {selectedQuiz ? <section className="panel quiz-taking"><div className="quiz-taking-head"><div><span className="subject-tag">{selectedQuiz.subject}</span><h2>{selectedQuiz.title}</h2><p>{selectedQuiz.description || "Choose one answer for each question, then submit your quiz."}</p></div><button className="secondary-button" onClick={() => { if (Object.keys(quizAnswers).length && !window.confirm("Leave this quiz? Your unsent answers will be discarded.")) return; setSelectedQuiz(null); setQuizAnswers({}); }}>Exit quiz</button></div><div className="quiz-question-list">{selectedQuiz.questions.map((question, index) => <fieldset className="quiz-question" key={`${selectedQuiz.id}-${index}`}><legend><span>QUESTION {index + 1}</span>{question.prompt}</legend><div className="quiz-options">{question.options.map((option, optionIndex) => <label key={optionIndex} className={Number(quizAnswers[index]) === optionIndex ? "quiz-option selected" : "quiz-option"}><input type="radio" name={`quiz-${selectedQuiz.id}-${index}`} checked={Number(quizAnswers[index]) === optionIndex} onChange={() => setQuizAnswers((current) => ({ ...current, [index]: String(optionIndex) }))} /><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></label>)}</div></fieldset>)}</div><div className="quiz-submit-row"><span>{Object.keys(quizAnswers).length} of {selectedQuiz.questions.length} answered</span><button className="primary-button" onClick={submitQuiz} disabled={Object.keys(quizAnswers).length !== selectedQuiz.questions.length}>Submit answers <Icon>→</Icon></button></div></section> : <div className="quiz-grid">{quizzes.map((quiz) => { const latest = quizResults.find((result) => result.quizId === quiz.id); return <article className="quiz-card" key={quiz.id}><div className="quiz-card-top"><span className={`subject-icon ${subjects.find((subject) => subject.name === quiz.subject)?.color || "violet"}`}>?</span><span className="quiz-question-count">{quiz.questions.length} questions</span></div><span className="quiz-subject">{quiz.subject}</span><h3>{quiz.title}</h3><p>{quiz.description || "Test your understanding with a quick practice quiz."}</p>{latest && <div className="quiz-last-result"><span>Last score</span><strong>{latest.score}/{latest.total} · {latest.percent}%</strong></div>}<div className="quiz-card-actions">{role === "student" ? <button className="primary-button" onClick={() => { setSelectedQuiz(quiz); setQuizAnswers({}); }}>Start quiz <Icon>→</Icon></button> : <button className="secondary-button" onClick={() => showNotice("Open Student workspace to try this quiz. Your attempts are saved locally.")}>Preview quiz</button>}{role === "teacher" && <button className="delete-button" aria-label={`Delete ${quiz.title}`} title="Delete quiz and attempts" onClick={() => deleteQuiz(quiz)}>×</button>}</div></article>; })}{quizzes.length === 0 && <div className="panel empty-state"><strong>No quizzes yet</strong><p>Use Teacher preview to create a practice quiz.</p></div>}</div>}
            {quizResults.length > 0 && <section className="panel quiz-history"><div className="panel-heading"><div><h3>Recent quiz results</h3><p>Attempts saved in this browser.</p></div></div>{quizResults.slice(0, 6).map((result) => <div className="quiz-result-row" key={result.id}><span className="activity-icon violet">✓</span><div><strong>{result.title}</strong><p>{result.subject} · {new Date(result.date).toLocaleDateString()}</p></div><strong className={result.percent >= 70 ? "score-good" : "score-needs-work"}>{result.score}/{result.total} · {result.percent}%</strong></div>)}</section>}
          </>}

          {active === "progress" && <>
            <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> EVERY STEP COUNTS</div><h1>My progress</h1><p className="subheading">A simple view of what’s moving forward and what needs attention.</p></div><span className="local-badge large-badge"><i /> Device progress</span></div>
            <div className="progress-hero"><div><span className="hero-kicker">OVERALL ASSIGNMENT COMPLETION</span><div className="progress-big-number">{completion}<span>%</span></div><p>{completed} of {tasks.length} assignments completed. Keep building the habit.</p></div><div className="progress-ring" style={{ "--progress": `${completion * 3.6}deg` }}><div><strong>{completion}%</strong><span>complete</span></div></div></div>
            <div className="section-heading progress-heading"><div><h2>Subject progress</h2><p>Based only on lessons saved and marked complete in this browser.</p></div></div><div className="progress-subject-grid">{allSubjects.map((subject) => { const progress = subjectProgress(subject.name, lessons, lessonDone); return <article className="progress-subject-card" key={subject.name}><div className="progress-subject-top"><span className={`subject-icon ${subject.color}`}>{subject.icon}</span><span className="subject-percent">{progress.percent === null ? "—" : `${progress.percent}%`}</span></div><h3>{subject.name}</h3><p>{progress.finished} of {progress.total} saved lessons completed</p><div className="wide-progress"><i className={subject.color} style={{ width: `${progress.percent ?? 0}%` }} /></div><span className="progress-caption">{progress.total ? "Completion of saved lessons only" : "No lessons saved for this subject"}</span></article>; })}</div>
            <section className="panel activity-panel"><div className="panel-heading"><div><h3>Learning activity</h3><p>Activity saved in this browser on this device.</p></div></div><div className="activity-row"><span className="activity-icon green">✓</span><div><strong>{completed} assignments completed</strong><p>Based on tasks marked complete or submitted in this browser.</p></div><span className="activity-status">Local records</span></div><div className="activity-row"><span className="activity-icon violet">▤</span><div><strong>{finishedLessons} saved lessons marked complete</strong><p>Mark a lesson complete from Lessons & notes.</p></div><button className="text-button" onClick={() => setActive("lessons")}>Open lessons →</button></div></section>
          </>}
        </div>
        <footer className="footer"><span>© 2026 TaleemLink</span><span><i /> A calm space to learn, wherever you are.</span><span>Built for steady progress <b>✦</b></span></footer>
      </section>

      {showStudyForm && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeStudyForm(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="study-modal-title"><div className="modal-heading"><div><span className="eyebrow">BUILD A STEADY ROUTINE</span><h2 id="study-modal-title">{editingStudyId !== null ? "Edit study session" : "Plan a study session"}</h2><p>Choose a time and define one useful goal.</p></div><button className="modal-close" onClick={closeStudyForm} aria-label="Close">×</button></div><form onSubmit={addStudySession} className="form-stack"><label>Session title<input autoFocus required value={studyForm.title} onChange={(e) => setStudyForm({ ...studyForm, title: e.target.value })} placeholder="e.g. Revise chapter 3" /></label><label>Subject<select value={studyForm.subject} onChange={(e) => setStudyForm({ ...studyForm, subject: e.target.value })}>{subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}</select></label><div className="form-two"><label>Date<input type="date" required value={studyForm.date} onChange={(e) => setStudyForm({ ...studyForm, date: e.target.value })} /></label><label>Start time<input type="time" required value={studyForm.start} onChange={(e) => setStudyForm({ ...studyForm, start: e.target.value })} /></label></div><label>Duration<select value={studyForm.duration} onChange={(e) => setStudyForm({ ...studyForm, duration: e.target.value })}><option value="15">15 minutes</option><option value="25">25 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label><label>Goal for this session (optional)<textarea rows="3" value={studyForm.goal} onChange={(e) => setStudyForm({ ...studyForm, goal: e.target.value })} placeholder="e.g. Solve five practice questions without looking at notes" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeStudyForm}>Cancel</button><button type="submit" className="primary-button">{editingStudyId !== null ? "Update session" : "Save study session"} <Icon>→</Icon></button></div></form></section></div>}
      {showTaskForm && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeTaskForm(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-heading"><div><span className="eyebrow">PLAN THE NEXT STEP</span><h2 id="task-modal-title">{editingTaskId !== null ? "Edit assignment" : "Create assignment"}</h2><p>Add clear instructions and a due date.</p></div><button className="modal-close" onClick={closeTaskForm} aria-label="Close">×</button></div><form onSubmit={addTask} className="form-stack"><label>Assignment title<input autoFocus required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Chapter 2 practice questions" /></label><div className="form-two"><label>Subject<select value={taskForm.subject} onChange={(e) => setTaskForm({ ...taskForm, subject: e.target.value })}>{subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Type<select value={taskForm.type} onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}><option>Homework</option><option>Practice</option><option>Reading</option><option>Quiz</option></select></label></div><label>Due date<input type="date" required value={taskForm.due} onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })} /></label><label>Instructions<textarea rows="3" value={taskForm.detail} onChange={(e) => setTaskForm({ ...taskForm, detail: e.target.value })} placeholder="What should the student do?" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeTaskForm}>Cancel</button><button type="submit" className="primary-button">{editingTaskId !== null ? "Update assignment" : "Save assignment"} <Icon>→</Icon></button></div></form></section></div>}
      {showLessonForm && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowLessonForm(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="lesson-modal-title"><div className="modal-heading"><div><span className="eyebrow">BUILD YOUR LIBRARY</span><h2 id="lesson-modal-title">Add learning material</h2><p>Add a lesson or note entry to your library.</p></div><button className="modal-close" onClick={() => setShowLessonForm(false)} aria-label="Close">×</button></div><form onSubmit={addLesson} className="form-stack"><label>Title<input autoFocus required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="e.g. Functions in C++" /></label><div className="form-two"><label>Subject<select value={lessonForm.subject} onChange={(e) => setLessonForm({ ...lessonForm, subject: e.target.value })}>{subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Material type<select value={lessonForm.kind} onChange={(e) => setLessonForm({ ...lessonForm, kind: e.target.value })}><option>Notes + practice</option><option>Video lesson</option><option>Reading</option><option>PDF notes</option></select></label></div><label>Duration label<input value={lessonForm.length} onChange={(e) => setLessonForm({ ...lessonForm, length: e.target.value })} placeholder="e.g. 15 min" /></label><label>Short description<textarea rows="3" value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="What will the student learn?" /></label><label>Attach a file (optional)<input type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.ppt,.pptx,.doc,.docx" onChange={(e) => setLessonFile(e.target.files?.[0] || null)} /><span className="field-help">PDF, notes, images, documents or videos · up to 150 MB. The file stays in this browser for offline use.</span>{lessonFile && <span className="selected-file"><span>▧</span> {lessonFile.name} · {formatBytes(lessonFile.size)} <button type="button" onClick={() => setLessonFile(null)} aria-label="Remove selected file">×</button></span>}</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowLessonForm(false); setLessonFile(null); }}>Cancel</button><button type="submit" className="primary-button" disabled={fileBusy}>{fileBusy ? "Saving…" : "Save material"} <Icon>→</Icon></button></div></form></section></div>}
      {showQuizForm && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowQuizForm(false); }}><section className="modal quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-modal-title"><div className="modal-heading"><div><span className="eyebrow">CHECK UNDERSTANDING</span><h2 id="quiz-modal-title">Create MCQ quiz</h2><p>Create a three-question quiz for practice.</p></div><button className="modal-close" onClick={() => setShowQuizForm(false)} aria-label="Close">×</button></div><form onSubmit={addQuiz} className="form-stack"><label>Quiz title<input autoFocus required value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="e.g. C++ Chapter 1 revision" /></label><label>Subject<select value={quizForm.subject} onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })}>{subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Short instructions<textarea rows="2" value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} placeholder="What should the student revise?" /></label>{quizForm.questions.map((question, index) => <fieldset className="quiz-builder-question" key={index}><legend>Question {index + 1}</legend><label>Question text<input required value={question.prompt} onChange={(e) => updateQuizQuestion(index, "prompt", e.target.value)} placeholder="Write the question" /></label><div className="quiz-builder-options">{question.options.map((option, optionIndex) => <label key={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}<input required value={option} onChange={(e) => updateQuizOption(index, optionIndex, e.target.value)} placeholder={`Answer ${String.fromCharCode(65 + optionIndex)}`} /></label>)}</div><label>Correct answer<select value={question.answer} onChange={(e) => updateQuizQuestion(index, "answer", e.target.value)}>{question.options.map((option, optionIndex) => <option value={String(optionIndex)} key={optionIndex}>{String.fromCharCode(65 + optionIndex)}{option.trim() ? ` — ${option}` : ""}</option>)}</select></label></fieldset>)}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowQuizForm(false)}>Cancel</button><button type="submit" className="primary-button">Save quiz <Icon>→</Icon></button></div></form></section></div>}
      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </main>
  );
}
