import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StudentRow } from "@/hooks/useStudents";

export interface StudentWithClass extends StudentRow {
  className: string | null;
}

export function useAllStudents() {
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    const [studentsRes, rosterRes] = await Promise.all([
      supabase.from("students").select("*").order("last_name", { ascending: true }),
      supabase.from("class_students").select("student_id, class_id, classes(name)"),
    ]);

    if (studentsRes.error || !studentsRes.data) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // A student can now belong to multiple classes; show the first enrollment found.
    const classByStudent = new Map<string, { classId: string; className: string | null }>();
    for (const row of rosterRes.data ?? []) {
      if (!classByStudent.has(row.student_id)) {
        const cls = row.classes as unknown as { name: string } | null;
        classByStudent.set(row.student_id, { classId: row.class_id, className: cls?.name ?? null });
      }
    }

    setStudents(
      studentsRes.data.map((student) => {
        const enrollment = classByStudent.get(student.id);
        const name = [student.first_name, student.last_name].filter(Boolean).join(" ").trim() || student.last_name;
        return {
          ...student,
          name,
          folder_id: enrollment?.classId ?? null,
          status: student.is_archived ? "inactive" : "active",
          student_number: student.lrn,
          className: enrollment?.className ?? null,
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { students, loading, refresh };
}
