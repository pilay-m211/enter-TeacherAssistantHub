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
    const { data, error } = await supabase
      .from("students")
      .select("*, folders(name)")
      .order("name", { ascending: true });

    if (error || !data) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setStudents(
      data.map((row) => {
        const { folders, ...student } = row as StudentRow & { folders: { name: string } | null };
        return { ...student, className: folders?.name ?? null };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { students, loading, refresh };
}
