import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LogOcrImportParams {
  folderId?: string | null;
  fileId?: string | null;
  mode: string;
  storagePath: string;
  rawResult: unknown;
  rowsExtracted: number;
  rowsCommitted: number;
  avgConfidence: number | null;
}

/**
 * Records what was uploaded and what the OCR model extracted, for traceability.
 * This is metadata only — it never stores grades; grades always live in grade_ledger.
 */
export function useOcrImportAudit() {
  const logImport = useCallback(async (params: LogOcrImportParams) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("ocr_import_audit").insert({
      user_id: userId,
      folder_id: params.folderId ?? null,
      file_id: params.fileId ?? null,
      mode: params.mode,
      storage_path: params.storagePath,
      raw_result: params.rawResult as never,
      rows_extracted: params.rowsExtracted,
      rows_committed: params.rowsCommitted,
      avg_confidence: params.avgConfidence,
    });

    if (error) {
      // Audit logging must never block the actual grade-saving flow.
      console.error("Failed to write OCR import audit log", error);
    }
  }, []);

  return { logImport };
}
