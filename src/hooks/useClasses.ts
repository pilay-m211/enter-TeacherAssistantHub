import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
    async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("folders").insert({ name, user_id: userId });
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

  return { classes, loading, createClass, deleteClass, refresh };
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
