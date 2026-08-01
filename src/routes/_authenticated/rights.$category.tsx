import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  FileText,
  ListChecks,
  MessageCircleQuestion,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { rightsCategories } from "./rights";
import { ScreenHeader } from "@/components/ScreenHeader";

export const Route = createFileRoute("/_authenticated/rights/$category")({
  head: ({ params }) => {
    const cat = rightsCategories.find((c) => c.slug === params.category);
    return {
      meta: [
        { title: `${cat?.label ?? "Rights"} — Meyyurai` },
        {
          name: "description",
          content: `Understand ${cat?.label.toLowerCase() ?? "your rights"}, applicable laws and how to file a complaint.`,
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

function CategoryDetail() {
  const { cat } = Route.useLoaderData() as { cat: (typeof rightsCategories)[number] };

  const sections = [
    {
      icon: ShieldCheck,
      title: "What it means",
      body: `${cat.label} protect you in everyday situations and during conflict. They define what you are entitled to and what others cannot do to you.`,
    },
    {
      icon: Scale,
      title: "Relevant laws",
      list: [
        "Constitutional provisions safeguarding fundamental rights.",
        "Specific statutes related to this category.",
        "Procedural rules that govern enforcement.",
      ],
    },
    {
      icon: Building2,
      title: "Authority to approach",
      body: "Local police, district-level officers, sectoral regulators, or courts as appropriate.",
    },
    {
      icon: ListChecks,
      title: "Complaint process",
      list: [
        "Write down what happened with dates and witnesses.",
        "File a complaint at the relevant authority or online portal.",
        "Keep a stamped receipt or reference number.",
        "Follow up in writing within 7–15 days.",
      ],
    },
    {
      icon: FileText,
      title: "Documents required",
      list: [
        "Government-issued ID & address proof.",
        "Supporting evidence (photos, contracts, screenshots).",
        "Previous correspondence, if any.",
      ],
    },
    {
      icon: MessageCircleQuestion,
      title: "Frequently asked",
      list: [
        "Is legal aid free? Yes, through District Legal Services Authority.",
        "Can I file anonymously? Sometimes — depends on the issue.",
        "How long does it take? Varies; track via the reference number.",
      ],
    },
  ];

  return (
    <div className="animate-fade-up">
      <div className="safe-top px-5 pt-5">
        <Link
          to="/rights"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <ScreenHeader eyebrow="Rights" title={cat.label} />

      <div className="space-y-3 px-5 pb-4">
        {sections.map((s, i) => (
          <div
            key={s.title}
            className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-soft"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-4.5 w-4.5" size={18} />
              </span>
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
            </div>
            {s.body ? (
              <p className="mt-3 text-sm leading-relaxed text-foreground">{s.body}</p>
            ) : null}
            {s.list ? (
              <ul className="mt-3 space-y-2">
                {s.list.map((it) => (
                  <li
                    key={it}
                    className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {it}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
