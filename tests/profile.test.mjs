import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, PROGRAMMES, suggestedSubjects, prepareProfile, validateStoredProfile, fromLegacyPreferences, appearancePreference } from '../src/lib/profile.mjs';
import { validateRecords } from '../src/lib/local-records.mjs';

const valid = { ...DEFAULT_PROFILE, displayName: ' Student ', educationLevel: 'Higher secondary / Intermediate / HSSC', programme: 'ICS', subjects: ['Computer Science', 'Mathematics'], dailyTarget: 45 };
test('learner profile validates and trims input', () => { const result = prepareProfile(valid); assert.equal(result.error, undefined); assert.equal(result.profile.displayName, 'Student'); assert.equal(result.profile.dailyTarget, 45); });
test('student identity, education and subjects cannot be omitted', () => { for (const change of [{ displayName: '' }, { educationLevel: '' }, { programme: '' }, { subjects: [] }]) assert.ok(prepareProfile({ ...valid, ...change }).error); });
test('invalid target and date are refused', () => { for (const dailyTarget of [0, 601, 30.2, 'hello']) assert.ok(prepareProfile({ ...valid, dailyTarget }).error); assert.ok(prepareProfile({ ...valid, examDate: '2026-02-31' }).error); });
test('profile stays compatible with old local preferences', () => { assert.equal(fromLegacyPreferences('ICS','Grade 11').programme,'ICS'); assert.equal(validateRecords({ tasks: [], studyTrack: 'ICS' }).profile.programme, 'ICS'); });
test('saved corrupt profile does not overwrite other records', () => { assert.throws(() => validateRecords({ tasks: [], profile: { ...valid, subjects: ['Physics', 'physics'] } }), /subjects/); assert.throws(() => validateStoredProfile(null), /invalid/); });
test('programme-appropriate suggestions and independent subjects', () => { assert.deepEqual(suggestedSubjects('Higher secondary / Intermediate / HSSC','ICS').slice(0,2), ['Computer Science', 'Mathematics']); assert.ok(PROGRAMMES['Undergraduate']); assert.deepEqual(suggestedSubjects('Undergraduate','Custom programme'), []); });
test('only documented appearance settings are accepted', () => { assert.equal(appearancePreference('dark'),'dark'); assert.equal(appearancePreference('weird'),'light'); });
test('new profile survives JSON roundtrip without losing original learning records', () => {
  const profile = prepareProfile({ ...valid, goals: 'Complete chapter 3', subjects: ['Mathematics','Computer Science'] }).profile;
  const legacy = { tasks: [{ id: 22, title: 'Assignment', subject: 'Physics', due: '2026-10-26' }], studyTrack: 'ICS', profile };
  const saved = JSON.parse(JSON.stringify(validateRecords(legacy)));
  assert.equal(validateRecords(saved).profile.goals, 'Complete chapter 3');
  assert.equal(validateRecords(saved).tasks[0].id, 22);
});
test('duplicate subject spelling does not create fake additional course counts', () => {
  const { profile } = prepareProfile({ ...valid, subjects: ['Physics', 'physics', ' Biology ', 'Biology'] });
  assert.deepEqual(profile.subjects, ['Physics','Biology']);
});
test('both appearance modes are distinct and light is the safe fallback', () => {
  assert.equal(appearancePreference('light'),'light');
  assert.equal(appearancePreference(null),'light');
  assert.notEqual(appearancePreference('dark'),appearancePreference('light'));
});
