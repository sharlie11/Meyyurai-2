import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Meyyurai" },
      {
        name: "description",
        content: "Reset your Meyyurai legal assistance and safety account password securely.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid registered email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset_password`,
      });

      if (error) {
        toast.error(error.message || "Failed to send recovery link.");
        return;
      }

      setSubmitted(true);
      toast.success("Password recovery instructions dispatched to your email.");
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
        {/* Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/10">
            <ShieldCheck className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold font-display text-white">Reset Account Password</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Enter your registered email address to receive secure recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 text-center space-y-4 shadow-2xl animate-in fade-in-50">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-white">Recovery Link Sent</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We have dispatched password recovery instructions to <strong className="text-white">{email}</strong>. Please check your inbox and spam folder.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full h-11 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 inline-flex items-center justify-center gap-2 text-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 space-y-5 shadow-2xl"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                Registered Email Address
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="citizen@meyyurai.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 rounded-xl bg-slate-800/60 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500 text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-700/25 transition-all text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Dispatching Link...
                </>
              ) : (
                "Send Password Recovery Link"
              )}
            </Button>

            <div className="text-center text-xs text-slate-400 pt-3 border-t border-slate-800">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-teal-400 hover:text-teal-300 hover:underline font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
