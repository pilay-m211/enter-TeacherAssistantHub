import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const RESULT_CAP = 8;
const MIN_QUERY_LENGTH = 2;

export interface StudentSearchResult {
  id: string;
  name: string;
  studentNumber: string | null;
  classId: string;
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
            .select("id, name, student_number, status, folder_id, folders(name)")
            .or(`name.ilike.${pattern},student_number.ilike.${pattern}`)
            .limit(RESULT_CAP);
          if (!includeArchived) q = q.eq("status", "active");
          return q;
        })(),
        supabase.from("folders").select("id, name, subject_group").ilike("name", pattern).limit(RESULT_CAP),
        supabase
          .from("files")
          .select("id, name, quarter, folder_id, folders(name)")
          .ilike("name", pattern)
          .limit(RESULT_CAP),
        supabase
          .from("student_notes")
          .select("id, title, content, student_id, folder_id, students(name)")
          .or(`title.ilike.${pattern},content.ilike.${pattern}`)
          .limit(RESULT_CAP),
      ]);

      if (!active) return;

      const students: StudentSearchResult[] = (studentsRes.data ?? []).map((row) => {
        const folder = row.folders as unknown as { name: string } | null;
        return {
          id: row.id,
          name: row.name,
          studentNumber: row.student_number,
          classId: row.folder_id,
          className: folder?.name ?? "Unknown class",
          status: row.status,
        };
      });

      const classes: ClassSearchResult[] = (classesRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        subjectGroup: row.subject_group,
      }));

      const assignments: AssignmentSearchResult[] = (assignmentsRes.data ?? []).map((row) => {
        const folder = row.folders as unknown as { name: string } | null;
        return {
          id: row.id,
          name: row.name,
          classId: row.folder_id as string,
          className: folder?.name ?? "Unknown class",
          quarter: row.quarter,
        };
      });

      const notes: NoteSearchResult[] = (notesRes.data ?? []).map((row) => {
        const student = row.students as unknown as { name: string } | null;
        return {
          id: row.id,
          studentId: row.student_id,
          studentName: student?.name ?? "Unknown student",
          classId: row.folder_id,
          title: row.title,
          snippet: row.content.length > 100 ? `${row.content.slice(0, 100)}…` : row.content,
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
