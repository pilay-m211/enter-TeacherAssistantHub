import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { SubjectGroup } from "@/lib/gradingConfig";

export type ClassRow = Tables<"classes">;

export interface CreateClassInput {
  name: string;
  subjectGroup?: SubjectGroup;
  subjectCode?: string;
  gradeLevel?: string;
  section?: string;
  semester?: 1 | 2 | 3;
  schoolYear?: string;
}

export function useClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: false });
    setClasses(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createClass = useCallback(
    async (nameOrInput: string | CreateClassInput, subjectGroup: SubjectGroup = "core") => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const input: CreateClassInput =
        typeof nameOrInput === "string" ? { name: nameOrInput, subjectGroup } : nameOrInput;

      const isShs = (input.subjectGroup ?? "core") === "shs_core" || input.subjectGroup === "shs_track";

      const { error } = await supabase.from("classes").insert({
        name: input.name,
        user_id: userId,
        subject_group: input.subjectGroup ?? "core",
        subject_code: input.subjectCode || null,
        grade_level: input.gradeLevel || null,
        section: input.section || null,
        // Trisem semester only meaningfully applies to SHS classes; basic ed defaults to 1.
        semester: isShs ? input.semester ?? 1 : 1,
        ...(input.schoolYear ? { school_year: input.schoolYear } : {}),
      });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const deleteClass = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const updateClass = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        subjectGroup?: SubjectGroup;
        gradeLevel?: string;
        section?: string;
        semester?: 1 | 2 | 3;
        isActive?: boolean;
      }
    ) => {
      const { error } = await supabase
        .from("classes")
        .update({
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.subjectGroup !== undefined ? { subject_group: updates.subjectGroup } : {}),
          ...(updates.gradeLevel !== undefined ? { grade_level: updates.gradeLevel } : {}),
          ...(updates.section !== undefined ? { section: updates.section } : {}),
          ...(updates.semester !== undefined ? { semester: updates.semester } : {}),
          ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {}),
        })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const archiveClass = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("classes").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { classes, loading, createClass, deleteClass, updateClass, archiveClass, refresh };
}

export function useClass(classId: string | undefined) {
  const [classItem, setClassItem] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    supabase
      .from("classes")
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
