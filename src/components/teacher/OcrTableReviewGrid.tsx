import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StudentRow } from "@/hooks/useStudents";
import type { OcrTableColumnMapping, OcrTableRowDraft } from "@/hooks/useOcrTableImport";

interface OcrTableReviewGridProps {
  columns: string[];
  columnMappings: OcrTableColumnMapping[];
  rows: OcrTableRowDraft[];
  students: StudentRow[];
  onUpdateRow: (index: number, updates: Partial<OcrTableRowDraft>) => void;
}

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const UNMATCHED_VALUE = "__unmatched__";
const NEW_STUDENT_VALUE = "__new__";

export function OcrTableReviewGrid({ columns, columnMappings, rows, students, onUpdateRow }: OcrTableReviewGridProps) {
  const includedColumnIndexes = columnMappings
    .map((m, i) => (m.include ? i : -1))
    .filter((i) => i !== -1);

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="w-10"></TableHead>
            <TableHead className="min-w-[200px]">Learner's Name</TableHead>
            {includedColumnIndexes.map((colIndex) => (
              <TableHead key={colIndex} className="text-right">
                {columnMappings[colIndex].header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => {
            const nameLowConfidence = row.nameConfidence < LOW_CONFIDENCE_THRESHOLD;
            const isUnmatched = !row.studentId && !row.isNewStudent;

            return (
              <TableRow
                key={rowIndex}
                className={`border-border/40 ${isUnmatched ? "bg-warning/5" : ""}`}
              >
                <TableCell>
                  <Checkbox
                    checked={row.include}
                    onCheckedChange={(checked) => onUpdateRow(rowIndex, { include: Boolean(checked) })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{row.ocrName}</span>
                      {nameLowConfidence && <Badge variant="ocr">low confidence</Badge>}
                    </div>
                    <Select
                      value={row.isNewStudent ? NEW_STUDENT_VALUE : row.studentId ?? UNMATCHED_VALUE}
                      onValueChange={(value) => {
                        if (value === NEW_STUDENT_VALUE) {
                          onUpdateRow(rowIndex, { studentId: null, isNewStudent: true });
                        } else if (value === UNMATCHED_VALUE) {
                          onUpdateRow(rowIndex, { studentId: null, isNewStudent: false, include: false });
                        } else {
                          onUpdateRow(rowIndex, { studentId: value, isNewStudent: false });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMATCHED_VALUE}>Unmatched — skip this row</SelectItem>
                        <SelectItem value={NEW_STUDENT_VALUE}>Add "{row.ocrName}" as new student</SelectItem>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                {includedColumnIndexes.map((colIndex) => {
                  const score = row.scores[colIndex];
                  const confidence = row.scoreConfidence[colIndex] ?? 1;
                  const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;
                  return (
                    <TableCell key={colIndex} className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lowConfidence && score !== null && <Badge variant="ocr">?</Badge>}
                        <Input
                          type="number"
                          min={0}
                          value={score ?? ""}
                          placeholder="—"
                          className={`h-8 w-20 text-right ${lowConfidence ? "border-warning/40" : ""}`}
                          onChange={(e) => {
                            const value = e.target.value;
                            const nextScores = [...row.scores];
                            nextScores[colIndex] = value === "" ? null : Number(value);
                            onUpdateRow(rowIndex, { scores: nextScores });
                          }}
                        />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
