import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { StudentRow } from "@/hooks/useStudents";

export type StudentProfileRow = Tables<"student_profiles">;
export type { StudentRow };

export interface StudentProfileUpdateInput {
  photo_url?: string | null;
  grade_level?: string | null;
  parent_guardian_name?: string | null;
  parent_contact?: string | null;
  address?: string | null;
  notes_summary?: string | null;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function useStudentProfile(studentId: string | undefined) {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [profile, setProfile] = useState<StudentProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);

    const [studentRes, profileRes, rosterRes] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
      supabase.from("student_profiles").select("*").eq("student_id", studentId).maybeSingle(),
      supabase.from("class_students").select("class_id").eq("student_id", studentId).limit(1).maybeSingle(),
    ]);

    if (studentRes.data) {
      const record = studentRes.data;
      const name = [record.first_name, record.last_name].filter(Boolean).join(" ").trim() || record.last_name;
      setStudent({
        ...record,
        name,
        folder_id: rosterRes.data?.class_id ?? null,
        status: record.is_archived ? "inactive" : "active",
        student_number: record.lrn,
      });
    } else {
      setStudent(null);
    }
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
      const dbUpdates: Record<string, string | null> = {};
      if (updates.name !== undefined) {
        const { firstName, lastName } = splitName(updates.name);
        dbUpdates.first_name = firstName;
        dbUpdates.last_name = lastName;
      }
      if (updates.student_number !== undefined) {
        dbUpdates.lrn = updates.student_number;
      }
      const { error } = await supabase.from("students").update(dbUpdates).eq("id", studentId);
      if (error) throw error;
      await refresh();
    },
    [studentId, refresh]
  );

  const archiveStudent = useCallback(async () => {
    if (!studentId) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { error: studentError } = await supabase
      .from("students")
      .update({ is_archived: true })
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
  }, [studentId, refresh]);

  const restoreStudent = useCallback(async () => {
    if (!studentId) return;
    const { error: studentError } = await supabase
      .from("students")
      .update({ is_archived: false })
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
