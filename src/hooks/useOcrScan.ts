import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const OCR_BUCKET = "ocr-uploads";

export type OcrMode = "roster" | "answer_sheet" | "grade_sheet" | "class_record_table";

export interface RosterOcrResult {
  students: string[];
}

export interface AnswerSheetOcrResult {
  student_name: string | null;
  scores: (number | null)[];
  confidence: number[];
}

export interface GradeSheetOcrResult {
  entries: { name: string; score: number }[];
}

export interface ClassRecordTableRow {
  name: string;
  name_confidence: number;
  scores: (number | null)[];
  score_confidence: number[];
}

export interface ClassRecordTableOcrResult {
  columns: string[];
  rows: ClassRecordTableRow[];
}

type OcrResultFor<M extends OcrMode> = M extends "roster"
  ? RosterOcrResult
  : M extends "answer_sheet"
    ? AnswerSheetOcrResult
    : M extends "grade_sheet"
      ? GradeSheetOcrResult
      : ClassRecordTableOcrResult;

async function uploadOcrImage(file: File, userId: string): Promise<{ imageUrl: string; storagePath: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(OCR_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(OCR_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Failed to get uploaded image URL");
  return { imageUrl: data.publicUrl, storagePath: `${OCR_BUCKET}/${path}` };
}

export interface OcrScanOutcome<M extends OcrMode> {
  result: OcrResultFor<M>;
  storagePath: string;
}

export function useOcrScan<M extends OcrMode>(mode: M) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(
    async (
      file: File,
      extra?: { question_count?: number; max_score_per_q?: number; hint_quarter?: number }
    ): Promise<OcrScanOutcome<M> | null> => {
      setIsScanning(true);
      setError(null);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Not authenticated");

        const { imageUrl, storagePath } = await uploadOcrImage(file, userId);

        const { data, error: fnError } = await supabase.functions.invoke("ocr-extract", {
          body: { mode, image_url: imageUrl, ...extra },
        });

        if (fnError) {
          throw new Error(fnError.message || "OCR request failed");
        }
        if (data?.error) {
          throw new Error(data.error.message || "OCR failed");
        }

        return { result: data.result as OcrResultFor<M>, storagePath };
      } catch (err) {
        const message = err instanceof Error ? err.message : "OCR failed";
        setError(message);
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [mode]
  );

  return { scan, isScanning, error };
}
