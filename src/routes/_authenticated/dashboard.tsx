import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Search,
  FileText,
  ShieldAlert,
  BookOpen,
  Bookmark,
  Briefcase,
  ShoppingCart,
  Globe,
  Shield,
  Home,
  Car,
  Scale,
  Users,
  Info,
  ChevronRight,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth-helper";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Meyyurai Legal Aid" }],
  }),
  component: DashboardScreen,
});

interface ComplaintItem {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
}

interface BookmarkItem {
  id: string;
  title: string;
  category: string;
}

interface AIConversationItem {
  id: string;
  user_question: string;
  urgency_level: string;
  created_at: string;
}

export function DashboardScreen() {
  const [userName, setUserName] = useState("User");
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [conversations, setConversations] = useState<AIConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");

          // Load recent complaints
          const { data: compData } = await supabase
            .from("complaints")
            .select("id, title, category, status, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3);
          if (compData) setComplaints(compData);

          // Load bookmarks
          const { data: bmData } = await supabase
            .from("bookmarks")
            .select("id, title, category")
            .eq("user_id", user.id)
            .limit(5);
          if (bmData) setBookmarks(bmData);

          // Load AI conversations
          const { data: aiData } = await supabase
            .from("ai_conversations")
            .select("id, user_question, urgency_level, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3);
          if (aiData) setConversations(aiData);
        }
      } catch (e) {
        console.error("Dashboard data load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const categories = [
    { title: "Labour & Employment", slug: "labor", icon: Briefcase, color: "text-blue-500 bg-blue-500/10" },
    { title: "Consumer Rights", slug: "consumer", icon: ShoppingCart, color: "text-emerald-500 bg-emerald-500/10" },
    { title: "Cyber Crime", slug: "cyber", icon: Globe, color: "text-purple-500 bg-purple-500/10" },
    { title: "Women & Child Safety", slug: "women", icon: Shield, color: "text-rose-500 bg-rose-500/10" },
    { title: "Domestic Violence", slug: "domestic", icon: Home, color: "text-amber-500 bg-amber-500/10" },
    { title: "Property & Rental", slug: "property", icon: Home, color: "text-indigo-500 bg-indigo-500/10" },
    { title: "Traffic Rules", slug: "traffic", icon: Car, color: "text-orange-500 bg-orange-500/10" },
    { title: "Criminal Law", slug: "criminal", icon: Scale, color: "text-red-500 bg-red-500/10" },
    { title: "Civil Matters", slug: "civil", icon: Users, color: "text-teal-500 bg-teal-500/10" },
    { title: "General Awareness", slug: "general", icon: Info, color: "text-sky-500 bg-sky-500/10" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Disclaimer */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>MEYYURAI Disclaimer:</strong> Provides legal information and assistance for awareness purposes. It is not a substitute for a qualified lawyer, police officer, court, or emergency service.
        </span>
      </div>

      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-700 p-6 text-white shadow-lifted">
        <h1 className="text-2xl font-bold font-display">Welcome back, {userName}!</h1>
        <p className="mt-1 text-sm text-teal-100 max-w-xl">
          What legal question or emergency assistance do you need today?
        </p>

        {/* Quick Action Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/assistant"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur transition-all text-center gap-1.5"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-semibold">Ask AI Assistant</span>
          </Link>

          <Link
            to="/search"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur transition-all text-center gap-1.5"
          >
            <Search className="w-5 h-5 text-sky-300" />
            <span className="text-xs font-semibold">Search Laws</span>
          </Link>

          <Link
            to="/complaints/create"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur transition-all text-center gap-1.5"
          >
            <FileText className="w-5 h-5 text-emerald-300" />
            <span className="text-xs font-semibold">Draft Complaint</span>
          </Link>

          <Link
            to="/emergency"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-500/80 hover:bg-rose-600 backdrop-blur transition-all text-center gap-1.5"
          >
            <ShieldAlert className="w-5 h-5 text-white" />
            <span className="text-xs font-semibold">Emergency SOS</span>
          </Link>
        </div>
      </div>

      {/* Legal Categories Grid */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg font-bold font-display">Legal Categories</h2>
          <Link to="/legal" className="text-xs text-primary font-medium hover:underline flex items-center">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to="/search"
                search={{ category: cat.slug }}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all text-center group"
              >
                <div className={`p-2.5 rounded-xl ${cat.color} mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-foreground leading-tight line-clamp-1">
                  {cat.title}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Complaints */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Recent Complaints
            </h3>
            <Link to="/complaints" className="text-xs text-primary font-medium hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2">
            {complaints.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-border bg-card/50 text-center space-y-3">
                <p className="text-xs text-muted-foreground">No draft complaints saved yet.</p>
                <Link
                  to="/complaints/create"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Complaint
                </Link>
              </div>
            ) : (
              complaints.map((c) => (
                <Link
                  key={c.id}
                  to="/complaints/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{c.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{c.category}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium capitalize">
                    {c.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Saved Bookmarks */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold font-display flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-500" /> Bookmarked Laws
            </h3>
            <Link to="/search" className="text-xs text-primary font-medium hover:underline">
              Find Laws
            </Link>
          </div>

          <div className="space-y-2">
            {bookmarks.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-border bg-card/50 text-center">
                <p className="text-xs text-muted-foreground">No bookmarked laws yet. Search and bookmark legal sections easily.</p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-card"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-foreground line-clamp-1">{bm.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{bm.category}</p>
                  </div>
                  <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
