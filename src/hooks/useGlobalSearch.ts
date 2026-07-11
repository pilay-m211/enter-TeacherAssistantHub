import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const RESULT_CAP = 8;
const MIN_QUERY_LENGTH = 2;

export interface StudentSearchResult {
  id: string;
  name: string;
  studentNumber: string | null;
  classId: string | null;
  className: string;
  status: string;
}

export interface ClassSearchResult {
  id: string;
  name: string;
  subjectGroup: string;
}

export interface AssignmentSearchResult {
  id: string;
  name: string;
  classId: string;
  className: string;
  quarter: number;
}

export interface NoteSearchResult {
  id: string;
  studentId: string;
  studentName: string;
  classId: string | null;
  title: string | null;
  snippet: string;
}

export interface GlobalSearchResults {
  students: StudentSearchResult[];
  classes: ClassSearchResult[];
  assignments: AssignmentSearchResult[];
  notes: NoteSearchResult[];
  loading: boolean;
}

const EMPTY_RESULTS: Omit<GlobalSearchResults, "loading"> = {
  students: [],
  classes: [],
  assignments: [],
  notes: [],
};

export function useGlobalSearch(query: string, options?: { includeArchived?: boolean }): GlobalSearchResults {
  const includeArchived = options?.includeArchived ?? false;
  const [results, setResults] = useState<Omit<GlobalSearchResults, "loading">>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const pattern = `%${trimmed}%`;

    (async () => {
      const [studentsRes, classesRes, assignmentsRes, notesRes] = await Promise.all([
        (() => {
          let q = supabase
            .from("students")
            .select("id, first_name, last_name, lrn, is_archived, class_students(class_id, classes(name))")
            .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},lrn.ilike.${pattern}`)
            .limit(RESULT_CAP);
          if (!includeArchived) q = q.eq("is_archived", false);
          return q;
        })(),
        supabase.from("classes").select("id, name, subject_group").ilike("name", pattern).limit(RESULT_CAP),
        supabase
          .from("assignments")
          .select("id, title, quarter, class_id, classes(name)")
          .ilike("title", pattern)
          .limit(RESULT_CAP),
        supabase
          .from("notes")
          .select("id, title, note_text, student_id, class_id, students(first_name, last_name)")
          .or(`title.ilike.${pattern},note_text.ilike.${pattern}`)
          .limit(RESULT_CAP),
      ]);

      if (!active) return;

      const students: StudentSearchResult[] = (studentsRes.data ?? []).map((row) => {
        const enrollment = (row.class_students as unknown as Array<{ class_id: string; classes: { name: string } | null }>)?.[0];
        return {
          id: row.id,
          name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
          studentNumber: row.lrn,
          classId: enrollment?.class_id ?? null,
          className: enrollment?.classes?.name ?? "Not enrolled",
          status: row.is_archived ? "inactive" : "active",
        };
      });

      const classes: ClassSearchResult[] = (classesRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        subjectGroup: row.subject_group,
      }));

      const assignments: AssignmentSearchResult[] = (assignmentsRes.data ?? []).map((row) => {
        const cls = row.classes as unknown as { name: string } | null;
        return {
          id: row.id,
          name: row.title,
          classId: row.class_id as string,
          className: cls?.name ?? "Unknown class",
          quarter: row.quarter,
        };
      });

      const notes: NoteSearchResult[] = (notesRes.data ?? []).map((row) => {
        const student = row.students as unknown as { first_name: string; last_name: string } | null;
        return {
          id: row.id,
          studentId: row.student_id,
          studentName: student ? [student.first_name, student.last_name].filter(Boolean).join(" ").trim() : "Unknown student",
          classId: row.class_id,
          title: row.title,
          snippet: row.note_text.length > 100 ? `${row.note_text.slice(0, 100)}…` : row.note_text,
        };
      });

      setResults({ students, classes, assignments, notes });
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [query, includeArchived]);

  return { ...results, loading };
}
