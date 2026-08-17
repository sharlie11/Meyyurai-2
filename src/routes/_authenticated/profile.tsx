import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  UserRound,
  Users,
  FolderOpen,
  Bell,
  ShieldCheck,
  Moon,
  ChevronRight,
  Languages,
  MapPin,
  LogOut,
  Trash2,
  KeyRound,
  Mic,
  Camera,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { setActiveUser } from "@/lib/auth-helper";
import {
  requestCamera,
  requestLocation,
  requestMicrophone,
  requestNotifications,
} from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Meyyurai" }] }),
  component: ProfileScreen,
});

type Contact = { id: string; name: string; phone: string; relationship: string | null };

function ProfileScreen() {
  const { t, setLang, lang } = useI18n();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [profile, setProfile] = useState<{
    full_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
  } | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const currentUser = u?.user ? { id: u.user.id, email: u.user.email, user_metadata: u.user.user_metadata } : null;

      if (currentUser) {
        let fullName = currentUser.user_metadata?.full_name;
        if (!fullName && currentUser.email) {
          fullName = currentUser.email.split("@")[0];
        }

        setProfile({
          full_name: fullName || "Meyyurai User",
          email: currentUser.email || "",
          phone_number: currentUser.email || "Active Member",
        });

        if (u?.user) {
          const { data: cs } = await supabase
            .from("emergency_contacts")
            .select("id, name, phone, relationship")
            .eq("user_id", u.user.id)
            .order("created_at");
          if (cs) setContacts(cs as Contact[]);
        } else {
          const stored = localStorage.getItem("meyyurai_local_contacts");
          if (stored) {
            try { setContacts(JSON.parse(stored)); } catch (e) {}
          }
        }
      } else {
        const stored = localStorage.getItem("meyyurai_local_contacts");
        if (stored) {
          try { setContacts(JSON.parse(stored)); } catch (e) {}
        }
      }
    })();
  }, []);

  const onLangChange = async (v: Lang) => {
    setLang(v);
    const { data: u } = await supabase.auth.getUser();
    if (u.user)
      await supabase.from("profiles").update({ preferred_language: v }).eq("id", u.user.id);
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    setActiveUser(null);
    navigate({ to: "/auth" });
  };

  const onAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error("Name and phone number are required");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        const { data, error } = await supabase
          .from("emergency_contacts")
          .insert({
            user_id: u.user.id,
            name: newContact.name,
            phone: newContact.phone,
            relationship: newContact.relationship || null,
          })
          .select("id, name, phone, relationship")
          .single();

        if (error) {
          toast.error(error.message);
          return;
        }
        setContacts((prev) => [...prev, data as Contact]);
        toast.success("Emergency contact saved to SQL database!");
      } else {
        const newLocal: Contact = {
          id: "cnt_" + Date.now().toString(36),
          name: newContact.name,
          phone: newContact.phone,
          relationship: newContact.relationship || null,
        };
        const updated = [...contacts, newLocal];
        setContacts(updated);
        localStorage.setItem("meyyurai_local_contacts", JSON.stringify(updated));
        toast.success("Emergency contact saved!");
      }

      setNewContact({ name: "", phone: "", relationship: "" });
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setBusy(false);
    }
  };

  const onRemoveContact = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user && !id.startsWith("cnt_")) {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    localStorage.setItem("meyyurai_local_contacts", JSON.stringify(updated));
    toast.success("Contact removed");
  };

  const onChangePassword = async () => {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPw("");
    setPwOpen(false);
    toast.success("Password updated");
  };

  const onDeleteAccount = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }
    // Cascades remove profile, contacts, prefs, logs, etc. via FK.
    const { error } = await supabase.from("profiles").delete().eq("id", u.user.id);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await supabase.auth.signOut();
    setBusy(false);
    toast.success("Account data removed. Goodbye.");
    navigate({ to: "/auth" });
  };

  return (
    <div className="animate-fade-up">
      <ScreenHeader eyebrow={t("profile.section.you")} title={t("nav.profile")} />

      {/* Header card */}
      <section className="px-5">
        <button
          onClick={() => navigate({ to: "/onboarding" })}
          className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft text-left"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
            {(profile?.full_name || "M").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">
              {profile?.full_name || "Meyyurai user"}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile?.email || profile?.phone_number || t("profile.subtitle.tap")}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </section>

      {/* Language */}
      <Group title={t("profile.section.language")}>
        <Row icon={Languages} label={t("profile.preferredLang")}>
          <Select value={lang} onValueChange={(v) => onLangChange(v as Lang)}>
            <SelectTrigger className="h-9 w-36 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.native}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Group>

      {/* Emergency contacts */}
      <section className="mt-6 px-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("profile.section.contacts")}
          </h2>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> {t("profile.add")}
          </button>
        </div>
        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {contacts.length === 0 && (
            <li className="px-4 py-4 text-xs text-muted-foreground">
              {t("profile.noContacts")}
            </li>
          )}
          {contacts.map((c, idx) => (
            <li
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${idx !== contacts.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.phone}
                  {c.relationship ? ` · ${c.relationship}` : ""}
                </p>
              </div>
              <button
                onClick={() => onRemoveContact(c.id)}
                aria-label="Remove"
                className="text-muted-foreground hover:text-emergency"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Permissions */}
      <Group title={t("profile.section.permissions")}>
        <Row icon={MapPin} label={t("profile.location")} desc={t("profile.locationDesc")}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full"
            onClick={() => requestLocation()}
          >
            {t("profile.allow")}
          </Button>
        </Row>
        <Row icon={Mic} label={t("profile.microphone")} desc={t("profile.microphoneDesc")}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full"
            onClick={() => requestMicrophone()}
          >
            {t("profile.allow")}
          </Button>
        </Row>
        <Row icon={Camera} label={t("profile.camera")} desc={t("profile.cameraDesc")}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full"
            onClick={() => requestCamera()}
          >
            {t("profile.allow")}
          </Button>
        </Row>
        <Row icon={Bell} label={t("profile.notifications")} desc={t("profile.notificationsDesc")} last>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full"
            onClick={() => requestNotifications()}
          >
            {t("profile.allow")}
          </Button>
        </Row>
      </Group>

      {/* Preferences */}
      <Group title="Preferences">
        <Row icon={Moon} label="Dark mode" last>
          <Switch checked={dark} onCheckedChange={setDark} />
        </Row>
      </Group>

      {/* Account */}
      <Group title={t("profile.section.account")}>
        <Row
          icon={UserRound}
          label="Edit profile"
          onClick={() => navigate({ to: "/onboarding" })}
        />
        <Row icon={KeyRound} label={t("profile.changePw")} onClick={() => setPwOpen(true)} />
        <Row icon={FolderOpen} label="Privacy & security" desc="End-to-end protected" />
        <Row icon={ShieldCheck} label="Saved data" desc="Stored securely in your account" last />
      </Group>

      <div className="px-5 mt-6 space-y-2">
        <Button variant="outline" className="w-full h-11 rounded-full" onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> {t("profile.logout")}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-11 rounded-full text-emergency hover:text-emergency hover:bg-emergency/10"
          onClick={() => setDelOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" /> {t("profile.deleteAcc")}
        </Button>
      </div>

      <p className="mt-8 px-6 text-center text-[11px] text-muted-foreground">
        Meyyurai · Made with care for your safety
      </p>

      {/* Add contact */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add emergency contact</DialogTitle>
            <DialogDescription>We'll alert this person on SOS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="mt-1 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="mt-1 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label>Relationship (optional)</Label>
              <Input
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                className="mt-1 h-10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-full">
              {t("common.cancel")}
            </Button>
            <Button onClick={onAddContact} disabled={busy} className="rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change password */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              minLength={8}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="mt-1 h-10 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} className="rounded-full">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={onChangePassword}
              disabled={busy || newPw.length < 8}
              className="rounded-full"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account */}
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your profile, contacts, conversations, and logs. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)} className="rounded-full">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={onDeleteAccount}
              disabled={busy}
              className="rounded-full bg-emergency text-emergency-foreground hover:bg-emergency/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 px-5">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {children}
      </ul>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  desc,
  children,
  onClick,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  last?: boolean;
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${!last ? "border-b border-border" : ""}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc ? <p className="text-xs text-muted-foreground">{desc}</p> : null}
      </div>
      {children ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
  return (
    <li>
      {onClick ? (
        <button onClick={onClick} className="w-full text-left">
          {inner}
        </button>
      ) : (
        inner
      )}
    </li>
  );
}
