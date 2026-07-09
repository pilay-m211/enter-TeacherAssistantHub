import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { COMPONENT_LABELS, type AssignmentComponent } from "@/lib/depedGrading";
import type { AssignmentRow } from "@/hooks/useAssignments";
import type { OcrTableColumnMapping } from "@/hooks/useOcrTableImport";

interface OcrColumnMappingCardProps {
  mapping: OcrTableColumnMapping;
  existingAssignments: AssignmentRow[];
  onChange: (updates: Partial<OcrTableColumnMapping>) => void;
}

const NEW_ASSIGNMENT_VALUE = "__new__";

export function OcrColumnMappingCard({ mapping, existingAssignments, onChange }: OcrColumnMappingCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-end sm:gap-4">
      <div className="flex items-center gap-2 sm:w-40 sm:shrink-0">
        <Checkbox
          checked={mapping.include}
          onCheckedChange={(checked) => onChange({ include: Boolean(checked) })}
        />
        <span className="truncate text-sm font-medium" title={mapping.header}>
          {mapping.header}
        </span>
      </div>

      <div className="flex-1 space-y-1.5">
        <Label className="text-xs text-muted-foreground">Maps to assignment</Label>
        <Select
          value={mapping.assignmentId ?? NEW_ASSIGNMENT_VALUE}
          onValueChange={(value) =>
            onChange({ assignmentId: value === NEW_ASSIGNMENT_VALUE ? null : value })
          }
          disabled={!mapping.include}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW_ASSIGNMENT_VALUE}>Create new: "{mapping.header}"</SelectItem>
            {existingAssignments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!mapping.assignmentId && (
        <>
          <div className="space-y-1.5 sm:w-32">
            <Label className="text-xs text-muted-foreground">Max score</Label>
            <Input
              type="number"
              min={1}
              className="h-9"
              value={mapping.newAssignmentMaxScore}
              disabled={!mapping.include}
              onChange={(e) => onChange({ newAssignmentMaxScore: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5 sm:w-44">
            <Label className="text-xs text-muted-foreground">Component</Label>
            <Select
              value={mapping.newAssignmentComponent}
              onValueChange={(value) => onChange({ newAssignmentComponent: value as AssignmentComponent })}
              disabled={!mapping.include}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COMPONENT_LABELS) as AssignmentComponent[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {COMPONENT_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {mapping.assignmentId && <Badge variant="outline">existing</Badge>}
    </div>
  );
}
