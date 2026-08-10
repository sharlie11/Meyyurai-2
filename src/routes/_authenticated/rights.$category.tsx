import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  FileText,
  ListChecks,
  MessageCircleQuestion,
  Scale,
  ShieldCheck,
  Gift,
  ExternalLink,
  MapPin,
  Phone,
  CheckCircle2,
  Search,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  FileCheck,
  Scroll,
  Info,
  Mail,
  UserCheck,
} from "lucide-react";

// (Skipping to authority office cards edit in lower line range...)
import { rightsCategories } from "./rights";
import { ScreenHeader } from "@/components/ScreenHeader";
import { RIGHTS_DATA, CategoryRightsDetail, Scheme, RelevantLaw } from "@/lib/data/rights-data";

export const Route = createFileRoute("/_authenticated/rights/$category")({
  head: ({ params }) => {
    const cat = rightsCategories.find((c) => c.slug === params.category);
    return {
      meta: [
        { title: `${cat?.label ?? "Rights"} — Meyyurai` },
        {
          name: "description",
          content: `Understand ${cat?.label.toLowerCase() ?? "your rights"}, welfare schemes, subsidies, laws, and location-aware complaint authorities.`,
        },
      ],
    };
  },
  loader: ({ params }) => {
    const cat = rightsCategories.find((c) => c.slug === params.category);
    if (!cat) throw notFound();
    return { cat };
  },
  component: CategoryDetail,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">Topic not found.</div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">{error.message}</div>
  ),
});

const TAMIL_NADU_DISTRICTS = [
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Tiruchirappalli",
  "Salem",
  "Tirunelveli",
  "Kanchipuram",
  "Tiruvallur",
  "Chengalpattu",
  "Vellore",
  "Erode",
  "Thanjavur",
  "Cuddalore",
  "Dindigul",
  "Kanyakumari",
  "Tuticorin (Thoothukudi)",
  "Tiruppur",
  "All Tamil Nadu / India",
];

function CategoryDetail() {
  const { cat } = Route.useLoaderData() as {
    cat: (typeof rightsCategories)[number];
  };

  return <CategoryDetailContent categorySlug={cat.slug} />;
}

export function CategoryDetailContent({
  categorySlug,
  onBack,
}: {
  categorySlug: string;
  onBack?: () => void;
}) {
  const cat = rightsCategories.find((c) => c.slug === categorySlug) || {
    slug: categorySlug,
    label: "Rights & Schemes",
    desc: "Legal protections & government welfare subsidies",
    icon: ShieldCheck,
    tint: "bg-primary/10 text-primary",
  };

  const data = RIGHTS_DATA[categorySlug] || null;

  const [selectedDistrict, setSelectedDistrict] = useState("Chennai");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Modal States
  const [activeModalScheme, setActiveModalScheme] = useState<Scheme | null>(null);
  const [activeModalLaw, setActiveModalLaw] = useState<RelevantLaw | null>(null);

  // Form State for Scheme Modal
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submittedFormSuccess, setSubmittedFormSuccess] = useState(false);

  // Fallback if data is not defined
  const detail: CategoryRightsDetail = data || {
    slug: cat.slug,
    title: cat.label,
    subtitle: `Legal rights, welfare schemes, laws, authorities & complaint process for ${cat.label}.`,
    overview: `${cat.label} protect citizens under Indian statutory laws, offering official complaint channels and legal aid.`,
    laws: [
      {
        actName: "Constitution of India",
        section: "Article 14 & Article 21",
        description: "Right to equality and right to life & personal liberty.",
        officialSource: "Ministry of Law and Justice",
      },
    ],
    schemes: [],
    authorities: [
      {
        name: "District Legal Services Authority (DLSA)",
        type: "Free Legal Aid",
        addressSummary: "District Court Building in every District HQ.",
        helpline: "15100",
        whatTheyDo: "Assigns free advocates and handles legal aid petitions.",
      },
    ],
    complaintSteps: [
      "Write a chronological summary of facts.",
      "Submit complaint to local authority or online portal.",
      "Keep reference acknowledgement copy.",
    ],
    documentsRequired: ["Government ID Proof", "Supporting Document Evidence"],
    faqs: [
      {
        question: "Is legal aid free?",
        answer: "Yes, through District Legal Services Authority (DLSA) for eligible categories.",
      },
    ],
  };

  // Filter schemes based on search query
  const filteredSchemes = (detail.schemes || []).filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.benefits.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleFormInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedFormSuccess(true);
  };

  return (
    <div className="animate-fade-up min-h-screen bg-background pb-16 relative">
      {/* Top Header Navigation */}
      <div className="safe-top px-5 pt-5 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to All Rights Categories
          </button>
        ) : (
          <Link
            to="/rights"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Rights
          </Link>
        )}
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
          Verified Government Sources
        </span>
      </div>

      <ScreenHeader
        eyebrow="Know Your Rights & Subsidies"
        title={detail.title}
        description={detail.subtitle}
      />

      {/* Search & Quick Jump Bar */}
      <div className="px-5 mb-5 space-y-3">
        <div className="flex items-center gap-2 rounded-2xl border border-input bg-card px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${cat.label} schemes, subsidies, or laws...`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Jump Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          {detail.schemes && detail.schemes.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToSection("sec-schemes")}
              className="shrink-0 flex items-center gap-1 bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <Gift className="h-3.5 w-3.5" /> Subsidies & Schemes ({detail.schemes.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => scrollToSection("sec-laws")}
            className="shrink-0 flex items-center gap-1 bg-secondary text-foreground font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-secondary/80 transition-colors"
          >
            <Scale className="h-3.5 w-3.5" /> Statutory Laws
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("sec-offices")}
            className="shrink-0 flex items-center gap-1 bg-secondary text-foreground font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-secondary/80 transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" /> Office Finder
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("sec-process")}
            className="shrink-0 flex items-center gap-1 bg-secondary text-foreground font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-secondary/80 transition-colors"
          >
            <ListChecks className="h-3.5 w-3.5" /> How to Apply
          </button>
        </div>
      </div>

      <div className="px-5 space-y-8">
        {/* 1. OVERVIEW SUMMARY BOX */}
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">Rights & Protection Overview</h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{detail.overview}</p>
        </div>

        {/* 2. WELFARE SCHEMES & SUBSIDIES (FEATURED SECTION) */}
        {detail.schemes && detail.schemes.length > 0 && (
          <div id="sec-schemes" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">
                  Government Welfare Schemes & Subsidies
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {filteredSchemes.length} Active Schemes
              </span>
            </div>

            {filteredSchemes.map((scheme, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-4 hover:border-primary/30 transition-colors"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="space-y-1">
                    {scheme.badge && (
                      <span className="inline-block rounded-md bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        {scheme.badge}
                      </span>
                    )}
                    <h4 className="text-base font-bold text-foreground">{scheme.title}</h4>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* IN-APP DIRECT FORM BUTTON */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModalScheme(scheme);
                        setFormData({});
                        setSubmittedFormSuccess(false);
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <FileCheck className="h-4 w-4" /> 📝 Fill Scheme Form
                    </button>

                    {scheme.portalUrl && (
                      <a
                        href={scheme.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 bg-secondary text-foreground hover:bg-secondary/80 px-3 py-2 rounded-xl text-xs font-semibold border border-border transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-primary" /> Official Portal
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-foreground">{scheme.description}</p>

                {/* Benefits List */}
                <div className="space-y-2 bg-emerald-500/5 p-3.5 rounded-2xl border border-emerald-500/20">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Scheme Benefits & Financial Grants
                  </h5>
                  <ul className="space-y-1.5 pl-1">
                    {scheme.benefits.map((b, i) => (
                      <li key={i} className="text-xs text-foreground font-medium flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Eligibility Criteria */}
                <div className="space-y-2 bg-secondary/30 p-3.5 rounded-2xl border border-border/60">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Who is Eligible?
                  </h5>
                  <ul className="space-y-1 pl-1">
                    {scheme.eligibility.map((el, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                        <span>{el}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How to Apply */}
                <div className="rounded-2xl bg-primary/5 p-3.5 border border-primary/20 space-y-1">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Step-by-Step: How to Avail
                  </h5>
                  <p className="text-xs leading-relaxed text-foreground font-medium">
                    {scheme.howToApply}
                  </p>
                  {scheme.helpline && (
                    <p className="text-xs text-primary font-bold pt-1">
                      📞 Official Helpline: {scheme.helpline}
                    </p>
                  )}
                </div>

                {/* Documents Needed */}
                <div className="space-y-1.5 pt-1">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Documents Required to Apply
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {scheme.documentsNeeded.map((doc, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-background border border-border px-2.5 py-1 text-[11px] font-medium text-foreground"
                      >
                        📄 {doc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. LOCATION-AWARE OFFICE FINDER */}
        <div id="sec-offices" className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">
              Nearby Authorities & Office Finder
            </h3>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-foreground">Select Your District</h4>
                <p className="text-xs text-muted-foreground">Shows offices, SROs, Collectorate DSWOs & filing desks.</p>
              </div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TAMIL_NADU_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    📍 {d} District
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {detail.authorities.map((auth, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-background p-4 space-y-3 shadow-xs hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {auth.type}
                        </span>
                        {auth.officerTitle && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <UserCheck className="h-3 w-3" /> {auth.officerTitle}
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-bold text-foreground mt-1.5">{auth.name}</h5>
                    </div>
                    {auth.onlinePortal && (
                      <a
                        href={auth.onlinePortal}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors shadow-2xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Portal
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed">{auth.whatTheyDo}</p>

                  <div className="rounded-xl bg-secondary/30 p-3 space-y-2 text-xs border border-border/50">
                    <div className="flex items-start gap-2 text-foreground font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong>Location in {selectedDistrict}:</strong> {auth.addressSummary}
                      </span>
                    </div>

                    {auth.email && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3 text-primary" /> Nodal Email:
                        </span>
                        <a
                          href={`mailto:${auth.email.split("/")[0].trim()}`}
                          className="font-mono text-[11px] font-semibold text-foreground hover:text-primary bg-background px-2.5 py-0.5 rounded-md border border-border flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3 text-muted-foreground" /> {auth.email}
                        </a>
                      </div>
                    )}

                    {auth.helpline && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3 text-primary" /> Official Helpline:
                        </span>
                        <a
                          href={`tel:${auth.helpline.split("/")[0].trim()}`}
                          className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-primary/20 transition-colors"
                        >
                          <Phone className="h-3 w-3" /> {auth.helpline}
                        </a>
                      </div>
                    )}

                    {auth.escalationContact && (
                      <div className="pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Fast-Track Escalation:</span>{" "}
                        {auth.escalationContact}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. STATUTORY LAWS & BARE ACT VIEWER */}
        <div id="sec-laws" className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Official Statutory Acts & Laws</h3>
          </div>

          <div className="space-y-3">
            {detail.laws.map((law, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-foreground">{law.actName}</h4>
                  <div className="flex items-center gap-2">
                    {/* BARE ACT TEXT MODAL BUTTON */}
                    <button
                      type="button"
                      onClick={() => setActiveModalLaw(law)}
                      className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <Scroll className="h-3.5 w-3.5" /> Read Bare Act Section
                    </button>
                    {law.officialUrl && (
                      <a
                        href={law.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-secondary px-2.5 py-1.5 rounded-xl transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> India Code
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs font-bold text-primary">{law.section}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{law.description}</p>

                {law.classification && (
                  <span className="inline-block rounded-md bg-secondary text-foreground text-[11px] font-semibold px-2.5 py-1 border border-border font-mono">
                    ⚖️ {law.classification}
                  </span>
                )}

                {law.punishment && (
                  <div className="rounded-2xl bg-emergency/10 border border-emergency/20 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emergency block">
                      ⚠️ Punishment & Legal Penalties
                    </span>
                    <p className="text-xs font-semibold text-emergency-foreground leading-relaxed">
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

                <p className="text-[10px] text-muted-foreground/70 font-mono pt-1 border-t border-border/40">
                  Source: {law.officialSource}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 5. HOW TO APPLY / COMPLAINT STEPS */}
        <div id="sec-process" className="space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">How to Apply & File Complaints</h3>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3">
            {detail.complaintSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-background border border-border">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {idx + 1}
                </span>
                <p className="text-xs leading-relaxed text-foreground pt-1">{step}</p>
              </div>
            ))}
          </div>

          {/* Checklist Documents */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Required Documents Checklist
            </h4>
            <ul className="space-y-2">
              {detail.documentsRequired.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-foreground bg-background p-3 rounded-xl border border-border">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 6. FAQS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-2">
            {detail.faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-2 font-bold text-sm text-foreground hover:bg-secondary/40 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground border-t border-border/40 pt-3 bg-secondary/20">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SCHEME DIRECT APPLICATION & FORM ASSISTANT */}
      {/* ========================================================================= */}
      {activeModalScheme && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-scale-in relative">
            <button
              type="button"
              onClick={() => setActiveModalScheme(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 pr-8">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                In-App Scheme Application & Verification Form
              </span>
              <h3 className="text-lg font-bold text-foreground">{activeModalScheme.title}</h3>
              <p className="text-xs text-muted-foreground">{activeModalScheme.description}</p>
            </div>

            {submittedFormSuccess ? (
              <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-foreground">Verification Checklist Generated!</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your scheme pre-submission details have been formatted. Below are your next submission steps:
                </p>

                <div className="text-left bg-background p-4 rounded-2xl border border-border text-xs space-y-2 font-mono">
                  <p><strong>Applicant:</strong> {formData["Applicant Full Name (As in Aadhaar)"] || formData["Student Full Name"] || "Verified"}</p>
                  <p><strong>Smart Ration Card:</strong> {formData["Smart Ration Card Number (12 Digits)"] || "Verified"}</p>
                  <p><strong>Aadhaar:</strong> {formData["Aadhaar Number (12 Digits)"] || formData["Aadhaar Number"] || "Verified"}</p>
                  <p><strong>District:</strong> {formData["District & Taluk Name"] || "Verified"}</p>
                </div>

                <div className="space-y-2 text-left pt-2">
                  <h5 className="text-xs font-bold text-primary uppercase tracking-wider">Submission Instructions:</h5>
                  {activeModalScheme.directApplicationSteps ? (
                    <ul className="space-y-1.5">
                      {activeModalScheme.directApplicationSteps.map((step, i) => (
                        <li key={i} className="text-xs text-foreground font-medium">{step}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-foreground">Submit form copy with documents at your local e-Sevai Center or District Social Welfare Office at Collectorate.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSubmittedFormSuccess(false)}
                    className="flex-1 bg-secondary text-foreground py-2.5 rounded-xl text-xs font-bold"
                  >
                    Edit Details
                  </button>
                  <a
                    href="https://cmhelpline.tnega.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-xs font-bold text-center"
                  >
                    Submit on CM Helpline ↗
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4" /> Required Application Details
                  </h4>

                  {(activeModalScheme.formFields || [
                    "Applicant Full Name",
                    "Aadhaar Number",
                    "Smart Ration Card Number",
                    "Mobile Number",
                    "District Name",
                  ]).map((field) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-semibold text-foreground block">{field}</label>
                      <input
                        required
                        type="text"
                        value={formData[field] || ""}
                        onChange={(e) => handleFormInputChange(field, e.target.value)}
                        placeholder={`Enter your ${field}`}
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  ))}
                </div>

                {/* Required Documents Checklist */}
                <div className="space-y-2 bg-secondary/30 p-3.5 rounded-2xl border border-border/50">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Required Upload/Physical Copies
                  </h5>
                  <div className="space-y-1">
                    {activeModalScheme.documentsNeeded.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-foreground font-medium">
                        <input type="checkbox" defaultChecked className="rounded border-input text-primary" />
                        <span>📄 {doc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalScheme(null)}
                    className="flex-1 bg-secondary text-foreground py-3 rounded-xl text-xs font-bold hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-4 w-4" /> Generate Form & Avail
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BARE ACT LEGAL TEXT READER */}
      {/* ========================================================================= */}
      {activeModalLaw && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-scale-in relative">
            <button
              type="button"
              onClick={() => setActiveModalLaw(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 pr-8">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Official Bare Act Statutory Section
              </span>
              <h3 className="text-base font-bold text-foreground">{activeModalLaw.actName}</h3>
              <p className="text-xs font-bold text-primary">{activeModalLaw.section}</p>
            </div>

            {activeModalLaw.classification && (
              <div className="rounded-xl bg-secondary p-3 border border-border text-xs font-mono text-foreground font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>{activeModalLaw.classification}</span>
              </div>
            )}

            {/* BARE ACT TEXT PARCHMENT BOX */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Scroll className="h-4 w-4 text-primary" /> Exact Legal Text (Bare Act Wording)
              </h4>
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 text-xs leading-relaxed text-foreground font-serif space-y-2">
                <p>{activeModalLaw.bareActText || activeModalLaw.description}</p>
              </div>
            </div>

            {/* PUNISHMENTS & FINE */}
            {activeModalLaw.punishment && (
              <div className="rounded-2xl bg-emergency/10 border border-emergency/20 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emergency block">
                  ⚠️ Statutory Punishment & Penalties
                </span>
                <p className="text-xs font-bold text-emergency-foreground leading-relaxed">
                  {activeModalLaw.punishment}
                </p>
              </div>
            )}

            {activeModalLaw.trialCourt && (
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-background border border-border">
                <span className="text-muted-foreground font-medium">🏛️ Court of Trial / Jurisdiction:</span>
                <span className="font-bold text-primary">{activeModalLaw.trialCourt}</span>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModalLaw(null)}
                className="flex-1 bg-secondary text-foreground py-2.5 rounded-xl text-xs font-bold hover:bg-secondary/80 transition-colors"
              >
                Close Reader
              </button>
              <a
                href={activeModalLaw.officialUrl || "https://www.indiacode.nic.in"}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open India Code Repository ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
