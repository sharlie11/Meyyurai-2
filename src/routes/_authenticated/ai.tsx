import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Mic,
  ImagePlus,
  FileUp,
  Send,
  Scale,
  BookOpen,
  CheckCircle2,
  FileText,
  Building2,
  Phone,
  ArrowRight,
  Lightbulb,
  ShieldCheck,
  User,
  AlertTriangle,
  ExternalLink,
  Code,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag,
  MapPin,
  Clock,
  Users,
  HelpCircle,
  Briefcase,
  FileQuestion,
  Gavel,
  Mail,
  Info,
} from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { GeneratedAiResponse, RetrievalDocument } from "@/lib/ai/provider";
import { getLawOfficialUrl, getLawSectionUrl } from "@/lib/data/rights-data";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "Meyyurai AI — Legal Guidance" },
      {
        name: "description",
        content: "Describe your situation and get clear next steps, rights, and official laws.",
      },
    ],
  }),
  component: AiScreen,
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string; // for user
  aiData?: GeneratedAiResponse & { retrieved_documents?: RetrievalDocument[] }; // for assistant
  isError?: boolean;
};

export function AiScreen() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Adjust textarea height dynamically across browsers
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const handleSelectSuggestion = (text: string) => {
    if (loading) return;
    setInput(text);
    setTimeout(() => {
      textareaRef.current?.focus();
      scrollToBottom();
    }, 50);
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    toast.info("Conversation reset");
  };

  const submit = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        reqHeaders["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
          question: userMessage.content,
          language: "en",
          conversation_id: conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "_err",
            role: "assistant",
            content: `Backend Error (${res.status}): ${data.error || "Ensure the backend is running."}`,
            isError: true,
          },
        ]);
        setLoading(false);
        return;
      }

      setConversationId(data.conversation_id);

      const assistantMessage: Message = {
        id: Date.now().toString() + "_ai",
        role: "assistant",
        content: "",
        aiData: data.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const error = err as Error;
      console.error("Network or catch error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_err2",
          role: "assistant",
          content: `Network Error: ${error.message}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col animate-fade-up">
      <ScreenHeader
        eyebrow="Meyyurai AI"
        title="Legal Guidance Platform"
        description="Grounded exclusively in official Government of India sources."
        right={
          messages.length > 0 ? (
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Chat
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pb-20">
        {messages.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">How can Meyyurai help?</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Describe your legal situation. The AI will retrieve official laws and explain them in
              plain language.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-[15px] text-primary-foreground shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="w-full max-w-3xl space-y-4">
                    {msg.isError ? (
                      <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        <div className="flex items-center gap-2 font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          Something went wrong
                        </div>
                        <p className="mt-1">{msg.content}</p>
                      </div>
                    ) : (
                      <AiStructuredResponse
                        data={msg.aiData!}
                        onSelectSuggestion={handleSelectSuggestion}
                        isLoading={loading}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex w-full max-w-3xl items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Sparkles className="h-4 w-4 animate-pulse text-muted-foreground" />
                </div>
                <div className="w-full max-w-sm space-y-3 pt-2">
                  <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-4/6 animate-pulse rounded bg-secondary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input box */}
      <div className="border-t border-border p-3 bg-background">
        <div className="rounded-xl border border-input bg-card shadow-sm transition-focus-within focus-within:ring-2 focus-within:ring-primary/20">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("ai.placeholder")}
            rows={1}
            className="max-h-32 min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none overflow-y-auto"
          />
          <div className="flex items-center justify-between border-t border-border/50 pt-2 px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toast.info("Voice input coming soon.")}
                aria-label="Voice input"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Mic className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={() => toast.info("Document analysis coming soon.")}
                aria-label="Upload document"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <FileUp className="h-4.5 w-4.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center rounded-full bg-primary p-2.5 text-primary-foreground transition-all hover:bg-primary-hover disabled:opacity-50"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiStructuredResponse({
  data,
  onSelectSuggestion,
  isLoading,
}: {
  data: GeneratedAiResponse & {
    retrieved_documents?: RetrievalDocument[];
    retrieved_services?: unknown[];
    internal_case_summary?: unknown;
  };
  onSelectSuggestion: (s: string) => void;
  isLoading?: boolean;
}) {
  const [showTransparency, setShowTransparency] = useState(false);

  if (data.needs_clarification) {
    return (
      <div className="animate-fade-up rounded-3xl border border-warning/30 bg-warning/5 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-warning" />
          <h3 className="text-base font-semibold text-foreground">Need More Information</h3>
        </div>
        <p className="text-[15px] text-muted-foreground mb-4">
          To provide accurate legal retrieval, please clarify the following:
        </p>
        <div className="space-y-2">
          {(data.follow_up_questions || []).map((q, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectSuggestion(q)}
              className="flex w-full items-center justify-between rounded-xl bg-background px-4 py-3 text-left text-sm text-foreground shadow-sm hover:bg-secondary transition-colors border border-border disabled:opacity-50"
            >
              <span>{q}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const { explanation, guidance, action_plan } = data;

  return (
    <div className="space-y-4 w-full animate-fade-up">
      {/* 0. Source Mode Badge */}
      <div className="w-full flex items-center justify-between px-1">
        {data.is_fallback ? (
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 shadow-sm w-fit">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Offline Statutory Mode — {data.provider_name || "Statutory Knowledge Base"}</span>
            </div>
            {data.fallback_reason && (
              <p className="text-[11px] text-muted-foreground px-1">
                ℹ️ {data.fallback_reason}
              </p>
            )}
          </div>
        ) : (data.retrieval_count || 0) > 0 ? (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>✓ Verified — {data.provider_name || "Gemini"} + RAG ({data.retrieval_count} Legal {data.retrieval_count === 1 ? "Source" : "Sources"})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 shadow-sm">
            <Info className="h-4 w-4 shrink-0 text-blue-500" />
            <span>General guidance — no specific statute matched ({data.provider_name || "Gemini"})</span>
          </div>
        )}
      </div>

      {/* 0b. Dynamic AI Case Intake & Fact Extraction Card */}
      {(() => {
        const rawSummary = data.internal_case_summary;
        if (!rawSummary) return null;
        const summary = typeof rawSummary === "string" ? JSON.parse(rawSummary) : rawSummary;
        if (!summary || typeof summary !== "object") return null;

        const hasDetails =
          summary.legal_category ||
          summary.jurisdiction ||
          summary.parties_involved ||
          (summary.important_facts && summary.important_facts.length > 0) ||
          (summary.possible_authorities && summary.possible_authorities.length > 0);

        if (!hasDetails) return null;

        return (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Case Intake & Extracted Facts
                </h3>
              </div>
              {summary.confidence && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                  {summary.confidence} Confidence
                </span>
              )}
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2">
              {summary.legal_category && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-background border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary shadow-xs">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  {summary.legal_category}
                </span>
              )}
              {summary.jurisdiction && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-background border border-border px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {summary.jurisdiction}
                </span>
              )}
              {summary.timeline && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-background border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {summary.timeline}
                </span>
              )}
            </div>

            {/* Parties Involved */}
            {summary.parties_involved && (
              <div className="rounded-2xl bg-background/80 border border-border/60 p-3 space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Parties Involved
                </h4>
                <p className="text-sm font-medium text-foreground">
                  {summary.parties_involved}
                </p>
              </div>
            )}

            {/* Important Facts */}
            {summary.important_facts && summary.important_facts.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Key Case Facts
                </h4>
                <ul className="space-y-1 pl-1">
                  {summary.important_facts.map((fact: string, idx: number) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Facts */}
            {summary.missing_facts && summary.missing_facts.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <FileQuestion className="h-3.5 w-3.5" /> Missing / Clarification Details
                </h4>
                <ul className="space-y-1 pl-1">
                  {summary.missing_facts.map((fact: string, idx: number) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Authorities & Evidence Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {summary.possible_authorities && summary.possible_authorities.length > 0 && (
                <div className="rounded-2xl bg-background border border-border p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Gavel className="h-3.5 w-3.5 text-primary" /> Relevant Authorities
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.possible_authorities.map((auth: string, idx: number) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        {auth}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summary.evidence_mentioned && summary.evidence_mentioned.length > 0 && (
                <div className="rounded-2xl bg-background border border-border p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Evidence Mentioned
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.evidence_mentioned.map((ev: string, idx: number) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 1. Situation Summary */}
      {explanation?.situation_summary && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Situation Summary
            </h3>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground">
            {explanation.situation_summary}
          </p>
        </div>
      )}

      {/* 2. Legal Explanation Card */}
      {explanation && (
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="bg-primary/5 p-5 border-b border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Official Legal Position</h3>
            </div>

            {/* Retrieved Laws */}
            {explanation.relevant_laws && explanation.relevant_laws.length > 0 && (
              <div className="space-y-3 mb-4">
                {explanation.relevant_laws.map((law, idx) => {
                  const metaDetails = [law.section, law.official_source]
                    .filter(Boolean)
                    .join(" • ");
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-primary/20 bg-background p-3 flex justify-between items-start gap-3"
                    >
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{law.act_name}</h4>
                        {metaDetails ? (
                          <p className="text-xs text-muted-foreground">{metaDetails}</p>
                        ) : null}
                      </div>
                      {law.official_url && (
                        <a
                          href={law.official_url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[10px] font-medium text-foreground hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" /> Official Source
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> What this means
              </h4>
              <p className="text-sm leading-relaxed text-foreground/90">
                {explanation.what_this_means}
              </p>
            </div>
            {guidance?.why_these_laws_apply && (
              <div className="mt-3 pt-3 border-t border-primary/10">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Why this applies:</span>{" "}
                  {guidance.why_these_laws_apply}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Practical Guidance Card (Govt Services, Actions) */}
      {guidance && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Actionable Guidance</h3>
          </div>

          {/* Helplines */}
          {guidance.government_helplines && guidance.government_helplines.length > 0 && (
            <div className="rounded-2xl bg-secondary/30 border border-border p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Official Helplines
              </h4>
              <div className="space-y-2">
                {guidance.government_helplines.map((hp, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{hp.name}</p>
                      <p className="text-xs text-muted-foreground">{hp.description}</p>
                    </div>
                    <a
                      href={`tel:${hp.number}`}
                      className="font-mono text-sm font-bold text-primary px-3 py-1 bg-primary/10 rounded-md shrink-0 text-center"
                    >
                      {hp.number}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Where to File & Nodal Officer Access */}
          {guidance.where_to_file && (
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Gavel className="h-3.5 w-3.5 text-primary" /> Authority Access & Where to File
                </h4>
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  Official Nodal Body
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-base font-bold text-foreground">
                  {guidance.where_to_file.authority}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {guidance.where_to_file.why_this_authority}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {guidance.where_to_file.portal_url && (
                    <a
                      href={guidance.where_to_file.portal_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Official Online Portal
                    </a>
                  )}
                  {guidance.where_to_file.contact_details && (
                    <a
                      href={`tel:${guidance.where_to_file.contact_details.replace(/[^0-9]/g, "")}`}
                      className="text-xs font-semibold bg-background border border-border px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-foreground hover:bg-secondary transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" /> {guidance.where_to_file.contact_details}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Action Plan Card */}
      {action_plan && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="text-lg font-semibold text-foreground">Your Action Plan</h3>
            </div>
            {action_plan.current_stage ? (
              <span className="text-xs font-medium bg-secondary px-2.5 py-1 rounded-full text-foreground">
                Stage: {action_plan.current_stage}
              </span>
            ) : null}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Immediate Actions */}
            {action_plan.immediate_actions && action_plan.immediate_actions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Immediate Steps</h4>
                <ul className="space-y-1.5">
                  {action_plan.immediate_actions.map((act, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {act}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Documents */}
            {guidance?.documents_to_prepare && guidance.documents_to_prepare.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Documents to Prepare</h4>
                <ul className="space-y-1.5">
                  {guidance.documents_to_prepare.map((doc, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {guidance?.expected_process && guidance.expected_process.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <h4 className="text-sm font-semibold text-foreground mb-2">Expected Process</h4>
              <div className="flex flex-wrap gap-2">
                {guidance.expected_process.map((step, i) => (
                  <span
                    key={i}
                    className="text-xs bg-secondary px-2.5 py-1 rounded-md text-foreground flex items-center gap-1.5"
                  >
                    <span className="opacity-50">{i + 1}.</span> {step}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Continue Guidance */}
      {action_plan?.continue_guidance && action_plan.continue_guidance.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
            Continue Investigation
          </p>
          <div className="flex flex-wrap gap-2">
            {action_plan.continue_guidance.map((q, i) => (
              <button
                key={i}
                type="button"
                disabled={isLoading}
                onClick={() => onSelectSuggestion(q)}
                className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary shadow-sm transition-colors hover:bg-primary/10 hover:border-primary/40 font-medium disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Trust & Transparency Panel */}
      <div className="pt-4 mt-4 border-t border-border/50">
        <button
          type="button"
          onClick={() => setShowTransparency(!showTransparency)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <ShieldCheck className="h-4 w-4" />
          Trust & Transparency Panel (Official Sources)
          {showTransparency ? (
            <ChevronUp className="h-4 w-4 ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-auto" />
          )}
        </button>

        {showTransparency && (
          <div className="mt-4 space-y-4 animate-fade-in text-sm text-muted-foreground bg-secondary/20 p-4 rounded-2xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2 h-2 rounded-full ${explanation?.confidence_level === "High" ? "bg-success" : explanation?.confidence_level === "Medium" ? "bg-warning" : "bg-destructive"}`}
              />
              <span className="font-medium text-foreground">
                AI Confidence Level: {explanation?.confidence_level || "Unknown"}
              </span>
            </div>
            <p className="text-xs">
              Meyyurai uses AI to explain laws and suggest actions, but it is{" "}
              <strong>not a substitute for professional legal advice</strong>. The information below
              was directly retrieved from official government sources and used to generate the
              response above.
            </p>

            {data.retrieved_documents && data.retrieved_documents.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-foreground mb-2">Retrieved Legal Texts:</h4>
                <ul className="space-y-2 text-xs">
                  {data.retrieved_documents.map((doc, i) => (
                    <li key={i} className="bg-background p-2 rounded-md border border-border/50">
                      <span className="font-medium text-foreground block">
                        {doc.act_name} - {doc.section_number}
                      </span>
                      <span className="opacity-70 line-clamp-2">"{doc.official_text}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.retrieved_services && data.retrieved_services.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-foreground mb-2">
                  Retrieved Government Services:
                </h4>
                <ul className="space-y-2 text-xs">
                  {data.retrieved_services.map((svcItem, i) => {
                    const svc = svcItem as {
                      name?: string;
                      service_type?: string;
                      description?: string;
                    };
                    return (
                      <li key={i} className="bg-background p-2 rounded-md border border-border/50">
                        <span className="font-medium text-foreground block">
                          {svc.name || "Government Service"} ({svc.service_type || "Authority"})
                        </span>
                        <span className="opacity-70">
                          {svc.description || "Official assistance department"} - Verified on{" "}
                          {new Date().toLocaleDateString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
