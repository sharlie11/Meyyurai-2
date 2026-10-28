import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Siren, Phone, Shield, HeartPulse, Baby, Globe, Scale, AlertTriangle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/emergency")({
  component: EmergencyAssistanceScreen,
});

interface EmergencyService {
  id: string;
  name: string;
  number: string;
  category: "all" | "general" | "women" | "child" | "cyber" | "medical" | "legal";
  description: string;
  website?: string;
  icon: typeof Siren;
  tone: "emergency" | "primary" | "warning" | "muted";
}

export function EmergencyAssistanceScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const services: EmergencyService[] = [
    {
      id: "112",
      name: "National Emergency Response System (NERS)",
      number: "112",
      category: "general",
      description: "Pan-India single emergency helpline number for Police, Fire, and Medical assistance.",
      website: "https://112.gov.in",
      icon: Siren,
      tone: "emergency",
    },
    {
      id: "1091",
      name: "National Women Helpline",
      number: "1091",
      category: "women",
      description: "Dedicated 24/7 hotline for women facing violence, harassment, or distress.",
      website: "https://wcd.nic.in",
      icon: Shield,
      tone: "primary",
    },
    {
      id: "1098",
      name: "Childline India",
      number: "1098",
      category: "child",
      description: "24/7 free emergency phone service for children in need of care and protection.",
      website: "https://www.childlineindia.org",
      icon: Baby,
      tone: "warning",
    },
    {
      id: "1930",
      name: "National Cyber Crime Helpline",
      number: "1930",
      category: "cyber",
      description: "Official financial cyber fraud reporting helpline operated by MHA.",
      website: "https://cybercrime.gov.in",
      icon: Globe,
      tone: "muted",
    },
    {
      id: "108",
      name: "Ambulance & Medical Emergency",
      number: "108",
      category: "medical",
      description: "Free emergency ambulance and medical transport service across Indian states.",
      website: "https://nhm.gov.in",
      icon: HeartPulse,
      tone: "emergency",
    },
    {
      id: "15100",
      name: "NALSA Free Legal Aid Helpline",
      number: "15100",
      category: "legal",
      description: "National Legal Services Authority helpline providing free legal advice and representation.",
      website: "https://nalsa.gov.in",
      icon: Scale,
      tone: "primary",
    },
  ];

  const filteredServices = selectedCategory === "all"
    ? services
    : services.filter((s) => s.category === selectedCategory);

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      {/* Non-dispatch Warning Banner */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-sm">IMPORTANT EMERGENCY NOTICE</h3>
          <p className="leading-relaxed">
            MEYYURAI is an information platform and does <strong>NOT</strong> directly dispatch police or emergency responders. If you are in physical danger, tap the call button below to dial <strong>112</strong> immediately.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Siren className="w-6 h-6 text-rose-500 animate-pulse" /> Emergency Support Directory
        </h1>
        <p className="text-sm text-muted-foreground">
          Verified official helpline contacts for emergency response across India.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { label: "All Services", value: "all" },
          { label: "Women Safety", value: "women" },
          { label: "Child Protection", value: "child" },
          { label: "Cyber Crime", value: "cyber" },
          { label: "Medical 108", value: "medical" },
          { label: "Free Legal Aid 15100", value: "legal" },
        ].map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedCategory(c.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === c.value
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4 flex flex-col justify-between hover:border-rose-500/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">{service.name}</h3>
                      <span className="text-xs font-mono font-bold text-rose-500">
                        Hotline: {service.number}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {service.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                {service.website && (
                  <a
                    href={service.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                  >
                    Official Portal <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <a
                  href={`tel:${service.number}`}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all ml-auto"
                >
                  <Phone className="w-3.5 h-3.5 fill-current" /> Call {service.number}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
