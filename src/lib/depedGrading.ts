// DepEd K-12 grading computation utilities.
//
// Grading mode toggle: flip GRADING_MODE to "zero_based" when DepEd's zero-based
// grading policy takes full effect (expected SY 2027-2028). All call sites go
// through computeQuarterlyGrade(), so this is a one-line change, not a rewrite.
export type GradingMode = "transmuted" | "zero_based";
export const GRADING_MODE: GradingMode = "transmuted";

export type SubjectGroup = "core" | "tle_mapeh";
export type AssignmentComponent = "written_work" | "performance_task" | "quarterly_assessment";

export interface ComponentWeights {
  writtenWork: number;
  performanceTask: number;
  quarterlyAssessment: number;
}

// DepEd MATATAG-aligned weight presets by subject group.
export const SUBJECT_GROUP_WEIGHTS: Record<SubjectGroup, ComponentWeights> = {
  core: { writtenWork: 0.2, performanceTask: 0.5, quarterlyAssessment: 0.3 },
  tle_mapeh: { writtenWork: 0.2, performanceTask: 0.6, quarterlyAssessment: 0.2 },
};

export const SUBJECT_GROUP_LABELS: Record<SubjectGroup, string> = {
  core: "Core Subjects (Languages, Math, Science, AP, ESP)",
  tle_mapeh: "MAPEH / EPP / TLE",
};

export const COMPONENT_LABELS: Record<AssignmentComponent, string> = {
  written_work: "Written Work",
  performance_task: "Performance Task",
  quarterly_assessment: "Quarterly Assessment",
};

/**
 * Official DepEd Order No. 8, s.2015 transmutation table.
 * Each entry is [minInitialGrade, maxInitialGrade, transmutedGrade].
 * Ranges are inclusive of min, inclusive of max (checked in order, most specific first).
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

/** Initial Grade -> Quarterly Grade, per the active GRADING_MODE. */
export function computeQuarterlyGrade(initialGrade: number): number {
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
  writtenWorkPct: number | null;
  performanceTaskPct: number | null;
  quarterlyAssessmentPct: number | null;
}

/** Aggregates raw scores per component into percentages (0-100), null if no data for that component. */
export function computeComponentPercentages(entries: ComponentScoreInput[]): ComponentPercentages {
  const sums: Record<AssignmentComponent, { score: number; max: number }> = {
    written_work: { score: 0, max: 0 },
    performance_task: { score: 0, max: 0 },
    quarterly_assessment: { score: 0, max: 0 },
  };

  for (const entry of entries) {
    sums[entry.component].score += entry.scoreTotal;
    sums[entry.component].max += entry.maxTotal;
  }

  const pct = (s: { score: number; max: number }) => (s.max > 0 ? (s.score / s.max) * 100 : null);

  return {
    writtenWorkPct: pct(sums.written_work),
    performanceTaskPct: pct(sums.performance_task),
    quarterlyAssessmentPct: pct(sums.quarterly_assessment),
  };
}

/** Initial Grade = weighted sum of available component percentages (missing components excluded). */
export function computeInitialGrade(pcts: ComponentPercentages, weights: ComponentWeights): number | null {
  const parts: Array<[number | null, number]> = [
    [pcts.writtenWorkPct, weights.writtenWork],
    [pcts.performanceTaskPct, weights.performanceTask],
    [pcts.quarterlyAssessmentPct, weights.quarterlyAssessment],
  ];

  const available = parts.filter(([pct]) => pct !== null) as Array<[number, number]>;
  if (available.length === 0) return null;

  // Re-normalize weights across only the components that have data, so a quarter
  // missing e.g. QA doesn't unfairly zero out the Initial Grade.
  const weightSum = available.reduce((sum, [, w]) => sum + w, 0);
  if (weightSum === 0) return null;

  const weighted = available.reduce((sum, [pct, w]) => sum + pct * w, 0);
  return weighted / weightSum;
}

export function computeFinalGrade(quarterlyGrades: Array<number | null>): number | null {
  const available = quarterlyGrades.filter((g): g is number => g !== null);
  if (available.length === 0) return null;
  return Math.round(available.reduce((sum, g) => sum + g, 0) / available.length);
}

export function remarksFor(finalGrade: number | null): "PASSED" | "FAILED" | "INCOMPLETE" {
  if (finalGrade === null) return "INCOMPLETE";
  return finalGrade >= 75 ? "PASSED" : "FAILED";
}
