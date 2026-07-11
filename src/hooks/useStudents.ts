import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudentRecord = Tables<"students">;

// Backward-compatible flattened shape: existing UI expects `name`, `folder_id`,
// `status`, and `student_number` on a student row (from the pre-Phase-1 schema).
// We keep that shape here and derive it from the new last_name/first_name +
// is_archived + lrn fields + the class_students join, so every existing
// component that reads student.name / student.folder_id / student.status /
// student.student_number keeps working unchanged.
export interface StudentRow extends StudentRecord {
  name: string;
  folder_id: string | null;
  status: "active" | "inactive";
  student_number: string | null;
}

function toStudentRow(record: StudentRecord, classId: string | null): StudentRow {
  const name = [record.first_name, record.last_name].filter(Boolean).join(" ").trim() || record.last_name;
  return {
    ...record,
    name,
    folder_id: classId,
    status: record.is_archived ? "inactive" : "active",
    student_number: record.lrn,
  };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function useStudents(classId: string | undefined) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    const { data } = await supabase
      .from("class_students")
      .select("student_id, students(*)")
      .eq("class_id", classId);

    const rows = (data ?? [])
      .map((row) => {
        const student = row.students as unknown as StudentRecord | null;
        return student ? toStudentRow(student, classId) : null;
      })
      .filter((s): s is StudentRow => s !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    setStudents(rows);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addStudent = useCallback(
    async (name: string) => {
      if (!classId) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { firstName, lastName } = splitName(name);
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({ first_name: firstName, last_name: lastName, user_id: userId })
        .select()
        .single();
      if (studentError) throw studentError;

      const { error: rosterError } = await supabase
        .from("class_students")
        .insert({ class_id: classId, student_id: student.id, user_id: userId });
      if (rosterError) throw rosterError;
      await refresh();
    },
    [classId, refresh]
  );

  const addStudents = useCallback(
    async (names: string[]) => {
      if (!classId || names.length === 0) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const studentRows = names.map((name) => {
        const { firstName, lastName } = splitName(name);
        return { first_name: firstName, last_name: lastName, user_id: userId };
      });

      const { data: createdStudents, error: studentsError } = await supabase
        .from("students")
        .insert(studentRows)
        .select();
      if (studentsError) throw studentsError;

      const rosterRows = (createdStudents ?? []).map((s) => ({
        class_id: classId,
        student_id: s.id,
        user_id: userId,
      }));
      const { error: rosterError } = await supabase.from("class_students").insert(rosterRows);
      if (rosterError) throw rosterError;
      await refresh();
    },
    [classId, refresh]
  );

  // "Remove" here means unenroll from this class (roster removal), not delete
  // the learner record — the student may be enrolled in other classes too.
  const removeStudent = useCallback(
    async (studentId: string) => {
      if (!classId) return;
      const { error } = await supabase
        .from("class_students")
        .delete()
        .eq("class_id", classId)
        .eq("student_id", studentId);
      if (error) throw error;
      await refresh();
    },
    [classId, refresh]
  );

  const updateStudent = useCallback(
    async (studentId: string, name: string) => {
      const { firstName, lastName } = splitName(name);
      const { error } = await supabase
        .from("students")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", studentId);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { students, loading, addStudent, addStudents, removeStudent, updateStudent, refresh };
}
