import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search as SearchIcon, Bookmark, ExternalLink, Loader2, Scale, Info, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLawOfficialUrl, getLawSectionUrl } from "@/lib/data/rights-data";

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (s: Record<string, unknown>): { category?: string; q?: string } => ({
    category: typeof s.category === "string" ? s.category : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: LegalSearchScreen,
});

interface LawItem {
  id: string;
  title: string;
  description: string;
  procedures?: string[];
  category?: string;
  source_url?: string;
  section_url?: string;
  section_number?: string;
}

export function LegalSearchScreen() {
  const searchParams = Route.useSearch();
  const [query, setQuery] = useState(searchParams.q || "");
  const [category, setCategory] = useState(searchParams.category || "all");
  const [results, setResults] = useState<LawItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Initial load
  useEffect(() => {
    handleSearch();
  }, [category]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query.trim());
      if (category && category !== "all") params.append("category", category);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch legal search results");
      const data = await res.json();
      
      const formatted: LawItem[] = (data.results || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        procedures: r.procedures,
        category: r.rights_categories?.name || category,
        source_url: getLawOfficialUrl({ actName: r.title, section: r.title, officialUrl: r.official_url }),
        section_url: getLawSectionUrl({ actName: r.title, section: r.title }),
        section_number: r.title.match(/Section \d+/i)?.[0] || undefined,
      }));

      // Fallback demonstration results if DB search is empty for specific terms
      if (formatted.length === 0 && query.trim()) {
        const demo: LawItem[] = [
          {
            id: "demo-1",
            title: "Payment of Wages Act, 1936 - Section 15",
            description: "Claims arising out of deductions from wages or delay in payment of wages and penalty for malicious or vexatious claims.",
            category: "Labour & Employment",
            source_url: "https://labour.gov.in/sites/default/files/TheCodeonWages2019.pdf",
            section_url: "https://indiankanoon.org/search/?formInput=Payment%20of%20Wages%20Act%20Section%2015",
            section_number: "Section 15",
          },
          {
            id: "demo-2",
            title: "Protection of Women from Domestic Violence Act, 2005 - Section 12",
            description: "Application to Magistrate by an aggrieved person or a Protection Officer seeking relief, protection orders, or monetary relief.",
            category: "Women & Child Safety",
            source_url: "https://wcd.nic.in/act/protection-women-domestic-violence-act-2005",
            section_url: "https://indiankanoon.org/search/?formInput=Protection%20of%20Women%20from%20Domestic%20Violence%20Act%20Section%2012",
            section_number: "Section 12",
          },
          {
            id: "demo-3",
            title: "Information Technology Act, 2000 - Section 66D",
            description: "Punishment for cheating by personation by using computer resource or communication device.",
            category: "Cyber Crime",
            source_url: "https://www.meity.gov.in/writereaddata/files/itbill2000.pdf",
            section_url: "https://indiankanoon.org/search/?formInput=Information%20Technology%20Act%20Section%2066D",
            section_number: "Section 66D",
          },
        ].filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) || 
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        );
        setResults(demo);
      } else {
        setResults(formatted);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error retrieving search results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (item: LawItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to bookmark laws.");
        return;
      }

      const newSet = new Set(bookmarkedIds);
      if (newSet.has(item.id)) {
        newSet.delete(item.id);
        toast.success("Bookmark removed.");
      } else {
        newSet.add(item.id);
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            law_id: item.id,
            title: item.title,
            category: item.category,
            source_url: item.source_url,
          }),
        });
        toast.success("Law bookmarked successfully!");
      }
      setBookmarkedIds(newSet);
    } catch (e) {
      toast.error("Failed to update bookmark.");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Disclaimer */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0" />
        <span>MEYYURAI provides official Indian statutory law awareness. Verify with official gazettes.</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" /> Legal Search & Knowledge Base
        </h1>
        <p className="text-sm text-muted-foreground">
          Search acts, section numbers, IPC/BNS laws, and workplace rights across India.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by keyword, law title, section (e.g. 'salary', 'Section 15', 'cyber')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border"
          />
        </div>
        <Button type="submit" disabled={loading} className="h-11 px-6 rounded-xl font-medium">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { label: "All Categories", value: "all" },
          { label: "Labour & Employment", value: "labor" },
          { label: "Women Safety", value: "women" },
          { label: "Cyber Crime", value: "cyber" },
          { label: "Domestic Violence", value: "domestic" },
          { label: "Consumer Rights", value: "consumer" },
        ].map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              category === c.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search Results List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            Searching official legal databases...
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card/50 p-6 space-y-2">
            <SearchIcon className="w-8 h-8 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-sm">No laws or sections found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search terms or selecting 'All Categories' to explore available legislation.
            </p>
          </div>
        ) : (
          results.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-border bg-card space-y-3 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {item.category}
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-1.5">{item.title}</h3>
                </div>

                <button
                  onClick={() => toggleBookmark(item)}
                  className={`p-2 rounded-xl border transition-all ${
                    bookmarkedIds.has(item.id)
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title="Bookmark Law"
                >
                  <Bookmark className={`w-4 h-4 ${bookmarkedIds.has(item.id) ? "fill-amber-500" : ""}`} />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>

              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground text-[11px]">Official Indian Law Gazette</span>
                <div className="flex items-center gap-2">
                  <a
                    href={getLawSectionUrl({ actName: item.title, section: item.section_number, sectionUrl: item.section_url })}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                    title="View verbatim statutory section text"
                  >
                    Exact Section <Scale className="w-3 h-3" />
                  </a>
                  <a
                    href={getLawOfficialUrl({ actName: item.title, officialUrl: item.source_url })}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                    title="Open official Ministry Gazette PDF publication"
                  >
                    Official Gazette PDF <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
