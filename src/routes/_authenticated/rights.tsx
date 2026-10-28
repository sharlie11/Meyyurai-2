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
  Scale,
  Gift,
  ExternalLink,
  MapPin,
  Phone,
  CheckCircle2,
  Sparkles,
  Gavel,
  ShieldAlert,
} from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { CategoryDetailContent } from "./rights.$category";
import {
  RIGHTS_DATA,
  RelevantLaw,
  Scheme,
  AuthorityOffice,
  getLawOfficialUrl,
  getLawSectionUrl,
} from "@/lib/data/rights-data";

export const Route = createFileRoute("/_authenticated/rights")({
  head: () => ({
    meta: [
      { title: "Rights & Welfare Schemes — Meyyurai" },
      {
        name: "description",
        content: "Search laws, punishments, BNS/IPC sections, state welfare schemes, subsidies and official government portals.",
      },
    ],
  }),
  component: RightsScreen,
});

export const rightsCategories = [
  {
    slug: "legalaid",
    label: "Free Legal Aid",
    desc: "Article 39A Free Lawyers, DLSA 15100 Helpline, Court Fee Exemption & Lok Adalats",
    icon: Gavel,
    tint: "bg-primary/10 text-primary",
  },
  {
    slug: "property",
    label: "Property Rights",
    desc: "SRO Land Registration, TNREGINET, Patta/Chitta transfer & Hindu Succession",
    icon: Home,
    tint: "bg-primary/10 text-primary",
  },
  {
    slug: "women",
    label: "Women Rights",
    desc: "TN Subsidies (KMUT ₹1,000/mo, Pudhumai Penn), POSH Act & DSWO Collectorate",
    icon: HandHeart,
    tint: "bg-emergency/10 text-emergency",
  },
  {
    slug: "scst",
    label: "SC/ST Rights",
    desc: "PoA Act 1989 Atrocity Protection, Mandatory FIR, DSP Investigation & Govt Relief",
    icon: ShieldAlert,
    tint: "bg-emergency/10 text-emergency",
  },
  {
    slug: "employee",
    label: "Employee Rights",
    desc: "Code on Wages, SAMADHAN portal, EPF/ESI & Notice Period rules",
    icon: Briefcase,
    tint: "bg-primary/10 text-primary",
  },
  {
    slug: "consumer",
    label: "Consumer Rights",
    desc: "e-Daakhil filing, National Consumer Helpline 1915 & Defective product refunds",
    icon: ShoppingBag,
    tint: "bg-success/15 text-success",
  },
  {
    slug: "cyber",
    label: "Cyber Rights",
    desc: "Financial cyber fraud 1930 helpline, bank account lien & IT Act provisions",
    icon: Globe,
    tint: "bg-primary/10 text-primary",
  },
  {
    slug: "child",
    label: "Child Rights",
    desc: "RTE 25% free private school quota, Childline 1098 & POCSO protection",
    icon: Baby,
    tint: "bg-warning/15 text-warning",
  },
  {
    slug: "senior",
    label: "Senior Citizen Rights",
    desc: "Elderline 14567, Maintenance Tribunal (RDO) & Property gift revocation",
    icon: UserRound,
    tint: "bg-primary/10 text-primary",
  },
  {
    slug: "education",
    label: "Education Rights",
    desc: "Scholarships, school admission quotas & student grievance redressal",
    icon: GraduationCap,
    tint: "bg-warning/15 text-warning",
  },
  {
    slug: "travel",
    label: "Travel Rights",
    desc: "Passenger compensation, railway refund rules & road emergency 108",
    icon: Plane,
    tint: "bg-primary/10 text-primary",
  },
  {
    slug: "family",
    label: "Family Rights",
    desc: "Marriage registration, custody, maintenance & family court procedures",
    icon: Users,
    tint: "bg-accent text-primary",
  },
] as const;

export function RightsScreen() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // If a category is selected, render CategoryDetailContent directly!
  if (selectedCategory) {
    return (
      <CategoryDetailContent
        categorySlug={selectedCategory}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  const queryClean = q.trim().toLowerCase();

  // Perform Global Cross-Category Search across Laws, Schemes, and Authorities
  const searchResults = (() => {
    if (!queryClean) return null;

    const matchingLaws: { categorySlug: string; categoryTitle: string; law: RelevantLaw }[] = [];
    const matchingSchemes: { categorySlug: string; categoryTitle: string; scheme: Scheme }[] = [];
    const matchingAuthorities: { categorySlug: string; categoryTitle: string; auth: AuthorityOffice }[] = [];

    Object.values(RIGHTS_DATA).forEach((cat) => {
      // Search Laws & Punishments
      (cat.laws || []).forEach((law) => {
        if (
          law.actName.toLowerCase().includes(queryClean) ||
          law.section.toLowerCase().includes(queryClean) ||
          law.description.toLowerCase().includes(queryClean) ||
          (law.punishment || "").toLowerCase().includes(queryClean)
        ) {
          matchingLaws.push({ categorySlug: cat.slug, categoryTitle: cat.title, law });
        }
      });

      // Search Schemes & Subsidies
      (cat.schemes || []).forEach((scheme) => {
        if (
          scheme.title.toLowerCase().includes(queryClean) ||
          scheme.description.toLowerCase().includes(queryClean) ||
          (scheme.badge || "").toLowerCase().includes(queryClean) ||
          scheme.benefits.some((b) => b.toLowerCase().includes(queryClean)) ||
          scheme.eligibility.some((e) => e.toLowerCase().includes(queryClean))
        ) {
          matchingSchemes.push({ categorySlug: cat.slug, categoryTitle: cat.title, scheme });
        }
      });

      // Search Authorities & Helplines
      (cat.authorities || []).forEach((auth) => {
        if (
          auth.name.toLowerCase().includes(queryClean) ||
          auth.type.toLowerCase().includes(queryClean) ||
          auth.whatTheyDo.toLowerCase().includes(queryClean)
        ) {
          matchingAuthorities.push({ categorySlug: cat.slug, categoryTitle: cat.title, auth });
        }
      });
    });

    return {
      matchingLaws,
      matchingSchemes,
      matchingAuthorities,
      totalCount: matchingLaws.length + matchingSchemes.length + matchingAuthorities.length,
    };
  })();

  const filteredCategories = rightsCategories.filter((c) =>
    (t(`rights.category.${c.slug}`) || c.label || (c as { desc?: string }).desc || "")
      .toLowerCase()
      .includes(queryClean),
  );

  return (
    <div className="animate-fade-up min-h-screen bg-background pb-16">
      <ScreenHeader
        eyebrow="Know Your Rights & Laws"
        title="Rights, Laws & Subsidies"
        description="Search any statutory law, BNS/IPC punishment section, state subsidy, or government portal."
      />

      {/* Global Search Input */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-card px-4 py-3.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search e.g. 'women safety laws', 'stalking punishment', 'patta transfer', 'cyber fraud'..."
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary px-2.5 py-1 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* RENDER GLOBAL LIVE SEARCH RESULTS IF QUERY ENTERED */}
      {searchResults ? (
        <div className="px-5 space-y-6 animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Search Results for <span className="text-primary font-mono">"{q}"</span>
            </h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {searchResults.totalCount} Results Found
            </span>
          </div>

          {searchResults.totalCount === 0 ? (
            <div className="p-8 text-center rounded-3xl border border-border bg-card text-muted-foreground space-y-2">
              <p className="text-sm font-semibold">No direct laws or schemes matched "{q}".</p>
              <p className="text-xs">Try searching for keywords like "women", "punishment", "harassment", "property", "cyber", or "salary".</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* MATCHING LAWS & PUNISHMENTS */}
              {searchResults.matchingLaws.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Scale className="h-4 w-4" /> Statutory Laws & Penalties ({searchResults.matchingLaws.length})
                  </h4>

                  <div className="space-y-3">
                    {searchResults.matchingLaws.map(({ categorySlug, categoryTitle, law }, idx) => (
                      <div
                        key={idx}
                        className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {categoryTitle}
                            </span>
                            <h5 className="font-bold text-base text-foreground mt-1">{law.actName}</h5>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <a
                              href={getLawSectionUrl(law)}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-500/10 px-2.5 py-1.5 rounded-xl transition-colors"
                              title="View exact statutory wording of this section"
                            >
                              <Scale className="h-3 w-3" /> Exact Section ↗
                            </a>
                            <a
                              href={getLawOfficialUrl(law)}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-xl transition-colors"
                              title="Open Official Ministry Gazette PDF publication"
                            >
                              <ExternalLink className="h-3 w-3" /> Official Gazette PDF ↗
                            </a>
                          </div>
                        </div>

                        <p className="text-xs font-bold text-primary">{law.section}</p>
                        <p className="text-xs leading-relaxed text-foreground">{law.description}</p>

                        {/* Punishment Box */}
                        {law.punishment && (
                          <div className="rounded-2xl bg-emergency/10 border border-emergency/20 p-3 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emergency block">
                              ⚠️ Punishment & Legal Penalties
                            </span>
                            <p className="text-xs font-bold text-emergency-foreground leading-relaxed">
                              {law.punishment}
                            </p>
                          </div>
                        )}

                        {law.trialCourt && (
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <span className="text-muted-foreground">🏛️ Trial / Appeal Court:</span>
                            <span className="font-bold text-primary">{law.trialCourt}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedCategory(categorySlug)}
                          className="w-full text-center text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 py-2 rounded-xl border border-primary/20 transition-colors"
                        >
                          View Full {categoryTitle} Guide →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MATCHING SCHEMES & SUBSIDIES */}
              {searchResults.matchingSchemes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Gift className="h-4 w-4" /> Government Welfare Schemes & Subsidies ({searchResults.matchingSchemes.length})
                  </h4>

                  <div className="space-y-3">
                    {searchResults.matchingSchemes.map(({ categorySlug, categoryTitle, scheme }, idx) => (
                      <div
                        key={idx}
                        className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                          <div>
                            {scheme.badge && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                {scheme.badge}
                              </span>
                            )}
                            <h5 className="font-bold text-base text-foreground mt-1">{scheme.title}</h5>
                          </div>
                          {scheme.portalUrl && (
                            <a
                              href={scheme.portalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Official Portal
                            </a>
                          )}
                        </div>

                        <p className="text-xs leading-relaxed text-foreground">{scheme.description}</p>

                        <div className="rounded-2xl bg-emerald-500/5 p-3 border border-emerald-500/20 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                            Key Benefits
                          </span>
                          <ul className="space-y-1">
                            {scheme.benefits.map((b, i) => (
                              <li key={i} className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCategory(categorySlug)}
                          className="w-full text-center text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 py-2 rounded-xl border border-primary/20 transition-colors"
                        >
                          View Scheme Eligibility & How to Apply →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* DEFAULT CATEGORY CARDS LIST */
        <ul className="space-y-3 px-5">
          {filteredCategories.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => setSelectedCategory(c.slug)}
                className="w-full text-left flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/40 active:scale-[0.99] cursor-pointer"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.tint}`}>
                  <c.icon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">
                    {t(`rights.category.${c.slug}`) || c.label}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground mt-0.5">
                    {(c as { desc?: string }).desc || t("rights.item.desc")}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
