import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Sparkles, Scale, FileText, AlertTriangle, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth-helper";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
    }
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner Disclaimer */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
        ⚠️ <strong>MEYYURAI</strong> provides legal information and assistance for awareness purposes. It is not a substitute for a qualified lawyer, police officer, court, or emergency service.
      </div>

      {/* Hero Section */}
      <header className="px-6 pt-12 pb-16 text-center max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
          <Shield className="w-4 h-4" /> AI-POWERED LEGAL & SAFETY PLATFORM
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 font-display">
          Understand Your Legal Rights. <br className="hidden md:block" />
          <span className="text-primary">Act With Confidence.</span>
        </h1>

        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
          Meyyurai empowers citizens across India with simple legal awareness, AI-assisted advice, structured complaint drafting, evidence management, and instant emergency support contacts.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 transition-all"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 transition-all"
              >
                Sign In <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium flex items-center justify-center gap-2 transition-all"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Feature Cards Grid */}
      <section className="px-6 py-12 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 font-display">
            Comprehensive Legal & Safety Companion
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-start">
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Legal Assistant</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask questions in plain language (e.g. salary delay, domestic violence, cyber fraud) and receive structured legal explanations with cited acts & next steps.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-start">
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Complaint Generator</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate properly formatted, formal complaint drafts tailored for labor commissioners, police stations, consumer forums, or company HRs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-start">
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Emergency Contacts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Access verified emergency services in India (112, 1091, 1098, 1930, 108) with one-tap dialing and priority emergency contact alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border bg-card text-center text-xs text-muted-foreground">
        <p className="mb-2">© 2026 MEYYURAI. All rights reserved.</p>
        <p className="max-w-xl mx-auto">
          MEYYURAI provides legal information for educational and awareness purposes only. In case of legal dispute or emergency, please consult a licensed advocate or call 112 immediately.
        </p>
      </footer>
    </div>
  );
}
