import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const LOGO_URL = "https://cdn.enter.pro/resources/uid_100130341/0cb6792a-ed5e-44.png";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState(initialTab);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session) navigate("/app", { replace: true });
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    // Do not navigate here: wait for AuthContext's session to update via
    // onAuthStateChange, then the effect above redirects to /app. Navigating
    // immediately risks ProtectedRoute reading a stale (null) session and
    // bouncing back to /auth.
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    if (!data.session) {
      // Email confirmation is required before a session exists.
      setLoading(false);
      toast({
        title: "Check your email",
        description: "Confirm your email address to finish creating your account.",
      });
      return;
    }
    toast({ title: "Account created", description: "Welcome! Setting up your dashboard…" });
    // Session is already set; the effect above will redirect to /app as soon
    // as AuthContext picks up the new session via onAuthStateChange.
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background bg-grid-overlay px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[image:var(--gradient-radial-glow)]" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img
            src={LOGO_URL}
            alt="Veritas"
            crossOrigin="anonymous"
            className="h-10 w-10 rounded-lg shadow-[var(--shadow-glow)]"
          />
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-gradient">Veritas</span>
          </span>
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Welcome, teacher</CardTitle>
            <CardDescription>Sign in or create an account to manage your classes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@school.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Log In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@school.edu"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
