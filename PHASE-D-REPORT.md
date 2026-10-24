# TaleemLink — Phase D: Personalized learning dashboard and dark-theme correction

## Delivered in source

**Source baseline:** Phase C ZIP. All Phase C features are retained, including the local-only teacher preview, learner profile, responsive navigation and light/dark toggle. No cloud service or MongoDB was added.

1. **Fixed the reported contrast bug:** In dark mode, assignment summary cards could remain white while their labels/numbers inherited near-white colors. `src/app/phase-d.css` explicitly applies theme surfaces and text tokens to assignment, quiz and study-planner summary cards, including icons, values and labels. The dark-theme palette targets at least WCAG AA for the main and muted text tokens.
2. **Real-record overview:** `src/components/LearningDashboard.jsx` replaces the old generic overview with a consistent responsive layout. It shows the saved learner pathway, actual lesson completion, pending assignments, today's planned sessions, actual quiz attempts/average, due dates, latest library entries, practice options, and subjects. All cards have actions that navigate to the relevant existing screen.
3. **Calculations separated from presentation:** `src/lib/dashboard.mjs` derives the view from saved records without mutating them. It sorts assignments by due date, labels past-due and due-today tasks, deduplicates completed lesson IDs, counts one completed assignment even when submitted and manually marked, and sorts today's sessions by local start time.
4. **Accurate empty states:** No invented grades, learners, activity, or study hours; nonexistent performance percentages display as unavailable instead of made-up success. Study-session minutes are explicitly described as *planned*, not measured study time. "Latest materials" means latest items in the saved library, not recently opened materials.
5. **Local calendar date:** A client-local YYYY-MM-DD key avoids interpreting today's sessions in UTC; it refreshes when the page is focused/visible again. Invalid dates do not create fake overdue tasks.
6. **Responsive layout:** Desktop four-card metrics; two-column panels; stacked panels and mobile cards at narrow widths. Every summary card uses the same theme tokens as the rest of the app.

## Actual checks

- `npm test`: **36 passed, 0 failed**, including 8 new dashboard cases and 3 new stylesheet/contrast contract tests.
- TypeScript parser (`typescript.createSourceFile` with JSX syntax) successfully parsed all modified JSX/JS files. This is a syntax check, not a Next.js compile.
- `tinycss2` successfully parsed all existing and new CSS files with **zero stylesheet parse errors**.
- WCAG relative luminance of the chosen background/text tokens: light theme main 18.19:1, muted 6.29:1; dark theme main 15.72:1, muted 8.75:1. These are token-based contrast calculations, not a complete accessibility audit.
- `npm ci --offline`: **failed**, as npm cache lacks required `zod-validation-error-4.0.2.tgz`.
- `npm ci` online: **timed out** while fetching dependencies. Partial install files were excluded from the delivered ZIP.
- `npm run lint` and `npm run build`: **not run**, because dependencies could not be installed in this environment.
- Full Next.js browser behavior, actual browser-rendered card colors, mobile screenshots, and cross-tab/device workflows: **unverified**. A standalone headless-Chromium CSS probe timed out and is not counted as a passed browser test.

## How to run and manually verify

1. Extract this ZIP and open a terminal inside `stable-taleemlink`.
2. With Node 22 and access to npm, run `npm ci`, `npm test`, `npm run lint`, `npm run build`, then `npm run dev`.
3. Open `http://localhost:3000`. Choose dark mode with the sun/moon control. Go to **Assignments**, **Quizzes & practice**, and **Study planner**. Verify the statistic cards have a dark surface, legible labels and legible numbers. Return to light mode and check again.
4. In Teacher preview, create a lesson, assignment (one overdue, one future) and a quiz. In Student mode, create a study session for today, complete a saved lesson, submit an assignment and attempt a quiz. Go to **Overview** and verify that the correct data, dates and statuses appear.
5. Refresh; verify data persists. Check widths around 360px, 390px, 768px and desktop. The mobile menu, theme toggle, metric cards and modal workflows should not overflow horizontally.
6. Before replacing a local workspace, use **Export learning records** if needed. Export does **not** include attachments. Existing records share the same localStorage key, so using the same browser origin (`localhost:3000`) does not intentionally clear them.

## Remaining work

- Full browser-based UI and accessibility tests, successful lint and production build.
- Actual recorded study time/timers versus planned time.
- Persistent recently-opened lesson history, if desired.
- Server-backed accounts, role security, cloud sync, and portable attachment backup/import.
- Phase E: more complete lesson editing, attachment management and verified browsing workflows.

**Definition of done:** Source changes and unit tests are complete. Phase D must not be treated as a production-verified release until the build and browser acceptance tests pass on a system with dependencies available.
