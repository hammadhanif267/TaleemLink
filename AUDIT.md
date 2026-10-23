# TaleemLink: source audit and first stabilization patch

**Audit date:** 2026-10-23  
**Inputs:** `stable-taleemlink.zip`, 20 ZIP entries, 345,977 uncompressed bytes, no archive path traversal detected.  
**Scope:** All supplied source files reviewed. Static inspection plus the dependency-free tests described below. **No interactive browser or production build was available.**

## 1. Current architecture

- Next.js **16.4.2**, React/React DOM **19.3.0**, App Router, JavaScript, Tailwind CSS 4 (configured), ESLint 9 (configured).
- Only application route is `/` (`src/app/page.js`), with root layout (`src/app/layout.js`) and global styles (`src/app/globals.css`). No API routes, server actions, back end, installed UI component library or separate shared React components.
- Almost all UI, event handlers and state live in one large client-side component. CSS lives in one monolithic stylesheet.
- `taleemlink-local-v2` is the browser `localStorage` key for educational records and stream/level selections. Lesson file blobs live in IndexedDB database `taleemlink-materials-v1`, object store `files`.
- Teacher/Student control is a local UI switch sharing one dataset, **not authenticated or separated users**. No HTTP server-side storage or cloud sync exists.
- Original archive contained **no tests** and only `dev`, `build`, `start`, `lint` scripts. `npm test` and nine pure unit tests were added in this patch.
- No fictitious starter student records or quiz attempts are embedded. Subject metadata provides a preset catalogue; that does not constitute enrollment or recorded progress.

### Evidence and feature inventory

**Meaning of statuses:** *Working* means exercised in an actual test; *Partial* means code for a subset exists but the requested end-to-end feature is not complete (and, absent browser validation, not independently verified); *Missing* means no implementation observed; *Unverified* means not enough test evidence. Source paths and behavior below are precise evidence, not proof of runtime success.

| Area | Status | Evidence in supplied source / stabilization patch | Missing / required next |
|---|---|---|---|
| Main navigation | Partial | `page.js` `navItems`, `active`, sidebar buttons switch panels | Browser, keyboard and small-screen navigation checks; URL routing |
| Teacher/student workspaces | Partial | UI `role` toggle gates creation/review versus submission/quiz-taking; now labeled **Teacher preview** | Real identity, enrollment, permissions and separation of records (deferred) |
| Student personal profile | Missing | Only study stream and class/level select; no student identity form | Display name, category, education system, institution, language, goals, study target |
| Programme and level settings | Partial | `studyTrack`, `studyLevel` controls persisted in local key | Cross-country model, conditional options, validation and full profile edit |
| Subject selection | Partial | Fixed `subjectOptions` and eight display presets; material forms use dropdown | Editable selected subjects, custom subjects, tracks, chapters, course CRUD |
| Lessons and notes | Partial | Add material form, lesson cards, search and completion toggle | Actual text lesson authoring, edit/delete/publish, chapter/topic hierarchy |
| Lesson file attachments | Partial | IndexedDB `files` store, `put`, `get`, blob open; size/extension validation enhanced | Real browser upload/reload tests, attachment deletion, backup, quota and MIME checks |
| Video material | Partial | File selector permits some video extensions; stored blobs opened in tab | Verified codecs, player, thumbnails, external URL handling |
| Assignment creation | Partial | Teacher-preview form collects title, subject, due date, type, detail | Edit, file materials, distribution and true assignment dates/status engine |
| Assignment submission | Partial | Student textarea and submitted status saved to local object | File submission, drafts across refresh, revisions policy, duplicate prevention, multi-student scope |
| Grading/teacher feedback | Partial | Teacher-preview `grade` and `feedback` form, reviewed timestamp, local status | Authorized reviewers, grading rubric, return-for-revision, real student isolation |
| Quiz authoring | Partial | Three-question form with four options, answer index; validation patched | Arbitrary question counts, edit, publish states, richer assessment types |
| Quiz attempts and scoring | Partial | Client-side scoring, result record and recent history; score UI | Answer review, time limits, secure key handling, end-to-end quiz tests |
| Planner | Partial | Session creation, sorted listing, completion toggle, delete | Editing, collision checks, safe deletion confirmation, reminders |
| Actual study time | Missing | Completion only marks a session; number entered is *planned duration* | Real timer/recorded time and stable refresh/background behavior |
| Overall dashboard | Partial | Actual record counts, saved lesson count, assignment completion | Enrollment-specific data, deadlines and scheduled today/recent lessons |
| Subject-level progress | Partial | Newly derived from real lessons and completed IDs in `subjectProgress` | Course/topic progress model, attendance, date/subject filtering |
| Study performance reporting | Partial | Assignment percentages, quiz mean, session totals and subject cards | CSV/print export, attempt trends, comprehensive dated reports |
| Local data persistence | Partial | Existing localStorage/IndexedDB; now versioned snapshots and hydration guard | Browser refresh test, stronger migrations, atomic metadata/blob writes |
| Corrupt data recovery | Partial | `validateRecords`, write block on errors, raw export and reset controls | Tested browser storage quota, migration UI, partial record recovery |
| Record export | Partial | Browser downloads the raw saved JSON records | Validated **import**, attachments export, portable complete backup |
| IndexedDB attachment backup | Missing | Record-only export intentionally excludes stored blobs | Import/export files with metadata, attachment consistency checks |
| Offline learning | Unverified | Blob storage is local, but no service worker, asset precache, offline navigation tests | Implement and test offline shell/assets and cached resources before claiming PWA |
| Search and filtering | Partial | Lesson string search and subject dropdown filter | Topic/programme/date/status search across all learning records |
| Accessibility | Partial | HTML labels, landmarks, focus-visible CSS and aria attributes present | Modal focus trap/escape, SR audit, tab-order check, contrast tests |
| Mobile responsiveness | Unverified | Responsive CSS media queries exist | Actual touch, layout, orientation, form and keyboard tests |
| Internationalization | Missing | English UI strings embedded in `page.js`; no translation files | Locale handling, Urdu RTL strategy, date and education terminology |
| Local roles as security | Missing | One `role` React state; all data and answers in same client | Only add security with server-side authenticated architecture |
| Central auth and database | Missing (intentionally deferred) | No auth endpoints, MongoDB, API routes or env-based server config | Secure design **after** local feature testing |
| Cross-device sync | Missing (intentionally deferred) | All records stored on current browser | Accounts, server ownership, conflict model and actual retries |
| Account privacy and deletion | Partial | Browser-only reset; no accounts | Online controls, authorization, privacy assessment for minors |
| PWA install and Android APK | Missing | No manifest, service worker, Capacitor or Android structure | Evaluate only after stable web build and real device checks |
| Automated unit validation | Working (narrow) | `npm test`: **9/9 passed** for record schema, legacy data, corruption, stats and attachment size/extension | Add component/browser/integration coverage; unit tests do not prove UI |
| Production deployment readiness | Unverified | Next configuration present; `next build` could not start without dependencies | Successful install, lint, build, browser tests, security/deployment review |

## 2. High-priority defects and risks discovered

### Corrected in this patch

1. **Risk of overwriting previously saved data on startup:** original hydration and persistence `useEffect` hooks were independent; the initial empty snapshot could be persisted before hydration state applied. Added `hydrated` gate.
2. **Corruption silently treated as a fresh install:** original `JSON.parse` catch discarded errors and could write empty starter content. Added version-aware validation, visible error, and blocked writing until explicit destructive reset.
3. **Inconsistent identifiers:** `Date.now()` generated all entity IDs and could collide within the same millisecond. New entries use `crypto.randomUUID()`; legacy numeric IDs remain supported.
4. **Misleading progress figures:** subject tiles used hard-coded zero fields with vague “starter estimates.” Now progress uses actual saved lessons, with no percentage where no lessons exist. Removed arbitrary `lessons.length * 10` progress indicator.
5. **Study-time mislabeling:** completion status formerly implied recorded minutes; now specifically labels planned duration of sessions marked complete, not measured time.
6. **Frozen form defaults:** initial due/session dates were literal October 2026 dates. Empty required date controls now demand user selection.
7. **Attachment selector not actually validating type:** `accept` attribute alone did not protect the save code. Added allowlisted filename extensions, empty file and 150 MB size checks in data-layer helper. This is *not* content scanning.
8. **Reviewed submission could retain stale marks after resubmission:** resubmissions now clear grade and feedback until a new review. An unchanged submission can now be resubmitted correctly.
9. **Grade-only reviews could be invisible:** marks appear even when no written feedback is provided. Empty reviews are refused.
10. **Quiz deletion relied on numeric IDs:** original conditional `quiz.id > 100` fails for UUID strings. Removed that check.
11. **Assignment snapshot/up-next errors:** pending now accounts for submitted records, and upcoming list sorts by due date rather than creation time.
12. **Role confusion:** first entry now opens Student workspace; teacher role explicitly says **Teacher preview** and role buttons expose `aria-pressed`.
13. **No preservation/recovery controls:** record-only JSON export and destructive reset (with confirmation) added. The export does **not** include IndexedDB files; do not use it as a full backup.

### Still open, prioritized

**Critical:** No authentication/authorization (do not deploy as a shared private education system); sensitive student work lives in one browser profile; browser storage/IDB transactions and browser permissions not yet end-to-end tested. File blobs and metadata are not committed atomically; browsers may evict storage. No true complete portable backup/import. No browser-level validation of hydration preservation yet.

**High:** Add editing/confirmation to destructive actions, correct status workflow and actual recorded time, model multiple courses/levels/countries, and implement student profile/subject selection. A quiz exposes answer keys in client-side records and must not be used for secure examinations. Browser accessibility, offline, and media compatibility remain unverified.

**Maintenance:** One oversized client component, one global CSS file, no reusable component structure, no server-side data adapter. Extract iteratively with feature parity tests, not via indiscriminate rewrite.

## 3. Test and command record

| Executed | Outcome |
|---|---|
| ZIP listing and secure extraction | PASS: 20 entries, no traversal path detected |
| Inspected `package.json`, lock file, `AGENTS.md`, Next config, React page/layout, global CSS, README and assets | PASS: source available and inspected |
| `npm ci --no-audit --no-fund` | **BLOCKED:** timed out waiting for external dependency retrieval; interrupted |
| `npm ci --offline --no-audit --no-fund --fetch-retries=0` | **BLOCKED:** `ENOTCACHED` for `zod-validation-error-4.0.2.tgz` |
| `npm test` | **PASS: 9 of 9 unit tests** (only isolated local helper logic) |
| TypeScript's JS/JSX parser over page/layout/helper | **PASS: zero syntax parsing diagnostics**, not typecheck or full Next compilation |
| `npm run lint` | **BLOCKED:** `eslint: not found` due to unavailable dependencies |
| `npm run build` | **BLOCKED:** `next: not found` due to unavailable dependencies |
| Browser, mobile, IndexedDB and actual offline scenario tests | **NOT RUN**: no runnable app, browser or installed Next packages |
| APK / cross-device sync / hosted release | **NOT RUN / NOT IMPLEMENTED** |

The source **must not** be described as production-ready or as having a successful build. The audit is complete at the source-inspection level; browser QA and production verification are not complete.

## 4. Next development order

1. **Finish Phase B:** install dependencies on a machine with npm registry access; run ESLint and `next build`; fix any warnings/errors. Launch in a real browser and verify empty and pre-populated storage (including dev Strict Mode), corrupt data, export/reset, file attachment persistence, grading, quiz flow, mobile and keyboard behavior.
2. **Phase C:** build a universal student profile and selected-subject model, persisted locally, without forcing Pakistan-specific class structures.
3. **Phase D:** personalize dashboard with that profile and genuinely saved data; calculate only well-defined measures.
4. **Phase E:** complete lessons, attachments, file deletion and an attachment-inclusive backup strategy.
5. **Phases F–I:** strengthen assignment revision/feedback, quiz authoring/results, recorded session time and progress/reporting.
6. **Phases J–K:** expand integration/browser tests and offline/PWA only when verified.
7. **Phases L–N:** design server auth, database, cross-device sync, security review, release after local flows are reliable.

## 5. Patch files

- `src/app/page.js`: hydrated-save gate, errors/recovery actions, workflow fixes and honest progress labels.
- `src/lib/local-records.mjs`: snapshot format validation, record persistence helpers, metrics, attachment validation.
- `src/app/globals.css`: data integrity warning and export control layout.
- `tests/local-records.test.mjs`: nine independent Node tests.
- `package.json`: `npm test` script.
- `README.md`: setup, current scope and limitations.

**Updated archive checks:** Verify with `unzip -t taleemlink-stabilized.zip` and `unzip -l taleemlink-stabilized.zip`. Do not include transient `node_modules` or `.next` directories in the deliverable.
