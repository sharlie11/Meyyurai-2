import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Phone,
  Navigation,
  Globe,
  Scale,
  HandHeart,
  Building2,
  Hospital,
  Shield,
  Home,
  Landmark,
  Brain,
  Users,
  Baby,
} from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Meyyurai" },
      {
        name: "description",
        content: "Find legal aid, NGOs, hospitals, shelters and mental health support near you.",
      },
    ],
  }),
  component: ResourcesScreen,
});

const categories = [
  { id: "all", label: "All", icon: Globe },
  { id: "legal", label: "Legal Aid", icon: Scale },
  { id: "ngo", label: "NGOs", icon: HandHeart },
  { id: "gov", label: "Government", icon: Landmark },
  { id: "hospital", label: "Hospitals", icon: Hospital },
  { id: "police", label: "Police", icon: Shield },
  { id: "shelter", label: "Shelters", icon: Home },
  { id: "embassy", label: "Embassies", icon: Building2 },
  { id: "mental", label: "Mental Health", icon: Brain },
  { id: "women", label: "Women Support", icon: Users },
  { id: "child", label: "Child Protection", icon: Baby },
] as const;

type Cat = (typeof categories)[number]["id"];

type Resource = {
  name: string;
  cat: Cat;
  distance: string;
  phone: string;
  website?: string;
  address: string;
};

const resources: Resource[] = [
  {
    name: "District Legal Services Authority",
    cat: "legal",
    distance: "1.4 km",
    phone: "15100",
    website: "https://nalsa.gov.in",
    address: "Court Complex, City Centre",
  },
  {
    name: "Asha Women Support NGO",
    cat: "ngo",
    distance: "3.1 km",
    phone: "+91 9876543210",
    website: "https://example.org",
    address: "12 Lotus Street",
  },
  {
    name: "City General Hospital",
    cat: "hospital",
    distance: "1.2 km",
    phone: "108",
    address: "Hospital Road",
  },
  {
    name: "Central Police Station",
    cat: "police",
    distance: "0.8 km",
    phone: "100",
    address: "Main Road",
  },
  {
    name: "Safe Haven Shelter",
    cat: "shelter",
    distance: "4.6 km",
    phone: "+91 9123456780",
    address: "Greenway Lane",
  },
  {
    name: "iCall Mental Health Helpline",
    cat: "mental",
    distance: "Nationwide",
    phone: "+91 9152987821",
    website: "https://icallhelpline.org",
    address: "Online & phone support",
  },
  {
    name: "Childline India",
    cat: "child",
    distance: "Nationwide",
    phone: "1098",
    website: "https://childlineindia.org",
    address: "24x7 helpline",
  },
  {
    name: "Women Helpline",
    cat: "women",
    distance: "Nationwide",
    phone: "1091",
    address: "24x7 helpline",
  },
  {
    name: "Consumer Affairs Office",
    cat: "gov",
    distance: "5.2 km",
    phone: "1915",
    website: "https://consumerhelpline.gov.in",
    address: "Govt. Complex",
  },
  {
    name: "Embassy of the Republic",
    cat: "embassy",
    distance: "8.0 km",
    phone: "+91 1123456789",
    address: "Diplomatic Enclave",
  },
];

function ResourcesScreen() {
  const [cat, setCat] = useState<Cat>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return resources.filter(
      (r) =>
        (cat === "all" || r.cat === cat) &&
        (q === "" || r.name.toLowerCase().includes(q.toLowerCase())),
    );
  }, [cat, q]);

  return (
    <div className="animate-fade-up">
      <ScreenHeader
        eyebrow="Find support"
        title="Resources"
        description="Trusted services near you — call, navigate or visit their site."
      />

      <div className="px-5">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search resources"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pb-2">
          {categories.map((c) => {
            const active = c.id === cat;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-2 space-y-3 px-5 pb-4">
        {list.map((r) => (
          <li key={r.name} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.address}</p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {r.distance}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <a
                href={`tel:${r.phone}`}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-2 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(r.name + " " + r.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2.5 text-xs font-medium text-foreground"
              >
                <Navigation className="h-3.5 w-3.5" /> Navigate
              </a>
              <a
                href={r.website ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!r.website}
                className={`flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2.5 text-xs font-medium ${
                  r.website ? "text-foreground" : "pointer-events-none text-muted-foreground/60"
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Website
              </a>
            </div>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No resources match your search.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
