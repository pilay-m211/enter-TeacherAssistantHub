import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudentProfileRow = Tables<"student_profiles">;
export type StudentRow = Tables<"students">;

export interface StudentProfileUpdateInput {
  photo_url?: string | null;
  grade_level?: string | null;
  parent_guardian_name?: string | null;
  parent_contact?: string | null;
  address?: string | null;
  notes_summary?: string | null;
}

export function useStudentProfile(studentId: string | undefined) {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [profile, setProfile] = useState<StudentProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);

    const [studentRes, profileRes] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
      supabase.from("student_profiles").select("*").eq("student_id", studentId).maybeSingle(),
    ]);

    setStudent(studentRes.data ?? null);
    setProfile(profileRes.data ?? null);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(
    async (updates: StudentProfileUpdateInput) => {
      if (!studentId) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("student_profiles").upsert(
        {
          student_id: studentId,
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );
      if (error) throw error;
      await refresh();
    },
    [studentId, refresh]
  );

  const updateStudentInfo = useCallback(
    async (updates: { name?: string; student_number?: string | null }) => {
      if (!studentId) return;
      const { error } = await supabase.from("students").update(updates).eq("id", studentId);
      if (error) throw error;
      await refresh();
    },
    [studentId, refresh]
  );

  const archiveStudent = useCallback(
    async (status: "inactive" | "transferred" = "inactive") => {
      if (!studentId) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error: studentError } = await supabase
        .from("students")
        .update({ status })
        .eq("id", studentId);
      if (studentError) throw studentError;

      const { error: profileError } = await supabase.from("student_profiles").upsert(
        {
          student_id: studentId,
          user_id: userId,
          archived_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );
      if (profileError) throw profileError;
      await refresh();
    },
    [studentId, refresh]
  );

  const restoreStudent = useCallback(async () => {
    if (!studentId) return;
    const { error: studentError } = await supabase
      .from("students")
      .update({ status: "active" })
      .eq("id", studentId);
    if (studentError) throw studentError;

    const { error: profileError } = await supabase
      .from("student_profiles")
      .update({ archived_at: null })
      .eq("student_id", studentId);
    if (profileError) throw profileError;
    await refresh();
  }, [studentId, refresh]);

  return {
    student,
    profile,
    loading,
    updateProfile,
    updateStudentInfo,
    archiveStudent,
    restoreStudent,
    refresh,
  };
}
