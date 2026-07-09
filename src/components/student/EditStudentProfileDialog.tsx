import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { StudentProfileRow, StudentProfileUpdateInput } from "@/hooks/useStudentProfile";

interface EditStudentProfileDialogProps {
  studentName: string;
  studentNumber: string | null;
  profile: StudentProfileRow | null;
  onSaveProfile: (updates: StudentProfileUpdateInput) => Promise<void>;
  onSaveStudentInfo: (updates: { name?: string; student_number?: string | null }) => Promise<void>;
}

export function EditStudentProfileDialog({
  studentName,
  studentNumber,
  profile,
  onSaveProfile,
  onSaveStudentInfo,
}: EditStudentProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(studentName);
  const [number, setNumber] = useState(studentNumber ?? "");
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level ?? "");
  const [parentName, setParentName] = useState(profile?.parent_guardian_name ?? "");
  const [parentContact, setParentContact] = useState(profile?.parent_contact ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(studentName);
      setNumber(studentNumber ?? "");
      setGradeLevel(profile?.grade_level ?? "");
      setParentName(profile?.parent_guardian_name ?? "");
      setParentContact(profile?.parent_contact ?? "");
      setAddress(profile?.address ?? "");
    }
    setOpen(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveStudentInfo({ name: name.trim(), student_number: number.trim() || null });
      await onSaveProfile({
        grade_level: gradeLevel.trim() || null,
        parent_guardian_name: parentName.trim() || null,
        parent_contact: parentContact.trim() || null,
        address: address.trim() || null,
      });
      toast({ title: "Profile updated" });
      setOpen(false);
    } catch (err) {
      toast({
        title: "Could not update profile",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="glass" size="sm">
          Edit Info
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit student information</DialogTitle>
          <DialogDescription>Basic info and optional parent/guardian contact details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student-name">Full name</Label>
              <Input id="student-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-number">Student number</Label>
              <Input
                id="student-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 2026-00123"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade-level">Grade level</Label>
            <Input
              id="grade-level"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="e.g. Grade 7"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parent-name">Parent / guardian name</Label>
              <Input id="parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-contact">Parent / guardian contact</Label>
              <Input id="parent-contact" value={parentContact} onChange={(e) => setParentContact(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-[60px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="hero" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
