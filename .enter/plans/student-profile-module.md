# Student Profile Module

## Context
The app currently has classes (`folders`), a flat roster (`students`), assignments (`files`, with `component`/`quarter` DepEd tags), and grades (`grade_ledger`, with `source: manual|ocr` — Phase 2 OCR already writes here). There is no attendance concept yet, no notes, and no per-student detail view — a teacher can only see students inside a flat roster table or aggregated in the Grade Book. This adds a **Student Profile** screen that consolidates a learner's info, grade history, attendance, and notes in one place, without duplicating any grade data.

**Architecture note on "API endpoints":** this app has no custom Node/Express backend — all data access goes through Supabase (PostgREST) directly from React hooks, exactly like every existing feature (`useStudents`, `useGrades`, `useGradeBook`, etc.). So "endpoints" below are implemented as **typed hooks calling Supabase tables under RLS**, not REST route handlers. This matches the existing codebase pattern exactly.

**Mapping the requested schema onto what already exists (per "do not create a separate student system"):**
- `GradeRecord` → **already exists** as `grade_ledger` (+ `files` for assignment/subject/term context). No new grade table — the profile's Grades tab reads existing `grade_ledger`/`files` filtered by `student_id`.
- `term_id` → **already exists** as `files.quarter` (1–4, DepEd quarters). No separate terms table; attendance reuses the same integer quarter for consistency.
- `subject_id`/`class_id` → **already exists** as `folders.id` (a class = a subject section in this app's model, each with `subject_group`).
- `teacher_id` → **already exists** as `user_id` on every table (RLS owner column).
- `StudentProfile`, `AttendanceRecord`, `NoteRecord` → **new tables**, additive only, linked via `student_id`/`folder_id` FKs.

## Data Model Changes (`supabase_migration`)

```sql
-- Extend students with number + lifecycle status (soft delete / archive, no hard delete)
alter table students add column if not exists student_number text;
alter table students add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive', 'transferred'));

-- 1:1 profile extension — never stores grades, only descriptive/contact info
create table if not exists student_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text,
  grade_level text,
  parent_guardian_name text,
  parent_contact text,
  address text,
  notes_summary text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_student_profiles_student on student_profiles(student_id);
alter table student_profiles enable row level security;
create policy "student_profiles_owner" on student_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Attendance, one row per student per class per date
create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  folder_id uuid not null references folders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quarter smallint not null default 1 check (quarter between 1 and 4),
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, folder_id, date)
);
create index if not exists idx_attendance_student on attendance_records(student_id);
create index if not exists idx_attendance_folder_quarter on attendance_records(folder_id, quarter);
alter table attendance_records enable row level security;
create policy "attendance_records_owner" on attendance_records for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Teacher notes / remarks per student
create table if not exists student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_student_notes_student on student_notes(student_id);
alter table student_notes enable row level security;
create policy "student_notes_owner" on student_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

RLS (`auth.uid() = user_id`) is the permission model already used everywhere else in this app — it already guarantees a teacher only ever sees their own classes/students/grades; the same pattern extends here, satisfying "role-based access, teachers only see their own classes and students."

## New Hooks (`src/hooks/`)
- `useStudentProfile(studentId)` — fetch-or-create the 1:1 `student_profiles` row; `updateProfile()`; `archiveStudent()`/`restoreStudent()` (sets `students.status` + `student_profiles.archived_at`).
- `useAttendance(studentId, classId)` — list a student's attendance in a class; `upsertAttendance({date, quarter, status, note})`; computed summary (present/absent/late/excused counts + rate).
- `useStudentNotes(studentId)` — list notes newest-first; `addNote()`, `updateNote()`, `deleteNote()`.
- `useStudentGradeHistory(studentId, classId)` — thin wrapper reusing `useGradeBook`'s existing per-quarter computation (`depedGrading.ts`) filtered to one student, plus a flat assignment-level list (name, component, quarter, raw score, max, source, feedback) for drill-down. **No new grade computation logic — reuses existing exported functions.**

## Frontend

**New page** `src/pages/StudentProfile.tsx` at route `/app/classes/:classId/students/:studentId`:
- Header: name, student number, class/section link, status badge, "Archive/Restore" action.
- Tabs (reusing existing `Tabs`/`TabsList` primitives): **Overview**, **Grades**, **Attendance**, **Notes**.
  - **Overview**: progress summary card (current quarter's Quarterly Grade + trend across Q1–Q4 sparkline-style badges, reusing `computeQuarterlyGrade`/`computeFinalGrade`), attendance rate this quarter, recent activity feed (latest 5 grade entries + notes, newest first).
  - **Grades**: per-quarter table (same columns as Grade Book: WW%/PT%/QA%/Initial/Quarterly) plus an assignment-level drill-down list with a link to that assignment's grading page (`/app/classes/:classId/assignments/:assignmentId`).
  - **Attendance**: quarter filter, `Calendar`-based or list-based date entries (reusing existing `Calendar` primitive), status badges, add/edit entry.
  - **Notes**: list of notes (title, content, timestamp), add/edit dialog (reusing `Dialog`/`Textarea` patterns already used across the app).
- Basic info card also surfaces optional `student_profiles` fields (grade level, parent/guardian, contact, address) with an "Edit" dialog — all optional, blank-safe.

**Entry points** (linking Student Profile into the existing flow, not a separate silo):
- `StudentRosterTable` (Class Detail roster): each row becomes a link to the profile instead of plain text.
- `GradeBook.tsx` quarter tables and Summary table: student name becomes a link to the profile.
- Profile page always has a "Back to Class" and "Open Grade Book" link.

**Router** (`src/router.tsx`): add `classes/:classId/students/:studentId` under the existing `AppLayout` branch, next to `gradebook`/`assignments`.

## Validation Rules
- Attendance: one record per (student, class, date) — enforced by the DB `unique` constraint; upsert on conflict.
- Notes: `content` required, non-empty; `title` optional.
- Profile fields: all optional except the row's `student_id` link; no format validation beyond basic trimming (parent contact is free text, not phone-validated, to avoid over-engineering for a student project).
- Archiving: archiving a student does not delete any `grade_ledger`/`attendance_records`/`student_notes` rows — it only flips `students.status` and stamps `student_profiles.archived_at`, and archived students are excluded from the active roster list by default (with a "show archived" toggle) but remain fully visible on their own profile and in exports/history.

## Sample Data Shapes
```ts
// useStudentProfile(studentId) result
{
  student: { id, name, student_number, folder_id, status },
  profile: { photo_url, grade_level, parent_guardian_name, parent_contact, address, notes_summary, archived_at },
}

// useStudentGradeHistory result (per quarter)
{
  quarter: 1,
  writtenWorkPct: 88.5, performanceTaskPct: 91.2, quarterlyAssessmentPct: 79.0,
  initialGrade: 87.4, quarterlyGrade: 92,
  assignments: [
    { assignmentId, name: "Quiz 1", component: "written_work", rawScore: 18, maxScore: 20, source: "manual" },
    { assignmentId, name: "Unit Test", component: "quarterly_assessment", rawScore: 40, maxScore: 50, source: "ocr" },
  ]
}

// useAttendance summary
{ present: 42, absent: 2, late: 1, excused: 0, ratePct: 93.3 }
```

## Implementation Steps
1. Migration: `students` columns + `student_profiles`, `attendance_records`, `student_notes` tables + RLS + indexes.
2. Hooks: `useStudentProfile`, `useAttendance`, `useStudentNotes`, `useStudentGradeHistory`.
3. Components: `StudentInfoCard`, `EditStudentProfileDialog`, `GradeHistoryTab`, `AttendanceTab` (+ `AddAttendanceDialog`), `NotesTab` (+ `NoteDialog`), `ProgressSummaryCard`, `RecentActivityList`.
4. Page: `StudentProfile.tsx` assembling the tabs.
5. Route: add to `router.tsx`.
6. Wire entry points: make student names clickable in `StudentRosterTable` and `GradeBook.tsx`.
7. Roster list: add "show archived" toggle to `ClassDetail`'s roster section, filter `status`.

## v2 Extensions (explicitly deferred, not built now)
- File attachments per student (would reuse the existing `ocr-uploads`-style storage bucket pattern).
- Parent-facing read-only view (separate auth role).
- Class-wide attendance-taking UI (mark a whole class present/absent in one screen) rather than per-student entry.
- Dashboards/alerts (e.g., "grade dropped 10%+", "3 absences this month").

## Verification
1. Open a class → roster → click a student name → Student Profile loads with correct name/section.
2. Grades tab shows the same Quarterly Grade as the Grade Book for that student/quarter, including OCR-sourced entries (`source: 'ocr'` badge visible on assignment-level rows).
3. Add an attendance entry, confirm it appears in the summary and can't be duplicated for the same date.
4. Add/edit a note, confirm it persists and appears in Recent Activity.
5. Archive the student, confirm they disappear from the default roster view but their profile/history remain fully intact and accessible.
6. Confirm a second teacher account cannot see the first teacher's student profiles/attendance/notes (RLS).
