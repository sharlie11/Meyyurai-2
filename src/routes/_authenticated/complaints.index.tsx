import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FileText, Plus, Loader2, Trash2, Eye, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/complaints/")({
  component: ComplaintsDashboardScreen,
});

interface ComplaintItem {
  id: string;
  title: string;
  category: string;
  incident_description: string;
  status: string;
  created_at: string;
}

export function ComplaintsDashboardScreen() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/complaints", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch complaints");
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this complaint draft?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/complaints/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to delete complaint");

      toast.success("Complaint deleted.");
      setComplaints((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error("Failed to delete complaint.");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Complaint Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate, manage, and download formal complaint drafts tailored for official Indian authorities.
          </p>
        </div>

        <Link
          to="/complaints/create"
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Complaint
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          Loading saved complaints...
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card/50 p-8 space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary inline-block">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">No Complaints Drafted Yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Easily generate structured formal complaints for unpaid salary, harassment, consumer disputes, or cyber fraud in 3 simple steps.
            </p>
          </div>
          <Link
            to="/complaints/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Start Complaint Generator
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {c.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground line-clamp-1">{c.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {c.incident_description}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <Link
                  to="/complaints/$id"
                  params={{ id: c.id }}
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" /> View & Print Draft
                </Link>

                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Delete Complaint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
