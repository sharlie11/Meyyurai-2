import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Meyyurai" },
      {
        name: "description",
        content: "Sign in to Meyyurai to access safety, rights and guidance tools.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<null | "google" | "apple">(null);

  const goNext = () => navigate({ to: search.redirect || "/" });

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goNext();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onOAuth = async (p: "google" | "apple") => {
    setProvider(p);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: p,
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign in. Please try again.");
      setProvider(null);
    }
  };

  const onForgot = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 animate-fade-up">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="font-display text-3xl text-foreground">{t("auth.welcome")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-full"
              onClick={() => onOAuth("google")}
              disabled={!!provider}
            >
              {provider === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("auth.continueGoogle")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-full"
              onClick={() => onOAuth("apple")}
              disabled={!!provider}
            >
              {provider === "apple" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("auth.continueApple")
              )}
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("auth.or")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onEmailSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">{t("onboarding.fullName")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 h-11 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 h-11 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-primary text-primary-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signup" ? (
                t("auth.signUp")
              ) : (
                t("auth.signIn")
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary"
            >
              {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
            </button>
            {mode === "signin" && (
              <button
                type="button"
                onClick={onForgot}
                className="text-muted-foreground hover:text-foreground"
              >
                {t("auth.forgot")}
              </button>
            )}
          </div>

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            By continuing you agree to our terms and privacy policy.
          </p>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            <Link to="/" className="underline">
              Skip for now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
