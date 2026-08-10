export interface Scheme {
  title: string;
  badge?: string;
  description: string;
  benefits: string[];
  eligibility: string[];
  howToApply: string;
  portalUrl?: string;
  helpline?: string;
  documentsNeeded: string[];
  formFields?: string[];
  directApplicationSteps?: string[];
}

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
  schemes: Scheme[];
  authorities: AuthorityOffice[];
  complaintSteps: string[];
  documentsRequired: string[];
  faqs: { question: string; answer: string }[];
}

export const RIGHTS_DATA: Record<string, CategoryRightsDetail> = {
  women: {
    slug: "women",
    title: "Women Rights, Safety Laws & Subsidies",
    subtitle: "Complete guide to Tamil Nadu women schemes, safety laws, BNS/IPC offences, bare act sections, and in-app scheme application forms.",
    overview:
      "Women in India and Tamil Nadu are protected under stringent criminal penal codes (BNS 2023 / IPC), workplace harassment laws (POSH Act), domestic violence safeguards, and state financial welfare schemes covering monthly basic income, education stipends, free transit, and microfinance loans.",
    schemes: [
      {
        title: "Kalaignar Magalir Urimai Thittam (KMUT)",
        badge: "Tamil Nadu State Welfare Scheme",
        description: "Monthly basic income scheme transferring ₹1,000/month directly into the bank accounts of eligible women heads of families across Tamil Nadu.",
        benefits: [
          "₹1,000 credited on the 15th of every month via Direct Benefit Transfer (DBT)",
          "Financial independence for homemakers and working women",
        ],
        eligibility: [
          "Woman head of the family aged 21 years or older",
          "Annual family income below ₹2.5 Lakhs",
          "Family electricity consumption below 3,600 units/year",
          "Family owns less than 5 acres of dry land or 2.5 acres of wetland",
        ],
        howToApply: "Fill the in-app application form below to verify documents, then submit at your local e-Sevai Center or designated Ration Shop camp.",
        portalUrl: "https://cmhelpline.tnega.org/",
        helpline: "CM Helpline: 1100 / 044-25619999",
        documentsNeeded: [
          "Smart Ration Card (Family Card Number)",
          "Aadhaar Card of Woman Head",
          "Aadhaar-linked Bank Account Passbook & IFSC Code",
          "Electricity Bill Consumer Number",
        ],
        formFields: [
          "Applicant Full Name (As in Aadhaar)",
          "Smart Ration Card Number (12 Digits)",
          "Aadhaar Number (12 Digits)",
          "Bank Account Number & Bank Name",
          "IFSC Code",
          "Electricity Consumer Number",
          "District & Taluk Name",
        ],
        directApplicationSteps: [
          "1. Fill out your details in the Meyyurai Scheme Form below to generate your pre-submission verification checklist.",
          "2. Collect original Smart Ration Card, Aadhaar Card, and Bank Passbook.",
          "3. Visit your local e-Sevai Center / Special Registration Camp or submit via Chief Minister Helpline (cmhelpline.tnega.org).",
          "4. Track monthly credit directly in your bank account on the 15th of every month.",
        ],
      },
      {
        title: "Pudhumai Penn Scheme (Moovalur Ramamirtham Ammaiyar Higher Education Assurance)",
        badge: "Tamil Nadu Education Stipend",
        description: "Financial stipend of ₹1,000/month for female students pursuing higher education degree, diploma, ITI, or professional courses.",
        benefits: [
          "₹1,000/month credited directly throughout the duration of degree/diploma",
          "No tuition or book expenditure burden on poor families",
        ],
        eligibility: [
          "Girl students who studied Classes 6 to 12 in Tamil Nadu Government Schools",
          "Enrolled in recognized College, ITI, Diploma, Nursing, or University in Tamil Nadu",
        ],
        howToApply: "Fill out the Pudhumai Penn verification checklist below and submit via your college nodal officer.",
        portalUrl: "https://www.tnega.tn.gov.in/",
        helpline: "1800-425-0110",
        documentsNeeded: [
          "School Study Certificate / Transfer Certificate (Classes 6-12 Govt School)",
          "College Admission Receipt & Student ID Card",
          "Aadhaar Card of Student",
          "Bank Account Passbook (Aadhaar-seeded)",
        ],
        formFields: [
          "Student Full Name",
          "Government School Name (Class 6-12)",
          "EMIS Number / School TC Number",
          "College / University Name & Course",
          "Aadhaar Number",
          "Bank Account Number & IFSC Code",
        ],
        directApplicationSteps: [
          "1. Generate your Pudhumai Penn application summary using the form below.",
          "2. Submit your EMIS number and School TC copy to your College Nodal Officer.",
          "3. College verifies Govt school background and approves application on TNeGA portal.",
          "4. Stipend of ₹1,000/month is credited directly to student's bank account.",
        ],
      },
      {
        title: "Vidiyal Payana Thittam (Zero-Ticket Bus Travel for Women)",
        badge: "Tamil Nadu Transit Subsidy",
        description: "100% free travel for all women, transwomen, and female students in ordinary town buses operated by TNSTC and MTC across Tamil Nadu.",
        benefits: [
          "100% free travel in ordinary town buses (White Board buses)",
          "Saves ₹800 to ₹1,500 monthly for working women, vendors, and students",
        ],
        eligibility: [
          "All women residents of Tamil Nadu without any income, age, or district cap",
        ],
        howToApply: "Direct boarding on any Ordinary Town Bus (white board). Conductor issues ₹0 zero-ticket without requiring any pass.",
        portalUrl: "https://www.tn.gov.in/",
        documentsNeeded: [
          "No document or pass needed — direct boarding",
        ],
        formFields: ["No form registration needed"],
        directApplicationSteps: [
          "1. Board any white-board Ordinary Town Bus operated by TNSTC or MTC.",
          "2. Conductor issues a zero-value ticket (₹0.00).",
          "3. Travel freely across town routes.",
        ],
      },
      {
        title: "Moovalur Ramamirtham Ammaiyar Marriage Assistance & Gold Scheme",
        badge: "Tamil Nadu Marriage Assistance",
        description: "Financial assistance and gold coin for the marriage of poor daughters to promote higher education and support underprivileged families.",
        benefits: [
          "₹25,000 to ₹50,000 financial assistance based on education qualification",
          "8 Grams (1 Sovereign) 22 Karat Gold Coin for Mangalsutra / Thali",
        ],
        eligibility: [
          "Bride must be at least 18 years old; Groom at least 21 years old",
          "Bride must have passed 10th Class (or 5th Class for ST category)",
          "Family annual income below ₹72,000",
        ],
        howToApply: "Submit application via local e-Sevai Center or District Social Welfare Officer at Collectorate 40 days prior to wedding.",
        portalUrl: "https://e-sevai.tn.gov.in/",
        helpline: "044-24351270",
        documentsNeeded: [
          "Bride & Groom Age Proof (Birth Certificate / TC)",
          "Educational Marksheet (10th / 12th / Degree)",
          "Income & Community Certificate from Tahsildar",
          "Marriage Invitation Card",
        ],
        formFields: [
          "Bride Full Name & Age",
          "Groom Full Name & Age",
          "Educational Qualification",
          "Family Income Certificate Number",
          "Date & Location of Marriage",
          "District & Social Welfare Block",
        ],
        directApplicationSteps: [
          "1. Fill out pre-requisite details in form below 40 days before marriage date.",
          "2. Obtain Income Certificate and Community Certificate from Tahsildar Office.",
          "3. Submit application at e-Sevai Center or Extension Officer (Social Welfare).",
          "4. Receive cheque and 8g Gold coin before wedding date.",
        ],
      },
    ],
    laws: [
      {
        actName: "Bharatiya Nyaya Sanhita, 2023 (BNS) / IPC",
        section: "BNS Section 74 / IPC Section 354: Outraging Modesty of Woman",
        description: "Criminalizes assault or use of criminal force against any woman with intent to outrage her modesty or dignity.",
        bareActText:
          "Section 74 of BNS 2023: Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty, shall be punished with imprisonment of either description for a term which shall not be less than one year but which may extend to five years, and shall also be liable to fine.",
        classification: "Cognizable | Non-Bailable | Triable by Judicial Magistrate 1st Class",
        punishment: "Mandatory imprisonment of minimum 1 year extending up to 5 years + Fine. Cognizable & Non-Bailable Offence.",
        trialCourt: "Judicial Magistrate First Class / Metropolitan Magistrate",
        officialSource: "Ministry of Law & Justice, Govt of India",
        officialUrl: "https://www.indiacode.nic.in",
      },
      {
        actName: "Bharatiya Nyaya Sanhita, 2023 (BNS) / IPC",
        section: "BNS Section 78 / IPC Section 354D: Stalking & Cyber Stalking",
        description: "Criminalizes following a woman, monitoring her electronic communications, internet activity, or attempting unwanted contact despite clear indication of disinterest.",
        bareActText:
          "Section 78 of BNS 2023: Any man who follows a woman and contacts, or attempts to contact such woman to foster personal interaction repeatedly despite a clear indication of disinterest by such woman; or monitors the use by a woman of the internet, email or any other form of electronic communication, commits the offence of stalking. Punishment: On first conviction, imprisonment up to three years and fine; on second or subsequent conviction, imprisonment up to five years and fine.",
        classification: "1st Offence: Cognizable & Bailable | 2nd Offence: Cognizable & Non-Bailable",
        punishment: "1st Conviction: Imprisonment up to 3 years + Fine (Bailable). 2nd Conviction: Imprisonment up to 5 years + Fine (Non-Bailable).",
        trialCourt: "Judicial Magistrate First Class",
        officialSource: "Ministry of Law & Justice, Govt of India",
        officialUrl: "https://www.indiacode.nic.in",
      },
      {
        actName: "Bharatiya Nyaya Sanhita, 2023 (BNS) / IPC",
        section: "BNS Section 75 / IPC Section 354A: Sexual Harassment",
        description: "Covers unwelcome physical contact, demand or request for sexual favors, showing pornography against her will, or making sexually colored remarks.",
        bareActText:
          "Section 75 of BNS 2023: A man committing any of the following acts—(i) physical contact and advances involving unwelcome and explicit sexual overtures; or (ii) a demand or request for sexual favours; or (iii) showing pornography against the will of a woman; or (iv) making sexually coloured remarks, shall be guilty of the offence of sexual harassment and punished with rigorous imprisonment for a term which may extend to three years, or with fine, or with both.",
        classification: "Cognizable | Bailable | Triable by Any Magistrate",
        punishment: "Rigorous imprisonment extending up to 3 years or Fine or both.",
        trialCourt: "Any Magistrate",
        officialSource: "Ministry of Law & Justice, Govt of India",
        officialUrl: "https://www.indiacode.nic.in",
      },
      {
        actName: "Bharatiya Nyaya Sanhita, 2023 (BNS) / IPC",
        section: "BNS Section 85 / IPC Section 498A: Cruelty by Husband or Relatives",
        description: "Protects married women from physical or mental cruelty, harassment for dowry, or conduct likely to drive her to suicide.",
        bareActText:
          "Section 85 of BNS 2023: Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to three years and shall also be liable to fine. Explanation.—For the purposes of this section, 'cruelty' means any wilful conduct which is of such a nature as is likely to drive the woman to commit suicide or to cause grave injury or danger to life, limb or health.",
        classification: "Cognizable | Non-Bailable | Non-Compoundable",
        punishment: "Imprisonment up to 3 years + Mandatory Fine. Non-Bailable & Cognizable Offence.",
        trialCourt: "Judicial Magistrate First Class",
        officialSource: "Ministry of Law & Justice, Govt of India",
        officialUrl: "https://www.indiacode.nic.in",
      },
      {
        actName: "Protection of Women from Domestic Violence Act, 2005",
        section: "Sections 3, 18 & 31: Domestic Abuse & Breach of Protection Orders",
        description: "Grants interim protection orders, residence rights in shared household, monetary relief, and custody orders. Breach of Protection Order by respondent is a criminal offence.",
        bareActText:
          "Section 31 of PWDVA 2005: A breach of protection order, or of an interim protection order, by the respondent shall be an offence under this Act and shall be punishable with imprisonment of either description for a term which may extend to one year, or with fine which may extend to twenty thousand rupees, or with both.",
        classification: "Cognizable | Non-Bailable | Triable by Judicial Magistrate 1st Class",
        punishment: "Violation of Protection Order: Imprisonment up to 1 year or Fine up to ₹20,000 or both. Non-Bailable.",
        trialCourt: "Judicial Magistrate First Class / Metropolitan Magistrate",
        officialSource: "National Commission for Women (NCW)",
        officialUrl: "https://ncw.nic.in",
      },
      {
        actName: "Sexual Harassment of Women at Workplace (POSH) Act, 2013",
        section: "Sections 4, 13 & 26: Mandatory Workplace ICC & Non-Compliance Penalties",
        description: "Mandates Internal Complaints Committee (ICC) in every office with 10+ staff. Employer must complete inquiry in 90 days and enforce termination or salary deduction of offender.",
        bareActText:
          "Section 26 of POSH Act 2013: Where the employer fails to constitute an Internal Committee, or fails to take action under sections 13, 14 and 22, he shall be punishable with fine which may extend to fifty thousand rupees. Repeat non-compliance may lead to cancellation of business license.",
        classification: "Statutory Employer Obligation | Conciliation & Executive Penalty",
        punishment: "Employer failure to form ICC or comply: Penalty up to ₹50,000; cancellation of business operational license for repeat offense.",
        trialCourt: "District Magistrate / Labour Conciliation Officer",
        officialSource: "Ministry of Women and Child Development",
        officialUrl: "https://wcd.nic.in",
      },
      {
        actName: "Dowry Prohibition Act, 1961",
        section: "Sections 3 & 4: Penalty for Giving, Taking, or Demanding Dowry",
        description: "Strictly prohibits demanding, giving, taking, or abetting dowry before, during, or after marriage.",
        bareActText:
          "Section 3 of Dowry Prohibition Act 1961: If any person, after the commencement of this Act, gives or takes or abets the giving or taking of dowry, he shall be punishable with imprisonment for a term which shall not be less than five years, and with fine which shall not be less than fifteen thousand rupees or the amount of the value of such dowry, whichever is more.",
        classification: "Cognizable | Non-Bailable | Non-Compoundable",
        punishment: "Taking/Giving Dowry: Minimum 5 years imprisonment + Fine up to ₹15,000 or dowry value. Demanding Dowry: 6 months to 2 years imprisonment + Fine.",
        trialCourt: "Metropolitan Magistrate / Judicial Magistrate First Class",
        officialSource: "Ministry of Law and Justice",
        officialUrl: "https://www.indiacode.nic.in",
      },
    ],
    authorities: [
      {
        name: "District Social Welfare Officer (DSWO) & Protection Officers",
        type: "Welfare & Domestic Protection Body",
        officerTitle: "District Social Welfare Officer (DSWO)",
        addressSummary: "Located inside District Collectorate Buildings in every District HQ across Tamil Nadu (e.g. Chennai Collectorate, Kanchipuram, Madurai, Coimbatore).",
        onlinePortal: "https://cmhelpline.tnega.org/",
        helpline: "181 / 1091 / CM Helpline: 1100",
        email: "dswochennai@tn.gov.in / ncw@nic.in",
        whatTheyDo: "Appoints Protection Officers, processes Domestic Incident Reports (DIR), arranges safe shelter, and facilitates state welfare schemes.",
        escalationContact: "Director of Social Welfare & Women Empowerment, Government of Tamil Nadu",
      },
      {
        name: "All Women Police Station (AWPS)",
        type: "Specialized Female Law Enforcement",
        officerTitle: "Inspector of Police (AWPS)",
        addressSummary: "Available in every Police Sub-Division & Taluk across Tamil Nadu.",
        helpline: "1091 / 112",
        email: "cawcell.police@tn.gov.in",
        whatTheyDo: "Registers FIRs under BNS/IPC sections for offences against women, conducts investigation, and provides emergency protection.",
        escalationContact: "Deputy Commissioner of Police (Crime Against Women & Children)",
      },
    ],
    complaintSteps: [
      "For emergency protection or imminent threat, dial 1091 (Women Helpline) or 112 immediately.",
      "For crimes/harassment, lodge an FIR at the nearest All Women Police Station (AWPS).",
      "For domestic abuse protection orders, file a petition before the Protection Officer at District Social Welfare Office (Collectorate).",
      "To claim ₹1,000 KMUT or Pudhumai Penn subsidies, use the in-app application form below.",
    ],
    documentsRequired: [
      "Aadhaar Card & Smart Ration Card (Family Card)",
      "Bank Account Passbook (Aadhaar linked)",
      "Medical Certificate / Injury Casualty Report (if physical assault)",
      "Written Incident Complaint with Date, Time, Location & Witness Details",
    ],
    faqs: [
      {
        question: "What is the punishment for stalking or harassing a woman in India?",
        answer: "Under BNS Section 78 (IPC 354D), stalking is punishable with up to 3 years imprisonment + Fine for 1st offense, and up to 5 years imprisonment + Fine for 2nd offense.",
      },
      {
        question: "How do I apply for the ₹1,000 Kalaignar Magalir Urimai Thittam in Tamil Nadu?",
        answer: "Fill out your details in the Meyyurai Scheme Application Form on this page to verify eligibility, then submit at your local e-Sevai Center or Ration Shop camp.",
      },
    ],
  },

  property: {
    slug: "property",
    title: "Property Rights, Registration & Land Laws",
    subtitle: "Complete guide to SRO land registration, Patta/Chitta transfer, Guideline Values, Hindu Succession Act, and TNREGINET portal.",
    overview:
      "Property rights in India govern ownership, land transfer, inheritance, leasing, and mandatory registration under the Registration Act 1908. In Tamil Nadu, registration is managed via Inspector General of Registration (TNREGINET) and Patta transfers via e-Services Revenue Portal.",
    schemes: [
      {
        title: "TNREGINET — Online Registration & Guideline Value Portal",
        badge: "Tamil Nadu Registration Portal",
        description: "Official portal for searching property Guideline Values, downloading Encumbrance Certificates (EC), and booking SRO appointment tokens.",
        benefits: [
          "Check official government Guideline Value per sq.ft / acre",
          "Download digital Encumbrance Certificate (EC) online",
          "Book online token for document registration at local SRO",
        ],
        eligibility: [
          "All property buyers, sellers, and property owners in Tamil Nadu",
        ],
        howToApply: "Use the in-app form below to verify survey numbers and calculate stamp duty, then proceed on TNREGINET portal.",
        portalUrl: "https://tnreginet.gov.in",
        helpline: "1800-425-6020",
        documentsNeeded: [
          "Property Survey Number & Village Name",
          "Previous Sale Deed Document Number",
        ],
        formFields: [
          "Buyer Full Name & Aadhaar",
          "Seller Full Name & Aadhaar",
          "Property Survey Number & Village Name",
          "Guideline Value / Sale Amount (in ₹)",
          "Sub-Registrar Office (SRO) Name",
        ],
        directApplicationSteps: [
          "1. Calculate Guideline Value and 7% Stamp Duty + 2% Registration Fee.",
          "2. Draft Sale Deed via registered document writer.",
          "3. Book biometric appointment token at local SRO.",
        ],
      },
    ],
    laws: [
      {
        actName: "Registration Act, 1908",
        section: "Section 17 & 49: Mandatory Property Registration & Invalid Unregistered Deeds",
        description: "All immovable property transfers (sales, gifts, mortgages exceeding ₹100, and leases over 1 year) must be registered at the Sub-Registrar Office (SRO). Unregistered documents cannot be admitted as evidence in court.",
        bareActText:
          "Section 17 of Registration Act 1908: Documents of which registration is compulsory include instruments of gift of immovable property, non-testamentary instruments which purport or operate to create, declare, assign, limit or extinguish any right, title or interest of the value of one hundred rupees and upwards, to or in immovable property.",
        classification: "Mandatory Statutory Compliance | Unregistered Document Inadmissible",
        punishment: "Unregistered property deed confers NO legal ownership title and cannot be enforced in civil court.",
        trialCourt: "Civil Court / Sub-Registrar Office (SRO)",
        officialSource: "Inspector General of Registration, Tamil Nadu",
        officialUrl: "https://tnreginet.gov.in",
      },
    ],
    authorities: [
      {
        name: "Sub-Registrar Office (SRO)",
        type: "Property Registration & Stamp Duty Body",
        addressSummary: "Located in every Taluk & Municipal Zone across Tamil Nadu (e.g. SRO Adyar, SRO Anna Nagar, SRO Tambaram, SRO Madurai, SRO Coimbatore).",
        onlinePortal: "https://tnreginet.gov.in",
        helpline: "1800-425-6020",
        whatTheyDo: "Registers Sale Deeds, Gift Deeds, Partition Deeds, collects Stamp Duty (7%) & Registration Fee (2%), and issues registered documents.",
      },
    ],
    complaintSteps: [
      "Verify Guideline Value & Encumbrance Certificate (EC) on TNREGINET before purchasing.",
      "Draft Sale Deed through a certified document writer or legal advocate.",
      "Pay E-Stamp duty (7%) & Registration fee (2%) online on TNREGINET and book an SRO token.",
    ],
    documentsRequired: [
      "Parent Deed / Previous Registered Sale Deed",
      "Latest Encumbrance Certificate (EC)",
      "Patta / Chitta Copy",
    ],
    faqs: [
      {
        question: "Where do I register my house or land sale deed in Tamil Nadu?",
        answer: "Registration must be done at the local Sub-Registrar Office (SRO) having jurisdiction over the property's village/survey number. Search SRO location on tnreginet.gov.in.",
      },
    ],
  },

  employee: {
    slug: "employee",
    title: "Employee Rights & Labour Welfare",
    subtitle: "Complete guide to salary protection, working hours, notice period rules, EPF/ESI, and SAMADHAN Labour Portal.",
    overview:
      "Employees and industrial workers in India are protected by labor laws that mandate fair working hours, overtime pay, prompt wage disbursement, EPF/ESI benefits, safety, and protection against wrongful termination or forced employment bonds.",
    schemes: [
      {
        title: "SAMADHAN Portal — Online Labour Dispute Resolution",
        badge: "Ministry of Labour & Employment",
        description: "Official central government portal for workers to lodge industrial disputes, unpaid salary claims, and wrongful termination grievances.",
        benefits: [
          "File labor disputes online directly to Conciliation Officers",
          "Track dispute status and court conciliation hearings",
        ],
        eligibility: [
          "All industrial employees, factory workers, and IT/ITeS staff",
        ],
        howToApply: "Fill the labour dispute form below to generate conciliation summary, then submit via SAMADHAN portal.",
        portalUrl: "https://samadhan.labour.gov.in",
        helpline: "14489",
        documentsNeeded: [
          "Employment Offer Letter / ID Card",
          "Salary Slips / Bank Statement",
          "Termination Notice / Written Grievance copy",
        ],
        formFields: [
          "Employee Name & Designation",
          "Employer / Company Name & Address",
          "Nature of Dispute (Unpaid Wages / Termination)",
          "Total Unpaid Amount (in ₹)",
          "Period of Work",
        ],
        directApplicationSteps: [
          "1. Generate dispute draft using in-app form below.",
          "2. Upload offer letter and salary slips to samadhan.labour.gov.in.",
          "3. Conciliation officer issues summons to employer within 14 days.",
        ],
      },
    ],
    laws: [
      {
        actName: "Code on Wages, 2019 / Payment of Wages Act, 1936",
        section: "Sections 5, 14 & 20: Delayed Wages & Overtime Penalties",
        description: "Wages must be disbursed before 7th/10th of every month. Overtime must be paid at double normal rate. Employers cannot make unauthorized salary deductions.",
        bareActText:
          "Section 5 of Code on Wages 2019: The employer shall pay or cause to be paid the wages to the employee in current coin or currency notes or by cheque or by crediting the wages in the bank account of the employee. All wages shall be paid before the expiry of the seventh day or tenth day after the last day of the wage-period.",
        classification: "Statutory Labour Enforcement | Conciliation & Criminal Prosecution",
        punishment: "Employer failure to pay wages: Fine up to ₹50,000 for 1st offense. Repeat offense: Imprisonment up to 3 months + Fine up to ₹1 Lakh.",
        trialCourt: "Labour Court / Metropolitan Magistrate",
        officialSource: "Ministry of Labour & Employment",
        officialUrl: "https://samadhan.labour.gov.in",
      },
    ],
    authorities: [
      {
        name: "Office of the Regional Labour Commissioner",
        type: "Labour Dispute & Conciliation Body",
        addressSummary: "Located in every District Headquarters across Tamil Nadu (e.g. DMS Complex Teynampet Chennai).",
        onlinePortal: "https://samadhan.labour.gov.in",
        helpline: "14489",
        whatTheyDo: "Conducts conciliation proceedings for unpaid wages, illegal termination, and labor disputes.",
      },
    ],
    complaintSteps: [
      "Gather employment proof, salary slips, work emails, and notice period correspondence.",
      "Submit a formal written grievance to your company HR / Grievance Cell.",
      "If unresolved within 14 days, file an online complaint on SAMADHAN portal (samadhan.labour.gov.in) or call 14489.",
    ],
    documentsRequired: [
      "Offer Letter / Appointment Order / Employee ID",
      "Salary Slips & Bank Account Statements (last 6 months)",
    ],
    faqs: [
      {
        question: "Can an employer withhold my salary during notice period?",
        answer: "No. Under the Payment of Wages Act and Code on Wages 2019, earned wages must be disbursed within 2 working days of employment termination.",
      },
    ],
  },

  consumer: {
    slug: "consumer",
    title: "Consumer Rights & Complaint Portals",
    subtitle: "Complete guide to e-Daakhil filing, National Consumer Helpline (1915), product refunds, and defect claims.",
    overview:
      "Consumers in India are protected under the Consumer Protection Act 2019 against defective products, deficient services, misleading advertisements, e-commerce fraud, and price gouging.",
    schemes: [
      {
        title: "National Consumer Helpline (NCH) & e-Daakhil Portal",
        badge: "Department of Consumer Affairs",
        description: "Official government platform for instant consumer dispute registration and online court filing.",
        benefits: [
          "File complaints against sellers, Amazon/Flipkart, airlines, banks, or hospitals",
          "File e-Daakhil consumer court cases online without hiring an advocate",
        ],
        eligibility: [
          "Any consumer who purchased goods or hired services for personal use",
        ],
        howToApply: "Call 1915 or file online at consumerhelpline.gov.in / edaakhil.nic.in.",
        portalUrl: "https://edaakhil.nic.in",
        helpline: "1915",
        documentsNeeded: [
          "Purchase Invoice / Tax Bill",
          "Payment Receipt / UPI Reference",
        ],
        formFields: [
          "Complainant Name & Contact",
          "Opposite Party / Brand Name",
          "Invoice Number & Date of Purchase",
          "Claim Amount & Compensation Demand (in ₹)",
        ],
        directApplicationSteps: [
          "1. Generate Consumer Notice draft using form below.",
          "2. Send notice to seller giving 7 days to refund.",
          "3. File e-Daakhil case online at edaakhil.nic.in.",
        ],
      },
    ],
    laws: [
      {
        actName: "Consumer Protection Act, 2019",
        section: "Section 2(47), 35 & 88: Unfair Trade Practices & Failure to Comply",
        description: "Guarantees right to safety, information, redressal, and replacement of defective goods or deficient services.",
        bareActText:
          "Section 35 of Consumer Protection Act 2019: A complaint in relation to any goods sold or delivered or agreed to be sold or delivered or any service provided or agreed to be provided may be filed with a District Commission by the consumer to whom such goods are sold or delivered.",
        classification: "Statutory Consumer Rights | Summary Adjudication",
        punishment: "Failure to comply with Consumer Commission Order: Imprisonment from 1 month to 3 years + Fine ₹25,000 to ₹1 Lakh.",
        trialCourt: "District Consumer Disputes Redressal Commission (DCDRC)",
        officialSource: "Department of Consumer Affairs",
        officialUrl: "https://consumeraffairs.nic.in",
      },
    ],
    authorities: [
      {
        name: "District Consumer Disputes Redressal Commission (DCDRC)",
        type: "Consumer Court",
        addressSummary: "Located inside District Court Complexes / District Headquarters in every district.",
        onlinePortal: "https://edaakhil.nic.in",
        helpline: "1915",
        whatTheyDo: "Adjudicates consumer claims up to ₹50 Lakhs, ordering full refunds, replacements, and compensation.",
      },
    ],
    complaintSteps: [
      "Send a written notice or email to the company/seller demanding refund/replacement within 7 days.",
      "If unresolved, call 1915 or register a grievance on consumerhelpline.gov.in.",
    ],
    documentsRequired: [
      "Tax Invoice / Cash Memo / Bill Copy",
      "Proof of Payment (Bank statement / UPI transaction receipt)",
    ],
    faqs: [
      {
        question: "Do I need a lawyer to file a case in Consumer Court?",
        answer: "No. Under the Consumer Protection Act 2019, consumers can file and represent their own case directly or online via edaakhil.nic.in.",
      },
    ],
  },

  cyber: {
    slug: "cyber",
    title: "Cyber Rights & Online Safety",
    subtitle: "Complete guide to reporting online financial fraud (1930), bank account freeze, and cybercrime.gov.in portal.",
    overview:
      "Cyber rights protect citizens from digital financial fraud, phishing, unauthorized banking debits, online stalking, identity theft, and data privacy violations under the IT Act 2000 and DPDP Act 2023.",
    schemes: [
      {
        title: "National Cyber Crime Reporting Portal (1930 Helpline)",
        badge: "Ministry of Home Affairs",
        description: "Official 24x7 emergency portal and hotline to report financial cyber fraud and freeze stolen money in transit.",
        benefits: [
          "Immediate lien/freeze on fraud bank account if reported within 2 hours",
          "Zero customer liability for unauthorized banking transactions under RBI rules",
        ],
        eligibility: [
          "All cyber fraud victims in India",
        ],
        howToApply: "Call 1930 immediately or register a complaint on cybercrime.gov.in.",
        portalUrl: "https://cybercrime.gov.in",
        helpline: "1930",
        documentsNeeded: [
          "Bank Transaction Reference Number / SMS",
          "Screenshots of Fraudulent Messages / Call Logs",
        ],
        formFields: [
          "Victim Name & Mobile",
          "Bank Account Number & Bank Name",
          "Fraud Transaction Reference ID",
          "Amount Defrauded (in ₹)",
          "Fraudulent UPI ID / Phone Number",
        ],
        directApplicationSteps: [
          "1. Dial 1930 immediately within 1-2 hours of fraud.",
          "2. Generate cyber complaint summary below and upload to cybercrime.gov.in.",
          "3. Submit acknowledgment copy to bank branch manager for zero-liability refund.",
        ],
      },
    ],
    laws: [
      {
        actName: "Information Technology Act, 2000",
        section: "Sections 66C & 66D: Identity Theft & Cyber Cheating by Personation",
        description: "Criminalizes OTP scams, phishing links, online identity theft, and fraudulent financial transactions.",
        bareActText:
          "Section 66D of IT Act 2000: Whoever, by means of any communication device or computer resource cheats by personation, shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to one lakh rupees.",
        classification: "Cognizable | Bailable | Triable by Metropolitan Magistrate",
        punishment: "Imprisonment up to 3 years + Fine up to ₹1 Lakh. Cognizable Offence.",
        trialCourt: "Metropolitan Magistrate / Chief Judicial Magistrate",
        officialSource: "Ministry of Electronics and IT (MeitY)",
        officialUrl: "https://meity.gov.in",
      },
    ],
    authorities: [
      {
        name: "Cyber Crime Police Station / Cyber Cell",
        type: "Specialized Police Force",
        addressSummary: "Located in every Police Commissionerate / District Police HQ across India.",
        onlinePortal: "https://cybercrime.gov.in",
        helpline: "1930 / 112",
        whatTheyDo: "Investigates digital crimes, coordinates with bank nodal officers, and recovers defrauded funds.",
      },
    ],
    complaintSteps: [
      "Call 1930 immediately within 1-2 hours of fraudulent transaction.",
      "Lodge formal complaint on cybercrime.gov.in and download complaint acknowledgement.",
    ],
    documentsRequired: [
      "Bank Account Statement highlighting fraud transaction",
      "Screenshots of phishing links, WhatsApp chats, or caller numbers",
    ],
    faqs: [
      {
        question: "What should I do immediately if money is stolen from my bank account via OTP scam?",
        answer: "Dial 1930 immediately. The cyber crime unit places an instant lien on the recipient bank account to block the money from being withdrawn.",
      },
    ],
  },

  child: {
    slug: "child",
    title: "Child Rights & Education Protection",
    subtitle: "Complete guide to POCSO Act, Childline 1098, RTE 25% free private school seats, and Child Welfare Committees.",
    overview:
      "Children in India are entitled to free and compulsory education, protection against child labor, safety from sexual offences (POCSO), and care through Child Welfare Committees.",
    schemes: [
      {
        title: "Right to Education (RTE) 25% Free Private School Quota",
        badge: "School Education Rights",
        description: "Mandates 25% free seat reservation in private non-minority schools for children from disadvantaged & weaker sections.",
        benefits: [
          "100% free tuition fee from LKG/Class 1 up to Class 8",
          "Government reimburses fees directly to private school",
        ],
        eligibility: [
          "Children belonging to SC/ST/OBC/BC, orphan, HIV-affected, or annual income below ₹2 Lakhs",
        ],
        howToApply: "Apply online during April-May annual admissions at rte.tn-schools.gov.in.",
        portalUrl: "https://rte.tn-schools.gov.in",
        helpline: "1098",
        documentsNeeded: [
          "Birth Certificate of Child",
          "Community Certificate & Income Certificate",
        ],
        formFields: [
          "Child Full Name & Date of Birth",
          "Parent / Guardian Name",
          "Income Certificate Number",
          "Preferred Private Schools List",
        ],
        directApplicationSteps: [
          "1. Generate RTE admission checklist below.",
          "2. Apply online at rte.tn-schools.gov.in during April window.",
          "3. Government conducts transparent random lottery for seat allotment.",
        ],
      },
    ],
    laws: [
      {
        actName: "Protection of Children from Sexual Offences (POCSO) Act, 2012",
        section: "Sections 4, 6 & 19: Sexual Assault Penalties & Mandatory Reporting",
        description: "Strict legislation protecting children from sexual abuse, pornography, and exploitation with mandatory reporting requirements.",
        bareActText:
          "Section 4 of POCSO Act 2012: Whoever commits penetrative sexual assault shall be punished with rigorous imprisonment for a term which shall not be less than twenty years, but which may extend to imprisonment for life, and shall also be liable to fine.",
        classification: "Cognizable | Non-Bailable | Non-Compoundable | Triable by Special POCSO Court",
        punishment: "Penetrative Sexual Assault: Minimum 20 years imprisonment up to Life Imprisonment / Death + Fine.",
        trialCourt: "Special Designated POCSO Sessions Court",
        officialSource: "Ministry of Women and Child Development",
        officialUrl: "https://wcd.nic.in",
      },
    ],
    authorities: [
      {
        name: "Child Welfare Committee (CWC) & DCPU",
        type: "Statutory Child Protection Body",
        addressSummary: "Located in every District Collectorate Headquarters.",
        helpline: "1098",
        whatTheyDo: "Handles care, protection, rehabilitation, and legal safeguard of children in distress.",
      },
    ],
    complaintSteps: [
      "Call 1098 (Childline Helpline) available 24x7.",
      "Report child safety violations to District Child Protection Officer at Collectorate.",
    ],
    documentsRequired: ["Child Birth Certificate", "Guardian Aadhaar Proof"],
    faqs: [
      {
        question: "How can I apply for 25% free private school admission under RTE in Tamil Nadu?",
        answer: "Apply online at rte.tn-schools.gov.in during the annual April admission window using your child's Birth Certificate and Income/Community Certificate.",
      },
    ],
  },

  senior: {
    slug: "senior",
    title: "Senior Citizen Rights & Elderline",
    subtitle: "Complete guide to Elderline 14567, Maintenance Tribunal, property gift revocation, and Old Age Pensions.",
    overview:
      "Senior citizens (aged 60+) have statutory rights to maintenance from children, fast-track tribunal proceedings, revocation of property transfers if neglected, and government old age pensions.",
    schemes: [
      {
        title: "Elderline 14567 — National Helpline for Senior Citizens",
        badge: "Ministry of Social Justice",
        description: "Toll-free 24x7 helpline offering free legal counseling, rescue, emotional support, and pension assistance for seniors.",
        benefits: ["Free legal advice", "Rescue of abandoned seniors", "Elder abuse intervention"],
        eligibility: ["Citizens aged 60 years and above"],
        howToApply: "Call 14567 directly from any phone.",
        helpline: "14567",
        documentsNeeded: ["Senior Citizen ID / Aadhaar"],
        formFields: ["Senior Citizen Name", "Age & Address", "Children / Relative Details"],
        directApplicationSteps: ["1. Call 14567 or file petition at local RDO Tribunal."],
      },
    ],
    laws: [
      {
        actName: "Maintenance and Welfare of Parents and Senior Citizens Act, 2007",
        section: "Sections 4 & 23: Maintenance Orders & Property Transfer Revocation",
        description: "Children/heirs must maintain senior citizens. If a senior citizen transfers property on condition of maintenance and is neglected, the Tribunal can declare the transfer void.",
        bareActText:
          "Section 23 of Senior Citizens Act 2007: Where any senior citizen who, after the commencement of this Act, has transferred by way of gift or otherwise, his property, subject to the condition that the transferee shall provide the basic amenities and basic physical needs to the transferor and such transferee refuses or fails to provide such amenities and physical needs, the said transfer of property shall be deemed to have been made by fraud or coercion or under undue influence and shall at the option of the transferor be declared void by the Tribunal.",
        classification: "Statutory Welfare Protection | Summary Tribunal Jurisdiction",
        punishment: "Non-compliance with maintenance order: Imprisonment up to 1 month or until payment is made. Abandoning Senior Citizen: Imprisonment up to 3 months + Fine ₹5,000.",
        trialCourt: "Senior Citizens Maintenance Tribunal (RDO Office)",
        officialSource: "Ministry of Social Justice and Empowerment",
        officialUrl: "https://socialjustice.gov.in",
      },
    ],
    authorities: [
      {
        name: "Senior Citizens Maintenance Tribunal (RDO Office)",
        type: "Statutory Maintenance Tribunal",
        addressSummary: "Office of the Revenue Divisional Officer (RDO) in every Sub-Division.",
        helpline: "14567",
        whatTheyDo: "Issues monthly maintenance orders up to ₹10,000 against children and cancels property deeds if parents are abandoned.",
      },
    ],
    complaintSteps: [
      "File a petition before the RDO / Maintenance Tribunal at your local Revenue Divisional Office.",
    ],
    documentsRequired: ["Aadhaar Card", "Age Proof", "Property Deed Copy (if applicable)"],
    faqs: [
      {
        question: "Can a senior citizen reclaim property gifted to a son/daughter if they refuse to care for them?",
        answer: "Yes. Under Section 23 of the Maintenance and Welfare of Parents and Senior Citizens Act 2007, the RDO Tribunal can declare the gift deed null and void.",
      },
    ],
  },

  legalaid: {
    slug: "legalaid",
    title: "Free Legal Aid & NALSA Assistance",
    subtitle: "Complete guide to Article 39A free lawyer access, District Legal Services Authority (DLSA), 15100 Helpline & Lok Adalats.",
    overview:
      "Under Article 39A of the Constitution of India and Legal Services Authorities Act 1987, free legal aid (including free advocate, court fee exemption, and document drafting) is a fundamental right for women, children, SC/ST, custody victims, industrial workers, and low-income families.",
    schemes: [
      {
        title: "NALSA Free Legal Aid & Assigned Advocate Scheme",
        badge: "National Legal Services Authority",
        description: "Provides free legal representation by senior empaneled advocates, free court fee exemption, and free drafting for civil, criminal, and family court cases.",
        benefits: [
          "100% free lawyer fees paid by Govt for entire trial and appeals",
          "Exemption from court fees and process fees in High Court and Subordinate Courts",
          "Free typing, translation, and document certified copies",
        ],
        eligibility: [
          "All women and children regardless of income",
          "Members of Scheduled Castes (SC) or Scheduled Tribes (ST)",
          "Victims of human trafficking, mass disaster, violence, or industrial workers",
          "General category persons with annual income below ₹3 Lakhs (in TN)",
        ],
        howToApply: "Apply online via nalsa.gov.in or visit the District Legal Services Authority (DLSA) inside your local District Court complex.",
        portalUrl: "https://nalsa.gov.in",
        helpline: "15100 (National Legal Aid Toll-Free Helpline)",
        documentsNeeded: [
          "Aadhaar Card / Govt Identity Proof",
          "Income Certificate (if general category)",
          "Case documents / FIR copy / Court notice",
        ],
        formFields: [
          "Applicant Name & Contact Address",
          "Category (Woman / SC-ST / Low Income)",
          "Court Name & Case Title",
          "Legal Relief Demanded (Advocate / Drafting / Bail / Appeal)",
        ],
        directApplicationSteps: [
          "1. Dial 15100 or visit the DLSA front office inside your District Court.",
          "2. Submit legal aid application form along with case details.",
          "3. Member Secretary assigns an empaneled advocate within 48 hours.",
          "4. Advocate represents your case free of charge across all court proceedings.",
        ],
      },
    ],
    laws: [
      {
        actName: "Legal Services Authorities Act, 1987",
        section: "Section 12 & Article 39A: Right to Free Legal Services & Lok Adalat Enforcement",
        description: "Statutory guarantee providing free and competent legal services to the weaker sections of society to ensure opportunities for securing justice are not denied.",
        bareActText:
          "Section 12 of Legal Services Authorities Act 1987: Every person who has to file or defend a case shall be entitled to legal services under this Act if that person is a woman or a child, a member of a Scheduled Caste or Scheduled Tribe, or an industrial workman.",
        classification: "Constitutional Mandate | Statutory Free Representation",
        punishment: "Denial of legal aid to eligible persons violates Constitutional Rights under Article 21 & Article 39A.",
        trialCourt: "District Court DLSA / High Court Legal Services Committee (HCLSC)",
        officialSource: "National Legal Services Authority (NALSA)",
        officialUrl: "https://nalsa.gov.in",
      },
    ],
    authorities: [
      {
        name: "District Legal Services Authority (DLSA)",
        type: "Statutory Free Legal Aid Body",
        officerTitle: "Member Secretary (District Judge Rank)",
        addressSummary: "Located inside District Court Complexes in all 38 District Headquarters of Tamil Nadu.",
        onlinePortal: "https://nalsa.gov.in",
        helpline: "15100 / 044-25342834 (TN State Legal Services Authority)",
        email: "tnslsa@tn.gov.in / nalsa-dla@nic.in",
        whatTheyDo: "Assigns free empaneled advocates, pays court fees, drafts petitions, and conducts Lok Adalats for quick settlement.",
        escalationContact: "Member Secretary, Tamil Nadu State Legal Services Authority (TNSLSA), High Court Campus, Chennai",
      },
    ],
    complaintSteps: [
      "Dial 15100 or visit your local District Court DLSA Front Office.",
      "Fill out the 1-page free legal aid application with case details.",
      "An empaneled legal aid advocate will be assigned to handle your case free of charge.",
    ],
    documentsRequired: ["Aadhaar / ID Card", "Case Papers / Summons / FIR Copy", "Income Certificate (if applicable)"],
    faqs: [
      {
        question: "Is legal aid completely free for women and SC/ST candidates?",
        answer: "Yes. Under Section 12 of Legal Services Authorities Act 1987, all women, children, and SC/ST candidates are entitled to free lawyers regardless of income.",
      },
    ],
  },

  scst: {
    slug: "scst",
    title: "SC / ST Rights & Atrocities Protection",
    subtitle: "Complete guide to PoA Act 1989, mandatory non-bailable FIR, Govt financial compensation, and SC/ST Welfare Board.",
    overview:
      "Scheduled Castes (SC) and Scheduled Tribes (ST) are protected under the Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act 1989 against caste discrimination, abuse, land grabbing, assault, and denial of dignity. Mandatory state compensation is credited directly upon FIR registration.",
    schemes: [
      {
        title: "SC/ST Atrocity Victim Financial Victim Relief & Rehabilitation Scheme",
        badge: "Tamil Nadu Adi Dravidar Welfare Dept",
        description: "Mandatory cash compensation ranging from ₹85,000 to ₹8,25,000 provided automatically to SC/ST victims upon FIR registration under PoA Act.",
        benefits: [
          "₹85,000 to ₹8.25 Lakhs victim relief credited directly to bank account",
          "50% relief disbursed immediately upon FIR registration; balance after chargesheet",
          "Free legal representation and monthly pension for victims' dependents in severe cases",
        ],
        eligibility: [
          "Any SC/ST individual who is a victim of an offence under the PoA Act by non-SC/ST persons",
        ],
        howToApply: "Automatic process initiated by DSP / District Collector upon registration of PoA FIR.",
        portalUrl: "https://adwelfare.tn.gov.in",
        helpline: "18555 (SC/ST Helpline) / CM Helpline 1100",
        documentsNeeded: [
          "Community Certificate (SC/ST)",
          "Copy of FIR under PoA Act",
          "Bank Account Details (Aadhaar linked)",
        ],
        formFields: [
          "Victim Name & Community",
          "FIR Number & Police Station",
          "Aadhaar Number & Bank Account",
        ],
        directApplicationSteps: [
          "1. Lodge FIR under SC/ST (PoA) Act at local Police Station or DSP Office.",
          "2. DSP submits Atrocity Relief proposal to District Collectorate within 7 days.",
          "3. First instalment of victim relief is credited via DBT to victim's bank account.",
        ],
      },
    ],
    laws: [
      {
        actName: "Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989",
        section: "Sections 3, 14 & 18: Non-Bailable Offence & Special Designated Courts",
        description: "Criminalizes casteist abuse, assault, economic boycott, land dispossession, and atrocities against SC/ST community. Offences are non-bailable and investigated directly by a Deputy Superintendent of Police (DSP).",
        bareActText:
          "Section 3 of SC/ST (PoA) Act 1989: Whoever, not being a member of a Scheduled Caste or a Scheduled Tribe, intentionally insults or intimidates with intent to humiliate a member of a Scheduled Caste or a Scheduled Tribe in any place within public view, shall be punishable with imprisonment for a term which shall not be less than six months but which may extend to five years and with fine.",
        classification: "Cognizable | Non-Bailable | Investigated by DSP | Special Court Trial",
        punishment: "Rigorous imprisonment extending from 6 months up to Life Imprisonment + Mandatory Fine & Victim Compensation.",
        trialCourt: "Special Designated SC/ST Sessions Court",
        officialSource: "Ministry of Social Justice and Empowerment",
        officialUrl: "https://socialjustice.gov.in",
      },
    ],
    authorities: [
      {
        name: "District Police Office — Social Justice & Human Rights (SJ&HR) Cell",
        type: "Specialized Police Force",
        officerTitle: "Deputy Superintendent of Police (DSP - SJ&HR)",
        addressSummary: "Located inside District Police Commissionerate / SP Office in every district headquarters.",
        onlinePortal: "https://adwelfare.tn.gov.in",
        helpline: "18555 / 112",
        email: "sjhr.police@tn.gov.in",
        whatTheyDo: "Investigates PoA offences, issues atrocity victim relief reports, and ensures protection of witnesses.",
        escalationContact: "Inspector General of Police, Social Justice & Human Rights, Chennai",
      },
    ],
    complaintSteps: [
      "Report atrocity incident immediately to the DSP (SJ&HR) or nearest Police Station.",
      "Ensure FIR is registered under relevant sections of SC/ST (PoA) Act 1989.",
      "Submit bank passbook and community certificate to Collectorate for victim relief payment.",
    ],
    documentsRequired: ["Community Certificate (SC/ST)", "FIR Copy", "Aadhaar Card & Bank Passbook"],
    faqs: [
      {
        question: "Is anticipatory bail granted in SC/ST Atrocities cases?",
        answer: "Under Section 18 of SC/ST (PoA) Act 1989, anticipatory bail under Section 438 CrPC is barred where a prima facie case of atrocity is disclosed.",
      },
    ],
  },

  education: {
    slug: "education",
    title: "Education Rights & Student Welfare",
    subtitle: "Complete guide to scholarships, UGC Grievance Portal, Fee Regulatory Committee & anti-ragging helpline (1800-180-5522).",
    overview:
      "Students in India have rights to non-discriminatory admission, transparent fees, safe campus environments free of ragging, government scholarships, and mandatory student grievance redressal committees.",
    schemes: [
      {
        title: "National Scholarship Portal (NSP) & Post-Matric Scholarships",
        badge: "Ministry of Education / Govt of TN",
        description: "Centralized portal providing tuition fee reimbursement, maintenance allowances, and merit scholarships for school and college students.",
        benefits: [
          "Full tuition fee reimbursement for eligible students",
          "Monthly maintenance stipend credited directly to student bank account",
        ],
        eligibility: [
          "Students belonging to SC/ST/BC/MBC/Minority or low-income background enrolled in recognized institutions",
        ],
        howToApply: "Apply online at scholarships.gov.in or tn.gov.in e-Sevai portal.",
        portalUrl: "https://scholarships.gov.in",
        helpline: "0120-6619540 / Anti-Ragging: 1800-180-5522",
        documentsNeeded: [
          "Income & Community Certificate",
          "College Admission Receipt & Previous Marksheets",
          "Bank Passbook (Aadhaar linked)",
        ],
        formFields: [
          "Student Name & Aadhaar Number",
          "Institution Name & Course Details",
          "Income Certificate Number",
        ],
        directApplicationSteps: [
          "1. Register student account on scholarships.gov.in.",
          "2. Upload marksheets and certificates for institutional verification.",
          "3. Nodal Officer approves and funds are credited via DBT.",
        ],
      },
    ],
    laws: [
      {
        actName: "UGC (Grievance Redressal) Regulations & Anti-Ragging Act",
        section: "Mandatory Anti-Ragging Committee & Ombudsman Proceedings",
        description: "Mandates Anti-Ragging Cell in every higher education institution. Ragging is a cognizable criminal offence leading to expulsion and police arrest.",
        bareActText:
          "UGC Regulations 2012: Ragging in any form is strictly prohibited inside and outside educational institutions. Any student found guilty shall be expelled and face criminal prosecution under criminal penal code.",
        classification: "Cognizable Offence | Mandatory Institutional Action within 24 Hours",
        punishment: "Expulsion from institution, cancellation of admission + Imprisonment up to 3 years under penal law.",
        trialCourt: "Judicial Magistrate First Class / UGC Ombudsman",
        officialSource: "University Grants Commission (UGC)",
        officialUrl: "https://www.ugc.gov.in",
      },
    ],
    authorities: [
      {
        name: "UGC Student Grievance Redressal Portal & Anti-Ragging Helpline",
        type: "Education Regulatory Body",
        officerTitle: "Ombudsman / Anti-Ragging Nodal Officer",
        addressSummary: "UGC Headquarters, New Delhi & Regional Office Chennai.",
        onlinePortal: "https://antiragging.in",
        helpline: "1800-180-5522 (24x7 Anti-Ragging Toll-Free)",
        email: "helpline@antiragging.in / secy.ugc@nic.in",
        whatTheyDo: "Enforces 24-hour action on campus ragging complaints, fee extortion, and student harassment.",
        escalationContact: "Secretary, University Grants Commission (UGC), New Delhi",
      },
    ],
    complaintSteps: [
      "Report ragging immediately to 1800-180-5522 or email helpline@antiragging.in.",
      "Submit written grievance to institutional Student Grievance Committee.",
    ],
    documentsRequired: ["Student ID Card", "Fee Receipt / Marksheet", "Complaint Evidence"],
    faqs: [
      {
        question: "Is ragging a punishable crime in Indian colleges?",
        answer: "Yes. Ragging is a non-bailable cognizable criminal offence. Institutions failing to take action lose UGC recognition.",
      },
    ],
  },

  travel: {
    slug: "travel",
    title: "Travel & Passenger Rights",
    subtitle: "Complete guide to Railway Helpline 139, Flight Cancellation Compensation (DGCA), and Road Accident Emergency 108.",
    overview:
      "Passengers traveling by trains, flights, or buses in India have statutory rights to refund, delay compensation, emergency medical aid, and protection against overcharging.",
    schemes: [
      {
        title: "DGCA Air Passenger Charter — Delay & Cancellation Compensation",
        badge: "Directorate General of Civil Aviation",
        description: "Statutory compensation rules mandating full refunds, free meals, hotel accommodation, or cash compensation for delayed or canceled flights.",
        benefits: [
          "Cash compensation up to ₹10,000 for canceled flights without 2-week notice",
          "Free refreshments and meals for flight delays exceeding 2 to 4 hours",
          "Full refund or alternate flight arrangement at passenger choice",
        ],
        eligibility: ["All domestic and international airline passengers holding valid tickets"],
        howToApply: "Claim directly with airline nodal officer or register grievance on AirSewa portal.",
        portalUrl: "https://airsewa.gov.in",
        helpline: "AirSewa Helpline / Rail Madad: 139",
        documentsNeeded: ["Flight PNR / E-Ticket", "Boarding Pass", "Airline Delay SMS/Communication"],
        formFields: ["Passenger Name & PNR", "Flight Number & Date", "Issue Category"],
        directApplicationSteps: [
          "1. Request delay certificate from airline desk at airport.",
          "2. File grievance on airsewa.gov.in if compensation is denied by airline.",
        ],
      },
    ],
    laws: [
      {
        actName: "Railways Act, 1989 & Motor Vehicles Act, 2019",
        section: "Sections 124 & 124A: Compensation for Train Accidents & Good Samaritan Rights",
        description: "Mandates compensation up to ₹8 Lakhs for railway accident victims. Motor Vehicles Act protects Good Samaritans helping accident victims from police harassment.",
        bareActText:
          "Section 124A of Railways Act: Railway administration is liable to pay compensation for loss of life or personal injury suffered by a passenger in an untoward incident or train accident.",
        classification: "Statutory Liability | Railway Claims Tribunal Jurisdiction",
        punishment: "Railway Claims Tribunal orders mandatory compensation up to ₹8 Lakhs.",
        trialCourt: "Railway Claims Tribunal (RCT)",
        officialSource: "Ministry of Railways",
        officialUrl: "https://railmadad.indianrailways.gov.in",
      },
    ],
    authorities: [
      {
        name: "RailMadad — Indian Railways Integrated Helpline & Portal",
        type: "Railway Passenger Redressal Body",
        officerTitle: "Divisional Railway Manager (DRM) / Nodal Officer",
        addressSummary: "Available across all Railway Stations & Divisions (Southern Railway Chennai HQ).",
        onlinePortal: "https://railmadad.indianrailways.gov.in",
        helpline: "139 (24x7 Rail Helpline)",
        email: "railmadad@rb.railnet.gov.in",
        whatTheyDo: "Handles real-time train complaints, security emergencies, cleanliness, and ticket refund disputes.",
        escalationContact: "General Manager, Southern Railway, Park Town, Chennai",
      },
    ],
    complaintSteps: [
      "Dial 139 or use RailMadad app for instant train assistance.",
      "File AirSewa grievance (airsewa.gov.in) for flight delay compensation disputes.",
    ],
    documentsRequired: ["Train PNR / Flight Ticket Copy", "ID Proof"],
    faqs: [
      {
        question: "Can police question a Good Samaritan who helps a road accident victim?",
        answer: "No. Under MV Act 2019, Good Samaritans are immune from police interrogation, forced disclosure of personal details, or legal liability.",
      },
    ],
  },

  family: {
    slug: "family",
    title: "Family Rights, Custody & Maintenance",
    subtitle: "Complete guide to Family Court procedures, Section 144 BNS / 125 CrPC maintenance, child custody & mutual divorce.",
    overview:
      "Family laws in India govern marriage, divorce, child custody, adoption, and compulsory monthly maintenance for spouses and children under statutory provisions.",
    schemes: [
      {
        title: "Family Court Conciliation & Free Legal Counseling Services",
        badge: "High Court Legal Services Committee",
        description: "Mandatory pre-litigation counseling and mediation provided at Family Courts to resolve marital disputes amicably.",
        benefits: [
          "Free certified counselors and mediators assigned by court",
          "Fast-track mutual consent divorce and custody settlement without protracted trial",
        ],
        eligibility: ["All married couples, parents, and family members"],
        howToApply: "Visit the Family Court Conciliation Center inside District Court Campus.",
        portalUrl: "https://districts.ecourts.gov.in",
        helpline: "15100 (Legal Aid Helpline)",
        documentsNeeded: ["Marriage Certificate / Invitation", "Aadhaar Card", "Proof of Income"],
        formFields: ["Petitioner Name & Address", "Respondent Name", "Relief Demanded"],
        directApplicationSteps: ["1. File family petition before Principal Judge, Family Court."],
      },
    ],
    laws: [
      {
        actName: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) / CrPC",
        section: "BNSS Section 144 / CrPC Section 125: Mandatory Maintenance for Wife & Children",
        description: "Mandates monthly maintenance allowance for wives, minor children, and dependent parents unable to maintain themselves.",
        bareActText:
          "Section 144 of BNSS 2023: If any person having sufficient means neglects or refuses to maintain his wife, unable to maintain herself, or his legitimate or illegitimate child, a Magistrate of the first class may order such person to make a monthly allowance for maintenance.",
        classification: "Statutory Maintenance Right | Summary Magistrate Proceedings",
        punishment: "Failure to pay maintenance: Imprisonment up to 1 month for every breach or until payment is fulfilled.",
        trialCourt: "Family Court / Judicial Magistrate First Class",
        officialSource: "Ministry of Law and Justice",
        officialUrl: "https://www.indiacode.nic.in",
      },
    ],
    authorities: [
      {
        name: "Family Court & Mediation Center",
        type: "Specialized Family Judicial Body",
        officerTitle: "Principal Judge, Family Court",
        addressSummary: "Located inside District Court Complexes across Tamil Nadu.",
        onlinePortal: "https://districts.ecourts.gov.in",
        helpline: "15100 / 044-25342834",
        email: "familycourt.chennai@tn.gov.in",
        whatTheyDo: "Adjudicates divorce, maintenance petitions, child custody, and restitution of conjugal rights.",
        escalationContact: "High Court Legal Services Committee, High Court Campus, Chennai",
      },
    ],
    complaintSteps: [
      "File a petition under BNSS Section 144 before the Family Court for interim monthly maintenance.",
      "Attend court conciliation sessions with assigned mediator.",
    ],
    documentsRequired: ["Marriage Proof", "Income Statements / Bank Passbook", "Child Birth Certificate"],
    faqs: [
      {
        question: "Can interim maintenance be granted during the pendency of a family case?",
        answer: "Yes. The Family Court Magistrate can grant interim monthly maintenance within 60 days of notice service.",
      },
    ],
  },
};

