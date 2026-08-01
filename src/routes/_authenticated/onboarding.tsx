import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up profile — Meyyurai" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t, setLang, lang } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    emergency_contact: "",
    guardian_contact: "",
    preferred_language: lang as Lang,
    country: "India",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile) {
          setForm((f) => ({
            ...f,
            full_name: profile.full_name || data.user.user_metadata?.full_name || "",
            phone_number: profile.phone_number || "",
            emergency_contact: profile.emergency_contact || "",
            guardian_contact: profile.guardian_contact || "",
            preferred_language: (profile.preferred_language as Lang) || lang,
            country: profile.country || "India",
          }));
        }
      }
    })();
  }, [lang]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Not signed in");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: u.user.id,
      ...form,
      onboarded: true,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLang(form.preferred_language);
    toast.success("Profile saved");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-dvh px-5 py-8 animate-fade-up">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl text-foreground">{t("onboarding.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label={t("onboarding.fullName")}
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
            required
          />
          <Field
            label={t("onboarding.phone")}
            type="tel"
            value={form.phone_number}
            onChange={(v) => setForm({ ...form, phone_number: v })}
            required
          />
          <Field
            label={t("onboarding.emergency")}
            type="tel"
            value={form.emergency_contact}
            onChange={(v) => setForm({ ...form, emergency_contact: v })}
          />
          <Field
            label={t("onboarding.guardian")}
            type="tel"
            value={form.guardian_contact}
            onChange={(v) => setForm({ ...form, guardian_contact: v })}
          />

          <div>
            <Label>{t("onboarding.language")}</Label>
            <Select
              value={form.preferred_language}
              onValueChange={(v) => setForm({ ...form, preferred_language: v as Lang })}
            >
              <SelectTrigger className="mt-1 h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.native} · {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field
            label={t("onboarding.country")}
            value={form.country}
            onChange={(v) => setForm({ ...form, country: v })}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("onboarding.save")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1 h-11 rounded-xl"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
