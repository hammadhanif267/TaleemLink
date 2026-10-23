# TaleemLink (local-first prototype)

TaleemLink is a Next.js 16.4.2 / React 19.3.0 education workspace prototype. It is **not** currently a production-secure, multi-user, synchronized or fully offline learning platform.

## Requirements and launch

Use Node.js 22 and an environment with access to the npm package registry:

```bash
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Then open `http://localhost:3000`. `npm test` is available without npm installation. In the project environment, dependency installation is unavailable, so lint and the Next.js production build cannot yet be verified. Browser behavior also requires manual testing on a machine with the dependencies installed.

## Current source capabilities (browser verification pending)

- Student workspace and a labeled **Teacher preview** (these share the same local data; no accounts or permissions).
- Study stream/level dropdowns, local lessons and notes metadata, IndexedDB file attachments, search, lesson completion.
- Local assignment creation **and editing**, answer submission, preview teacher review/marks and MCQ quizzes; deletion asks for confirmation and clears linked local records.
- Study session planning, editing, overlap checking and completion markers; **session duration is not measured study time**.
- Subject lesson completion computed from real saved resources and deduplicated completion IDs.
- Validated versioned `localStorage` records, recovery banner on corrupted storage and JSON record export.
- Confirmed deletion for assignments, lessons (including IndexedDB attachments), study sessions, and quizzes (including local attempts).
- Dialog Escape-key closing, Tab focus containment and mobile-safe record actions.
- A storage conflict warning pauses writes when another tab changes the saved records; reload to get the current snapshot.

## Data persistence and recovery

- Learning records: browser `localStorage` key `taleemlink-local-v2`, saved with `schemaVersion: 1`; compatible legacy records from the old key load when valid.
- Attachment blobs: IndexedDB database `taleemlink-materials-v1` in the current browser profile.
- Storage writes wait until initial data has been read. If saved records fail validation, existing stored bytes are preserved and further writes are paused until intentional reset.
- **Export records** downloads the saved JSON only, which can contain private learning information. **File attachments are excluded. This export is not a complete portable backup, and no import tool exists yet.** Keep the exported file private. Reset permanently deletes both records and local lesson attachments.
- Browser storage can still be removed, blocked, exhausted, or evicted. Data is not automatically transferred between browsers or devices.

## Still needed

Full student profiles, flexible subjects and levels, complete teacher/student permissions, lesson metadata editing, portable attachment backup/import, realistic study-time tracking, stronger quiz authoring/results, real browser testing, PWA/offline service worker, internationalization, server authentication, online database, authorized synchronization and Android application.

Read [`AUDIT.md`](AUDIT.md) for source-grounded status of every major feature, actual command/test results, risks and next-phase priorities.

## Phase B delivery

Read [`PHASE-B-REPORT.md`](PHASE-B-REPORT.md) for implemented changes, risks, automated checks, and the browser acceptance checklist. Browser data shared between Teacher preview and Student is only for prototype demonstration.
