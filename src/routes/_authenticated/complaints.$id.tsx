import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FileText, ArrowLeft, Copy, Printer, Trash2, Save, Loader2, Paperclip, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  component: ComplaintDetailScreen,
});

interface ComplaintData {
  id: string;
  title: string;
  category: string;
  complaint_text: string;
  status: string;
  created_at: string;
}

interface EvidenceData {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
}

export function ComplaintDetailScreen() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<ComplaintData | null>(null);
  const [evidence, setEvidence] = useState<EvidenceData[]>([]);
  const [complaintText, setComplaintText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  const fetchComplaintDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/complaints/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to load complaint details");
      const data = await res.json();
      setComplaint(data.complaint);
      setComplaintText(data.complaint.complaint_text);
      setEvidence(data.evidence || []);
    } catch (err) {
      toast.error("Error loading complaint.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/complaints/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ complaint_text: complaintText }),
      });

      if (!res.ok) throw new Error("Failed to update complaint");
      toast.success("Complaint updated successfully!");
    } catch (err) {
      toast.error("Failed to update complaint.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this complaint?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/complaints/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to delete complaint");
      toast.success("Complaint deleted.");
      navigate({ to: "/complaints" });
    } catch (err) {
      toast.error("Failed to delete complaint.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(complaintText);
    toast.success("Copied to clipboard!");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" /> Loading complaint details...
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Complaint not found.</p>
        <Link to="/complaints" className="text-xs text-primary font-medium hover:underline">
          Back to Complaints Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/complaints" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Complaints
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-xl text-xs">
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl text-xs">
            <Printer className="w-3.5 h-3.5 mr-1" /> Print / PDF
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-xl text-xs">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              {complaint.category}
            </span>
            <h1 className="text-xl font-bold font-display mt-2">{complaint.title}</h1>
            <p className="text-xs text-muted-foreground">
              Created on {new Date(complaint.created_at).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        <Textarea
          rows={16}
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
          className="font-mono text-xs leading-relaxed bg-muted/30 border-border p-4 rounded-xl"
        />

        <div className="flex justify-end">
          <Button onClick={handleUpdate} disabled={saving} className="rounded-xl px-6">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Associated Evidence Files */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold font-display flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-primary" /> Associated Evidence & Documents
          </h2>
          <Link
            to="/evidence"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Upload Evidence
          </Link>
        </div>

        {evidence.length === 0 ? (
          <p className="text-xs text-muted-foreground">No evidence files linked to this complaint yet.</p>
        ) : (
          <div className="space-y-2">
            {evidence.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">{file.file_name}</span>
                </div>
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View File
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
