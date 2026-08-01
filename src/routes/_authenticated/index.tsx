import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Siren,
  Phone,
  MapPin,
  Users,
  Shield,
  HeartPulse,
  Baby,
  Globe,
  ChevronRight,
  Navigation,
  Hospital,
  Scale,
  HandHeart,
  X,
} from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Emergency — Meyyurai" },
      {
        name: "description",
        content:
          "One-tap access to emergency services, trusted contacts and live location sharing.",
      },
    ],
  }),
  component: EmergencyScreen,
});

type EmergencyContact = {
  id: string;
  label: string;
  number: string;
  icon: typeof Phone;
  tone: "emergency" | "primary" | "warning" | "muted";
};

const contacts: EmergencyContact[] = [
  { id: "112", label: "All-in-one Emergency", number: "112", icon: Siren, tone: "emergency" },
  { id: "police", label: "Police", number: "100", icon: Shield, tone: "primary" },
  { id: "ambulance", label: "Ambulance", number: "108", icon: HeartPulse, tone: "emergency" },
  { id: "women", label: "Women Safety", number: "1091", icon: HandHeart, tone: "primary" },
  { id: "child", label: "Child Protection", number: "1098", icon: Baby, tone: "warning" },
  { id: "cyber", label: "Cyber Crime", number: "1930", icon: Globe, tone: "muted" },
];

const nearby = [
  { name: "Central Police Station", distance: "0.8 km", icon: Shield, kind: "Police" },
  { name: "City General Hospital", distance: "1.2 km", icon: Hospital, kind: "Hospital" },
  { name: "District Legal Aid Centre", distance: "2.4 km", icon: Scale, kind: "Legal Aid" },
  { name: "Asha Women Support NGO", distance: "3.1 km", icon: HandHeart, kind: "NGO" },
];

const guidance = [
  {
    title: "Stay calm and breathe",
    body: "Move to a safe space. Keep your phone close and unlocked.",
  },
  {
    title: "Share your location",
    body: "Trusted contacts can find you faster when location is shared.",
  },
  {
    title: "Document everything",
    body: "Save photos, audio or notes. They can be evidence later.",
  },
];

function toneClasses(tone: EmergencyContact["tone"]) {
  switch (tone) {
    case "emergency":
      return "bg-emergency/10 text-emergency";
    case "primary":
      return "bg-primary/10 text-primary";
    case "warning":
      return "bg-warning/15 text-warning";
    default:
      return "bg-secondary text-foreground";
  }
}

function EmergencyScreen() {
  const [sosOpen, setSosOpen] = useState(false);
  const [confirm, setConfirm] = useState<EmergencyContact | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!confirm) return;
    setCountdown(3);
    const i = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(i);
          window.location.href = `tel:${confirm.number}`;
          setConfirm(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [confirm]);

  const shareLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        if (navigator.share) {
          navigator.share({ title: "My live location", url }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(url);
          toast.success("Location link copied");
        }
      },
      () => toast.error("Couldn't access location"),
    );
  };

  return (
    <div className="animate-fade-up">
      <ScreenHeader
        eyebrow="You're safe here"
        title="Emergency"
        description="One tap away from help. Use the SOS button or pick a direct line below."
      />

      {/* SOS */}
      <section className="px-5">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-emergency/[0.06] via-transparent to-primary/[0.05]" />
          <div className="relative flex flex-col items-center text-center">
            <button
              onClick={() => setSosOpen(true)}
              aria-label="Activate SOS"
              className="animate-sos flex h-40 w-40 items-center justify-center rounded-full bg-emergency text-emergency-foreground transition-transform active:scale-95"
            >
              <div className="flex flex-col items-center">
                <Siren className="h-10 w-10" />
                <span className="mt-2 text-2xl font-semibold tracking-wider">SOS</span>
              </div>
            </button>
            <p className="mt-5 text-sm text-muted-foreground">
              Press and choose how you'd like to get help.
            </p>
          </div>
        </div>
      </section>

      {/* Emergency contacts */}
      <section className="mt-8 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Emergency contacts</h2>
          <span className="text-xs text-muted-foreground">Tap to call</span>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {contacts.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setConfirm(c)}
                className="flex h-full w-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all active:scale-[0.98]"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses(c.tone)}`}
                >
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
                    {c.number}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Location */}
      <section className="mt-8 px-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Your live location</p>
              <p className="text-xs text-muted-foreground">
                Share with trusted contacts so they can reach you faster.
              </p>
            </div>
          </div>
          <button
            onClick={shareLocation}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Navigation className="h-4 w-4" />
            Share live location
          </button>
        </div>
      </section>

      {/* Nearby */}
      <section className="mt-8 px-5">
        <h2 className="mb-3 text-base font-semibold text-foreground">Nearby assistance</h2>
        <ul className="space-y-2">
          {nearby.map((n) => (
            <li
              key={n.name}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <n.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{n.name}</p>
                <p className="text-xs text-muted-foreground">
                  {n.kind} · {n.distance} away
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      </section>

      {/* Guidance */}
      <section className="mt-8 px-5">
        <h2 className="mb-3 text-base font-semibold text-foreground">If you need a moment</h2>
        <div className="space-y-2">
          {guidance.map((g) => (
            <div key={g.title} className="rounded-2xl border border-border bg-accent/40 p-4">
              <p className="text-sm font-medium text-foreground">{g.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOS action sheet */}
      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>How can we help?</DialogTitle>
            <DialogDescription>Choose an action. We'll guide you through it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <button
              onClick={() => {
                setSosOpen(false);
                setConfirm(contacts[0]);
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-emergency px-4 py-4 text-left text-emergency-foreground"
            >
              <Phone className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Call Emergency Services</p>
                <p className="text-xs opacity-90">Dial 112 immediately</p>
              </div>
            </button>
            <button
              onClick={() => {
                setSosOpen(false);
                shareLocation();
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left"
            >
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Share Live Location</p>
                <p className="text-xs text-muted-foreground">Send to trusted contacts</p>
              </div>
            </button>
            <button
              onClick={() => {
                setSosOpen(false);
                toast.success("Trusted contacts alerted");
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left"
            >
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Alert Trusted Contacts</p>
                <p className="text-xs text-muted-foreground">Send an instant SOS message</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call confirm with countdown */}
      <Dialog
        open={!!confirm}
        onOpenChange={(o: boolean) => {
          if (!o) setConfirm(null);
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Calling {confirm?.label}</DialogTitle>
            <DialogDescription>
              You are about to call emergency services on{" "}
              <span className="font-medium text-foreground">{confirm?.number}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emergency/10 text-3xl font-semibold text-emergency">
              {countdown}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Calling in {countdown}s</p>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setConfirm(null)}
            >
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button
              className="flex-1 rounded-full bg-emergency text-emergency-foreground hover:bg-emergency/90"
              onClick={() => {
                if (confirm) window.location.href = `tel:${confirm.number}`;
                setConfirm(null);
              }}
            >
              <Phone className="mr-1 h-4 w-4" /> Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
