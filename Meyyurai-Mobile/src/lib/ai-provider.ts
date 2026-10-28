export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  lawsReferenced?: string[];
  steps?: string[];
  providerName?: string;
  isFallback?: boolean;
}

export const QUICK_LEGAL_PROMPTS = [
  'I have a property dispute with my brother regarding our ancestral house share',
  'What should I do if my employer is withholding my salary?',
  'I missed / lost my ATM card, what should I do now?',
  'How do I report an online UPI banking fraud within 2 hours?',
  'What rights do tenants have if the landlord asks to vacate without notice?',
];

interface LegalCategoryPattern {
  id: string;
  keywords: string[];
  title: string;
  generate: (query: string, lowerQuery: string) => { text: string; laws: string[]; steps: string[] };
}

const DOMAIN_PATTERNS: LegalCategoryPattern[] = [
  // 1. PROPERTY, LAND & FAMILY PARTITION DISPUTES
  {
    id: 'property_partition',
    keywords: [
      'property', 'brother', 'sister', 'father', 'land', 'ancestral', 'house', 'partition',
      'inheritance', 'share', 'plot', 'dispute', 'boundary', 'patta', 'chitta', 'will', 'deed',
      'encroach', 'grab', 'real estate', 'registry', 'joint family'
    ],
    title: 'Property & Family Partition Rights',
    generate: (query, lower) => {
      const isBrother = lower.includes('brother') || lower.includes('sibling');
      const isAncestral = lower.includes('ancestral') || lower.includes('father') || lower.includes('parent');
      const party = isBrother ? 'brother' : 'co-heir';
      const propType = isAncestral ? 'ancestral coparcenary property' : 'joint property';

      return {
        text: `Regarding your property dispute with your ${party} ("${query}"): Under Indian Property & Succession Laws (**Hindu Succession Act 1956** / **Partition Act 1893**), ${propType} cannot be unilaterally grabbed, sold, built upon, or blocked by one party without a legal deed of partition or written consent of all co-sharers. Every legal heir holds an equal statutory right to demand their separate share and possession.`,
        laws: [
          'Hindu Succession Act 1956 (Section 6 & Section 8 - Equal Coparcenary Rights of Legal Heirs)',
          'Partition Act 1893 (Section 2 - Suit for Partition & Division of Property)',
          'Code of Civil Procedure 1908 (Order 39 Rules 1 & 2 - Temporary Injunction Stay Order)',
          'Transfer of Property Act 1882 (Section 44 - Transfers by Co-owners)',
        ],
        steps: [
          'Verify Land & Title Records: Obtain certified copies of the Parent Deed, Encumbrance Certificate (EC), Patta / Chitta / 7-12 extract from your local Sub-Registrar Office (SRO) or Revenue Office.',
          'Issue Registered Legal Demand Notice: Engage a civil advocate to issue a formal 15-day Legal Notice to your ' + party + ' demanding an amicable partition by metes and bounds.',
          'File Civil Suit for Partition: If your ' + party + ' refuses, file a Partition Suit in the District Civil Court seeking your legal share and declaration of title.',
          'Apply for Injunction Stay Order: File an interim application under Order 39 Rules 1 & 2 CPC asking the Court to restrain your ' + party + ' from selling or altering the property during litigation.',
        ],
      };
    },
  },

  // 2. SALARY, EMPLOYER & WORKPLACE DISPUTES
  {
    id: 'workplace_salary',
    keywords: [
      'salary', 'employer', 'job', 'wage', 'pay', 'bond', 'notice', 'resignation', 'terminate',
      'advance', 'withhold', 'experience letter', 'relieving', 'boss', 'office', 'harass',
      'toxic', 'pressure', 'stress', 'overtime', 'hr', 'workplace'
    ],
    title: 'Employee Wage Protection & Employment Rights',
    generate: (query, lower) => {
      const isSalary = lower.includes('salary') || lower.includes('wage') || lower.includes('pay');
      return {
        text: `Regarding your employment dispute ("${query}"): Under the **Code on Wages 2019** and **Payment of Wages Act 1936**, employers are legally mandated to pay earned wages on time. Withholding salary, forcing uncompensated overtime, demanding illegal bond penalty forfeitures (void under **Section 27 of Indian Contract Act 1872**), or refusing relieving letters is strictly unlawful.`,
        laws: [
          'Code on Wages 2019 (Section 5 & Section 14 - Mandated Timely Wage Disbursement)',
          'Indian Contract Act 1872 (Section 27 - Restraint of Trade & Unreasonable Employment Bonds Void)',
          'Payment of Wages Act 1936 (Section 7 - Authorized Deductions Only)',
          'Mental Healthcare Act 2017 (Section 18 - Protection Against Workplace Mental Harassment)',
        ],
        steps: [
          'Preserve Written Communications: Save all offer letters, salary slips, attendance records, and emails/WhatsApp messages demanding payment.',
          'Send Pre-Litigation Notice: Serve a formal registered Legal Demand Notice to HR giving 7 days deadline for full and final settlement.',
          'Lodge Grievance on SAMADHAN Portal: File an online complaint on the Ministry of Labour portal (**samadhan.labour.gov.in**) or call **14489**.',
          'Approach Labour Commissioner: Submit your petition to the Regional Labour Commissioner for conciliation and salary recovery.',
        ],
      };
    },
  },

  // 3. BANK CARDS, ATM & PASSBOOK LOST
  {
    id: 'atm_card_lost',
    keywords: [
      'atm', 'card', 'debit', 'credit', 'passbook', 'cheque', 'lost card', 'missed card',
      'stolen card', 'block card', 'bank', 'account', 'pin'
    ],
    title: 'ATM & Banking Instrument Security',
    generate: (query) => ({
      text: `Regarding your missing or stolen banking card query ("${query}"): Immediate action is required to freeze your card and prevent unauthorized withdrawals. Under RBI guidelines on electronic banking customer liability, reporting a lost card promptly guarantees zero liability for unauthorized transactions after reporting.`,
      laws: [
        'RBI Master Circular on Customer Liability in Electronic Banking (Zero Liability Policy)',
        'Information Technology Act 2000 (Section 66D - Financial Security)',
        'Payment and Settlement Systems Act 2007',
      ],
      steps: [
        'Block Card Instantly: Open your Mobile Banking App or call your bank\'s 24x7 customer helpline to block transactions.',
        'Send SMS Block Code: Most Indian banks accept instant SMS blocking (e.g., "BLOCK <last 4 digits>" sent to official shortcode).',
        'Lodge e-FIR / Lost Property Report: Register a lost document report on your state police portal to obtain an official acknowledgment.',
        'Apply for Card Replacement: Visit your bank branch with the police acknowledgment copy for a replacement card.',
      ],
    }),
  },

  // 4. CYBER FRAUD & SCAMS
  {
    id: 'cyber_fraud',
    keywords: [
      'fraud', 'money', 'bank', 'upi', 'gpay', 'phonepe', 'paytm', 'otp', 'scam', 'cyber',
      'phishing', 'hacked', 'stolen money', 'unauthorized', 'transaction'
    ],
    title: 'Cyber Financial Fraud Recovery',
    generate: (query) => ({
      text: `Regarding cyber financial loss ("${query}"): Under RBI directives and IT Act Section 66D, reporting unauthorized online transactions immediately within the Golden Hours (1-2 hours) ensures maximum fund freezing and customer liability protection.`,
      laws: [
        'Information Technology Act 2000 (Section 66D - Financial Fraud Protection)',
        'RBI Master Circular on Customer Liability in Electronic Transactions',
        'Bharatiya Nyaya Sanhita 2023 (Section 318 - Cheating)',
      ],
      steps: [
        'Call Cyber Helpline 1930: Dial **1930** immediately to freeze funds in transit across inter-bank networks.',
        'Register Online Complaint: File an official complaint at **cybercrime.gov.in** and note down the acknowledgment number.',
        'Submit Written Bank Report: Hand over a copy of the cyber complaint to your home bank branch within 3 days.',
      ],
    }),
  },

  // 5. TENANCY & HOUSING
  {
    id: 'tenancy_housing',
    keywords: [
      'tenant', 'landlord', 'rent', 'house', 'evict', 'deposit', 'flat', 'owner',
      'water cut', 'electricity cut', 'lease', 'agreement'
    ],
    title: 'Tenant Protection & Housing Rights',
    generate: (query) => ({
      text: `Regarding tenancy and housing rights ("${query}"): Under Rent Control Laws, landlords cannot forcefully evict tenants, lock premises, cut water/electricity supply, or withhold security deposits without legal eviction decrees from a Rent Tribunal.`,
      laws: [
        'Regulation of Rights and Responsibilities of Landlords and Tenants Act 2017',
        'Bharatiya Nyaya Sanhita 2023 (Section 329 - Wrongful Restraint)',
        'Transfer of Property Act 1882 (Section 106 - Notice to Quit)',
      ],
      steps: [
        'Review Agreement: Check your registered Tenancy Agreement for notice period guidelines.',
        'Police Assistance: If amenities are cut or locks changed, lodge a police complaint for criminal intimidation.',
        'Rent Tribunal Petition: File a formal grievance before the local Rent Tribunal.',
      ],
    }),
  },

  // 6. WOMEN SAFETY & POSH
  {
    id: 'women_safety',
    keywords: [
      'woman', 'female', 'domestic', 'husband', 'in-laws', 'abuse', 'posh', 'stalk',
      'dowry', 'harass woman', 'violence'
    ],
    title: 'Women Protection & Domestic Safety',
    generate: (query) => ({
      text: `Regarding safety and domestic protection ("${query}"): Indian law provides comprehensive civil and criminal protection against domestic violence, verbal abuse, workplace sexual harassment (POSH), and stalking.`,
      laws: [
        'Protection of Women from Domestic Violence Act 2005 (Section 3 & Section 18)',
        'Bharatiya Nyaya Sanhita 2023 (Section 74, Section 75 & Section 85)',
        'Sexual Harassment of Women at Workplace (POSH) Act 2013',
      ],
      steps: [
        'Emergency Assistance: Call **112** (Emergency Response) or **1091** (Women Helpline) immediately.',
        'Contact Protection Officer: Approach the District Protection Officer at your Collectorate for free shelter & legal protection.',
        'Lodge Police FIR: Visit the nearest All Women Police Station (AWPS).',
      ],
    }),
  },

  // 7. ROAD ACCIDENTS & VEHICLES
  {
    id: 'road_accidents',
    keywords: [
      'accident', 'bike', 'car', 'hit', 'injury', 'personal injury', 'vehicle', 'driver',
      'highway', 'road', 'collision', 'mact', 'traffic'
    ],
    title: 'Road Accident Safeguards & MACT Claims',
    generate: (query) => ({
      text: `Regarding road collision/accident ("${query}"): Under the Motor Vehicles Act, accident victims have a statutory right to immediate medical emergency care without cost deposit and compensation claims via MACT.`,
      laws: [
        'Motor Vehicles Act 1988/2019 (Section 166 & Section 134A Good Samaritan Protection)',
        'Bharatiya Nyaya Sanhita 2023 (Section 281 & Section 125(a) - Rash Driving)',
      ],
      steps: [
        'Call Helpline: Call **108** for ambulance and **112** for police emergency.',
        'Obtain FIR & DAR: Ensure police file a Detailed Accident Report (DAR) within 90 days.',
        'File MACT Claim: Submit claim petition before Motor Accident Claims Tribunal for hospital & vehicle recovery.',
      ],
    }),
  },

  // 8. CONSUMER PROTECTION
  {
    id: 'consumer_protection',
    keywords: [
      'consumer', 'refund', 'product', 'amazon', 'flipkart', 'defective', 'warranty',
      'shop', 'store', 'seller', 'faulty', 'replacement'
    ],
    title: 'Consumer Protection & Product Refund Rights',
    generate: (query) => ({
      text: `Regarding consumer dispute/refund ("${query}"): Under the **Consumer Protection Act 2019**, consumers are protected against defective goods, unfair trade practices, and seller refusal of legitimate refunds.`,
      laws: [
        'Consumer Protection Act 2019 (Section 2(47) - Unfair Trade Practice)',
        'Consumer Protection (E-Commerce) Rules 2020',
      ],
      steps: [
        'Lodge INGRAM Grievance: Call **1915** (National Consumer Helpline) or file online on **consumerhelpline.gov.in**.',
        'Serve Pre-Litigation Notice: Email a formal notice to seller customer support giving 7 days deadline.',
        'File District Consumer Forum Case: Submit a petition online via **edaakhil.nic.in**.',
      ],
    }),
  },

  // 9. POLICE FIR & ARREST SAFEGUARDS
  {
    id: 'police_fir',
    keywords: [
      'police', 'fir', 'arrest', 'station', 'constable', 'bribe', 'bail', 'summons', 'complaint'
    ],
    title: 'Police Procedure & FIR Rights',
    generate: (query) => ({
      text: `Regarding police interaction or FIR filing ("${query}"): Under Section 173 of BNSS 2023, police are statutorily bound to record information regarding cognizable offences (Zero FIR / e-FIR).`,
      laws: [
        'Bharatiya Nagarik Suraksha Sanhita 2023 (Section 173 - Information in Cognizable Cases & e-FIR)',
        'Constitution of India (Article 22 - Protection Against Arrest & Detention)',
      ],
      steps: [
        'Lodge Written Complaint: Submit a signed written complaint to the Station House Officer (SHO).',
        'Send to Superintendent (SP): If police refuse FIR, send complaint by registered post to Superintendent of Police.',
        'Free Advocate Support: Call **15100 (NALSA)** for a free legal aid advocate.',
      ],
    }),
  },
];

/**
 * Connects Mobile AI to the shared Meyyurai Web Backend API (/api/ai/chat)
 * Automatically falls back to the in-app Zero-API Statutory Engine if offline or backend is unreachable.
 */
export async function fetchBackendAIQuery(userQuery: string, userLang: string = 'en'): Promise<ChatMessage> {
  const backendUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/ai/chat';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: userQuery,
        language: userLang,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const ans = data.answer;
      if (ans && (ans.explanation || ans.action_plan)) {
        let responseText = ans.explanation?.situation_summary || ans.explanation?.what_this_means || '';
        
        if (ans.explanation?.what_this_means && !responseText.includes(ans.explanation.what_this_means)) {
          responseText += '\n\n' + ans.explanation.what_this_means;
        }

        const laws = (ans.explanation?.relevant_laws || []).map((l: any) => `${l.act_name} (${l.section})`);
        const steps = ans.action_plan?.immediate_actions || [];

        return {
          id: Date.now().toString(),
          sender: 'ai',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lawsReferenced: laws.length > 0 ? laws : undefined,
          steps: steps.length > 0 ? steps : undefined,
          providerName: ans.provider_name || 'Gemini 3.1 Flash',
          isFallback: Boolean(ans.is_fallback),
        };
      }
    }
  } catch (e) {
    // Network or backend unavailable -> use local zero-API statutory engine fallback
  }

  const localRes = await sendLegalAIQuery(userQuery, userLang);
  localRes.providerName = '⚡ Offline Statutory Engine';
  localRes.isFallback = true;
  return localRes;
}

/**
 * Zero-API-Key Dynamic Legal Reasoning Engine
 * Synthesizes dynamic, context-aware legal guidance for any prompt offline or online.
 */
export async function sendLegalAIQuery(userQuery: string, userLang: string = 'en'): Promise<ChatMessage> {
  const queryClean = userQuery.trim();
  const queryLower = queryClean.toLowerCase();

  // 1. Direct Greetings
  if (['hi', 'hello', 'hey', 'greetings', 'namaste'].includes(queryLower)) {
    return {
      id: Date.now().toString(),
      sender: 'ai',
      text: `Hello! I am **Meyyurai AI Legal & Safety Advisor**. I provide plain-language explanations of Indian laws, statutory rights, property partition disputes, employee protections, banking card security, and emergency procedures. How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lawsReferenced: ['Constitution of India (Article 21 - Right to Protection of Life & Personal Liberty)'],
      steps: [
        'Type any specific problem (e.g. property dispute with brother, lost ATM card, salary delay, UPI scam, rent dispute).',
        'Or select one of the quick suggestion chips below.',
      ],
    };
  }

  // 2. Match Domain Intelligence Patterns
  for (const pattern of DOMAIN_PATTERNS) {
    if (pattern.keywords.some((kw) => queryLower.includes(kw))) {
      const res = pattern.generate(queryClean, queryLower);
      return {
        id: Date.now().toString(),
        sender: 'ai',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lawsReferenced: res.laws,
        steps: res.steps,
      };
    }
  }

  // 3. Universal Dynamic Synthesizer for Novel & Unindexed Queries
  return synthesizeNovelQuery(queryClean);
}

/**
 * Universal NLP Synthesizer for unindexed queries
 * Extracts intent and matches governing Indian legal frameworks dynamically.
 */
function synthesizeNovelQuery(userQuery: string): ChatMessage {
  const q = userQuery.toLowerCase();
  let categoryName = 'Civil & Citizens Protection Rights';
  let primaryAct = 'Constitution of India (Article 21 - Fundamental Right to Life, Dignity & Fair Treatment)';
  let secondaryAct = 'Legal Services Authorities Act 1987 (Section 12 - Free Legal Assistance & Counseling)';
  let tertiaryAct = 'Bharatiya Nagarik Suraksha Sanhita 2023 (Section 173 - Information & Grievance Registration)';
  let customText = `Regarding your query ("${userQuery}"): Under Indian law and statutory citizen protection frameworks, every individual has guaranteed rights to fair resolution, due legal process, safety, and grievance redressal.`;
  let steps = [
    'Preserve Written & Digital Evidence: Collect all relevant receipts, contracts, agreements, chat records, call logs, or photos.',
    'Issue Pre-Litigation Notice: Consult a legal practitioner to serve a formal Registered Legal Demand Notice giving 15 days deadline.',
    'Lodge Complaint with Statutory Authority: File a complaint on the official government portal or approach the competent District Authority.',
    'Free Advocate Support: Dial **15100 (NALSA National Legal Aid Helpline)** for free advocate representation or call **112** for emergency protection.',
  ];

  // Medical / Hospital Negligence
  if (q.includes('doctor') || q.includes('hospital') || q.includes('medical') || q.includes('negligence') || q.includes('treatment')) {
    categoryName = 'Medical Protection & Patient Rights';
    primaryAct = 'Consumer Protection Act 2019 (Section 2(42) - Deficiency in Medical Services)';
    secondaryAct = 'National Medical Commission Act 2019 (Professional Misconduct Guidelines)';
    tertiaryAct = 'Bharatiya Nyaya Sanhita 2023 (Section 106 - Negligent Act Endangering Life)';
    customText = `Regarding medical care or hospital grievance ("${userQuery}"): Under Indian Law (**Consumer Protection Act 2019** & **NMC Regulations**), patients have statutory rights to receive standard medical care, transparent billing, complete medical records, and compensation for medical negligence.`;
    steps = [
      'Obtain Complete Medical Records: Formally request certified copies of discharge summaries, diagnostic reports, and itemized hospital bills under Patient Rights Guidelines.',
      'File Medical Council Complaint: Submit a formal complaint to the State Medical Council against the concerned hospital or medical practitioner for professional misconduct.',
      'Claim Compensation in Consumer Forum: File a petition on **edaakhil.nic.in** seeking compensation for deficiency in service.',
    ];
  }
  // Education / School / Fee Disputes
  else if (q.includes('school') || q.includes('college') || q.includes('university') || q.includes('fee') || q.includes('student') || q.includes('certificate') || q.includes('degree')) {
    categoryName = 'Student Rights & Educational Protections';
    primaryAct = 'Right of Children to Free and Compulsory Education Act 2009 (Section 13 - Capitation Fee Prohibition)';
    secondaryAct = 'UGC Redressal of Grievances of Students Regulations 2023';
    tertiaryAct = 'Consumer Protection Act 2019 (Unfair Trade Practice by Educational Institutions)';
    customText = `Regarding educational institution or fee dispute ("${q}"): Under UGC Guidelines and Supreme Court Rulings, educational institutions cannot withhold original certificates, charge unauthorized capitation fees, or refuse refund of excess unutilized fees.`;
    steps = [
      'Submit Written Grievance to Ombudsperson: Submit a formal complaint to the University / Institution Student Grievance Redressal Committee (SGRC).',
      'Lodge UGC e-Samadhan Grievance: File an online complaint on the UGC e-Samadhan Portal (**samadhan.ugc.ac.in**).',
      'Approach Consumer Court: File an e-Daakhil petition for refund of withheld fees and return of original documents.',
    ];
  }
  // Cheque Bounce & Loan Debt Recovery
  else if (q.includes('cheque') || q.includes('bounce') || q.includes('loan') || q.includes('borrow') || q.includes('recovery agent') || q.includes('debt')) {
    categoryName = 'Banking Debt & Cheque Dishonor Laws';
    primaryAct = 'Negotiable Instruments Act 1881 (Section 138 - Dishonor of Cheque for Insufficiency of Funds)';
    secondaryAct = 'RBI Fair Practices Code for Lenders (Protection Against Harassment by Recovery Agents)';
    tertiaryAct = 'Bharatiya Nyaya Sanhita 2023 (Section 308 - Extortion & Coercion)';
    customText = `Regarding cheque dishonor or debt recovery ("${q}"): Under Section 138 of the Negotiable Instruments Act 1881, cheque bounce is a punishable offence. Additionally, RBI guidelines strictly prohibit recovery agents from abusive threats, late-night calls, or physical harassment.`;
    steps = [
      'Serve Statutory 30-Day Notice: Issue a formal legal notice under Section 138 NI Act within 30 days of receiving the Cheque Return Memo.',
      'File NI Act Criminal Complaint: If unpaid within 15 days of notice receipt, file a Section 138 complaint before the Judicial Magistrate Court.',
      'Report Agent Harassment: Report unauthorized recovery agent coercion to the RBI Ombudsman (**cms.rbi.org.in**) and local police station.',
    ];
  }
  // Defamation & Social Media Harassment
  else if (q.includes('defamation') || q.includes('troll') || q.includes('post') || q.includes('social media') || q.includes('reputation') || q.includes('fake news') || q.includes('photo')) {
    categoryName = 'Defamation & Digital Reputation Protection';
    primaryAct = 'Bharatiya Nyaya Sanhita 2023 (Section 356 - Defamation)';
    secondaryAct = 'Information Technology Act 2000 (Section 66E - Privacy Violation & Identity Theft)';
    tertiaryAct = 'Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021';
    customText = `Regarding online defamation or reputation harm ("${q}"): Under Indian Criminal Law (**BNS Section 356** & **IT Act Section 66E**), publishing false statements, non-consensual images, or defamatory content damaging an individual's reputation is a punishable offense.`;
    steps = [
      'Preserve Screenshots & URLs: Take clean timestamped screenshots of defamatory posts, profiles, and direct page links.',
      'Report Content Takedown: Submit a formal takedown request directly to the social media platform\'s Grievance Officer.',
      'File Cyber Crime FIR: Register a complaint at **cybercrime.gov.in** and lodge an FIR under BNS Section 356 at your local Cyber Crime Cell.',
    ];
  }

  return {
    id: Date.now().toString(),
    sender: 'ai',
    text: customText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    lawsReferenced: [primaryAct, secondaryAct, tertiaryAct],
    steps: steps,
  };
}



