# DepEd-Aligned Grade Computation & Export (E-Class Record, Summary, Form 138, Backup)

## Context
The app currently stores raw per-assignment scores (`grade_ledger.scores[]`) with no concept of DepEd's Written Work (WW) / Performance Task (PT) / Quarterly Assessment (QA) components, no per-quarter tracking, and no Initial→Quarterly Grade transmutation. The user wants the app to follow the actual E-Class Record workflow: raw scores → Initial Grade → Quarterly Grade (transmuted), plus four export outputs teachers already use: an E-Class Record-style sheet, a Summary of Quarterly Grades (for the class adviser), a Form 138-style report card, and a clean CSV/XLSX backup.

## DepEd Grading Rules To Implement (as pure functions, `src/lib/depedGrading.ts`)
- **Subject-group weight presets** (chosen per class, applied to all assignments in that class):
  - `core`: WW 20% / PT 50% / QA 30% (Languages, Math, Science, AP, ESP, etc.)
  - `tle_mapeh`: WW 20% / PT 60% / QA 20% (MAPEH, EPP/TLE)
  - (SHS-specific presets are out of scope for now — noted as future work in code comments.)
- **Component % per student** = (sum of raw scores across that component's assignments in the quarter) / (sum of max totals) × 100.
- **Initial Grade** = WW% × wWW + PT% × wPT + QA% × wQA.
- **Quarterly Grade** = looked up from the official DepEd Order 8 s.2015 transmutation table (Initial Grade range → integer Transmuted Grade, 60–100), hardcoded as a constant table. This is what the user confirmed as "the current DepEd Order for SY 2026–2027 with the adjusted transmutation table."
- **Zero-based grading toggle**: implement `GRADING_MODE` as a single exported constant (`"transmuted"` for now). When DepEd's zero-based grading takes effect SY 2027–2028, switching this one constant makes `computeQuarterlyGrade` return `Math.round(initialGrade)` directly instead of using the transmutation table — code path already branches on this constant so the future change is a one-line flip, not a rewrite.
- **Final Grade** (for the year) = `Math.round(average(Q1, Q2, Q3, Q4))`; **Remarks** = "PASSED" if ≥ 75 else "FAILED".

## Data Model Changes (`supabase_migration`)
- `folders` (classes): add `subject_group text not null default 'core' check (subject_group in ('core','tle_mapeh'))`.
- `files` (assignments): add
  - `component text not null default 'written_work' check (component in ('written_work','performance_task','quarterly_assessment'))`
  - `quarter smallint not null default 1 check (quarter between 1 and 4)`
  - Backfill existing rows: `component = 'performance_task'` where `assessment_type = 'rubric'`, else `'written_work'`.

## UI Changes
1. **`CreateClassDialog`**: add a required "Subject Group" select (Core Subjects / MAPEH-EPP-TLE) → stored as `folders.subject_group`. `useClasses.createClass` gains a `subjectGroup` param.
2. **Assignment component/quarter tagging — via a separate settings screen** (per user's explicit preference, not the create dialog): add a small gear/settings icon button on each row in `AssignmentList` opening a new `AssignmentSettingsDialog` with two selects — Component (Written Work / Performance Task / Quarterly Assessment, defaulting to the assignment's current value) and Quarter (Q1–Q4). Saves via a new `updateAssignment(id, { component, quarter })` in `useAssignments`. `CreateAssignmentDialog` itself is unchanged (keeps its existing Simple/Rubric flow); new assignments get sensible defaults from the migration default (`written_work`, quarter 1) and teachers retag via the settings dialog.
3. **New `useGradeBook(classId)` hook** (`src/hooks/useGradeBook.ts`): fetches the class (for `subject_group`/weights), all its assignments (grouped by quarter & component), all students, and all `grade_ledger` rows once, then uses `depedGrading.ts` helpers to compute, per quarter: each student's WW%/PT%/QA%, Initial Grade, and Quarterly Grade; plus a year-long summary (Q1–Q4, Final Grade, Remarks) per student.
4. **New page `GradeBook.tsx`** at `/app/classes/:classId/gradebook` (linked via a new "Grade Book" button on `ClassDetail`, rendered inside the existing `AppLayout`/sidebar):
   - Quarter tabs (Q1–Q4) showing an E-Class-Record-style table: student rows, assignment score columns grouped by component, then computed WW%/PT%/QA%/Initial Grade/Quarterly Grade columns.
   - A "Summary of Quarterly Grades" section: student rows × Q1–Q4 + Final Grade + Remarks.
   - Export buttons: **Export E-Class Record (.xlsx)**, **Export Summary of Quarterly Grades (.xlsx)**, **Export Full Backup (.csv)**, and **Open Form 138 Report Card** (navigates to the print page).
5. **New print-only page `ReportCardPrint.tsx`** at `/app/classes/:classId/report-card`, added as a sibling route under `/app` *outside* the `AppLayout` branch (no sidebar/topbar chrome, per existing nested-route pattern in `router.tsx`) so `window.print()` output is clean. Renders one Form-138-style card per student (subject, Q1–Q4 grades, Final Grade, Remarks) with `@media print` page breaks between students, plus an on-screen "Print / Save as PDF" button and a "Back to Grade Book" link (hidden when printing).
6. **Export utility `src/lib/exportUtils.ts`** using the new `xlsx` (SheetJS) dependency: `downloadWorkbook(sheets, filename)` for multi-sheet `.xlsx` (E-Class Record, Summary) and `downloadCsv(rows, filename)` for the flat backup export.

## Dependency
Add `xlsx` (SheetJS) via `add_dependency`.

## Files Touched/Created
- Migration: alter `folders`, `files` (new columns + backfill).
- `src/lib/depedGrading.ts` (new) — pure grading/transmutation logic.
- `src/lib/exportUtils.ts` (new) — XLSX/CSV download helpers.
- `src/hooks/useClasses.ts` — add `subjectGroup` to `createClass`; add `updateClass`.
- `src/hooks/useAssignments.ts` — add `updateAssignment`.
- `src/hooks/useGradeBook.ts` (new).
- `src/components/teacher/CreateClassDialog.tsx` — add subject group select.
- `src/components/teacher/AssignmentSettingsDialog.tsx` (new) — component + quarter editor.
- `src/components/teacher/AssignmentList.tsx` — add settings icon button wired to the new dialog.
- `src/pages/ClassDetail.tsx` — add "Grade Book" button.
- `src/pages/GradeBook.tsx` (new).
- `src/pages/ReportCardPrint.tsx` (new).
- `src/router.tsx` — add both new routes (gradebook inside `AppLayout`, report-card as a sibling outside it).

## Verification
1. Create a class, pick "Core Subjects" — confirm `folders.subject_group = 'core'`.
2. Create a few assignments, tag them via the new settings dialog: some Written Work, some Performance Task, one Quarterly Assessment, all Q1.
3. Enter scores for 2–3 students across those assignments.
4. Open Grade Book → Q1 tab: confirm WW%/PT%/QA%, Initial Grade, and Quarterly Grade match manual calculation using the 20/50/30 weights and the transmutation table.
5. Export E-Class Record (.xlsx) and Summary (.xlsx) — confirm files download and open with correct columns/values.
6. Open Form 138 report card print view — confirm one card per student, correct Final Grade/Remarks, and browser print-to-PDF produces a clean page-per-student output (no sidebar visible).
7. Export full backup CSV — confirm it contains raw, unaggregated grade rows for spreadsheet backup.
