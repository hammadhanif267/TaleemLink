import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, readLocalRecords, writeLocalRecords, validateRecords, subjectProgress, assignmentStats, validateAttachment } from '../src/lib/local-records.mjs';

const mockStorage = (stored) => {
  let value = stored;
  return { getItem: (key) => key === STORAGE_KEY ? value : null, setItem: (key, data) => { assert.equal(key, STORAGE_KEY); value = data; }, value: () => value };
};
const old = { tasks: [{ id: 17, title: 'Work', subject: 'Math', due: '2026-10-30', done: false }], studyTrack: 'ICS' };
test('empty storage loads as new installation', () => assert.equal(readLocalRecords(mockStorage(null)), null));
test('legacy v2 saved data loads and retains IDs and preferences', () => {
  const result = readLocalRecords(mockStorage(JSON.stringify(old)));
  assert.equal(result.tasks[0].id, 17);
  assert.equal(result.studyTrack, 'ICS');
  assert.deepEqual(result.lessons, []);
});
test('valid records write with a format version', () => {
  const storage = mockStorage(null);
  writeLocalRecords(storage, old);
  assert.equal(JSON.parse(storage.value()).schemaVersion, 1);
  assert.deepEqual(readLocalRecords(storage).tasks, old.tasks);
});
test('corrupt JSON throws without modifying the stored text', () => {
  const storage = mockStorage('{not valid json');
  assert.throws(() => readLocalRecords(storage));
  assert.equal(storage.value(), '{not valid json');
});
test('invalid record types and incompatible version are rejected', () => {
  assert.throws(() => validateRecords({ tasks: 'this is not an array' }), /tasks/);
  assert.throws(() => validateRecords({ schemaVersion: 999 }), /format version/);
  assert.throws(() => validateRecords({ quizzes: [{ id: 1, title: 'bad', subject: 'Math', questions: [{ prompt: '', options: ['a','b'], answer: 8 }] }] }), /quizzes/);
});
test('subject progress counts only actual saved lessons and ignores duplicates', () => {
  const lessons = [{ id: 1, subject: 'Math' }, { id: 2, subject: 'Math' }, { id: 3, subject: 'English' }];
  assert.deepEqual(subjectProgress('Math', lessons, [1, 1, 3]), { total: 2, finished: 1, percent: 50 });
  assert.deepEqual(subjectProgress('Physics', lessons, []), { total: 0, finished: 0, percent: null });
});
test('assignment statistics never double count a submitted and completed task', () => {
  assert.deepEqual(assignmentStats([{ id: 1, done: true }, { id: 2, done: false }], { 1: { submittedAt: '2026-10-23' } }), { completed: 1, pending: 1, completion: 50 });
});
test('attachment validation rejects empty, unsupported and oversized files', () => {
  assert.match(validateAttachment({ name: 'danger.exe', size: 123 }), /not supported/);
  assert.match(validateAttachment({ name: 'notes.pdf', size: 0 }), /Empty/);
  assert.match(validateAttachment({ name: 'large.pdf', size: 151 * 1024 * 1024 }), /150 MB/);
  assert.equal(validateAttachment({ name: 'notes.pdf', size: 1024 }), null);
});

test('empty object is treated as corruption, not as a blank installation', () => {
  assert.throws(() => readLocalRecords(mockStorage('{}')), /recognizable/);
});
