import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanMaterialDraft, validateMaterialDraft, safeMaterialUrl, updateMaterial, filterMaterials, materialChapters } from '../src/lib/materials.mjs';
const base = { title: '  Introduction ', subject: 'Math', kind: 'Reading', content: 'Learn fractions.' };
test('validates authored lesson content or link or file, not metadata-only cards', () => {
  assert.equal(validateMaterialDraft(base), null);
  assert.match(validateMaterialDraft({ ...base, content: '' }), /content/);
  assert.equal(validateMaterialDraft({ ...base, content: '' }, { hasAttachment: true }), null);
  assert.equal(validateMaterialDraft({ ...base, content: '', url: 'https://example.org/learn' }), null);
});
test('disallows unsafe URLs, unsupported schemes, and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'https://user:pass@example.com', 'nonsense']) {
    assert.equal(safeMaterialUrl(url), '');
    assert.match(validateMaterialDraft({ ...base, url }), /valid HTTP or HTTPS/);
  }
  assert.equal(safeMaterialUrl('https://example.org/lesson'), 'https://example.org/lesson');
});
test('trims input, rejects empty/oversized values, and retains all optional fields', () => {
  assert.equal(cleanMaterialDraft(base).title, 'Introduction');
  assert.match(validateMaterialDraft({ ...base, title: ' '.repeat(10) }), /title/);
  assert.match(validateMaterialDraft({ ...base, chapter: 'x'.repeat(101) }), /Chapter/);
  assert.match(validateMaterialDraft({ ...base, content: 'x'.repeat(30001) }), /Content/);
});
test('editing a lesson retains ID and unrelated/legacy metadata', () => {
  const items = [{ id: 4, title: 'Before', subject: 'Math', attachment: { id: 'file4' }, custom: 'keep' }, { id: 5, title: 'Other' }];
  const edited = updateMaterial(items, 4, { title: 'After', chapter: '1' });
  assert.equal(edited[0].id, 4);
  assert.equal(edited[0].attachment.id, 'file4');
  assert.equal(edited[0].custom, 'keep');
  assert.deepEqual(edited[1], items[1]);
  assert.equal(items[0].title, 'Before');
});
test('search and filters operate on real saved records including chapter, content and attachment name', () => {
  const items = [
    { id: 1, title: 'Tenses', subject: 'English', kind: 'Reading', chapter: 'Grammar', content: 'Past perfect' },
    { id: 2, title: 'Fractions', subject: 'Math', kind: 'PDF notes', chapter: 'Numbers', attachment: { name: 'lesson.pdf' } },
    { id: 3, title: 'Decimals', subject: 'Math', kind: 'Reading', chapter: 'Numbers' },
  ];
  assert.deepEqual(filterMaterials(items, { subject: 'Math', chapter: 'Numbers', kind: 'PDF notes' }).map(i => i.id), [2]);
  assert.deepEqual(filterMaterials(items, { query: 'perfect' }).map(i => i.id), [1]);
  assert.deepEqual(filterMaterials(items, { query: 'lesson.pdf' }).map(i => i.id), [2]);
  assert.deepEqual(materialChapters(items, 'Math'), ['Numbers']);
});
test('old lessons without content and chapter remain searchable and readable', () => {
  const old = [{ id: 1, title: 'Old note', subject: 'Physics', description: 'Legacy description' }];
  assert.deepEqual(filterMaterials(old, { query: 'legacy' }), old);
  assert.deepEqual(materialChapters(old, 'Physics'), []);
});

test('phase E validated records persist written lessons and references', async () => {
  const { validateRecords } = await import('../src/lib/local-records.mjs');
  const original = { lessons: [{ id: '9', title: 'Intro', subject: 'Math', kind: 'Reading', chapter: 'One', topic: 'Numbers', content: 'One and two', url: 'https://example.org', attachment: { id: 'attachment-9', name: 'lesson.pdf', type: 'application/pdf', size: 2048 } }] };
  assert.deepEqual(validateRecords(JSON.parse(JSON.stringify(original))).lessons, original.lessons);
  assert.throws(() => validateRecords({ lessons: [{ ...original.lessons[0], content: { html: 'bad' } }] }), /lessons/);
  assert.throws(() => validateRecords({ lessons: [{ ...original.lessons[0], attachment: { id: 'a', name: {}, size: 42 } }] }), /lessons/);
});
test('rejects a dangerous declared MIME even with an allowed extension', async () => {
  const { validateAttachment } = await import('../src/lib/local-records.mjs');
  assert.match(validateAttachment({ name: 'fake.pdf', size: 123, type: 'text/html' }), /not allowed/);
  assert.equal(validateAttachment({ name: 'notes.pdf', size: 123, type: 'application/pdf' }), null);
});
