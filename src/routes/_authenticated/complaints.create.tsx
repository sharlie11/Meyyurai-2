import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, FileText, ArrowRight, ArrowLeft, Save, Copy, Printer, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/complaints/create")({
  component: CreateComplaintScreen,
});

export function CreateComplaintScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [category, setCategory] = useState("Labour & Employment");
  const [title, setTitle] = useState("");
  const [complainantName, setComplainantName] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [location, setLocation] = useState("");
  const [respondent, setRespondent] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [requestedAction, setRequestedAction] = useState("");
  const [contactDetails, setContactDetails] = useState("");

  // Generated Result
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    "Labour & Employment",
    "Domestic Violence",
    "Consumer Rights",
    "Cyber Crime",
    "Property & Rental",
    "Traffic & Motor Vehicle",
    "General Legal Notice",
  ];

  const handleGenerateDraft = async () => {
    if (!title.trim() || !incidentDescription.trim()) {
      toast.error("Please fill in the complaint title and incident description.");
      return;
    }

    setIsGenerating(true);
    setStep(3);

    const recipientMap: Record<string, string> = {
      "Labour & Employment": "The Deputy Labour Commissioner / Inspector of Factories",
      "Domestic Violence": "The Station House Officer (SHO) / Protection Officer under PWDVA",
      "Consumer Rights": "The President / Member Secretary, District Consumer Disputes Redressal Commission",
      "Cyber Crime": "The Officer In-Charge, Cyber Crime Police Station / National Cyber Crime Portal",
      "Property & Rental": "The Rent Authority / District Collector / Sub-Divisional Magistrate",
      "Traffic & Motor Vehicle": "The Traffic Police Commissioner / Regional Transport Officer (RTO)",
      "General Legal Notice": "The Station House Officer (SHO) / Competent Authority",
    };

    const recipient = recipientMap[category] || "The Concerned Officer In-Charge / Authority";
    const dateStr = incidentDate || new Date().toLocaleDateString("en-IN");
    const nameStr = complainantName.trim() || "[Complainant Name]";
    const respStr = respondent.trim() || "[Opposite Party / Respondent]";
    const locStr = location.trim() || "[Incident Location]";
    const reqStr = requestedAction.trim() || "Take appropriate legal action and grant immediate relief.";
    const contactStr = contactDetails.trim() || "[Phone / Email Contact]";

    const draftText = `TO:
${recipient}
${locStr}

SUBJECT:
Formal Complaint regarding ${title.trim().toUpperCase()}

RESPECTED SIR/MADAM,

I, ${nameStr}, residing at ${locStr} (Contact: ${contactStr}), submit this formal complaint regarding the unlawful incident detailed below.

1. FACTS OF THE INCIDENT
------------------------
• Incident Date: ${dateStr}
• Location of Occurrence: ${locStr}
• Party / Organization Involved: ${respStr}

Detailed Statement:
${incidentDescription.trim()}

2. SUPPORTING INFORMATION & EVIDENCE
-----------------------------------
I maintain supporting documentary evidence (including relevant records, correspondence, and notices) substantiating the facts of this incident.

3. REQUESTED ACTION
-------------------
I respectfully request your esteemed authority to:
a) Register this formal complaint and initiate an inquiry into the matter.
b) Direct the respondent (${respStr}) to: ${reqStr}
c) Issue necessary directions/orders to ensure justice and protection of my legal rights.

4. DECLARATION
--------------
I hereby declare that the facts stated above are true and correct to the best of my knowledge, information, and belief.

Date: ${new Date().toLocaleDateString("en-IN")}
Place: ${locStr}

Yours faithfully,

________________________
(${nameStr})
Contact: ${contactStr}`;

    setGeneratedDraft(draftText);
    setIsGenerating(false);
  };

  const handleSaveComplaint = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please sign in again.");
        return;
      }

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          complainant_name: complainantName,
          incident_date: incidentDate,
          location,
          respondent,
          incident_description: incidentDescription,
          requested_action: requestedAction,
          contact_details: contactDetails,
          complaint_text: generatedDraft,
        }),
      });

      if (!res.ok) throw new Error("Failed to save complaint");

      toast.success("Complaint draft saved successfully!");
      navigate({ to: "/complaints" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save complaint to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDraft);
    toast.success("Complaint draft copied to clipboard!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Create Formal Complaint Draft
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate a structured complaint draft tailored for Indian legal authorities in 3 simple steps.
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        {[
          { num: 1, label: "Select Category" },
          { num: 2, label: "Incident Details" },
          { num: 3, label: "Review & Save Draft" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 text-xs font-semibold ${
              step === s.num
                ? "text-primary"
                : step > s.num
                ? "text-emerald-500"
                : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                step === s.num
                  ? "bg-primary text-primary-foreground"
                  : step > s.num
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Category Selection */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-bold font-display">Step 1: Choose Complaint Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-4 rounded-xl text-left border text-xs font-semibold transition-all ${
                  category === cat
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={() => setStep(2)} className="rounded-xl px-6">
              Next: Enter Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Incident Form Details */}
      {step === 2 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-bold font-display">Step 2: Incident & Complainant Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Complaint Subject / Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Non-payment of salary for 2 months"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complainantName">Your Full Name</Label>
              <Input
                id="complainantName"
                placeholder="Jane Doe"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="incidentDate">Incident Date</Label>
              <Input
                id="incidentDate"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">City / Location</Label>
              <Input
                id="location"
                placeholder="e.g. Bengaluru, Karnataka"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="respondent">Opposite Party / Organization Name</Label>
              <Input
                id="respondent"
                placeholder="e.g. ABC Tech Solutions Pvt Ltd / Landlord Name"
                value={respondent}
                onChange={(e) => setRespondent(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="incidentDescription">Detailed Incident Statement *</Label>
              <Textarea
                id="incidentDescription"
                rows={5}
                placeholder="Describe what happened in detail (dates, amounts, conversations, actions taken so far)..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="requestedAction">Requested Action / Remedy</Label>
              <Input
                id="requestedAction"
                placeholder="e.g. Immediate release of pending salary of ₹85,000 plus interest"
                value={requestedAction}
                onChange={(e) => setRequestedAction(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contactDetails">Your Phone Number / Email</Label>
              <Input
                id="contactDetails"
                placeholder="+91 9876543210 | user@example.com"
                value={contactDetails}
                onChange={(e) => setContactDetails(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleGenerateDraft} disabled={isGenerating} className="rounded-xl px-6">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Generate Draft"}
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generated Draft Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Draft Notice:</strong> This complaint draft is generated for informational and formatting assistance. Please review carefully before submitting to competent authorities or legal counsel.
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <h2 className="text-base font-bold font-display">Generated Complaint Draft</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="rounded-xl text-xs">
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Text
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl text-xs">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print / PDF
                </Button>
              </div>
            </div>

            <Textarea
              rows={16}
              value={generatedDraft}
              onChange={(e) => setGeneratedDraft(e.target.value)}
              className="font-mono text-xs leading-relaxed bg-muted/30 border-border p-4 rounded-xl"
            />

            <div className="pt-2 flex justify-between items-center">
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> Edit Details
              </Button>
              <Button onClick={handleSaveComplaint} disabled={isSaving} className="rounded-xl px-6">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Complaint Draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
