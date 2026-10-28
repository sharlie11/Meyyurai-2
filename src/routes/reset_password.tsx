import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { evaluatePasswordStrength } from "@/lib/auth-helper";

export const Route = createFileRoute("/reset_password")({
  head: () => ({ meta: [{ title: "Set New Password — Meyyurai" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = evaluatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Failed to update password.");
      } else {
        toast.success("Password updated successfully!");
        navigate({ to: "/login" });
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/10">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold font-display text-white">Choose New Password</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Ensure your account remains safeguarded with a robust, high-entropy password.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 space-y-5 shadow-2xl"
        >
          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="np" className="text-xs font-medium text-slate-300">
              New Password
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="np"
                type={showPassword ? "text" : "password"}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 rounded-xl bg-slate-800/60 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Strength:</span>
                  <span
                    className={`font-semibold ${
                      strength.score >= 3
                        ? "text-emerald-400"
                        : strength.score === 2
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  <div className={`rounded-full transition-colors ${strength.score >= 1 ? strength.color : "bg-slate-800"}`} />
                  <div className={`rounded-full transition-colors ${strength.score >= 2 ? strength.color : "bg-slate-800"}`} />
                  <div className={`rounded-full transition-colors ${strength.score >= 3 ? strength.color : "bg-slate-800"}`} />
                  <div className={`rounded-full transition-colors ${strength.score >= 4 ? strength.color : "bg-slate-800"}`} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cnp" className="text-xs font-medium text-slate-300">
                Confirm New Password
              </Label>
              {confirmPassword.length > 0 && (
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${passwordsMatch ? "text-emerald-400" : "text-red-400"}`}>
                  {passwordsMatch ? <><CheckCircle2 className="h-3 w-3" /> Matches</> : "Mismatch"}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="cnp"
                type={showConfirmPassword ? "text" : "password"}
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 rounded-xl bg-slate-800/60 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !passwordsMatch}
            className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-700/25 transition-all text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating Password...
              </>
            ) : (
              "Save New Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
