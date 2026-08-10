export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  lawsReferenced?: string[];
  steps?: string[];
}

export const QUICK_LEGAL_PROMPTS = [
  'What should I do if my employer is withholding my salary?',
  'How do I report an online UPI banking fraud within 2 hours?',
  'What rights do tenants have if the landlord asks to vacate without notice?',
  'How do I lodge a domestic violence complaint in Tamil Nadu?',
  'Can a consumer claim a refund for a defective electronic product?',
];

export async function sendLegalAIQuery(userQuery: string, userLang: string = 'en'): Promise<ChatMessage> {
  const queryLower = userQuery.toLowerCase();
  
  let responseText = '';
  let lawsReferenced: string[] = [];
  let steps: string[] = [];

  if (queryLower.includes('salary') || queryLower.includes('employer') || queryLower.includes('job') || queryLower.includes('wage')) {
    responseText = `Under the **Code on Wages, 2019** and **Payment of Wages Act 1936**, your employer must disburse earned wages before the 7th/10th of every month. Withholding earned wages during notice period or after resignation is illegal.`;
    lawsReferenced = ['Code on Wages 2019 (Section 5 & 14)', 'Payment of Wages Act 1936'];
    steps = [
      'Send a formal written notice / email to your HR & Management demanding salary disbursement within 7 days.',
      'If unresolved, file an online complaint on the SAMADHAN portal (samadhan.labour.gov.in) or call 14489.',
      'Visit the Regional Labour Commissioner office with your offer letter and bank statements.',
    ];
  } else if (queryLower.includes('fraud') || queryLower.includes('money') || queryLower.includes('bank') || queryLower.includes('upi') || queryLower.includes('otp')) {
    responseText = `If you are a victim of an online financial scam or unauthorized transaction, immediate action within the first **Golden Hour (1-2 hours)** is critical to freeze the defrauded funds in transit.`;
    lawsReferenced = ['Information Technology Act 2000 (Section 66D)', 'RBI Circular on Zero Customer Liability'];
    steps = [
      'Call the National Cyber Crime Helpline **1930** immediately to place a lien on the recipient bank account.',
      'Lodge a formal cyber complaint on **cybercrime.gov.in** and download the acknowledgment copy.',
      'Submit the complaint copy to your bank branch within 3 days for zero customer liability protection.',
    ];
  } else if (queryLower.includes('woman') || queryLower.includes('harass') || queryLower.includes('abuse') || queryLower.includes('domestic') || queryLower.includes('stalk')) {
    responseText = `Women in India are protected against physical, verbal, mental, and financial abuse under stringent criminal and civil statutes.`;
    lawsReferenced = ['Bharatiya Nyaya Sanhita 2023 (Section 74, 75 & 78)', 'Domestic Violence Act 2005 (Section 3 & 18)'];
    steps = [
      'In an active emergency or threat, call **112** or **1091 (Women Helpline)** immediately.',
      'For domestic violence, contact your District Social Welfare Officer (Protection Officer) at the Collectorate.',
      'Lodge an FIR at your nearest All Women Police Station (AWPS).',
    ];
  } else if (queryLower.includes('tenant') || queryLower.includes('landlord') || queryLower.includes('rent') || queryLower.includes('house')) {
    responseText = `Under Tenant Protection Laws and Rent Control Acts, a landlord cannot forcefully evict a tenant, disconnect water/electricity, or seize belongings without a legal eviction decree.`;
    lawsReferenced = ['Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act 2017'];
    steps = [
      'Check your registered Tenancy Agreement for the mandatory 1 to 3 months notice period clause.',
      'If electricity/water is cut, file a police complaint for criminal intimidation and wrongful restraint.',
      'File a petition before the Rent Tribunal / Rent Authority.',
    ];
  } else {
    responseText = `Thank you for reaching out to **Meyyurai AI Legal & Rights Assistant**. I am designed to assist you with plain-language explanations of Indian laws, statutory rights, emergency procedures, and consumer protection.`;
    lawsReferenced = ['Constitution of India (Article 39A - Free Legal Aid)', 'Legal Services Authorities Act 1987'];
    steps = [
      'Specify your situation (e.g. salary delay, banking fraud, domestic dispute, tenant issue).',
      'Or check the Rights tab to explore complete legal breakdowns for your topic.',
      'For free government advocate representation, call **15100 (NALSA)**.',
    ];
  }

  return {
    id: Date.now().toString(),
    sender: 'ai',
    text: responseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    lawsReferenced,
    steps,
  };
}
