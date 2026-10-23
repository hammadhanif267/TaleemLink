import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCalendarDate, validateAssignmentDraft, validateStudySessionDraft, sortedSessions, updateEditedRecord } from '../src/lib/workflows.mjs';

const assignment = { title: 'Read chapter', subject: 'Physics', due: '2026-10-30', detail: '' };
const session = { title: 'Review geometry', subject: 'Mathematics', date: '2026-10-30', start: '17:00', duration: '25', goal: '' };

test('calendar dates reject impossible days and malformed values', () => {
  assert.equal(isValidCalendarDate('2028-02-29'), true);
  assert.equal(isValidCalendarDate('2027-02-29'), false);
  assert.equal(isValidCalendarDate('2026-13-01'), false);
  assert.equal(isValidCalendarDate('anything'), false);
});
test('assignment form validates required fields and preserves valid past dates', () => {
  assert.equal(validateAssignmentDraft(assignment), null);
  assert.match(validateAssignmentDraft({ ...assignment, due: '2026-02-30' }), /valid/);
  assert.match(validateAssignmentDraft({ ...assignment, title: '  ' }), /title/);
  assert.equal(validateAssignmentDraft({ ...assignment, due: '2024-12-31' }), null);
});
test('study form validates dates, duration, and midnight rollover', () => {
  assert.equal(validateStudySessionDraft(session), null);
  assert.match(validateStudySessionDraft({ ...session, duration: '0' }), /duration/);
  assert.match(validateStudySessionDraft({ ...session, start: '23:50', duration: '25' }), /midnight/);
  assert.match(validateStudySessionDraft({ ...session, start: '24:15' }), /start time/);
});
test('study session refuses exact and partial overlap but allows back-to-back', () => {
  const existing = [{ id: 'a', ...session }];
  assert.match(validateStudySessionDraft(session, existing), /overlaps/);
  assert.match(validateStudySessionDraft({ ...session, start: '17:24' }, existing), /overlaps/);
  assert.equal(validateStudySessionDraft({ ...session, start: '17:25' }, existing), null);
  assert.equal(validateStudySessionDraft({ ...session, date: '2026-10-31' }, existing), null);
  assert.equal(validateStudySessionDraft(session, existing, 'a'), null);
});
test('editing preserves metadata and record identifiers', () => {
  const old = [{ id: 'a', done: true, submittedAt: '2026-10-01', title: 'old' }, { id: 4, title: 'other' }];
  const edited = updateEditedRecord(old, 'a', { id: 'tamper', title: 'new' });
  assert.equal(edited[0].id, 'a');
  assert.equal(edited[0].done, true);
  assert.equal(edited[0].submittedAt, '2026-10-01');
  assert.equal(edited[1], old[1]);
});
test('study sessions sort chronologically after editing', () => {
  const list = sortedSessions([{ date: '2026-10-31', start: '17:00' }, { date: '2026-10-30', start: '20:00' }, { date: '2026-10-30', start: '13:00' }]);
  assert.deepEqual(list.map(({ start }) => start), ['13:00', '20:00', '17:00']);
});
