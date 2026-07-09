# Class Attendance Module (Fast Daily Roll-Call)

## Context
Per-student attendance already exists end-to-end: `attendance_records` table, `useAttendance(studentId, classId)` hook, and a per-student `AttendanceTab` on the Student Profile (add one record at a time via a dialog). What's missing is the **fast, class-wide daily marking screen** the request describes: open a class → pick a date → see the whole roster defaulted to Present → tap the few students who were Absent/Late/Excused → Save once. This adds that screen on top of the existing table — no new attendance data model.

## Decisions (stated explicitly, no schema duplication)
- **No `attendance_sessions` table.** The existing `attendance_records` unique key `(student_id, folder_id, date)` already lets us derive "was this class marked on this date?" from `SELECT DISTINCT date FROM attendance_records WHERE folder_id = ...` — adding a parallel sessions table would duplicate that concept. Noted as intentionally skipped.
- **"Default to Present" is resolved at Save time, not just read time.** When the teacher saves a day's attendance, one row is written per active student in the class — students the teacher never tapped are saved as `present`. This keeps historical summaries accurate (a day with 30 students has 30 rows, not just the 2 the teacher tapped), and matches the described flow exactly ("Default all students to Present... Save attendance").
- **`term_id`/`grading_period_id`** → reuse the existing `attendance_records.quarter` (1–4), same DepEd-quarter concept already used everywhere else in the app (`files.quarter`). No new terms table.
- **`class_id`/`teacher_id`** → already `folder_id`/`user_id` on `attendance_records`, consistent with every other table's RLS pattern (`auth.uid() = user_id`).

## Database Change (one additive migration)
```sql
-- Support audit/update tracking on attendance edits (PATCH semantics), consistent
-- with how student_notes.updated_at is already maintained by the app.
alter table attendance_records add column if not exists updated_at timestamptz not null default now();

-- Fast lookup for "load a class's attendance for one date" — the core query of the new screen.
create index if not exists idx_attendance_folder_date on attendance_records(folder_id, date);
```
No RLS changes needed — the existing `attendance_records_owner` policy (`auth.uid() = user_id`) already guarantees a teacher can only read/write their own classes' attendance.

## New Hooks
- **`src/lib/attendanceSummary.ts`** — extract the existing `summarize()` logic out of `useAttendance.ts` into a shared pure function, so both per-student and class-wide summaries use identical counting logic (present/absent/late/excused counts + attendance rate).
- **`src/hooks/useClassAttendance.ts`** (new) — given `classId` + `date`:
  - Loads active students in the class (`useStudents`-style query) and existing `attendance_records` rows for that exact date.
  - Builds a draft map `studentId -> { status, note }`, defaulting every student without an existing row to `present`.
  - `setStatus(studentId, status)`, `setNote(studentId, note)`, `markAllPresent()` (bulk reset).
  - `liveSummary` — counts computed from the in-memory draft (updates instantly as the teacher taps, before saving).
  - `quarter` state (1–4 selector); if records already exist for the date, defaults to the quarter found on those records.
  - `save()` — upserts one row per active student (`onConflict: student_id,folder_id,date`), writing `present` for untouched students. Uses the same upsert-by-unique-key pattern as the existing per-student hook, so duplicates are prevented identically.
- **`src/hooks/useClassAttendanceSummary.ts`** (new) — aggregate stats across the whole class (all students, all recorded dates or filtered by quarter): total days marked, overall rate, per-status breakdown. Powers a summary card on the new screen (the "GET class attendance summary" capability from the request).
- **`src/hooks/useAttendance.ts`** (existing, per-student) — refactored to import the shared `summarize()` from `attendanceSummary.ts` instead of defining its own copy. No behavior change.

## Frontend
- **New page `src/pages/ClassAttendance.tsx`** at route `/app/classes/:classId/attendance`:
  - Header: class name, date input (capped at today — future dates disallowed; past dates freely editable per the request), quarter selector.
  - Live summary card (present/absent/late/excused counts + rate) — reused `ClassAttendanceSummaryCard` style component fed by `liveSummary`.
  - Roster list: one row per active student — name, a compact 4-way status control, and a small note field that only appears once a student is marked something other than Present (keeps the row fast/quiet for the common case).
  - "Mark all Present" quick action, and a prominent "Save Attendance" button.
- **New component `src/components/attendance/AttendanceStatusToggle.tsx`** — 4-way single-select control (Present/Absent/Late/Excused) built on the existing `ToggleGroup`/`ToggleGroupItem` primitives, color-coded consistent with the app's existing status badges (`verified`=present, `destructive`=absent, `ocr`=late, `outline`=excused).
- **New component `src/components/attendance/AttendanceReasonInput.tsx`** — small inline textarea/popover for the optional reason note, shown conditionally per row.
- **Entry point**: "Take Attendance" button added to `ClassDetail.tsx`, next to the existing "Grade Book" button.
- **Student Profile**: no changes needed — its existing `AttendanceTab`/`useAttendance(studentId, classId)` already reads from `attendance_records`, so records saved from the new bulk screen appear there automatically (same shared table, same hook, live on next load).

## Validation Rules
- Status restricted to `present | absent | late | excused` — enforced by the existing DB check constraint and the TypeScript union type before submission.
- No duplicate `(student, class, date)` rows — existing DB unique constraint + upsert `onConflict`.
- Date cannot be set in the future — `max` attribute on the date input, mirrored with a client-side check before save.
- Reason note is always optional, for any status (not just absent/late), consistent with the existing per-student flow.
- Teachers can only see/mark their own classes' attendance — existing RLS policy, unchanged.

## Summary Calculation Logic
`ratePct = (present + late + excused) / total * 100` (late/excused count as "attended" — same formula already used by the existing per-student `useAttendance`, now shared via `attendanceSummary.ts` so per-student and class-wide numbers are always computed identically).

## Implementation Steps
1. Migration: `updated_at` column + `(folder_id, date)` index on `attendance_records`.
2. Extract `attendanceSummary.ts`; refactor `useAttendance.ts` to use it.
3. Build `useClassAttendance.ts` and `useClassAttendanceSummary.ts`.
4. Build `AttendanceStatusToggle.tsx`, `AttendanceReasonInput.tsx`, `ClassAttendanceSummaryCard` (reusable card).
5. Build `ClassAttendance.tsx` page.
6. Add route in `router.tsx`.
7. Add "Take Attendance" entry point button in `ClassDetail.tsx`.

## Verification
1. Open a class → "Take Attendance" → today's roster loads, everyone defaulted to Present.
2. Tap 2 students to Absent/Late, add a note to one, hit Save — confirm exactly one row per active student is written/updated for that date.
3. Change the date picker to yesterday, confirm a fresh, independently-editable roll (or previously saved marks reload correctly, pre-filled).
4. Reopen the same date — previously saved statuses/notes are pre-filled, not reset.
5. Try to re-save the same date/class/student — confirm it updates the existing row rather than creating a duplicate (unique constraint holds).
6. Open that student's Profile → Attendance tab — the newly saved records appear immediately, summary numbers match.
7. Confirm a second teacher account cannot see or mark the first teacher's class attendance (RLS).
