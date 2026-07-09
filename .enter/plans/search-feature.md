# Cross-App Search

## Context
The app has no search today beyond the Class Detail roster's manual scroll and a small archived-student filter checkbox. Data already lives in `students`, `folders` (classes), `files` (assignments), `student_notes`, `attendance_records`, and `grade_ledger` — all RLS-scoped to `auth.uid() = user_id`. This adds two layers on top of that same data, no new data store:

1. **Global search** (Cmd/Ctrl+K command palette, reachable from anywhere) — students, classes, assignments, notes.
2. **Page-level search/filter inputs** on Classes, Class roster, Students directory, Grade Book, Attendance, and Notes — client-side filtering of data already loaded on that page (fast, zero extra queries, since those pages already fetch the full per-class/per-student dataset).

Because OCR-imported rows are written through the exact same `upsertGradeRecord`/`addStudents`/`createAssignment` functions manual entry uses, they are automatically included in every search below with no extra code.

## Database Changes (indexing only — no new tables)
```sql
create extension if not exists pg_trgm;

-- Fast case-insensitive partial matching (ILIKE '%term%') for global search targets.
create index if not exists idx_students_name_trgm on students using gin (name gin_trgm_ops);
create index if not exists idx_students_number_trgm on students using gin (student_number gin_trgm_ops);
create index if not exists idx_folders_name_trgm on folders using gin (name gin_trgm_ops);
create index if not exists idx_files_name_trgm on files using gin (name gin_trgm_ops);
create index if not exists idx_student_notes_content_trgm on student_notes using gin (content gin_trgm_ops);
create index if not exists idx_student_notes_title_trgm on student_notes using gin (title gin_trgm_ops);
```
Attendance already has `idx_attendance_folder_date`/`idx_attendance_folder_quarter`/`idx_attendance_student` from the previous migration — sufficient since status/date are small enumerable values, not free text. No new attendance index needed.

**Permissions**: no policy changes. Every query below runs through the existing `*_owner` RLS policies (`auth.uid() = user_id`), so a teacher's search results are automatically scoped to only their own classes/students/notes — this is inherited for free, not something search code has to enforce itself.

## Architecture (hooks = "API", matching this app's existing pattern)
This app has no REST backend — every "endpoint" in the request maps to a typed React hook calling Supabase directly under RLS, exactly like `useGradeBook`, `useAttendance`, etc. already do.

| Requested endpoint | Implementation |
|---|---|
| `GET /search?q=` | `useGlobalSearch(query, { includeArchived })` — parallel `ilike` queries across `students`, `folders`, `files`, `student_notes` |
| `GET /search/students?q=&classId=` | same hook, `classId` filter applied client-side to the students slice, or `useStudents(classId)` + local filter (page-level search) |
| `GET /search/classes?q=` | `useClasses()` + local filter (page-level search on Classes.tsx) |
| `GET /search/attendance?q=&classId=` | local filter on `useClassAttendance`'s already-loaded roster (page-level search on ClassAttendance.tsx) |
| `GET /search/notes?q=&studentId=` | local filter on `useStudentNotes`'s already-loaded notes (page-level search on NotesTab) |
| `GET /search/gradebook?q=&classId=` | local filter on `useGradeBook`'s already-loaded `quarterGrades`/`yearSummary` (page-level search on GradeBook.tsx) |

Only the first (global, cross-table) needs a new network round-trip; everything else filters data the page already has in memory — faster and avoids duplicate querying.

## New Files
- **`src/hooks/useDebouncedValue.ts`** — tiny generic debounce hook (300ms), used by global search input.
- **`src/hooks/useGlobalSearch.ts`** — given `{ query, includeArchived }`:
  - Trims whitespace; returns empty result set for queries under 2 characters (prevents expensive broad scans, per the request).
  - Runs 4 `ilike` queries in parallel (`Promise.all`): `students` (name OR student_number, optionally excluding archived), `folders` (name), `files` (name, joined to folder name for context), `student_notes` (title OR content, joined to student name).
  - Caps each category at 8 results.
  - Returns `{ students, classes, assignments, notes, loading }`, each item carrying enough context (`classId`, `studentId`, etc.) to build a direct link.
- **`src/lib/searchHighlight.tsx`** — `<HighlightMatch text query />` helper that wraps the matching substring in a `<mark>`-style span using the theme's `bg-warning/30 text-warning-foreground`-equivalent highlight, used by both global and page-level result lists.
- **`src/components/search/GlobalSearchDialog.tsx`** — Cmd/Ctrl+K modal built on the already-installed `Command`/`CommandDialog`/`CommandInput`/`CommandList`/`CommandGroup`/`CommandItem`/`CommandEmpty` primitives (from `cmdk`, already in `package.json`). Grouped sections: Students, Classes, Assignments, Notes. An "Include archived students" toggle chip. Selecting a result navigates via `useNavigate` and closes the dialog.
- **`src/components/search/SearchInput.tsx`** — reusable bare input with a search icon, clear (×) button, and `placeholder` prop — used for all page-level filters.

## Wiring Into Existing Pages
- **`AppLayout.tsx`**: add a "Search…" button in the header (with `⌘K` hint) that opens `GlobalSearchDialog`; add a `keydown` listener for Cmd/Ctrl+K globally while inside the authenticated app shell.
- **`Classes.tsx`**: `SearchInput` filtering the class grid by name (client-side).
- **`ClassDetail.tsx`**: `SearchInput` above `StudentRosterTable`, filtering the already-loaded roster by name/student number (works alongside the existing "show archived" checkbox).
- **`Students.tsx`** (cross-class directory): `SearchInput` filtering by name/student number/class name.
- **`GradeBook.tsx`**: `SearchInput` filtering the per-quarter table rows and the Summary of Quarterly Grades table by student name.
- **`ClassAttendance.tsx`**: `SearchInput` filtering the roster list being marked, so a teacher can jump straight to one student in a large class.
- **`NotesTab.tsx`** (Student Profile): `SearchInput` filtering notes by title/content.

## Search Behavior
- Search-as-you-type everywhere; global search additionally debounced 300ms before firing its network query (page-level filters are instant/client-side, no debounce needed).
- Case-insensitive partial/fragment matching (`ilike '%term%'` server-side; `.toLowerCase().includes()` client-side).
- Clear (×) button resets instantly.
- Empty state: "No results for '{query}'" with a short hint, shown consistently by both `GlobalSearchDialog` (via `CommandEmpty`) and page-level filtered-list empty states.
- Archived students excluded from global search and directory search by default; included only when the "Include archived" toggle is on — matching the existing `ClassDetail` convention.

## Validation / Performance
- Trim whitespace before every query.
- Minimum 2-character query length before hitting the database (global search only).
- Debounce (300ms) on the global search input.
- Per-category result caps (8) to keep the dropdown fast and payloads small.
- Parallel queries (`Promise.all`), not sequential.
- RLS enforces per-teacher scope automatically — no extra permission logic to write.

## Example Response Shape
```ts
// useGlobalSearch("mar") result
{
  students: [
    { id, name: "Maria Santos", studentNumber: "2026-0044", classId, className: "Grade 7 - Rizal", status: "active" }
  ],
  classes: [
    { id, name: "Grade 8 - Mabini", subjectGroup: "core" }
  ],
  assignments: [
    { id, name: "Q1 Math Quiz", classId, className: "Grade 7 - Rizal", component: "written_work", quarter: 1 }
  ],
  notes: [
    { id, studentId, studentName: "Maria Santos", classId, title: "Parent meeting", snippet: "...discussed math progress..." }
  ],
  loading: false
}
```

## Implementation Steps
1. Migration: `pg_trgm` extension + trigram indexes.
2. `useDebouncedValue.ts`, `searchHighlight.tsx`.
3. `useGlobalSearch.ts`.
4. `SearchInput.tsx`, `GlobalSearchDialog.tsx`.
5. Wire `GlobalSearchDialog` + `⌘K` shortcut into `AppLayout.tsx`.
6. Add `SearchInput` filters to `Classes.tsx`, `ClassDetail.tsx`, `Students.tsx`, `GradeBook.tsx`, `ClassAttendance.tsx`, `NotesTab.tsx`.

## v2 Extensions (explicitly deferred)
- Global search across `grade_ledger.feedback` (searching teacher feedback comments on assignments).
- Recent searches (localStorage) and saved searches.
- Advanced filter chips in `GlobalSearchDialog` (by class, quarter, subject group).
- True full-text search (Postgres `tsvector`/`websearch_to_tsquery`) if datasets grow well beyond typical single-teacher scale.
- A dedicated `/app/search?q=` results page for "see all results" beyond the capped dropdown.

## Verification
1. Press Cmd/Ctrl+K from any page — dialog opens, typing 2+ characters returns grouped results within ~300ms.
2. Search a partial student name fragment (e.g. "mar" for "Maria") — case-insensitive partial match works.
3. Click a result — navigates directly to the right class/student/assignment.
4. Toggle "Include archived" — archived students appear/disappear from results accordingly.
5. On Class Detail, Students directory, Grade Book, Attendance, and Notes tab — typing in the local search box filters instantly with no network delay.
6. Clear button resets each search field immediately.
7. An OCR-imported student/assignment/grade is found by search identically to a manually-entered one (no special-casing needed).
8. Log in as a second teacher — global search returns zero cross-teacher results (RLS holds).
