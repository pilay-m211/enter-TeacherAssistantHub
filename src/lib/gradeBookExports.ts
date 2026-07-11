import { downloadWorkbook, downloadCsv, type ExportSheet } from "@/lib/exportUtils";
import { COMPONENT_LABELS, type AssignmentComponent } from "@/lib/gradingConfig";
import type { GradeBookData } from "@/hooks/useGradeBook";
import type { GradeRow } from "@/hooks/useGrades";

const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];

/** E-Class Record-style sheet: one tab per quarter, subject-teacher view with raw % breakdown. */
export function exportEClassRecord(data: GradeBookData, className: string) {
  const sheets: ExportSheet[] = [];

  for (let quarter = 1; quarter <= 4; quarter++) {
    const rows = data.quarterGrades[quarter] ?? [];
    if (data.students.length === 0) continue;

    sheets.push({
      name: `Quarter ${quarter}`,
      rows: rows.map((row) => ({
        "Learner's Name": row.studentName,
        "Written Work %": row.writtenWorkPct !== null ? Number(row.writtenWorkPct.toFixed(2)) : "",
        "Performance Task %": row.performanceTaskPct !== null ? Number(row.performanceTaskPct.toFixed(2)) : "",
        "Quarterly Assessment %": row.quarterlyAssessmentPct !== null ? Number(row.quarterlyAssessmentPct.toFixed(2)) : "",
        "Initial Grade": row.initialGrade !== null ? Number(row.initialGrade.toFixed(2)) : "",
        "Quarterly Grade": row.quarterlyGrade ?? "",
      })),
    });
  }

  downloadWorkbook(sheets, `${className} - E-Class Record`);
}

/** Summary of Quarterly Grades: single sheet, one row per student, Q1-Q4 + Final Grade + Remarks — for the class adviser. */
export function exportSummaryOfQuarterlyGrades(data: GradeBookData, className: string) {
  const rows = data.yearSummary.map((student) => ({
    "Learner's Name": student.studentName,
    Q1: student.quarterlyGrades[0] ?? "",
    Q2: student.quarterlyGrades[1] ?? "",
    Q3: student.quarterlyGrades[2] ?? "",
    Q4: student.quarterlyGrades[3] ?? "",
    "Final Grade": student.finalGrade ?? "",
    Remarks: student.remarks,
  }));

  downloadWorkbook([{ name: "Summary of Quarterly Grades", rows }], `${className} - Summary of Quarterly Grades`);
}

/** Flat, unaggregated backup of every raw grade entry for spreadsheet backup / audit. */
export function exportRawBackupCsv(
  data: GradeBookData,
  grades: GradeRow[],
  assignmentMeta: Map<string, { name: string; component: AssignmentComponent; quarter: number; maxTotal: number }>,
  className: string
) {
  const rows = grades.map((grade) => {
    const meta = assignmentMeta.get(grade.assignment_id);
    const total = grade.scores ? (grade.scores ?? []).reduce((sum, s) => sum + (s || 0), 0) : grade.score_numeric ?? 0;
    return {
      "Learner's Name": grade.student_name,
      Assignment: meta?.name ?? "",
      Component: meta ? COMPONENT_LABELS[meta.component] : "",
      Quarter: meta ? QUARTER_LABELS[meta.quarter - 1] : "",
      "Raw Score": total,
      "Max Score": meta?.maxTotal ?? "",
      Feedback: grade.feedback ?? "",
    };
  });

  downloadCsv(rows, `${className} - Grade Backup`);
}
