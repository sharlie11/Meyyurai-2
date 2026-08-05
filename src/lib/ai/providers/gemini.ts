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

type QueryCategory = "workplace" | "cyber" | "women" | "consumer" | "tenant" | "general";

function categorizeUserQuery(query: string): QueryCategory {
  const q = query.toLowerCase();
  if (
    q.includes("manager") ||
    q.includes("workload") ||
    q.includes("office") ||
    q.includes("boss") ||
    q.includes("salary") ||
    q.includes("job") ||
    q.includes("employee") ||
    q.includes("work") ||
    q.includes("workplace") ||
    q.includes("company") ||
    q.includes("terminate") ||
    q.includes("resignation") ||
    q.includes("pressure") ||
    q.includes("labour") ||
    q.includes("labor")
  ) {
    return "workplace";
  }

  if (
    q.includes("cyber") ||
    q.includes("hacked") ||
    q.includes("otp") ||
    q.includes("fraud") ||
    q.includes("money stolen") ||
    q.includes("online") ||
    q.includes("bank") ||
    q.includes("scam") ||
    q.includes("phishing")
  ) {
    return "cyber";
  }

  if (
    q.includes("women") ||
    q.includes("girl") ||
    q.includes("posh") ||
    q.includes("husband") ||
    q.includes("dowry") ||
    q.includes("domestic violence") ||
    q.includes("eve teasing") ||
    q.includes("stalking")
  ) {
    return "women";
  }

  if (
    q.includes("consumer") ||
    q.includes("product") ||
    q.includes("defect") ||
    q.includes("refund") ||
    q.includes("seller") ||
    q.includes("warranty") ||
    q.includes("faulty")
  ) {
    return "consumer";
  }

  if (
    q.includes("rent") ||
    q.includes("landlord") ||
    q.includes("tenant") ||
    q.includes("eviction") ||
    q.includes("deposit") ||
    q.includes("house")
  ) {
    return "tenant";
  }

  return "general";
}

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

    try {
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
        console.warn(`Gemini Embedding Warning (${response.status} ${response.statusText}), using zero-vector fallback.`);
        return new Array(768).fill(0);
      }

      const data = (await response.json()) as { embedding: { values: number[] } };
      return data.embedding.values || new Array(768).fill(0);
    } catch (err) {
      console.warn("Gemini embedding exception, using zero-vector fallback:", err);
      return new Array(768).fill(0);
    }
  }

  async investigate(userQuery: string, chatHistory: ChatMessage[]): Promise<InvestigationResult> {
    const category = categorizeUserQuery(userQuery);

    if (!this.apiKey) {
      return {
        needs_clarification: false,
        internal_case_summary: {
          legal_category:
            category === "workplace"
              ? "Labor & Employment Rights"
              : category === "cyber"
              ? "Cyber Crime & Financial Protection"
              : category === "women"
              ? "Women Protection & Safety"
              : category === "consumer"
              ? "Consumer Rights & Refund Claims"
              : category === "tenant"
              ? "Housing & Tenancy Disputes"
              : "General Citizens Rights & Assistance",
          jurisdiction: "Central / State Government of India",
          confidence: "high",
          important_facts: [userQuery],
        },
        search_query: userQuery,
        domain_tags: [category],
      };
    }

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

    const formattedHistory = chatHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const prompt = `Conversation History:\n${formattedHistory}\n\nLatest User Query: ${userQuery}`;

    try {
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
        console.warn(`Gemini API Warning (${response.status} ${response.statusText}): Falling back to rule engine.`);
        return {
          needs_clarification: false,
          internal_case_summary: {
            legal_category:
              category === "workplace"
                ? "Labor & Employment Rights"
                : category === "cyber"
                ? "Cyber Crime & Financial Protection"
                : category === "women"
                ? "Women Protection & Safety"
                : category === "consumer"
                ? "Consumer Rights & Refund Claims"
                : category === "tenant"
                ? "Housing & Tenancy Disputes"
                : "General Citizens Rights & Assistance",
            jurisdiction: "Central / State Government of India",
            confidence: "high",
            important_facts: [userQuery],
          },
          search_query: userQuery,
          domain_tags: [category],
        };
      }

      const data = (await response.json()) as {
        candidates: { content: { parts: { text: string }[] } }[];
      };
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (err) {
      console.warn("Gemini fetch exception, using rule engine fallback:", err);
      return {
        needs_clarification: false,
        internal_case_summary: {
          legal_category: category,
          jurisdiction: "Central / State Government of India",
          confidence: "high",
          important_facts: [userQuery],
        },
        search_query: userQuery,
        domain_tags: [category],
      };
    }
  }

  private getFallbackExplanation(category: QueryCategory, userQuery: string): ExplanationGeneratorResponse {
    if (category === "workplace") {
      return {
        situation_summary: `Workplace Issue Analysis: "${userQuery}". You are experiencing excessive workload, managerial pressure, or work environment distress.`,
        relevant_laws: [
          {
            act_name: "Industrial Employment (Standing Orders) Act 1946 & State Shops Act",
            section: "Section 5: Working Hours, Overtime & Conditions of Service",
            official_source: "Ministry of Labour & Employment, Govt of India",
            official_url: "https://labour.gov.in",
          },
          {
            act_name: "Occupational Safety, Health and Working Conditions Code 2020",
            section: "Section 6: Duty of Employer to Maintain Health & Mental Welfare",
            official_source: "Gazette of India",
            official_url: "https://e-gazette.gov.in",
          },
          {
            act_name: "Code on Wages 2019",
            section: "Section 14: Overtime Wages for Extra Work",
            official_source: "Ministry of Labour & Employment",
            official_url: "https://samadhan.labour.gov.in",
          },
        ],
        what_this_means:
          "Under Indian Labor Law, an employer or manager cannot coerce an employee into excessive uncompensated work hours or inflict workplace harassment/threats. You have statutory rights to fair working hours, overtime compensation, and internal grievance redressal.",
        confidence_level: "High",
      };
    }

    if (category === "cyber") {
      return {
        situation_summary: `Cyber Crime Analysis: "${userQuery}". You are facing digital fraud, unauthorized transactions, or online harassment.`,
        relevant_laws: [
          {
            act_name: "Information Technology Act 2000",
            section: "Section 66C & 66D: Identity Theft & Cheating by Personation",
            official_source: "Ministry of Electronics and Information Technology",
            official_url: "https://meity.gov.in",
          },
          {
            act_name: "RBI Guidelines on Customer Liability in Unauthorised Electronic Transactions",
            section: "Zero Liability Policy for Timely Fraud Notification",
            official_source: "Reserve Bank of India",
            official_url: "https://rbi.org.in",
          },
        ],
        what_this_means:
          "Cyber crimes and unauthorized banking transactions are strictly punishable in India. Reporting to 1930 within 72 hours limits consumer liability and freezes fraudulent accounts.",
        confidence_level: "High",
      };
    }

    if (category === "women") {
      return {
        situation_summary: `Women Safety Analysis: "${userQuery}". You are seeking guidance under statutory women protection laws.`,
        relevant_laws: [
          {
            act_name: "Sexual Harassment of Women at Workplace (POSH) Act 2013",
            section: "Section 4 & 9: Internal Complaints Committee Mandate",
            official_source: "Ministry of Women & Child Development",
            official_url: "https://wcd.nic.in",
          },
          {
            act_name: "Protection of Women from Domestic Violence Act 2005",
            section: "Section 3 & 12: Protection Orders & Relief",
            official_source: "National Commission for Women",
            official_url: "https://ncw.nic.in",
          },
        ],
        what_this_means:
          "Women in India are legally protected against physical, psychological, or workplace harassment. You have the right to file an anonymous complaint and obtain immediate protection.",
        confidence_level: "High",
      };
    }

    if (category === "consumer") {
      return {
        situation_summary: `Consumer Dispute Analysis: "${userQuery}". You are seeking a refund, replacement, or compensation for defective products or service issues.`,
        relevant_laws: [
          {
            act_name: "Consumer Protection Act 2019",
            section: "Section 2(47) & Section 35: Unfair Trade Practice & Consumer Claims",
            official_source: "Department of Consumer Affairs",
            official_url: "https://consumeraffairs.nic.in",
          },
        ],
        what_this_means:
          "Sellers and companies are legally obligated to deliver products/services as committed. Unfair practices entitle you to full refund and compensation via Consumer Courts.",
        confidence_level: "High",
      };
    }

    if (category === "tenant") {
      return {
        situation_summary: `Tenancy Dispute Analysis: "${userQuery}". You are seeking guidance on landlord-tenant rights or deposit recovery.`,
        relevant_laws: [
          {
            act_name: "Model Tenancy Act 2021 / State Rent Control Act",
            section: "Section 13: Protection Against Arbitrary Eviction & Deposit Refund",
            official_source: "Ministry of Housing and Urban Affairs",
            official_url: "https://mohua.gov.in",
          },
        ],
        what_this_means:
          "Landlords cannot evict tenants arbitrarily without due legal notice, nor withhold security deposits without itemized proof of damage.",
        confidence_level: "High",
      };
    }

    // Default General Distress
    return {
      situation_summary: `Citizens Rights & Support Analysis: "${userQuery}". You are dealing with a difficult situation and seeking guidance on where to turn.`,
      relevant_laws: [
        {
          act_name: "Constitution of India",
          section: "Article 21: Right to Life, Dignity and Personal Liberty",
          official_source: "Ministry of Law & Justice, Govt of India",
          official_url: "https://lawmin.gov.in",
        },
        {
          act_name: "Legal Services Authorities Act 1987",
          section: "Section 12: Free Legal Services & Counseling for Citizens",
          official_source: "National Legal Services Authority (NALSA)",
          official_url: "https://nalsa.gov.in",
        },
        {
          act_name: "Mental Healthcare Act 2017",
          section: "Section 29: Right to Mental Health Support & Crisis Care",
          official_source: "Ministry of Health and Family Welfare",
          official_url: "https://mohfw.gov.in",
        },
      ],
      what_this_means:
        "Every citizen in India has a fundamental right to safety, emotional support, and free legal assistance. You do not have to handle distress alone; official government counseling and legal bodies exist to support you.",
      confidence_level: "High",
    };
  }

  async explain(
    userQuery: string,
    caseSummary: InternalCaseSummary | undefined,
    retrievedDocuments: RetrievalDocument[],
  ): Promise<ExplanationGeneratorResponse> {
    const category = categorizeUserQuery(userQuery);

    if (!this.apiKey || retrievedDocuments.length === 0) {
      return this.getFallbackExplanation(category, userQuery);
    }

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

    try {
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

      if (!response.ok) {
        console.warn(`Gemini Explain Warning (${response.status} ${response.statusText}), using fallback template.`);
        return this.getFallbackExplanation(category, userQuery);
      }

      const data = (await response.json()) as {
        candidates: { content: { parts: { text: string }[] } }[];
      };
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (err) {
      console.warn("Gemini explain exception, using fallback template:", err);
      return this.getFallbackExplanation(category, userQuery);
    }
  }

  private getFallbackGuidance(category: QueryCategory): GuidanceEngineResponse {
    if (category === "workplace") {
      return {
        why_these_laws_apply:
          "Labor and employment laws exist to protect workers from excessive workload pressure, unauthorized salary deductions, or manager coercion.",
        immediate_actions: [
          "Maintain copies of all work emails, assignment logs, and chat messages detailing the pressure or manager instructions.",
          "File a formal written grievance with your internal HR or Grievance Redressal Committee.",
          "If the company fails to respond or threatens retaliation, file an online grievance on the Ministry of Labour SAMADHAN portal (samadhan.labour.gov.in).",
        ],
        where_to_file: {
          authority: "Office of the Labour Commissioner / Govt SAMADHAN Portal",
          portal_url: "https://samadhan.labour.gov.in",
          contact_details: "Labour Helpline: 14489 / Shram Suvidha: 1800-425-1514",
          why_this_authority:
            "Official Government of India statutory forum for resolving workplace disputes and employee grievances.",
        },
        government_helplines: [
          {
            name: "Ministry of Labour SAMADHAN Helpline",
            number: "14489",
            description: "24x7 Government Dispute & Grievance Portal for Employees",
          },
          {
            name: "Tele-MANAS Mental Health Counseling",
            number: "14416",
            description: "24x7 Free Counseling for Work Stress & Mental Pressure",
          },
          {
            name: "Shram Suvidha Helpline",
            number: "1800-425-1514",
            description: "National Portal for Labour Rights & Advisory",
          },
        ],
        documents_to_prepare: [
          "Employment Offer Letter, Appointment Contract & Designation Details",
          "Chronological Log & Screenshots of Work Messages / Emails from Manager",
          "Payslips & Attendance / Working Hours Records",
        ],
        expected_process: [
          "1. Formal internal HR review within 14 working days.",
          "2. Conciliation proceedings before the Conciliation Officer / Labour Department.",
          "3. Mutual settlement or binding order from the Labour Court / Industrial Tribunal.",
        ],
        time_limits: "Grievances should ideally be submitted within 30 to 90 days of occurrence.",
      };
    }

    if (category === "cyber") {
      return {
        why_these_laws_apply:
          "IT Act provisions safeguard citizens against financial fraud, online identity theft, and digital harassment.",
        immediate_actions: [
          "Call 1930 immediately to freeze fraudulent bank transfers.",
          "Take full screenshots of messages, bank statements, and sender IDs.",
          "Lodge an official report on cybercrime.gov.in.",
        ],
        where_to_file: {
          authority: "National Cyber Crime Reporting Portal",
          portal_url: "https://cybercrime.gov.in",
          contact_details: "Cyber Helpline: 1930",
          why_this_authority:
            "Central government nodal agency for cyber crime investigation and bank account freeze.",
        },
        government_helplines: [
          {
            name: "National Cyber Crime Helpline",
            number: "1930",
            description: "24x7 Financial Fraud & Cyber Crime Emergency Helpline",
          },
          {
            name: "RBI Financial Consumer Helpline",
            number: "14440",
            description: "Banking Security & Consumer Protection Guidance",
          },
        ],
        documents_to_prepare: [
          "Bank Statement / Transaction Reference Numbers",
          "Screenshots of Fraudulent Messages / Emails / Phone Numbers",
          "Government Photo ID Proof",
        ],
        expected_process: [
          "1. Immediate financial lien/freeze on fraud bank account.",
          "2. Cyber Crime Cell investigation and FIR registration.",
          "3. Refund process as per RBI Zero Liability Guidelines.",
        ],
        time_limits: "Report within 24 to 72 hours for maximum refund probability.",
      };
    }

    if (category === "women") {
      return {
        why_these_laws_apply:
          "Statutory women safety laws guarantee immediate emergency response, anonymous reporting, and legal protection.",
        immediate_actions: [
          "Call 1091 (Women Helpline) or 112 (ERSS) if in immediate danger.",
          "File a written complaint with the Internal Complaints Committee (ICC) or local Police Station.",
        ],
        where_to_file: {
          authority: "National Commission for Women / Local Women Police Station",
          portal_url: "https://ncwapps.nic.in",
          contact_details: "Women Helpline: 1091 / ERSS: 112",
          why_this_authority:
            "Authorized statutory body under Govt of India for women protection.",
        },
        government_helplines: [
          {
            name: "National Women Helpline",
            number: "1091",
            description: "24x7 Emergency Helpline for Women in Distress",
          },
          {
            name: "Emergency Response Support System (ERSS)",
            number: "112",
            description: "24x7 All-India Police, Fire & Emergency Services",
          },
        ],
        documents_to_prepare: [
          "Written Statement of Incident Facts",
          "Screenshots, Call Logs, or Witness Details",
          "Government Photo ID Proof",
        ],
        expected_process: [
          "1. Immediate emergency response & protection order.",
          "2. Inquiry by ICC / Police Officer within statutory timeline.",
        ],
        time_limits: "Complaints can be filed immediately or within 3 months.",
      };
    }

    if (category === "consumer") {
      return {
        why_these_laws_apply:
          "Consumer Protection Act protects buyers against defective products, delayed services, and fraudulent sellers.",
        immediate_actions: [
          "Call 1915 to lodge a grievance with National Consumer Helpline.",
          "File an online complaint on e-Daakhil (edaakhil.nic.in).",
        ],
        where_to_file: {
          authority: "National Consumer Disputes Redressal Commission / e-Daakhil",
          portal_url: "https://edaakhil.nic.in",
          contact_details: "National Consumer Helpline: 1915",
          why_this_authority: "Official statutory commission for consumer refund & compensation claims.",
        },
        government_helplines: [
          {
            name: "National Consumer Helpline",
            number: "1915",
            description: "24x7 Toll-Free Consumer Complaints & Refund Portal",
          },
        ],
        documents_to_prepare: [
          "Tax Invoice / Purchase Receipt",
          "Warranty Card & Customer Support Emails",
          "Photos/Videos of Defective Product",
        ],
        expected_process: [
          "1. Notice issued to seller/manufacturer.",
          "2. Conciliation / Mediation hearing.",
          "3. Refund and compensation order.",
        ],
        time_limits: "Complaints should be filed within 2 years of purchase.",
      };
    }

    return {
      why_these_laws_apply:
        "Constitutional provisions and legal services authorities guarantee free counseling, legal representation, and emergency care for any citizen in distress.",
      immediate_actions: [
        "Call Tele-MANAS (14416) for free 24x7 emotional & stress counseling",
        "Contact NALSA Helpline (15100) for free legal aid",
        "Gather ID proof and a short summary of your situation",
      ],
      where_to_file: {
        authority: "District Legal Services Authority (DLSA) / NALSA",
        portal_url: "https://nalsa.gov.in",
        contact_details: "Legal Aid Helpline: 15100 / Tele-MANAS: 14416",
        why_this_authority:
          "Statutory body established by Parliament to provide free legal aid and advice to citizens.",
      },
      government_helplines: [
        {
          name: "Tele-MANAS Mental Health Support",
          number: "14416",
          description: "24x7 Free & Confidential Govt Psychological Support",
        },
        {
          name: "National Legal Aid Helpline (NALSA)",
          number: "15100",
          description: "24x7 Free Legal Advice & Lawyer Assistance",
        },
        {
          name: "Emergency Response Support System (ERSS)",
          number: "112",
          description: "24x7 Nationwide Police & Emergency Assistance",
        },
      ],
      documents_to_prepare: [
        "Government ID Proof (Aadhaar / Voter ID / Ration Card)",
        "Brief Written Summary of your Problem",
      ],
      expected_process: [
        "1. Confidential legal counseling session with DLSA advocate.",
        "2. Free legal aid assignment or mediation assistance.",
      ],
      time_limits: "Available 24x7 without any time restriction.",
    };
  }

  async guide(
    explanation: ExplanationGeneratorResponse,
    retrievedServices: GovernmentService[],
  ): Promise<GuidanceEngineResponse> {
    const category = categorizeUserQuery(explanation.situation_summary);

    if (!this.apiKey) {
      return this.getFallbackGuidance(category);
    }

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

    try {
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

      if (!response.ok) {
        console.warn(`Gemini Guide Warning (${response.status} ${response.statusText}), using fallback guidance.`);
        return this.getFallbackGuidance(category);
      }

      const data = (await response.json()) as {
        candidates: { content: { parts: { text: string }[] } }[];
      };
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (err) {
      console.warn("Gemini guide exception, using fallback guidance:", err);
      return this.getFallbackGuidance(category);
    }
  }

  async generateActionPlan(guidance: GuidanceEngineResponse): Promise<ActionPlanGeneratorResponse> {
    const category = categorizeUserQuery(guidance.why_these_laws_apply);

    if (!this.apiKey) {
      if (category === "workplace") {
        return {
          current_stage: "Workplace Grievance & Employee Protection Plan",
          immediate_actions: [
            "Log all email exchanges, workload hours, and manager communications",
            "Submit a formal written grievance to Company HR / Grievance Redressal Committee",
            "Dial Tele-MANAS (14416) for confidential work stress counseling if feeling overwhelmed",
          ],
          authorities_to_contact: [
            "Internal HR / Grievance Officer",
            "Regional Labour Commissioner (samadhan.labour.gov.in)",
          ],
          expected_outcomes: [
            "Re-allocation of work hours and fair overtime policy",
            "Protection against coercive termination or workplace harassment",
          ],
          additional_information_needed: [
            "Employment Contract terms and documented manager communications",
          ],
          continue_guidance: [
            "Request written acknowledgment of HR complaint",
            "File online petition on SAMADHAN portal (14489) if unresolved",
          ],
        };
      }

      if (category === "cyber") {
        return {
          current_stage: "Cyber Crime Reporting & Asset Freeze",
          immediate_actions: [
            "Call 1930 immediately to block transaction",
            "File online report at cybercrime.gov.in",
          ],
          authorities_to_contact: [
            "Cyber Crime Police Station",
            "Bank Cyber Cell Nodal Officer",
          ],
          expected_outcomes: [
            "Lien/freeze on recipient bank account",
            "Investigation & potential refund",
          ],
          additional_information_needed: [
            "Transaction IDs and chat screenshots",
          ],
          continue_guidance: [
            "Submit FIR copy to bank branch manager",
          ],
        };
      }

      if (category === "women") {
        return {
          current_stage: "Women Protection & POSH Redressal Plan",
          immediate_actions: [
            "Dial 1091 / 112 for emergency help",
            "Submit complaint to ICC or Women Police Station",
          ],
          authorities_to_contact: [
            "Internal Complaints Committee (ICC)",
            "National Commission for Women (NCW)",
          ],
          expected_outcomes: [
            "Protection Order & inquiry initiation",
          ],
          additional_information_needed: [
            "Incident timeline & evidence details",
          ],
          continue_guidance: [
            "Track complaint status on NCW portal",
          ],
        };
      }

      // Default General Action Plan
      return {
        current_stage: "Citizens Support & Rights Action Plan",
        immediate_actions: [
          "Call Tele-MANAS (14416) for free 24x7 emotional & stress counseling",
          "Contact NALSA Helpline (15100) for free legal aid",
          "Gather ID proof and a short summary of your situation",
        ],
        authorities_to_contact: [
          "District Legal Services Authority (DLSA)",
          "Tele-MANAS Counseling Center",
        ],
        expected_outcomes: [
          "Free legal advice & confidential crisis counseling",
        ],
        additional_information_needed: [
          "Details of affected parties and location",
        ],
        continue_guidance: [
          "Visit District Court DLSA office for assigned advocate",
        ],
      };
    }

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

    const messages = [{ role: "user", parts: [{ text: `Guidance: ${JSON.stringify(guidance)}` }] }];

    try {
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

      if (!response.ok) {
        console.warn(`Gemini Action Plan Warning (${response.status} ${response.statusText}), using fallback.`);
        return this.getFallbackActionPlan(category);
      }

      const data = (await response.json()) as {
        candidates: { content: { parts: { text: string }[] } }[];
      };
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (err) {
      console.warn("Gemini action plan exception, using fallback:", err);
      return this.getFallbackActionPlan(category);
    }
  }

  private getFallbackActionPlan(category: QueryCategory): ActionPlanGeneratorResponse {
    if (category === "workplace") {
      return {
        current_stage: "Workplace Grievance & Employee Protection Plan",
        immediate_actions: [
          "Log all email exchanges, workload hours, and manager communications",
          "Submit a formal written grievance to Company HR / Grievance Redressal Committee",
          "Dial Tele-MANAS (14416) for confidential work stress counseling if feeling overwhelmed",
        ],
        authorities_to_contact: [
          "Internal HR / Grievance Officer",
          "Regional Labour Commissioner (samadhan.labour.gov.in)",
        ],
        expected_outcomes: [
          "Re-allocation of work hours and fair overtime policy",
          "Protection against coercive termination or workplace harassment",
        ],
        additional_information_needed: [
          "Employment Contract terms and documented manager communications",
        ],
        continue_guidance: [
          "Request written acknowledgment of HR complaint",
          "File online petition on SAMADHAN portal (14489) if unresolved",
        ],
      };
    }

    if (category === "cyber") {
      return {
        current_stage: "Cyber Crime Reporting & Asset Freeze",
        immediate_actions: [
          "Call 1930 immediately to block transaction",
          "File online report at cybercrime.gov.in",
        ],
        authorities_to_contact: [
          "Cyber Crime Police Station",
          "Bank Nodal Officer for Fraud Prevention",
        ],
        expected_outcomes: [
          "Lien on fraud bank account & police acknowledgment",
        ],
        additional_information_needed: [
          "Bank transaction ID and beneficiary details",
        ],
        continue_guidance: [
          "Submit copy of FIR to bank within 3 days for zero liability",
        ],
      };
    }

    if (category === "women") {
      return {
        current_stage: "Women Safety & Emergency Legal Aid Plan",
        immediate_actions: [
          "Call 1091 (Women Helpline) or 112 if in danger",
          "File written complaint with Internal Complaints Committee / Police",
        ],
        authorities_to_contact: [
          "Internal Complaints Committee (ICC)",
          "National Commission for Women (NCW)",
        ],
        expected_outcomes: [
          "Protection Order & inquiry initiation",
        ],
        additional_information_needed: [
          "Incident timeline & evidence details",
        ],
        continue_guidance: [
          "Track complaint status on NCW portal",
        ],
      };
    }

    return {
      current_stage: "Citizens Support & Rights Action Plan",
      immediate_actions: [
        "Call Tele-MANAS (14416) for free 24x7 emotional & stress counseling",
        "Contact NALSA Helpline (15100) for free legal aid",
        "Gather ID proof and a short summary of your situation",
      ],
      authorities_to_contact: [
        "District Legal Services Authority (DLSA)",
        "Tele-MANAS Counseling Center",
      ],
      expected_outcomes: [
        "Free legal advice & confidential crisis counseling",
      ],
      additional_information_needed: [
        "Details of affected parties and location",
      ],
      continue_guidance: [
        "Visit District Court DLSA office for assigned advocate",
      ],
    };
  }
}
