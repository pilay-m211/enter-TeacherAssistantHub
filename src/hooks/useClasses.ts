import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { SubjectGroup } from "@/lib/depedGrading";

export type ClassRow = Tables<"folders">;

export function useClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("folders")
      .select("*")
      .order("created_at", { ascending: false });
    setClasses(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createClass = useCallback(
    async (name: string, subjectGroup: SubjectGroup = "core") => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("folders")
        .insert({ name, user_id: userId, subject_group: subjectGroup });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const deleteClass = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("folders").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const updateClass = useCallback(
    async (id: string, updates: { name?: string; subjectGroup?: SubjectGroup }) => {
      const { error } = await supabase
        .from("folders")
        .update({
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.subjectGroup !== undefined ? { subject_group: updates.subjectGroup } : {}),
        })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { classes, loading, createClass, deleteClass, updateClass, refresh };
}

export function useClass(classId: string | undefined) {
  const [classItem, setClassItem] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    supabase
      .from("folders")
      .select("*")
      .eq("id", classId)
      .maybeSingle()
      .then(({ data }) => {
        setClassItem(data);
        setLoading(false);
      });
  }, [classId]);

  return { classItem, loading };
}
