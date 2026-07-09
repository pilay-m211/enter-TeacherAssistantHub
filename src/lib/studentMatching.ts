import type { StudentRow } from "@/hooks/useStudents";

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Classic Levenshtein edit distance. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export interface StudentMatch {
  student: StudentRow | null;
  /** 1 = exact match, 0.75+ = likely match, below = no confident match */
  score: number;
}

/**
 * Matches an OCR-extracted name against the class roster.
 * Tries exact match first, then falls back to fuzzy similarity so minor OCR
 * misreads (e.g. "Dela Cruz" vs "De la Cruz") still resolve to the right student.
 */
export function matchStudentByName(name: string, students: StudentRow[]): StudentMatch {
  const normalized = normalize(name);
  if (!normalized) return { student: null, score: 0 };

  const exact = students.find((s) => normalize(s.name) === normalized);
  if (exact) return { student: exact, score: 1 };

  let best: StudentRow | null = null;
  let bestScore = 0;
  for (const student of students) {
    const score = similarity(normalized, normalize(student.name));
    if (score > bestScore) {
      bestScore = score;
      best = student;
    }
  }

  // Require a fairly high similarity before treating it as a confident match;
  // anything lower is surfaced to the teacher as "unmatched" rather than guessed.
  if (best && bestScore >= 0.75) {
    return { student: best, score: bestScore };
  }
  return { student: null, score: bestScore };
}
