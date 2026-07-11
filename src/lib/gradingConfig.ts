// Central, swappable grading configuration.
//
// IMPORTANT: The numeric values below (component weights, transmutation table,
// passing cutoff, awards thresholds) are PLACEHOLDERS carried over from the
// last officially-confirmed DepEd Order (No. 8, s. 2015) and the MATATAG-era
// weight presets already used by this app. They are NOT yet verified against
// DepEd Order No. 015, s. 2026 ("Revised Guidelines on Classroom Assessment,
// Grading System, and Awards and Recognition") because the official numeric
// tables for that order were not available at implementation time.
//
// GRADING CALENDAR: DO 15, s. 2026 replaces the old 4-quarter calendar with a
// 3-term ("Trisemester" / Trisem) school year, applied to every grade level
// (elementary, JHS, and SHS alike) — not just Senior High. Every grading
// period in this app (classes, assignments, attendance, grade records) uses
// a single `semester` field constrained to 1 | 2 | 3, representing Term 1,
// Term 2, and Term 3 of the school year. There is no separate "quarter"
// concept anymore.
//
// When the actual DO 15, s. 2026 figures are provided, update ONLY this file:
// - COMPONENT_WEIGHTS_BY_SUBJECT_GROUP
// - TRANSMUTATION_TABLE (or flip GRADING_MODE to "zero_based" if DO 15 removes
//   transmutation entirely)
// - PASSING_GRADE
// - AWARDS_CONFIG
// No other file needs to change — every computation function below reads from
// this config object rather than hardcoding numbers.

export type GradingMode = "transmuted" | "zero_based";

/** PLACEHOLDER — confirm against DO 15, s. 2026 text. */
export const GRADING_MODE: GradingMode = "transmuted";

/** PLACEHOLDER — confirm against DO 15, s. 2026 text. */
export const PASSING_GRADE = 75;

/** The 3 Trisemester terms every class, assignment, and grade record is tagged with. */
export const TERMS = [1, 2, 3] as const;
export type Term = (typeof TERMS)[number];

export const TERM_LABELS: Record<Term, string> = {
  1: "Term 1",
  2: "Term 2",
  3: "Term 3",
};

export type SubjectGroup = "core" | "mapeh_tle" | "shs_core" | "shs_track";
export type AssignmentComponent = "written_oral" | "performance_task" | "examination";

export interface ComponentWeights {
  writtenOral: number;
  performanceTask: number;
  examination: number;
}

/**
 * PLACEHOLDER weights, carried over from the DepEd MATATAG-era presets
 * (Written Work / Performance Task / Quarterly Assessment) already used by
 * this app, renamed to the DO-15 component labels (written_oral /
 * performance_task / examination). Confirm exact percentages against the
 * official DO 15, s. 2026 text before treating these as compliant.
 */
export const COMPONENT_WEIGHTS_BY_SUBJECT_GROUP: Record<SubjectGroup, ComponentWeights> = {
  core: { writtenOral: 0.2, performanceTask: 0.5, examination: 0.3 },
  mapeh_tle: { writtenOral: 0.2, performanceTask: 0.6, examination: 0.2 },
  // SHS placeholders mirror "core" until DO 15, s. 2026 SHS-specific figures are confirmed.
  shs_core: { writtenOral: 0.25, performanceTask: 0.45, examination: 0.3 },
  shs_track: { writtenOral: 0.2, performanceTask: 0.6, examination: 0.2 },
};

export const SUBJECT_GROUP_LABELS: Record<SubjectGroup, string> = {
  core: "Core Subjects (Languages, Math, Science, AP, ESP)",
  mapeh_tle: "MAPEH / EPP / TLE",
  shs_core: "Senior High School — Core Subjects",
  shs_track: "Senior High School — Track / Specialized Subjects",
};

export const COMPONENT_LABELS: Record<AssignmentComponent, string> = {
  written_oral: "Written Work / Oral Recitation",
  performance_task: "Performance Task",
  examination: "Examination",
};

/**
 * PLACEHOLDER — official DepEd Order No. 8, s. 2015 transmutation table,
 * reused pending confirmation of DO 15, s. 2026's table (or its removal in
 * favor of zero-based grading — see GRADING_MODE).
 * Each entry is [minInitialGrade, maxInitialGrade, transmutedGrade].
 */
const TRANSMUTATION_TABLE: Array<[number, number, number]> = [
  [100, 100, 100],
  [98.4, 99.99, 99],
  [96.8, 98.39, 98],
  [95.2, 96.79, 97],
  [93.6, 95.19, 96],
  [92.0, 93.59, 95],
  [90.4, 91.99, 94],
  [88.8, 90.39, 93],
  [87.2, 88.79, 92],
  [85.6, 87.19, 91],
  [84.0, 85.59, 90],
  [82.4, 83.99, 89],
  [80.8, 82.39, 88],
  [79.2, 80.79, 87],
  [77.6, 79.19, 86],
  [76.0, 77.59, 85],
  [74.4, 75.99, 84],
  [72.8, 74.39, 83],
  [71.2, 72.79, 82],
  [69.6, 71.19, 81],
  [68.0, 69.59, 80],
  [66.4, 67.99, 79],
  [64.8, 66.39, 78],
  [63.2, 64.79, 77],
  [61.6, 63.19, 76],
  [60.0, 61.59, 75],
  [56.0, 59.99, 74],
  [52.0, 55.99, 73],
  [48.0, 51.99, 72],
  [44.0, 47.99, 71],
  [40.0, 43.99, 70],
  [36.0, 39.99, 69],
  [32.0, 35.99, 68],
  [28.0, 31.99, 67],
  [24.0, 27.99, 66],
  [20.0, 23.99, 65],
  [16.0, 19.99, 64],
  [12.0, 15.99, 63],
  [8.0, 11.99, 62],
  [4.0, 7.99, 61],
  [0, 3.99, 60],
];

function transmute(initialGrade: number): number {
  const clamped = Math.max(0, Math.min(100, initialGrade));
  for (const [min, max, transmuted] of TRANSMUTATION_TABLE) {
    if (clamped >= min && clamped <= max) return transmuted;
  }
  return 60;
}

/** Initial Grade -> Term Grade, per the active GRADING_MODE. */
export function computeTermGrade(initialGrade: number): number {
  if (GRADING_MODE === "zero_based") {
    return Math.round(Math.max(0, Math.min(100, initialGrade)));
  }
  return transmute(initialGrade);
}

export interface ComponentScoreInput {
  component: AssignmentComponent;
  scoreTotal: number;
  maxTotal: number;
}

export interface ComponentPercentages {
  writtenOralPct: number | null;
  performanceTaskPct: number | null;
  examinationPct: number | null;
}

/** Aggregates raw scores per component into percentages (0-100), null if no data for that component. */
export function computeComponentPercentages(entries: ComponentScoreInput[]): ComponentPercentages {
  const sums: Record<AssignmentComponent, { score: number; max: number }> = {
    written_oral: { score: 0, max: 0 },
    performance_task: { score: 0, max: 0 },
    examination: { score: 0, max: 0 },
  };

  for (const entry of entries) {
    sums[entry.component].score += entry.scoreTotal;
    sums[entry.component].max += entry.maxTotal;
  }

  const pct = (s: { score: number; max: number }) => (s.max > 0 ? (s.score / s.max) * 100 : null);

  return {
    writtenOralPct: pct(sums.written_oral),
    performanceTaskPct: pct(sums.performance_task),
    examinationPct: pct(sums.examination),
  };
}

/** Initial Grade = weighted average of available component percentages (missing components excluded + re-normalized). */
export function computeInitialGrade(pcts: ComponentPercentages, weights: ComponentWeights): number | null {
  const parts: Array<[number | null, number]> = [
    [pcts.writtenOralPct, weights.writtenOral],
    [pcts.performanceTaskPct, weights.performanceTask],
    [pcts.examinationPct, weights.examination],
  ];

  const available = parts.filter(([pct]) => pct !== null) as Array<[number, number]>;
  if (available.length === 0) return null;

  const weightSum = available.reduce((sum, [, w]) => sum + w, 0);
  if (weightSum === 0) return null;

  const weighted = available.reduce((sum, [pct, w]) => sum + pct * w, 0);
  return weighted / weightSum;
}

/**
 * Final Grade for the school year = average of the 3 Trisemester Term Grades
 * (Term 1, Term 2, Term 3). Terms with no data are excluded rather than
 * counted as zero.
 */
export function computeYearFinalGrade(termGrades: Array<number | null>): number | null {
  const available = termGrades.filter((g): g is number => g !== null);
  if (available.length === 0) return null;
  return Math.round(available.reduce((sum, g) => sum + g, 0) / available.length);
}

/** Backward-compatible alias for the year-level average across all terms. */
export const computeFinalGrade = computeYearFinalGrade;

export function remarksFor(finalGrade: number | null): "PASSED" | "FAILED" | "INCOMPLETE" {
  if (finalGrade === null) return "INCOMPLETE";
  return finalGrade >= PASSING_GRADE ? "PASSED" : "FAILED";
}

/**
 * PLACEHOLDER awards logic pending DO 15, s. 2026 confirmation.
 * Known, commonly-cited baseline carried over: no numeric academic awards for
 * Key Stage 1 (Grades 1-3); Academic Excellence-style recognition for Key
 * Stage 2-4 requires a General Average at/above the threshold with no
 * individual subject grade below the floor.
 */
export const AWARDS_CONFIG = {
  keyStage1NoNumericAwards: true,
  academicExcellenceMinAverage: 90,
  academicExcellenceMinPerSubject: 85,
};

export type KeyStage = "ks1" | "ks2" | "ks3" | "ks4";

export function keyStageForGradeLevel(gradeLevel: string | null | undefined): KeyStage | null {
  if (!gradeLevel) return null;
  const match = gradeLevel.match(/(\d+)/);
  if (!match) return null;
  const level = Number(match[1]);
  if (level >= 1 && level <= 3) return "ks1";
  if (level >= 4 && level <= 6) return "ks2";
  if (level >= 7 && level <= 10) return "ks3";
  if (level >= 11 && level <= 12) return "ks4";
  return null;
}

export interface AwardsEligibilityInput {
  keyStage: KeyStage | null;
  generalAverage: number | null;
  lowestSubjectGrade: number | null;
}

export function isEligibleForAcademicExcellence(input: AwardsEligibilityInput): boolean {
  if (input.keyStage === "ks1" && AWARDS_CONFIG.keyStage1NoNumericAwards) return false;
  if (input.generalAverage === null || input.lowestSubjectGrade === null) return false;
  return (
    input.generalAverage >= AWARDS_CONFIG.academicExcellenceMinAverage &&
    input.lowestSubjectGrade >= AWARDS_CONFIG.academicExcellenceMinPerSubject
  );
}
