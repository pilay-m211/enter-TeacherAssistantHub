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
Routes added to `src/router.tsx` (all except `/auth` wrapped in `ProtectedRoute`):
- `/auth` — `src/pages/Auth.tsx`
- `/` — `src/pages/Dashboard.tsx`: list of the teacher's classes (create/delete class).
- `/classes/:classId` — `src/pages/ClassDetail.tsx`: student roster (add/edit/remove student, "Scan roster photo" OCR button) + list of assignments (create assignment, choose grading type: simple or rubric; if rubric, open `RubricEditor` to define criteria).
- `/classes/:classId/assignments/:assignmentId` — `src/pages/AssignmentGrading.tsx`: gradebook-style table of students for that assignment — simple assignments show a single score input + feedback textarea per student; rubric assignments show one input per criterion (auto-totaled) + feedback textarea. Includes a "Scan grade sheet" OCR action that bulk-fills scores for review, and a per-student "Scan answer sheet" OCR action.

Key components (`src/components/teacher/`):
- `ClassCard`, `CreateClassDialog`
- `StudentRosterTable`, `AddStudentDialog`, `ScanRosterButton` (OCR)
- `AssignmentList`, `CreateAssignmentDialog`, `RubricEditor`
- `GradeRow` (handles both simple & rubric input modes), `ScanAnswerSheetButton`, `ScanGradeSheetButton` (OCR)
- `OcrImageUpload` — shared component: file picker → upload to storage → call `ocr-extract` → returns parsed JSON to caller for review

Data access hooks (`src/hooks/`): `useClasses`, `useStudents`, `useAssignments`, `useRubric`, `useGrades` — thin wrappers around Supabase client + React Query (already installed) for fetch/create/update/delete.

`src/integrations/supabase/client.ts` — standard Supabase client bootstrap, exporting `SUPABASE_URL`/`SUPABASE_ANON_KEY` for the edge function calls.

## Design
Replace the current generic hero `Index.tsx` with a clean, professional "teacher dashboard" aesthetic: calm blue/teal primary palette, card-based layout, sidebar or top nav with class switcher. Update `index.css` tokens (primary/accent/secondary) and reuse/extend shadcn `Card`, `Table`, `Tabs`, `Dialog`, `Badge` components — no ad-hoc inline colors, everything via design tokens.

## Verification
1. Sign up as a teacher, confirm a private `profiles` row is created and login/logout works.
2. Create a class, add students manually, then use "Scan roster photo" with a sample photo of a name list and confirm extracted names appear for review before saving.
3. Create a simple-grading assignment, enter scores + feedback, confirm gradebook totals persist after refresh.
4. Create a rubric-grading assignment with 2+ criteria, confirm per-criterion scores sum into the total correctly.
5. Use "Scan answer sheet" on one student and "Scan grade sheet" for bulk entry; confirm both return editable results, not silent auto-save.
6. Confirm RLS: a second teacher account cannot see the first teacher's classes/students/grades.
