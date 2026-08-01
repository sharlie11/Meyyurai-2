import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Home,
  HandHeart,
  Baby,
  Briefcase,
  ShoppingBag,
  UserRound,
  Globe,
  GraduationCap,
  Plane,
  Users,
  ChevronRight,
  Search,
} from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/rights")({
  head: () => ({
    meta: [
      { title: "Rights — Meyyurai" },
      {
        name: "description",
        content: "Know your rights across property, work, family, cyber and more.",
      },
    ],
  }),
  component: RightsScreen,
});

export const rightsCategories = [
  { slug: "property", label: "Property Rights", icon: Home, tint: "bg-primary/10 text-primary" },
  { slug: "women", label: "Women Rights", icon: HandHeart, tint: "bg-emergency/10 text-emergency" },
  { slug: "child", label: "Child Rights", icon: Baby, tint: "bg-warning/15 text-warning" },
  {
    slug: "employee",
    label: "Employee Rights",
    icon: Briefcase,
    tint: "bg-primary/10 text-primary",
  },
  {
    slug: "consumer",
    label: "Consumer Rights",
    icon: ShoppingBag,
    tint: "bg-success/15 text-success",
  },
  {
    slug: "senior",
    label: "Senior Citizen Rights",
    icon: UserRound,
    tint: "bg-primary/10 text-primary",
  },
  { slug: "cyber", label: "Cyber Rights", icon: Globe, tint: "bg-primary/10 text-primary" },
  {
    slug: "education",
    label: "Education Rights",
    icon: GraduationCap,
    tint: "bg-warning/15 text-warning",
  },
  { slug: "travel", label: "Travel Rights", icon: Plane, tint: "bg-primary/10 text-primary" },
  { slug: "family", label: "Family Rights", icon: Users, tint: "bg-accent text-primary" },
] as const;

function RightsScreen() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const filtered = rightsCategories.filter((c) =>
    (t(`rights.category.${c.slug}`) || c.label).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="animate-fade-up">
      <ScreenHeader
        eyebrow={t("rights.eyebrow")}
        title={t("rights.title")}
        description={t("rights.description")}
      />
      <div className="px-5">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("rights.search")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>
      <ul className="mt-5 space-y-2 px-5">
        {filtered.map((c) => (
          <li key={c.slug}>
            <Link
              to="/rights/$category"
              params={{ category: c.slug }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-transform active:scale-[0.99]"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t(`rights.category.${c.slug}`) || c.label}
                </p>
                <p className="text-xs text-muted-foreground">{t("rights.item.desc")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
