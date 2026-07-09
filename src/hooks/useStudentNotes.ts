import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudentNoteRow = Tables<"student_notes">;

export function useStudentNotes(studentId: string | undefined, classId?: string) {
  const [notes, setNotes] = useState<StudentNoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("student_notes")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setNotes(data ?? []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNote = useCallback(
    async (params: { title?: string; content: string; visibility?: "private" | "shared" }) => {
      if (!studentId) return;
      if (!params.content.trim()) throw new Error("Note content cannot be empty");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("student_notes").insert({
        student_id: studentId,
        folder_id: classId ?? null,
        user_id: userId,
        title: params.title?.trim() || null,
        content: params.content.trim(),
        visibility: params.visibility ?? "private",
      });
      if (error) throw error;
      await refresh();
    },
    [studentId, classId, refresh]
  );

  const updateNote = useCallback(
    async (id: string, updates: { title?: string; content?: string; visibility?: "private" | "shared" }) => {
      if (updates.content !== undefined && !updates.content.trim()) {
        throw new Error("Note content cannot be empty");
      }
      const { error } = await supabase
        .from("student_notes")
        .update({
          ...(updates.title !== undefined ? { title: updates.title.trim() || null } : {}),
          ...(updates.content !== undefined ? { content: updates.content.trim() } : {}),
          ...(updates.visibility !== undefined ? { visibility: updates.visibility } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("student_notes").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { notes, loading, addNote, updateNote, deleteNote, refresh };
}
