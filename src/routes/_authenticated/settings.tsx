import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, Globe, Bell, Shield, LogOut, Moon, Sun, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsScreen,
});

export function SettingsScreen() {
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully.");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error("Logout failed.");
    }
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "ta", label: "தமிழ் (Tamil)" },
    { code: "hi", label: "हिंदी (Hindi)" },
    { code: "te", label: "తెలుగు (Telugu)" },
    { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
    { code: "ml", label: "മലയാളം (Malayalam)" },
  ];

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Application Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage language preferences, security options, and account sessions.
        </p>
      </div>

      {/* Language Preferences */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold font-display flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> Preferred Language
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code as any);
                toast.success(`Language updated to ${l.label}`);
              }}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                lang === l.code
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <span>{l.label}</span>
              {lang === l.code && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications & Preferences */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold font-display flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notifications & Alerts
        </h2>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <h3 className="text-xs font-bold">Emergency & Safety Alerts</h3>
            <p className="text-[11px] text-muted-foreground">Receive critical SOS alerts and status updates.</p>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-11 h-6 rounded-full p-1 transition-colors ${
              notifications ? "bg-primary" : "bg-muted"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                notifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Session Logout */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold font-display flex items-center gap-2 text-rose-500">
          <Shield className="w-4 h-4" /> Account Session
        </h2>
        <p className="text-xs text-muted-foreground">
          Sign out of your Meyyurai session across this device.
        </p>
        <Button onClick={handleLogout} variant="destructive" className="w-full sm:w-auto rounded-xl px-6">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out of Account
        </Button>
      </div>
    </div>
  );
}
