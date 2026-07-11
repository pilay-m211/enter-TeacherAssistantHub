import { downloadWorkbook, downloadCsv, type ExportSheet } from "@/lib/exportUtils";
import { COMPONENT_LABELS, TERM_LABELS, TERMS, type AssignmentComponent, type Term } from "@/lib/gradingConfig";
import type { GradeBookData } from "@/hooks/useGradeBook";
import type { GradeRow } from "@/hooks/useGrades";

/** E-Class Record-style sheet: one tab per term, subject-teacher view with raw % breakdown. */
export function exportEClassRecord(data: GradeBookData, className: string) {
  const sheets: ExportSheet[] = [];

  for (const term of TERMS) {
    const rows = data.termGrades[term] ?? [];
    if (data.students.length === 0) continue;

    sheets.push({
      name: TERM_LABELS[term],
      rows: rows.map((row) => ({
        "Learner's Name": row.studentName,
        "Written Work %": row.writtenWorkPct !== null ? Number(row.writtenWorkPct.toFixed(2)) : "",
        "Performance Task %": row.performanceTaskPct !== null ? Number(row.performanceTaskPct.toFixed(2)) : "",
        "Quarterly Assessment %": row.quarterlyAssessmentPct !== null ? Number(row.quarterlyAssessmentPct.toFixed(2)) : "",
        "Initial Grade": row.initialGrade !== null ? Number(row.initialGrade.toFixed(2)) : "",
        "Term Grade": row.termGrade ?? "",
      })),
    });
  }

  downloadWorkbook(sheets, `${className} - E-Class Record`);
}

/** Summary of Term Grades: single sheet, one row per student, T1-T3 + Final Grade + Remarks — for the class adviser. */
export function exportSummaryOfTermGrades(data: GradeBookData, className: string) {
  const rows = data.yearSummary.map((student) => ({
    "Learner's Name": student.studentName,
    "Term 1": student.termGrades[0] ?? "",
    "Term 2": student.termGrades[1] ?? "",
    "Term 3": student.termGrades[2] ?? "",
    "Final Grade": student.finalGrade ?? "",
    Remarks: student.remarks,
  }));

  downloadWorkbook([{ name: "Summary of Term Grades", rows }], `${className} - Summary of Term Grades`);
}

/** Flat, unaggregated backup of every raw grade entry for spreadsheet backup / audit. */
export function exportRawBackupCsv(
  data: GradeBookData,
  grades: GradeRow[],
  assignmentMeta: Map<string, { name: string; component: AssignmentComponent; semester: Term; maxTotal: number }>,
  className: string
) {
  const rows = grades.map((grade) => {
    const meta = assignmentMeta.get(grade.assignment_id);
    const total = grade.scores ? (grade.scores ?? []).reduce((sum, s) => sum + (s || 0), 0) : grade.score_numeric ?? 0;
    return {
      "Learner's Name": grade.student_name,
      Assignment: meta?.name ?? "",
      Component: meta ? COMPONENT_LABELS[meta.component] : "",
      Term: meta ? TERM_LABELS[meta.semester] : "",
      "Raw Score": total,
      "Max Score": meta?.maxTotal ?? "",
      Feedback: grade.feedback ?? "",
    };
  });

  downloadCsv(rows, `${className} - Grade Backup`);
}
