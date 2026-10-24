/** Phase E lesson/material rules. Records remain backward compatible with Phase D. */
export const MATERIAL_TYPES = ['Notes + practice', 'Video lesson', 'Reading', 'PDF notes', 'Document', 'Revision summary', 'External resource'];

const strip = (value) => typeof value === 'string' ? value.trim() : '';
export function cleanMaterialDraft(draft) {
  return {
    title: strip(draft.title), subject: strip(draft.subject), kind: strip(draft.kind) || 'Notes + practice',
    length: strip(draft.length), description: strip(draft.description), chapter: strip(draft.chapter),
    topic: strip(draft.topic), content: strip(draft.content), url: strip(draft.url),
  };
}

export function safeMaterialUrl(raw) {
  if (!strip(raw)) return '';
  try {
    const url = new URL(raw);
    // Never allow javascript:, data:, file:, credentials or non-web protocols.
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}

export function validateMaterialDraft(raw, { hasAttachment = false } = {}) {
  const draft = cleanMaterialDraft(raw);
  if (!draft.title || draft.title.length > 140) return 'Enter a title of 1 to 140 characters.';
  if (!draft.subject || draft.subject.length > 120) return 'Choose a valid subject.';
  if (!MATERIAL_TYPES.includes(draft.kind)) return 'Choose a supported learning-material type.';
  for (const [key, max] of [['chapter', 100], ['topic', 100], ['description', 1000], ['length', 50], ['content', 30000]]) {
    if (draft[key].length > max) return `${key[0].toUpperCase()}${key.slice(1)} is too long (maximum ${max} characters).`;
  }
  if (draft.url && !safeMaterialUrl(draft.url)) return 'Enter a valid HTTP or HTTPS resource link without embedded credentials.';
  if (draft.url.length > 2048) return 'Resource link is too long.';
  if (!draft.content && !draft.url && !hasAttachment) return 'Add written lesson content, a web link or an attachment to make this material usable.';
  return null;
}

export function updateMaterial(records, id, changes) {
  return records.map((record) => record.id === id ? { ...record, ...changes, id: record.id } : record);
}

export function filterMaterials(records, { subject = 'All subjects', kind = 'All types', chapter = 'All chapters', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return records.filter((record) =>
    (subject === 'All subjects' || record.subject === subject) &&
    (kind === 'All types' || (record.kind || 'Notes + practice') === kind) &&
    (chapter === 'All chapters' || (record.chapter || '') === chapter) &&
    (!needle || [record.title, record.subject, record.description, record.kind, record.chapter, record.topic, record.content, record.attachment?.name]
      .some((field) => String(field || '').toLocaleLowerCase().includes(needle)))
  );
}

export function materialChapters(records, subject) {
  return [...new Set(records.filter((record) => subject === 'All subjects' || record.subject === subject)
    .map((record) => strip(record.chapter)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
