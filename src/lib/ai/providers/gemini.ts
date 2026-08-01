import {
  ActionPlanGeneratorResponse,
  AIProvider,
  ChatMessage,
  ExplanationGeneratorResponse,
  GovernmentService,
  GuidanceEngineResponse,
  InternalCaseSummary,
  InvestigationResult,
  RetrievalDocument,
} from "../provider";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private embeddingModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    this.model = "gemini-2.5-pro";
    this.embeddingModel = "text-embedding-004";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      console.warn("No GEMINI_API_KEY found, using dummy zero vector for embedding.");
      return new Array(768).fill(0);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${this.embeddingModel}`,
          content: { parts: [{ text }] },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini Embedding Error: ${response.statusText}`);
    }

    const data = (await response.json()) as { embedding: { values: number[] } };
    return data.embedding.values;
  }

  async investigate(userQuery: string, chatHistory: ChatMessage[]): Promise<InvestigationResult> {
    const systemInstruction = `
You are Meyyurai's Legal Intake & Case Investigator.
Your job is to analyze the user's query and conversation history to determine:
1. Do we have enough information to categorize the issue and construct a targeted legal search query?
2. If NOT, ask clarifying questions.
3. If YES, construct an internal_case_summary and a search_query.

Output MUST be valid JSON matching this schema:
{
  "needs_clarification": boolean,
  "follow_up_questions": ["string"],
  "internal_case_summary": {
    "legal_category": "string",
    "jurisdiction": "string",
    "timeline": "string",
    "parties_involved": "string",
    "important_facts": ["string"],
    "missing_facts": ["string"],
    "possible_authorities": ["string"],
    "evidence_mentioned": ["string"],
    "confidence": "low" | "medium" | "high"
  },
  "search_query": "string",
  "domain_tags": ["string"]
}
`;

    if (!this.apiKey) {
      // Fallback mock if no API key present
      return {
        needs_clarification: false,
        internal_case_summary: {
          legal_category: "Labor & Employment",
          jurisdiction: "Central / State",
          confidence: "medium",
          important_facts: [userQuery],
        },
        search_query: userQuery,
        domain_tags: ["labor", "wages"],
      };
    }

    const formattedHistory = chatHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const prompt = `Conversation History:\n${formattedHistory}\n\nLatest User Query: ${userQuery}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini Investigate Error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }

  async explain(
    userQuery: string,
    caseSummary: InternalCaseSummary | undefined,
    retrievedDocuments: RetrievalDocument[],
  ): Promise<ExplanationGeneratorResponse> {
    const systemInstruction = `
You are Meyyurai's Explanation Generator.
Your ONLY job is to explain the retrieved official legal documents in simple language.
Do NOT give practical guidance, do NOT suggest authorities (that happens in the next stage).
Ground your answer STRICTLY in the provided retrieved documents. If confidence is low, state what is missing.

Output MUST be valid JSON matching this schema:
{
  "situation_summary": "string",
  "relevant_laws": [
    {
      "act_name": "string",
      "section": "string",
      "official_source": "string",
      "official_url": "string"
    }
  ],
  "what_this_means": "string",
  "confidence_level": "High" | "Medium" | "Low"
}
`;

    if (!this.apiKey) {
      return {
        situation_summary: "Summary based on provided legal context.",
        relevant_laws: retrievedDocuments.map((doc) => ({
          act_name: doc.act_name || "Official Act",
          section: doc.section_number || "General",
          official_source: "Government Gazette",
          official_url: doc.official_url || "https://e-gazette.gov.in",
        })),
        what_this_means: "Explanation of statutory provisions.",
        confidence_level: retrievedDocuments.length > 0 ? "High" : "Low",
      };
    }

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `User Query: ${userQuery}\nCase Summary: ${JSON.stringify(caseSummary)}\nRetrieved Docs: ${JSON.stringify(retrievedDocuments)}`,
          },
        ],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: messages,
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );

    if (!response.ok) throw new Error(`Gemini Explain Error: ${response.statusText}`);
    const data = (await response.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }

  async guide(
    explanation: ExplanationGeneratorResponse,
    retrievedServices: GovernmentService[],
  ): Promise<GuidanceEngineResponse> {
    const systemInstruction = `
You are Meyyurai's Guidance Engine.
Based on the provided legal explanation and retrieved government services, provide actionable, practical next steps.
Do NOT invent authorities or helplines that are not in the retrieved services list.

Output MUST be valid JSON matching this schema:
{
  "why_these_laws_apply": "string",
  "immediate_actions": ["string"],
  "where_to_file": {
    "authority": "string",
    "portal_url": "string",
    "contact_details": "string",
    "why_this_authority": "string"
  },
  "government_helplines": [
    {
      "name": "string",
      "number": "string",
      "description": "string"
    }
  ],
  "documents_to_prepare": ["string"],
  "expected_process": ["string"],
  "time_limits": "string"
}
`;

    if (!this.apiKey) {
      return {
        why_these_laws_apply: "Mock application",
        immediate_actions: ["Mock action"],
        documents_to_prepare: ["Mock doc"],
        expected_process: ["Mock process"],
      };
    }

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `Legal Explanation: ${JSON.stringify(explanation)}\n\nRetrieved Government Services: ${JSON.stringify(retrievedServices)}`,
          },
        ],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: messages,
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );

    if (!response.ok) throw new Error(`Gemini Guide Error: ${response.statusText}`);
    const data = (await response.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }

  async generateActionPlan(guidance: GuidanceEngineResponse): Promise<ActionPlanGeneratorResponse> {
    const systemInstruction = `
You are Meyyurai's Action Plan Generator.
Your job is to summarize the guidance into a concise, high-level action plan.

Output MUST be valid JSON matching this schema:
{
  "current_stage": "string",
  "immediate_actions": ["string"],
  "authorities_to_contact": ["string"],
  "expected_outcomes": ["string"],
  "additional_information_needed": ["string"],
  "continue_guidance": ["string"]
}
`;

    if (!this.apiKey) {
      return {
        current_stage: "Mock Stage",
        immediate_actions: ["Mock Action"],
        authorities_to_contact: [],
        expected_outcomes: [],
        additional_information_needed: [],
        continue_guidance: [],
      };
    }

    const messages = [{ role: "user", parts: [{ text: `Guidance: ${JSON.stringify(guidance)}` }] }];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: messages,
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );

    if (!response.ok) throw new Error(`Gemini Action Plan Error: ${response.statusText}`);
    const data = (await response.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }
}
