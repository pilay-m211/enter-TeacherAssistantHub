import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { AssignmentComponent } from "@/lib/gradingConfig";

export type AssignmentRow = Tables<"assignments">;

export interface CreateAssignmentInput {
  name: string;
  subject?: string;
  gradingType: "simple" | "rubric";
  maxScorePerQuestion: number;
  criteria?: string[]; // only used when gradingType === "rubric"
  component?: AssignmentComponent;
  quarter?: number;
  semester?: 1 | 2 | 3;
}

export function useAssignments(classId: string | undefined) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });
    setAssignments(data ?? []);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createAssignment = useCallback(
    async (input: CreateAssignmentInput): Promise<AssignmentRow | undefined> => {
      if (!classId) return undefined;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const isRubric = input.gradingType === "rubric";
      const questionCount = isRubric ? Math.max(2, input.criteria?.length ?? 2) : 1;
      const maxScore = input.maxScorePerQuestion * questionCount;

      const { data, error } = await supabase
        .from("assignments")
        .insert({
          title: input.name,
          class_id: classId,
          user_id: userId,
          assessment_type: isRubric ? "rubric" : "simple",
          question_count: questionCount,
          max_score_per_q: input.maxScorePerQuestion,
          max_score: maxScore,
          question_labels: isRubric ? input.criteria ?? [] : null,
          // Sensible defaults; teachers retag component/quarter from the assignment
          // settings dialog once created, or the caller can pass them explicitly
          // (used by the OCR table importer to tag detected columns).
          component: input.component ?? (isRubric ? "performance_task" : "written_oral"),
          quarter: input.quarter ?? 1,
          semester: input.semester ?? 1,
        })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data ?? undefined;
    },
    [classId, refresh]
  );

  const deleteAssignment = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const updateAssignment = useCallback(
    async (id: string, updates: { component?: AssignmentComponent; quarter?: number; semester?: 1 | 2 | 3 }) => {
      const { error } = await supabase
        .from("assignments")
        .update({
          ...(updates.component !== undefined ? { component: updates.component } : {}),
          ...(updates.quarter !== undefined ? { quarter: updates.quarter } : {}),
          ...(updates.semester !== undefined ? { semester: updates.semester } : {}),
        })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { assignments, loading, createAssignment, deleteAssignment, updateAssignment, refresh };
}

export function useAssignment(assignmentId: string | undefined) {
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assignmentId) return;
    setLoading(true);
    supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .maybeSingle()
      .then(({ data }) => {
        setAssignment(data);
        setLoading(false);
      });
  }, [assignmentId]);

  return { assignment, loading };
}
