/** Small, pure workflow rules shared by forms and automated tests. */
export function isValidCalendarDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0, 10) === date;
}

export function validateAssignmentDraft(form) {
  if (!form || typeof form.title !== 'string' || !form.title.trim()) return 'Enter an assignment title.';
  if (form.title.length > 160) return 'Assignment title must be 160 characters or fewer.';
  if (typeof form.subject !== 'string' || !form.subject.trim()) return 'Choose a subject.';
  if (!isValidCalendarDate(form.due)) return 'Choose a valid assignment due date.';
  if (typeof form.detail !== 'string' || form.detail.length > 10000) return 'Instructions must be 10,000 characters or fewer.';
  return null;
}

function parseMinutes(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Reject overlapping sessions on the same date without silently changing the user's plan. */
export function validateStudySessionDraft(form, existing = [], editingId = null) {
  if (!form || typeof form.title !== 'string' || !form.title.trim()) return 'Enter a study session title.';
  if (form.title.length > 160) return 'Study session title must be 160 characters or fewer.';
  if (typeof form.subject !== 'string' || !form.subject.trim()) return 'Choose a subject.';
  if (!isValidCalendarDate(form.date)) return 'Choose a valid study date.';
  const start = parseMinutes(form.start);
  if (start === null) return 'Enter a valid 24-hour start time.';
  const duration = Number(form.duration);
  if (!Number.isInteger(duration) || duration < 5 || duration > 720) return 'Choose a duration between 5 and 720 minutes.';
  if (start + duration > 1440) return 'Study sessions cannot extend past midnight. Split this into two sessions.';
  if (typeof form.goal !== 'string' || form.goal.length > 5000) return 'Study goals must be 5,000 characters or fewer.';
  const conflicts = existing.some((session) => {
    if (session.id === editingId || session.date !== form.date) return false;
    const sessionStart = parseMinutes(session.start);
    const sessionDuration = Number(session.duration);
    if (sessionStart === null || !(sessionDuration > 0)) return false;
    return start < sessionStart + sessionDuration && sessionStart < start + duration;
  });
  return conflicts ? 'This time overlaps another study session. Choose a different time.' : null;
}

export function sortedSessions(records) {
  return [...records].sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
}

export function updateEditedRecord(records, id, changes) {
  return records.map((record) => record.id === id ? { ...record, ...changes, id: record.id } : record);
}
