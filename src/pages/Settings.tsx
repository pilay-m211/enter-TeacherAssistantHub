import { useEffect, useState } from "react";
import { Loader2, Save, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

const TITLE_OPTIONS = ["Teacher", "Professor", "Instructor"];

const Settings = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("Teacher");
  const [schoolName, setSchoolName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setTitle(profile.title ?? "Teacher");
      setSchoolName(profile.school_name ?? "");
      setDepartment(profile.department ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        title,
        school_name: schoolName || null,
        department: department || null,
      });
      toast({ title: "Profile updated" });
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and account.</p>
      </div>

      <Card variant="glass" className="mt-8">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This information is shown across your Veritas account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TITLE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Mathematics"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-name">School name</Label>
            <Input
              id="school-name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Lincoln Middle School"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="hero" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass" className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign out of Veritas on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
