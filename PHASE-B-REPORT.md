# TaleemLink Phase B: stabilization and workflow UX

Date: 2026-10-23  
Input: `taleemlink-stabilized.zip` from Phase A  
Scope: incremental changes to the original Next.js local-first prototype. No MongoDB, server authentication, cloud sync, fake users, or framework rewrite.

## What changed

1. Added assignment editing from Teacher preview, preserving its stable ID, any local submission, completion marker, and review. Assignments can be deleted only after confirmation. Removal clears linked submission and transient drafts.
2. Added study session editing with chronological re-sorting, validation of actual calendar dates and times, 5–720 minute durations, no midnight rollover, and overlap detection. Delete requires confirmation.
3. Added learning material deletion in Teacher preview, confirmation, completion-marker cleanup and deletion of its IndexedDB attachment (when present). If IndexedDB attachment deletion fails, the lesson metadata is kept and an error is shown. Metadata editing/replacement remains outside this phase.
4. Quiz deletion now requires confirmation and removes quiz attempt history tied to the deleted quiz. Leaving an answered but unsubmitted quiz requires confirmation.
5. Resubmitting a reviewed assignment requires confirmation and removes its existing grade and feedback; review drafts are also cleared, preventing stale review data from appearing on the next submission. A teacher cannot uncheck a submitted assignment's completion indicator.
6. Added document-level keyboard handling for modal forms: Escape to close, focus containment with Tab/Shift+Tab, initial focus and focus restoration.
7. Improved icon-only mobile navigation's accessible labels and current-page indication, grouped Edit/Delete actions, visible delete styling and focus rings.
8. On a cross-tab change to the saved record key, the current tab pauses saving to reduce accidental overwrites and offers a reload button. This does **not** implement synchronized editing.
9. Reworded copy that previously suggested the app was already fully offline.
10. Added isolated workflow-validation tests and a pure helper module `src/lib/workflows.mjs`.

## Source files changed

- `src/app/page.js`
- `src/app/globals.css`
- `src/lib/workflows.mjs` (new)
- `tests/workflows.test.mjs` (new)
- `README.md`
- `PHASE-B-REPORT.md` (new)

All other supplied source/assets/config files are kept from the stabilized project.

## Verification actually performed

| Check | Result |
|---|---|
| `npm test` (`node --test tests/*.test.mjs`) | **PASS: 15/15** pure unit tests including 9 previous tests |
| TypeScript AST parser on `page.js`, `layout.js`, workflow and persistence helpers | **PASS: no parse diagnostics** (syntax only) |
| `npm ci --prefer-offline --no-audit --no-fund --fetch-retries=0 --fetch-timeout=8000` | **BLOCKED / interrupted**: external dependency retrieval did not complete in the permitted runtime |
| `npm run lint` | **BLOCKED**: `eslint: not found` without npm dependencies |
| `npm run build` | **BLOCKED**: `next: not found` without npm dependencies |
| Browser workflow tests, mobile and keyboard QA, IndexedDB deletion test | **NOT RUN** without runnable Next.js installation/browser |
| ZIP integrity and expected files | Verified when packaged |

Unit tests cover data validation and pure calculations, **not** React UI behavior, IndexedDB transaction outcomes, or actual saving after refresh. Do not treat this phase as production ready.

## Browser acceptance checklist (still unverified)

Once npm dependencies can be installed, run `npm test`, `npm run lint`, `npm run build`, `npm run dev`. Open `http://localhost:3000` and test:

1. Teacher preview: add an assignment, edit its details, switch to Student, submit work, switch back and review it, edit its title again. All records and review must persist after refresh.
2. Student: resubmit reviewed work; verify the confirmation and that the old review is cleared.
3. Teacher preview: delete an assignment; verify the confirmation, submission cleanup, and that cancellation keeps everything intact.
4. Planner: create a 17:00–17:25 session, reject 17:20–17:45 overlap, accept 17:25–17:50, edit the first session and ensure chronological order and `done` flag survive refresh.
5. Lessons: add an actual file; refresh and open it; delete its lesson; confirm the record/completion disappear and the attachment is no longer accessible via the old storage record.
6. Quizzes: create and complete one, delete it and verify linked attempts are removed; cancel deletion and ensure they stay.
7. Open each modal with keyboard only. Check Escape, Tab focus containment, return focus, native validation, and touch layout at ~360px and tablet widths.
8. Open the site in two tabs; edit in tab A; confirm tab B warns and refuses to write stale records; reload tab B and see the latest saved snapshot.
9. Repeat after browser refresh and inspect browser console/storage warnings.

## Open limitations

- All records belong to one browser profile. Teacher preview is not an authenticated teacher and cannot securely restrict access.
- Local JSON export excludes IndexedDB attachments and no restore/import is available.
- Browser storage may be evicted or become unavailable; the attachment metadata and blob are not one atomic transaction.
- Editing lesson metadata or replacing existing lesson attachments is not implemented.
- Actual recorded study time, full profile and subject management, complete lesson authoring, reviewable quiz answers, and many requested educational features are still pending.
- No production build, interactive browser QA, automated accessibility audit, service worker, hosted deployment, cloud synchronization, or Android APK was verified/generated.

## Next recommended phase

**Phase C:** full local-first student profile, country/education system, learner category, study programme, class/year, selected subjects and preferences, with backwards-compatible schema, validation and tests. Before any real deployment, complete a proper local browser QA pass for Phase B.
