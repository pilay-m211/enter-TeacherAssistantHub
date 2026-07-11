# Veritas Re-Architecture — Phase 1: Data Model + Trisem/LRN Structure + Configurable Grading Engine

## Context
This is a large structural upgrade requested against the working app, driven by "DepEd Order No. 015, s. 2026." **I could not find the official published text of DO 15, s. 2026 with the actual numeric values** (component weight percentages, transmutation table, passing cutoff, awards cut-offs) — public sources as of now are news summaries/videos without the source tables. Per your decision, you will paste/upload the actual order text or numbers, and I will implement the exact math once I have it.

To avoid blocking all progress on that, **Phase 1 ships everything that does NOT depend on the unknown numbers**: the full data model re-architecture (LRN-based students, many-to-many rosters, Trisem/semester support, renamed/expanded tables) and a **configurable grading engine** with the current, known-correct DepEd Order 8 s.2015 values as the placeholder default — structured so swapping in the real DO 15 numbers later is a config change, not a rewrite (same pattern as the existing `GRADING_MODE` toggle in `depedGrading.ts`).

**What I need from you to complete Phase 1's grading accuracy**: the actual component weight percentages per subject group (Core, MAPEH/TLE, SHS Core, SHS Track/Specialized), the transmutation table (or confirmation it's zero-based/no transmutation), and the passing/awards cutoffs from DO 15, s. 2026. Paste the text/numbers whenever you have them — I'll wire them into `gradingConfig.ts` (see below) without touching anything else.

## Scope Decisions (why re-architecture, not additive-only, this time)
The requested schema fundamentally changes shape vs. what exists (`folders`→`classes` decoupled from a flat `students.folder_id`, into a **many-to-many** `class_students` join; `students.name`→split `last_name/first_name/middle_name` + `lrn`; single `quarter`→`quarter` + `semester` for Trisem). This can't be done as a pure additive migration without leaving the data model incoherent, so Phase 1 is a genuine migration: new tables are created, existing data is backfilled into the new shape, and the app is repointed at the new tables. Old tables (`folders`, `students`, `files`, `grade_ledger`) are **kept temporarily as `_legacy` renamed tables** (not dropped) so nothing is destroyed if something needs to be recovered, and dropped in a follow-up once Phase 1 is verified.

## Database Changes (`supabase_migration`)

```sql
-- 1. Rename existing tables to _legacy (preserve all current data, nothing dropped)
alter table folders rename to folders_legacy;
alter table students rename to students_legacy;
alter table files rename to files_legacy;
alter table grade_ledger rename to grade_ledger_legacy;

-- 2. classes (was folders)
create table classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject_code text,
  subject_group text not null default 'core'
    check (subject_group in ('core','mapeh_tle','shs_core','shs_track')),
  grade_level text,
  section text,
  semester smallint not null default 1 check (semester in (1,2,3)), -- Trisem for SHS; K-12 basic ed uses 1
  school_year text not null default to_char(now(), 'YYYY') || '-' || to_char(now() + interval '1 year', 'YYYY'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_classes_user on classes(user_id);
alter table classes enable row level security;
create policy "classes_owner" on classes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. students (LRN-based, one record per learner across all classes)
create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lrn text,
  last_name text not null,
  first_name text not null,
  middle_name text,
  sex text check (sex in ('male','female')),
  birthdate date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_students_user on students(user_id);
create index idx_students_lrn_trgm on students using gin (lrn gin_trgm_ops);
create index idx_students_name_trgm on students using gin ((last_name || ' ' || first_name) gin_trgm_ops);
alter table students enable row level security;
create policy "students_owner" on students for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. class_students (many-to-many roster join — a student can belong to multiple classes/sections)
create table class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);
create index idx_class_students_class on class_students(class_id);
create index idx_class_students_student on class_students(student_id);
alter table class_students enable row level security;
create policy "class_students_owner" on class_students for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. assignments (was files)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  component text not null default 'written_oral'
    check (component in ('written_oral','performance_task','examination')),
  quarter smallint not null default 1 check (quarter between 1 and 4),
  semester smallint not null default 1 check (semester in (1,2,3)),
  max_score numeric not null default 100,
  weight numeric, -- resolved from gradingConfig.ts at compute time if null; explicit override if set
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_assignments_class on assignments(class_id);
create index idx_assignments_title_trgm on assignments using gin (title gin_trgm_ops);
alter table assignments enable row level security;
create policy "assignments_owner" on assignments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. grade_records (was grade_ledger; now one row per student per assignment, not per-question array)
create table grade_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  score_numeric numeric,
  score_descriptive text, -- Key Stage 1 descriptive grading, no numeric computation
  source text not null default 'manual' check (source in ('manual','ocr')),
  quarter smallint not null check (quarter between 1 and 4),
  semester smallint not null default 1 check (semester in (1,2,3)),
  school_year text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, assignment_id)
);
create index idx_grade_records_class on grade_records(class_id);
create index idx_grade_records_student on grade_records(student_id);
create index idx_grade_records_quarter_sem on grade_records(quarter, semester);
alter table grade_records enable row level security;
create policy "grade_records_owner" on grade_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. attendance_records: extend existing table in place (rename folder_id->class_id, add semester/school_year/reason_note)
alter table attendance_records rename column folder_id to class_id;
alter table attendance_records rename column note to reason_note;
alter table attendance_records rename column date to attendance_date;
alter table attendance_records add column semester smallint not null default 1 check (semester in (1,2,3));
alter table attendance_records add column school_year text not null default (to_char(now(),'YYYY') || '-' || to_char(now() + interval '1 year','YYYY'));
-- existing unique(student_id, folder_id, date) constraint is automatically renamed with the column; verify name and re-add if needed.

-- 8. notes: rename student_notes -> notes, folder_id -> class_id, content -> note_text (align field names to spec)
alter table student_notes rename to notes;
alter table notes rename column folder_id to class_id;
alter table notes rename column content to note_text;
-- title/visibility columns kept (additive, not in spec but harmless and already used by existing UI)

-- 9. school_settings (per-teacher grading config, editable in Settings — Phase 3 UI, table created now)
create table school_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_year text not null default (to_char(now(),'YYYY') || '-' || to_char(now() + interval '1 year','YYYY')),
  grading_config jsonb not null default '{}'::jsonb, -- populated from gradingConfig.ts defaults on first read if empty
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table school_settings enable row level security;
create policy "school_settings_owner" on school_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Backfill migration** (same transaction/turn): copy `folders_legacy`→`classes` (name, user_id, default subject_group from old value), `students_legacy`→`students` (split `name` into `first_name`/`last_name` best-effort, no LRN yet), `files_legacy`→`assignments` (title, component, quarter, max_score = max_score_per_q × question_count), `grade_ledger_legacy`→`grade_records` (one row per student per assignment, `score_numeric` = sum of the old `scores[]` array, `source` preserved). `class_students` populated from each legacy student's single `folder_id`. This is mechanical, scripted in the migration SQL, not manual.

## Grading Engine (`src/lib/gradingConfig.ts` — new, replaces hardcoded values in `depedGrading.ts`)
- Same computation *shape* as today (component % → Initial Grade → transmuted/zero-based Quarterly Grade → average → General Average), but every **number** (weights per subject_group, transmutation table, passing cutoff, awards thresholds) lives in one exported `DEFAULT_GRADING_CONFIG` object instead of being inlined — this is the object I will overwrite once you provide the real DO 15, s. 2026 figures.
- New: `computeSemesterFinalGrade(quarterlyGrades, semester)` — average of the quarters within that semester (K-12 basic ed: semester 1 = Q1+Q2, semester 2 = Q3+Q4; SHS Trisem: each of the 3 semesters maps to its own quarter set per config).
- New: `computeGeneralAverage(semesterFinalGrades)` — average across all semesters in the school year.
- New: `AWARDS_CONFIG` placeholder (Academic Excellence thresholds, KS1 "no numeric awards" flag) — logic stubbed with today's commonly-known thresholds (e.g. ≥90 with no grade <85) clearly marked `// PLACEHOLDER pending DO 15 s.2026 text`.
- `depedGrading.ts` is not deleted; it's refactored to import from `gradingConfig.ts` so `useGradeBook`/`useStudentGradeHistory` keep working with minimal changes.

## Frontend/Hook Changes (mechanical renames + Trisem awareness)
- Rename hook files/exports to match new tables: `useClasses` (folders→classes), `useStudents` (name-split + LRN fields), `useClassRoster` (new, wraps `class_students` join, replaces the old `folder_id`-on-student model), `useAssignments`, `useGrades`→`useGradeRecords`.
- Every hook that filtered by `folder_id` now filters by `class_id`; every place `quarter` was the only period selector gains a paired `semester` selector, defaulting to `1` (invisible/no-op for K-12 basic ed classes, active for `shs_core`/`shs_track` classes).
- `ClassDetail`, `GradeBook`, `ClassAttendance`, `StudentProfile`, `Scanner`, OCR import — updated to the renamed tables/columns. No visual/UX redesign in this phase; this is a plumbing migration.
- `CreateClassDialog` gains grade-level/section/school-year fields and a semester selector that only appears for `shs_core`/`shs_track` subject groups (1/2/3), defaulting to hidden/`1` for K-12.
- Student creation gains LRN, sex, birthdate fields (all optional except name, to avoid blocking teachers who don't have LRNs handy yet).

## Explicitly Deferred to Later Phases (per your approval)
- **Phase 2**: `ocr_jobs` table + job-queue UI (pending/review/applied/rejected states) replacing today's synchronous OCR review flow; `exports` history table logging each export.
- **Phase 3**: Settings page UI for editing `grading_config` per subject group, school year config, export history view.

## Verification (Phase 1)
1. Run migration — confirm `classes`, `students`, `class_students`, `assignments`, `grade_records`, `notes`, `school_settings` exist with RLS enabled and owner policies.
2. Confirm legacy data backfilled: every existing class/student/assignment/grade appears correctly in the new tables with no data loss (`folders_legacy` row count == `classes` row count, etc.).
3. Full manual flow: create a class (Core, K-12), add a student (with/without LRN), create an assignment, enter a grade — Grade Book still computes Initial/Quarterly Grade correctly using the placeholder config (same numbers as before, since defaults = current DO 8 s.2015 values).
4. Create an SHS class (`shs_core`), confirm semester selector (1/2/3) appears and assignments/grades correctly scope by quarter **and** semester.
5. OCR roster/answer-sheet/grade-sheet scans still write into `students`/`grade_records` correctly post-rename.
6. Second teacher account still cannot see the first teacher's classes/students/grades (RLS holds on all renamed/new tables).
7. **Grading math itself is flagged as PLACEHOLDER** until you supply the actual DO 15, s. 2026 weights/transmutation/awards numbers — I will not claim DO 15 compliance until that data is in and verified against your source.
