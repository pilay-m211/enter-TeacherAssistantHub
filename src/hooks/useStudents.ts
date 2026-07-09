import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudentRow = Tables<"students">;

export function useStudents(classId: string | undefined) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("folder_id", classId)
      .order("name", { ascending: true });
    setStudents(data ?? []);
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

      const { error } = await supabase
        .from("students")
        .insert({ name, folder_id: classId, user_id: userId });
      if (error) throw error;
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

      const rows = names.map((name) => ({ name, folder_id: classId, user_id: userId }));
      const { error } = await supabase.from("students").insert(rows);
      if (error) throw error;
      await refresh();
    },
    [classId, refresh]
  );

  const removeStudent = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const updateStudent = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase.from("students").update({ name }).eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { students, loading, addStudent, addStudents, removeStudent, updateStudent, refresh };
}
