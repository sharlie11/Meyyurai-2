export interface RetrievalDocument {
  chunk_id: string;
  document_id: string;
  act_name: string;
  official_url: string;
  chapter_number: string | null;
  chapter_title: string | null;
  section_number: string | null;
  subsection: string | null;
  official_text: string;
  similarity: number;
}

export interface GovernmentService {
  id: string;
  service_type: "Authority" | "Portal" | "Helpline" | "Legal Aid" | "Police";
  name: string;
  official_url?: string;
  contact_details?: Record<string, string>;
  jurisdiction: string;
  description: string;
}

export interface InternalCaseSummary {
  legal_category?: string;
  jurisdiction?: string;
  timeline?: string;
  parties_involved?: string;
  important_facts?: string[];
  missing_facts?: string[];
  possible_authorities?: string[];
  evidence_mentioned?: string[];
  confidence: "low" | "medium" | "high";
}

export interface InvestigationResult {
  needs_clarification: boolean;
  follow_up_questions?: string[];
  internal_case_summary?: InternalCaseSummary;
  search_query?: string;
  domain_tags?: string[];
}

export interface ExplanationGeneratorResponse {
  situation_summary: string;
  relevant_laws: {
    act_name: string;
    section: string;
    official_source: string;
    official_url: string;
  }[];
  what_this_means: string;
  confidence_level: "High" | "Medium" | "Low";
}

export interface GuidanceEngineResponse {
  why_these_laws_apply: string;
  immediate_actions: string[];
  where_to_file?: {
    authority: string;
    portal_url?: string;
    contact_details?: string;
    why_this_authority: string;
  };
  government_helplines?: {
    name: string;
    number: string;
    description: string;
  }[];
  documents_to_prepare: string[];
  expected_process: string[];
  time_limits?: string;
}

export interface ActionPlanGeneratorResponse {
  current_stage: string;
  immediate_actions: string[];
  authorities_to_contact: string[];
  expected_outcomes: string[];
  additional_information_needed: string[];
  continue_guidance: string[];
}

// Final aggregated response sent to UI
export interface GeneratedAiResponse {
  needs_clarification: boolean;
  is_fallback?: boolean;
  retrieval_count?: number;
  follow_up_questions?: string[];
  explanation?: ExplanationGeneratorResponse;
  guidance?: GuidanceEngineResponse;
  action_plan?: ActionPlanGeneratorResponse;
  internal_case_summary?: InternalCaseSummary;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CombinedRAGResponse {
  explanation: ExplanationGeneratorResponse;
  guidance: GuidanceEngineResponse;
  action_plan: ActionPlanGeneratorResponse;
}

export interface AIProvider {
  /**
   * Stage 1-3: Listen, Investigate, Build Case Summary
   */
  investigate(userQuery: string, chatHistory: ChatMessage[]): Promise<InvestigationResult>;

  /**
   * Stage 5: Explain the Law
   */
  explain(
    userQuery: string,
    caseSummary: InternalCaseSummary | undefined,
    retrievedDocuments: RetrievalDocument[],
  ): Promise<ExplanationGeneratorResponse>;

  /**
   * Stage 6: Generate Guidance from Govt Services
   */
  guide(
    explanation: ExplanationGeneratorResponse,
    retrievedServices: GovernmentService[],
  ): Promise<GuidanceEngineResponse>;

  /**
   * Stage 7: Generate Action Plan
   */
  generateActionPlan(guidance: GuidanceEngineResponse): Promise<ActionPlanGeneratorResponse>;

  /**
   * Single-pass combined generator for explanation, guidance, and action plan.
   * Significantly reduces latency by combining stages into 1 LLM call.
   */
  generateCombinedRAGResponse?(
    userQuery: string,
    caseSummary: InternalCaseSummary | undefined,
    retrievedDocuments: RetrievalDocument[],
    retrievedServices: GovernmentService[],
  ): Promise<CombinedRAGResponse>;

  /**
   * Generates a vector embedding for the given text.
   */
  generateEmbedding(text: string): Promise<number[]>;
}


export interface AIFactoryOptions {
  provider?: "gemini" | "ollama" | "local" | "openai" | "anthropic";
}

/**
 * Factory to get the configured AI provider.
 */
export async function getAIProvider(options?: AIFactoryOptions): Promise<AIProvider> {
  const providerType = (options?.provider || process.env.AI_PROVIDER || "gemini").toLowerCase();

  if (providerType === "gemini") {
    const { GeminiProvider } = await import("./providers/gemini");
    return new GeminiProvider();
  }

  if (providerType === "ollama" || providerType === "local") {
    const { OllamaProvider } = await import("./providers/ollama");
    return new OllamaProvider();
  }

  throw new Error(`AI Provider ${providerType} is not supported or not implemented.`);
}

