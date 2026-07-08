# Teacher Grading & Assessment App

## Context
The project is currently the empty Enter template (single `Index.tsx` hero page, no auth, no data). The user wants an app for teachers focused on **grading & assessment**: classes/rosters, assignments, simple or rubric-based grading, written feedback, and OCR to reduce manual data entry (scanning answer sheets, class rosters, and handwritten grade sheets). Each teacher needs their own private account and data, so this requires backend (Enter Cloud / Supabase: Auth + Postgres + RLS) and an AI vision capability (OCR via Gemini 3.5 Flash) exposed through an Edge Function.

## Prerequisites (first actions when leaving plan mode)
1. Call `supabase_enable` to turn on Enter Cloud (Postgres + Auth + Edge Functions).
2. Call `enable_ai_capability` to unlock the AI Gateway used by the OCR edge function.

## Data Model (Enter Cloud / Postgres, via `supabase_migration`)
All tables use RLS scoped to the owning teacher.

- `profiles` — `id (=auth.users.id, pk)`, `email`, `full_name`, `created_at`. Auto-populated by a trigger on `auth.users` insert (standard Supabase pattern).
- `classes` — `id`, `teacher_id (fk auth.users, default auth.uid())`, `name`, `subject`, `created_at`.
- `students` — `id`, `class_id (fk classes)`, `name`, `created_at`.
- `assignments` — `id`, `class_id (fk classes)`, `name`, `max_points numeric`, `grading_type text check in ('simple','rubric')`, `created_at`.
- `rubrics` — `id`, `assignment_id (fk assignments, unique)`, `title`.
- `rubric_criteria` — `id`, `rubric_id (fk rubrics)`, `name`, `max_points numeric`, `sort_order int`.
- `grades` — `id`, `assignment_id (fk assignments)`, `student_id (fk students)`, `score numeric`, `feedback text`, `criterion_scores jsonb` (array of `{criterion_id, score}`, used only when the assignment is rubric-based), `updated_at`. Unique on `(assignment_id, student_id)`.

RLS policies: teachers can only `select/insert/update/delete` rows where the row's class (directly or via assignment/student join) belongs to `teacher_id = auth.uid()`.

## Auth
- Email/password sign up & login using Supabase Auth (`supabase.auth.signUp` / `signInWithPassword`).
- `src/contexts/AuthContext.tsx` — provides `session`, `user`, `loading`, `signOut`.
- `src/components/ProtectedRoute.tsx` — redirects to `/auth` if not logged in.
- `src/pages/Auth.tsx` — single page with tab/toggle between sign up and login forms (shadcn `Card`, `Input`, `Button`, `Tabs`).

## OCR (Edge Function, Gemini 3.5 Flash)
One Edge Function `supabase/functions/ocr-extract/index.ts` handles all three OCR use cases via a `mode` parameter, since they share the same shape (image in → structured JSON out):

- `mode: "roster"` → returns `{ students: string[] }` (names parsed from a photographed class list).
- `mode: "answer_sheet"` → returns `{ score: number | null, notes: string }` (best-effort score/answers extracted from one student's paper).
- `mode: "grade_sheet"` → returns `{ entries: { name: string, score: number }[] }` (bulk name→score pairs from a handwritten grade sheet, matched to roster by name on the frontend).

Implementation notes (per `enter_llm_integration` skill, Gemini protocol):
- Frontend uploads the photo to Enter Cloud Storage first (per `enter_resource_upload` skill) and sends the public image URL + `mode` to the edge function — read the `enter_resource_upload` bucket setup workflow to provision a bucket (reuse `images` if suitable) with `ai-all/%`-scoped read/insert policies.
- Inside the edge function, call `POST <ENTER_API_BASE_URL>/code/api/ai/v1beta/models/google/gemini-3.5-flash:streamGenerateContent` with the image URL as inline/file part and a prompt instructing Gemini to return **only strict JSON** matching the mode's shape.
- Since this route is always SSE, the edge function accumulates the streamed text chunks server-side, then extracts/parses the final JSON and returns a normal (non-streaming) JSON HTTP response to the frontend — the frontend does not need SSE handling for OCR, just a regular `fetch`/`await res.json()`.
- Read `references/protocol_google_gemini_generate_content.md` in the skill bundle before implementing, for exact request/SSE shapes and auth header (`x-goog-api-key`).
- OCR results are always shown to the teacher for review/edit before saving (never auto-saved silently), to handle misreads.

## Frontend Structure
`/` is now a **public marketing landing page** (unauthenticated), matching the theme spec below. The teacher app lives under `/app/*`, protected by auth.

Routes in `src/router.tsx`:
- `/` — `src/pages/Landing.tsx` (public marketing page, see Design section). "Get Started" → `/auth?mode=signup`, "Log In" → `/auth`.
- `/auth` — `src/pages/Auth.tsx` (sign up / login, styled with the same dark glass theme). On success, redirect to `/app`.
- `/app` — `src/pages/Dashboard.tsx` *(ProtectedRoute)*: list of the teacher's classes (create/delete class).
- `/app/classes/:classId` — `src/pages/ClassDetail.tsx` *(ProtectedRoute)*: student roster (add/edit/remove student, "Scan roster photo" OCR button) + list of assignments (create assignment, choose grading type: simple or rubric; if rubric, open `RubricEditor` to define criteria).
- `/app/classes/:classId/assignments/:assignmentId` — `src/pages/AssignmentGrading.tsx` *(ProtectedRoute)*: gradebook-style table of students for that assignment — simple assignments show a single score input + feedback textarea per student; rubric assignments show one input per criterion (auto-totaled) + feedback textarea. Includes a "Scan grade sheet" OCR action that bulk-fills scores for review, and a per-student "Scan answer sheet" OCR action.

Key components (`src/components/teacher/`):
- `ClassCard`, `CreateClassDialog`
- `StudentRosterTable`, `AddStudentDialog`, `ScanRosterButton` (OCR)
- `AssignmentList`, `CreateAssignmentDialog`, `RubricEditor`
- `GradeRow` (handles both simple & rubric input modes), `ScanAnswerSheetButton`, `ScanGradeSheetButton` (OCR)
- `OcrImageUpload` — shared component: file picker → upload to storage → call `ocr-extract` → returns parsed JSON to caller for review; amber highlight styling on raw/unverified fields per the OCR indicator color below

Landing page components (`src/components/landing/`), built once and reused as the sitewide shell where relevant (Navbar/Footer also wrap the authenticated `/app` pages for visual consistency, swapped nav links):
- `Navbar` — sticky, blurred, translucent dark bar; logo mark, nav links, "Log In" outline button + "Get Started" gradient button.
- `Hero` — split view: left = gradient headline, subheader, CTA buttons, 3-col micro-stats; right = interactive dual-pane mockup ("Grading Sheet" amber-highlighted raw scores vs. "Verified Ledger" teal-highlighted verified scores) with floating "AI Verification Active" badge and looping progress bar (CSS keyframes only, no JS animation libs).
- `MarqueeTicker` — CSS-animated infinite horizontal scroll of trusted institutions/feature callouts.
- `FeaturesGrid` — 3x2 card grid, per-card colored icon backdrop (lucide-react icons only), "View Documentation" micro-link with sideways hover shift.
- `WorkflowTimeline` — 6-step horizontal capsule flow describing the OCR grading pipeline (upload → scan → extract → review → verify → save).
- `TechStackGrid` — 4-column grid with bottom accent line that `scaleX(1)` on hover.
- `BenefitsSection` — 3-column icon+text flex row.
- `CtaBanner` — large rounded panel with radial/cosmic glow background, closing CTA.
- `Footer` — responsive link grid.

Data access hooks (`src/hooks/`): `useClasses`, `useStudents`, `useAssignments`, `useRubric`, `useGrades` — thin wrappers around Supabase client + React Query (already installed) for fetch/create/update/delete.

`src/integrations/supabase/client.ts` — standard Supabase client bootstrap, exporting `SUPABASE_URL`/`SUPABASE_ANON_KEY` for the edge function calls.

## Design — "Dark Cyberpunk Academic"
This becomes the sitewide theme (landing + authenticated app), implemented entirely through design tokens in `src/index.css` and `tailwind.config.ts` — no hardcoded colors in components.

**Tokens (`index.css`, dark-first — app defaults to `.dark` root)**:
- `--background`: near-black navy (`#060914` → hsl equivalent), `--card`/`--popover` slightly lighter navy (`#0c1224`) with alpha for glass panels.
- `--primary`: teal (`#2dd4bf`), `--primary-glow`: cyan (`#22d3ee`).
- `--accent`: indigo (`#818cf8`).
- New semantic token `--warning`/`--ocr-highlight`: amber (`#f59e0b`) — used exclusively for "raw/unverified OCR" UI states (e.g. amber-highlighted score boxes, amber left-border on pending OCR review cards). Verified/saved data uses `--primary` (teal) highlighting instead.
- `--border`: translucent white (e.g. `hsl(0 0% 100% / 0.08)`).
- New utility tokens/classes for glassmorphism: `.glass-panel` (`backdrop-filter: blur(18px)`, translucent bg + border), radial glow background utility for hero/CTA sections.
- Gradient tokens: `--gradient-primary` (teal→cyan), `--gradient-text` (for hero headline gradient text mask).

**Component variants**:
- `button.tsx`: add `hero` (gradient teal→cyan, glow shadow) and keep `outline` (translucent border, for "Log In") variants.
- `card.tsx`: add a `glass` variant applying `.glass-panel` + hover lift (`translateY(-4px to -6px)` + deepened glow shadow) for feature/tech/workflow cards.
- `badge.tsx`: add an `ocr` variant (amber) for "unverified/raw" indicators and a `verified` variant (teal) for confirmed data.

**Motion** (CSS-only, in `index.css` `@layer utilities` / `tailwind.config.ts` keyframes):
- `floatY` — gentle vertical drift for floating badges/mockup elements.
- `progressLoop` — looping progress bar animation for the hero mockup.
- `marquee` — continuous horizontal scroll for the ticker.
- Hover lift + glow transition class applied to all structural cards.

The authenticated app (`/app/*`) reuses the same dark glass tokens/components (glass cards for class/assignment lists, amber OCR-pending badges, teal verified badges) so the product feels continuous from landing page to in-app experience, rather than switching to a separate light "dashboard" look.

## Verification
1. Visit `/`, confirm the landing page renders the dark glassmorphic theme (navbar, hero dual-pane mockup, marquee, features grid, workflow timeline, tech stack, benefits, CTA, footer) and is responsive.
2. Click "Get Started"/"Log In", sign up as a teacher, confirm a private `profiles` row is created and login/logout works, redirecting to `/app`.
3. Create a class, add students manually, then use "Scan roster photo" with a sample photo of a name list and confirm extracted names appear for review (amber state) before saving (teal/verified state).
4. Create a simple-grading assignment, enter scores + feedback, confirm gradebook totals persist after refresh.
5. Create a rubric-grading assignment with 2+ criteria, confirm per-criterion scores sum into the total correctly.
6. Use "Scan answer sheet" on one student and "Scan grade sheet" for bulk entry; confirm both return editable results, not silent auto-save.
7. Confirm RLS: a second teacher account cannot see the first teacher's classes/students/grades.
