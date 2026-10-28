import {
  AIProvider,
  ChatMessage,
  InternalCaseSummary,
  InvestigationResult,
  RetrievalDocument,
  ExplanationGeneratorResponse,
  GovernmentService,
  GuidanceEngineResponse,
  ActionPlanGeneratorResponse,
  CombinedRAGResponse,
} from "../provider";

/**
 * Normalizes any embedding vector to strictly 768 dimensions for Supabase VECTOR(768) compatibility.
 * - Slices vector to 768 dimensions if > 768
 * - Pads with zeros if < 768
 * - Re-normalizes vector using L2 norm so ||v||_2 = 1.0 (maintains cosine similarity validity)
 */
export function normalizeVectorTo768(vec: number[]): number[] {
  if (!vec || vec.length === 0) {
    return new Array(768).fill(0);
  }

  let sliced: number[];
  if (vec.length >= 768) {
    sliced = vec.slice(0, 768);
  } else {
    sliced = [...vec, ...new Array(768 - vec.length).fill(0)];
  }

  let sumSq = 0;
  for (let i = 0; i < sliced.length; i++) {
    sumSq += sliced[i] * sliced[i];
  }

  const norm = Math.sqrt(sumSq);
  if (norm === 0) return sliced;

  return sliced.map((val) => val / norm);
}

/**
 * Dual JSON Recovery Parser
 * Robustly parses JSON from LLM outputs, recovering structured objects even if the model
 * wraps the JSON in markdown triple-backticks or conversational text.
 */
export function parseLlmJson<T>(rawText: string): T | null {
  if (!rawText || rawText.trim() === "") return null;

  // 1. Direct JSON parse attempt
  try {
    return JSON.parse(rawText.trim()) as T;
  } catch {
    // Continue to fallback regex extraction
  }

  // 2. Extract JSON payload inside ```json ... ``` or raw {...} block
  const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim()) as T;
    } catch {
      // Continue
    }
  }

  // 3. Regex match for outermost curly braces {...}
  const curlyMatch = rawText.match(/\{[\s\S]*\}/);
  if (curlyMatch) {
    try {
      return JSON.parse(curlyMatch[0].trim()) as T;
    } catch {
      // Continue
    }
  }

  return null;
}

export class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private embeddingModel: string;
  public lastCallFailed: boolean = false;

  constructor() {
    this.apiKey = (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    this.model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
    this.embeddingModel = process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";
  }

  private async callOpenRouterApi(messages: any[], jsonMode = true): Promise<string> {
    if (!this.apiKey || this.apiKey.startsWith("your_")) {
      console.warn("⚠️ [OpenRouter]: No OPENROUTER_API_KEY set.");
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    const payload: any = {
      model: this.model,
      messages,
      temperature: 0.2,
    };

    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://meyyurai.app",
          "X-Title": "Meyyurai Legal Assistant",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ [OpenRouter HTTP ${response.status}]: ${errorText}`);
        throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || "";
      this.lastCallFailed = false;
      return content;
    } catch (err: any) {
      clearTimeout(timeout);
      this.lastCallFailed = true;
      console.warn("⚠️ [OpenRouter Exception]:", err.message);
      throw err;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey || this.apiKey.startsWith("your_")) {
      return new Array(768).fill(0);
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://meyyurai.app",
          "X-Title": "Meyyurai Legal Assistant",
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text.slice(0, 8000),
          dimensions: 768,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const rawVec = data.data?.[0]?.embedding;
        if (Array.isArray(rawVec) && rawVec.length > 0) {
          return normalizeVectorTo768(rawVec);
        }
      } else {
        console.warn(`⚠️ [OpenRouter Embedding HTTP ${res.status}]: Returning zero-vector fallback.`);
      }
    } catch (err: any) {
      console.warn("⚠️ [OpenRouter Embedding Exception]:", err.message);
    }

    return new Array(768).fill(0);
  }

  async investigate(userQuery: string, chatHistory: ChatMessage[]): Promise<InvestigationResult> {
    const prompt = `You are an AI legal intake specialist for the Meyyurai Legal Aid Platform (India).
Analyze the user's input and determine if you need to ask clarifying questions or build an internal case summary.

Return MUST be valid JSON with this EXACT structure:
{
  "needs_clarification": false,
  "follow_up_questions": ["Question 1?"],
  "internal_case_summary": {
    "legal_category": "Labour & Wages",
    "jurisdiction": "Central",
    "timeline": "Last 3 months",
    "parties_involved": "Employee vs Employer",
    "important_facts": ["Salary unpaid for 2 months"],
    "missing_facts": [],
    "possible_authorities": ["Labour Commissioner"],
    "evidence_mentioned": ["Bank statements"],
    "confidence": "high"
  },
  "search_query": "unpaid wages salary delay Payment of Wages Act section",
  "domain_tags": ["labour", "wages"]
}

User Query: "${userQuery}"`;

    try {
      const messages = [
        ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt },
      ];

      const raw = await this.callOpenRouterApi(messages, true);
      const parsed = parseLlmJson<InvestigationResult>(raw);

      if (parsed) {
        return parsed;
      }
    } catch (err: any) {
      console.warn("⚠️ [OpenRouter Investigate Fallback]:", err.message);
    }

    // Structured Rule Fallback
    return {
      needs_clarification: false,
      search_query: userQuery,
      internal_case_summary: {
        legal_category: "General Legal Counsel",
        jurisdiction: "India",
        timeline: "Recent",
        parties_involved: "Individual",
        important_facts: [userQuery],
        missing_facts: [],
        possible_authorities: ["Legal Aid Services Authority"],
        evidence_mentioned: [],
        confidence: "medium",
      },
      domain_tags: ["general"],
    };
  }

  async explain(
    userQuery: string,
    caseSummary: InternalCaseSummary | undefined,
    retrievedDocuments: RetrievalDocument[],
  ): Promise<ExplanationGeneratorResponse> {
    const prompt = `You are a legal scholar simplifying Indian law for citizens.
Explain the relevant laws based ONLY on retrieved documents.

Query: "${userQuery}"
Summary: ${JSON.stringify(caseSummary || {})}
Retrieved Docs: ${JSON.stringify(retrievedDocuments)}

Return valid JSON matching:
{
  "situation_summary": "Plain English explanation of rights and statutory protections...",
  "relevant_laws": [
    {
      "act_name": "Payment of Wages Act, 1936",
      "section": "Section 15",
      "official_source": "India Code",
      "official_url": "https://www.indiacode.nic.in"
    }
  ],
  "what_this_means": "Practical meaning for the citizen...",
  "confidence_level": "High"
}`;

    try {
      const messages = [{ role: "user", content: prompt }];
      const raw = await this.callOpenRouterApi(messages, true);
      const parsed = parseLlmJson<ExplanationGeneratorResponse>(raw);
      if (parsed) return parsed;
    } catch (err: any) {
      console.warn("⚠️ [OpenRouter Explain Fallback]:", err.message);
    }

    return {
      situation_summary: `Based on your situation "${userQuery}", you have rights under Indian statutory provisions.`,
      relevant_laws: retrievedDocuments.map((doc) => ({
        act_name: doc.act_name || "Indian Statute",
        section: doc.section_number || "General Provision",
        official_source: "India Code",
        official_url: doc.official_url || "https://www.indiacode.nic.in",
      })),
      what_this_means: "You can seek legal recourse and file a formal dispute with the designated authority.",
      confidence_level: retrievedDocuments.length > 0 ? "High" : "Medium",
    };
  }

  async guide(
    explanation: ExplanationGeneratorResponse,
    retrievedServices: GovernmentService[],
  ): Promise<GuidanceEngineResponse> {
    const prompt = `Provide actionable guidance based on legal explanation and services.

Explanation: ${JSON.stringify(explanation)}
Services: ${JSON.stringify(retrievedServices)}

Return valid JSON:
{
  "why_these_laws_apply": "Reasoning...",
  "immediate_actions": ["Step 1", "Step 2"],
  "where_to_file": {
    "authority": "Labour Commissioner / Samadhan Portal",
    "portal_url": "https://samadhan.labour.gov.in",
    "contact_details": "Helpline: 14489",
    "why_this_authority": "Jurisdiction over wage claims"
  },
  "government_helplines": [
    {
      "name": "National Legal Services Authority (NALSA)",
      "number": "15100",
      "description": "24x7 Free Legal Advice"
    }
  ],
  "documents_to_prepare": ["Employment Contract", "Bank Account Statement"],
  "expected_process": ["Submission of application", "Notice to employer", "Conciliation"],
  "time_limits": "3 years from date of wage deduction"
}`;

    try {
      const messages = [{ role: "user", content: prompt }];
      const raw = await this.callOpenRouterApi(messages, true);
      const parsed = parseLlmJson<GuidanceEngineResponse>(raw);
      if (parsed) return parsed;
    } catch (err: any) {
      console.warn("⚠️ [OpenRouter Guide Fallback]:", err.message);
    }

    return {
      why_these_laws_apply: explanation.what_this_means,
      immediate_actions: [
        "Gather all supporting documents and correspondence",
        "Submit a formal representation to the opposite party",
        "Contact NALSA free legal assistance at 15100",
      ],
      where_to_file: {
        authority: "District Legal Services Authority (DLSA) / Labour Office",
        portal_url: "https://nalsa.gov.in",
        contact_details: "Helpline: 15100",
        why_this_authority: "Provides free legal representation to eligible citizens under Legal Services Authorities Act",
      },
      government_helplines: [
        {
          name: "National Legal Services Authority (NALSA)",
          number: "15100",
          description: "24x7 Toll-Free Legal Advice",
        },
      ],
      documents_to_prepare: ["Identity proof", "Written grievance statement", "Evidence of communication"],
      expected_process: ["Intake and verification", "Conciliation hearing", "Formal legal order"],
      time_limits: "3 years standard limitation period",
    };
  }

  async generateActionPlan(guidance: GuidanceEngineResponse): Promise<ActionPlanGeneratorResponse> {
    return {
      current_stage: "Initial Complaint Filing",
      immediate_actions: guidance.immediate_actions,
      authorities_to_contact: guidance.where_to_file?.authority ? [guidance.where_to_file.authority] : ["Legal Services Authority"],
      expected_outcomes: ["Written acknowledgment", "Formal dispute resolution"],
      additional_information_needed: guidance.documents_to_prepare,
      continue_guidance: guidance.expected_process,
    };
  }

  async generateCombinedRAGResponse(
    userQuery: string,
    caseSummary: InternalCaseSummary | undefined,
    retrievedDocuments: RetrievalDocument[],
    retrievedServices: GovernmentService[],
  ): Promise<CombinedRAGResponse> {
    const prompt = `You are Meyyurai, an expert Indian AI Legal Advisor.
Generate a comprehensive, accurate statutory explanation, step-by-step guidance, and action plan based strictly on the retrieved laws and government services.

User Query: "${userQuery}"
Case Summary: ${JSON.stringify(caseSummary || {})}
Retrieved Official Statutes: ${JSON.stringify(retrievedDocuments)}
Government Portals & Services: ${JSON.stringify(retrievedServices)}

Return MUST be valid JSON with this structure:
{
  "explanation": {
    "situation_summary": "Clear plain-language summary of user situation and statutory rights",
    "relevant_laws": [
      {
        "act_name": "Name of Act",
        "section": "Section XX",
        "official_source": "India Code",
        "official_url": "Official URL"
      }
    ],
    "what_this_means": "Practical legal implication for the user",
    "confidence_level": "High"
  },
  "guidance": {
    "why_these_laws_apply": "Detailed legal reasoning",
    "immediate_actions": ["Action 1", "Action 2"],
    "where_to_file": {
      "authority": "Authority Name",
      "portal_url": "https://...",
      "contact_details": "Contact Info",
      "why_this_authority": "Jurisdiction explanation"
    },
    "government_helplines": [
      {
        "name": "NALSA Legal Aid Helpline",
        "number": "15100",
        "description": "24x7 Toll-Free Legal Guidance"
      }
    ],
    "documents_to_prepare": ["Doc 1", "Doc 2"],
    "expected_process": ["Step 1", "Step 2"],
    "time_limits": "Limitation period details"
  },
  "action_plan": {
    "current_stage": "Stage 1: Documentation & Legal Notice",
    "immediate_actions": ["Action 1", "Action 2"],
    "authorities_to_contact": ["Authority Name"],
    "expected_outcomes": ["Outcome 1"],
    "additional_information_needed": ["Info 1"],
    "continue_guidance": ["Next Step 1"]
  }
}`;

    try {
      const messages = [{ role: "user", content: prompt }];
      const raw = await this.callOpenRouterApi(messages, true);
      const parsed = parseLlmJson<CombinedRAGResponse>(raw);

      if (parsed && parsed.explanation && parsed.guidance && parsed.action_plan) {
        return parsed;
      }
    } catch (err: any) {
      console.warn("⚠️ [OpenRouter Combined RAG Fallback]:", err.message);
    }

    // Dual Fallback via individual calls
    const explanation = await this.explain(userQuery, caseSummary, retrievedDocuments);
    const guidance = await this.guide(explanation, retrievedServices);
    const actionPlan = await this.generateActionPlan(guidance);

    return { explanation, guidance, action_plan: actionPlan };
  }
}
