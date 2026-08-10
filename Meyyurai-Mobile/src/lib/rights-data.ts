export interface RelevantLaw {
  actName: string;
  section: string;
  description: string;
  bareActText?: string;
  classification?: string;
  punishment?: string;
  trialCourt?: string;
  officialSource: string;
  officialUrl?: string;
}

export interface AuthorityOffice {
  name: string;
  type: string;
  officerTitle?: string;
  addressSummary: string;
  onlinePortal?: string;
  helpline: string;
  email?: string;
  whatTheyDo: string;
  escalationContact?: string;
}

export interface CategoryRightsDetail {
  slug: string;
  title: string;
  subtitle: string;
  overview: string;
  laws: RelevantLaw[];
  authorities: AuthorityOffice[];
  complaintSteps: string[];
  documentsRequired: string[];
  faqs: { question: string; answer: string }[];
}

export const RIGHTS_CATEGORIES = [
  { id: 'women', title: 'Women Rights & Safety', icon: 'shield', badge: 'Safety & Welfare' },
  { id: 'employee', title: 'Employee & Worker Rights', icon: 'briefcase', badge: 'Labour Laws' },
  { id: 'consumer', title: 'Consumer Protection', icon: 'shopping-bag', badge: 'Consumer Court' },
  { id: 'cyber', title: 'Cyber Rights & Banking Fraud', icon: 'smartphone', badge: '1930 Fraud Line' },
  { id: 'property', title: 'Property & Land Rights', icon: 'home', badge: 'TNREGINET' },
  { id: 'child', title: 'Child Rights & Education', icon: 'heart', badge: '1098 POCSO/RTE' },
  { id: 'senior', title: 'Senior Citizen Rights', icon: 'users', badge: '14567 Elderline' },
  { id: 'legalaid', title: 'Free Legal Aid (NALSA)', icon: 'scale', badge: 'Article 39A' },
];

export const RIGHTS_DATA: Record<string, CategoryRightsDetail> = {
  women: {
    slug: 'women',
    title: 'Women Rights, Safety Laws & Subsidies',
    subtitle: 'Safety laws, BNS/IPC offences, domestic abuse protection, and emergency helplines.',
    overview: 'Women in India are protected under criminal penal codes (BNS 2023 / IPC), POSH Act workplace safety, domestic violence safeguards, and state financial welfare schemes.',
    laws: [
      {
        actName: 'Bharatiya Nyaya Sanhita, 2023 (BNS) / IPC',
        section: 'BNS Section 74 / IPC Section 354: Outraging Modesty of Woman',
        description: 'Criminalizes assault or use of criminal force against any woman with intent to outrage her modesty.',
        classification: 'Cognizable | Non-Bailable',
        punishment: 'Mandatory imprisonment of 1 to 5 years + Fine.',
        officialSource: 'Ministry of Law & Justice, Govt of India',
      },
      {
        actName: 'Protection of Women from Domestic Violence Act, 2005',
        section: 'Sections 3 & 18: Domestic Abuse Protection Orders',
        description: 'Grants interim protection orders, residence rights in shared household, monetary relief, and custody orders.',
        classification: 'Cognizable | Non-Bailable',
        punishment: 'Violation of Protection Order: Imprisonment up to 1 year or Fine up to ₹20,000.',
        officialSource: 'National Commission for Women (NCW)',
      },
    ],
    authorities: [
      {
        name: 'All Women Police Station (AWPS)',
        type: 'Specialized Law Enforcement',
        addressSummary: 'Available in every Police Sub-Division & Taluk across India.',
        helpline: '1091 / 112',
        whatTheyDo: 'Registers FIRs under BNS/IPC sections for offences against women and provides emergency protection.',
      },
    ],
    complaintSteps: [
      'For emergency protection or imminent threat, dial 1091 (Women Helpline) or 112 immediately.',
      'For crimes or harassment, lodge an FIR at the nearest All Women Police Station (AWPS).',
      'For domestic abuse protection orders, file a petition before the Protection Officer at District Collectorate.',
    ],
    documentsRequired: [
      'Aadhaar Card / ID Proof',
      'Medical Certificate / Injury Casualty Report (if physical assault)',
      'Written Incident Complaint with Date, Time, Location & Witness Details',
    ],
    faqs: [
      {
        question: 'What is the punishment for stalking or harassing a woman in India?',
        answer: 'Under BNS Section 78 (IPC 354D), stalking is punishable with up to 3 years imprisonment + Fine for 1st offense, and up to 5 years for repeat offense.',
      },
    ],
  },
  cyber: {
    slug: 'cyber',
    title: 'Cyber Rights & Online Banking Fraud',
    subtitle: 'Reporting online financial fraud (1930), bank account freeze, and cybercrime.gov.in portal.',
    overview: 'Cyber rights protect citizens from digital financial fraud, phishing, unauthorized banking debits, online stalking, identity theft, and data privacy violations under the IT Act 2000.',
    laws: [
      {
        actName: 'Information Technology Act, 2000',
        section: 'Sections 66C & 66D: Identity Theft & Cyber Cheating',
        description: 'Criminalizes OTP scams, phishing links, online identity theft, and fraudulent financial transactions.',
        classification: 'Cognizable | Bailable',
        punishment: 'Imprisonment up to 3 years + Fine up to ₹1 Lakh.',
        officialSource: 'Ministry of Electronics and IT (MeitY)',
      },
    ],
    authorities: [
      {
        name: 'Cyber Crime Police Station / Cyber Cell',
        type: 'Specialized Police Force',
        addressSummary: 'Located in every Police Commissionerate / District Police HQ.',
        helpline: '1930 / 112',
        whatTheyDo: 'Investigates digital crimes, coordinates with bank nodal officers, and freezes defrauded funds in transit.',
      },
    ],
    complaintSteps: [
      'Call 1930 immediately within 1-2 hours of fraudulent transaction to freeze recipient bank account.',
      'Lodge a formal complaint on cybercrime.gov.in and download complaint acknowledgement.',
      'Submit acknowledgment copy to bank branch manager for zero-liability refund under RBI guidelines.',
    ],
    documentsRequired: [
      'Bank Account Statement highlighting fraud transaction',
      'Screenshots of phishing links, WhatsApp chats, or caller numbers',
    ],
    faqs: [
      {
        question: 'What should I do immediately if money is stolen from my bank account via OTP scam?',
        answer: 'Dial 1930 immediately. The cyber crime unit places an instant lien on the recipient bank account to block the money.',
      },
    ],
  },
  employee: {
    slug: 'employee',
    title: 'Employee & Worker Rights',
    subtitle: 'Salary protection, working hours, notice period rules, EPF/ESI, and SAMADHAN Labour Portal.',
    overview: 'Employees and industrial workers in India are protected by labor laws that mandate fair working hours, overtime pay, prompt wage disbursement, EPF/ESI benefits, and protection against wrongful termination.',
    laws: [
      {
        actName: 'Code on Wages, 2019 / Payment of Wages Act, 1936',
        section: 'Sections 5 & 14: Delayed Wages & Overtime Penalties',
        description: 'Wages must be disbursed before 7th/10th of every month. Overtime must be paid at double normal rate.',
        classification: 'Statutory Labour Enforcement',
        punishment: 'Employer failure to pay wages: Fine up to ₹50,000 for 1st offense; Repeat offense: Imprisonment up to 3 months.',
        officialSource: 'Ministry of Labour & Employment',
      },
    ],
    authorities: [
      {
        name: 'Office of the Regional Labour Commissioner',
        type: 'Labour Dispute Body',
        addressSummary: 'Located in every District Headquarters.',
        helpline: '14489',
        whatTheyDo: 'Conducts conciliation proceedings for unpaid wages, illegal termination, and labor disputes.',
      },
    ],
    complaintSteps: [
      'Gather employment proof, salary slips, work emails, and notice period correspondence.',
      'Submit a formal written grievance to your company HR / Grievance Cell.',
      'If unresolved within 14 days, file an online complaint on SAMADHAN portal (samadhan.labour.gov.in) or call 14489.',
    ],
    documentsRequired: [
      'Offer Letter / Appointment Order / Employee ID',
      'Salary Slips & Bank Account Statements (last 6 months)',
    ],
    faqs: [
      {
        question: 'Can an employer withhold my salary during notice period?',
        answer: 'No. Under the Payment of Wages Act and Code on Wages 2019, earned wages must be disbursed within 2 working days of termination.',
      },
    ],
  },
  consumer: {
    slug: 'consumer',
    title: 'Consumer Rights & Protection',
    subtitle: 'e-Daakhil filing, National Consumer Helpline (1915), product refunds, and defect claims.',
    overview: 'Consumers in India are protected under the Consumer Protection Act 2019 against defective products, deficient services, misleading advertisements, and e-commerce fraud.',
    laws: [
      {
        actName: 'Consumer Protection Act, 2019',
        section: 'Sections 2(47) & 35: Unfair Trade Practices & Claims',
        description: 'Guarantees right to safety, information, redressal, and replacement of defective goods or deficient services.',
        classification: 'Statutory Consumer Rights',
        punishment: 'Failure to comply with Consumer Order: Imprisonment from 1 month to 3 years + Fine ₹25,000 to ₹1 Lakh.',
        officialSource: 'Department of Consumer Affairs',
      },
    ],
    authorities: [
      {
        name: 'District Consumer Disputes Redressal Commission (DCDRC)',
        type: 'Consumer Court',
        addressSummary: 'Located inside District Court Complexes in every district.',
        helpline: '1915',
        whatTheyDo: 'Adjudicates consumer claims up to ₹50 Lakhs, ordering full refunds, replacements, and compensation.',
      },
    ],
    complaintSteps: [
      'Send a written notice or email to the seller demanding refund/replacement within 7 days.',
      'If unresolved, call 1915 or register a grievance on consumerhelpline.gov.in.',
      'File an e-Daakhil consumer court case online at edaakhil.nic.in without hiring a lawyer.',
    ],
    documentsRequired: [
      'Tax Invoice / Cash Memo / Bill Copy',
      'Proof of Payment (Bank statement / UPI transaction receipt)',
    ],
    faqs: [
      {
        question: 'Do I need a lawyer to file a case in Consumer Court?',
        answer: 'No. Consumers can file and represent their own case directly online via edaakhil.nic.in.',
      },
    ],
  },
};
