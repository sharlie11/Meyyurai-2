import os
import json
import re
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, session
try:
    import google.generativeai as genai
except ImportError:
    genai = None
try:
    import db
except ImportError:
    from backend import db

try:
    import sms_service
except ImportError:
    from backend import sms_service

load_dotenv()

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.getenv("SECRET_KEY", "meyyurai_secure_key_2026_sos_portal")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Configure Gemini AI (with graceful local fallback if API key is missing or offline)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
if GOOGLE_API_KEY.startswith("export "):
    GOOGLE_API_KEY = GOOGLE_API_KEY.replace("export ", "").strip()
if "=" in GOOGLE_API_KEY and not GOOGLE_API_KEY.startswith("AIza"):
    GOOGLE_API_KEY = GOOGLE_API_KEY.split("=")[-1].strip().strip('"').strip("'")

gemini_model = None
if GOOGLE_API_KEY and genai:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        print("Gemini AI successfully initialized for Meyyurai.")
    except Exception as e:
        print("Warning: Gemini initialization error:", e)

# Load official Indian legal knowledge base
DATA_DIR = Path(__file__).resolve().parent / "data"
RIGHTS_DATA = {}
try:
    rights_file = DATA_DIR / "rights_data.json"
    if rights_file.exists():
        with open(rights_file, "r", encoding="utf-8") as f:
            RIGHTS_DATA = json.load(f)
        print(f"Loaded {len(RIGHTS_DATA)} legal categories from {rights_file}")
except Exception as e:
    print("Warning: Could not load rights_data.json:", e)


# ============================================================================
# STATUTORY LEGAL NLP & CLASSIFICATION ENGINE (PHASE 4A)
# ============================================================================

STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'its', 'itself', 'just',
    'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only',
    'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
    'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
    'was', 'wasn\'t', 'we', 'were', 'weren\'t', 'what', 'when', 'where', 'which', 'while', 'who',
    'whom', 'why', 'with', 'won\'t', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
    'please', 'help', 'sir', 'madam', 'someone', 'yesterday', 'today', 'something', 'anything',
    'thing', 'things', 'happened', 'need', 'want', 'tell', 'know', 'give', 'issue', 'problem',
    'matter', 'case', 'regarding', 'also', 'came', 'threw', 'getting', 'done', 'dealing', 'facing'
}

IRREGULAR_STEMS = {
    'children': 'child', 'labour': 'labor', 'stole': 'steal', 'stolen': 'steal',
    'stealing': 'steal', 'wives': 'wife', 'evicted': 'evict', 'evicting': 'evict',
    'eviction': 'evict', 'evictions': 'evict', 'frauds': 'fraud', 'fraudulent': 'fraud',
    'harassed': 'harass', 'harassing': 'harass', 'harassment': 'harass',
    'defects': 'defect', 'defective': 'defect', 'refunds': 'refund', 'refunding': 'refund',
    'refunded': 'refund', 'scams': 'scam', 'scammed': 'scam', 'scammer': 'scam', 'scammers': 'scam',
    'salaries': 'salary', 'wages': 'wage', 'tenants': 'tenant', 'tenancy': 'tenant',
    'landlords': 'landlord', 'locks': 'lock', 'locked': 'lock', 'locking': 'lock',
    'properties': 'property', 'disputes': 'dispute', 'disputed': 'dispute',
    'complaints': 'complaint', 'complaining': 'complaint', 'unpaid': 'unpaid',
    'threatening': 'threat', 'threatened': 'threat', 'threats': 'threat',
    'beaten': 'beat', 'beating': 'beat', 'abused': 'abuse', 'abusing': 'abuse',
    'encroached': 'encroach', 'encroachment': 'encroach', 'encroaching': 'encroach',
    'ancestral': 'ancestral', 'boundary': 'boundary', 'boundaries': 'boundary',
    'sexually': 'sexual', 'sexual': 'sexual', 'touching': 'touch', 'inlaws': 'inlaw',
    'cheated': 'cheat', 'cheating': 'cheat', 'falsified': 'falsify'
}

EMERGENCY_SIGNALS = [
    'breaking into', 'break into', 'break in', 'kill me', 'killing me', 'attacked right now',
    'attacking me', 'save me', 'immediate danger', 'help me please', 'suicide', 'threat to life',
    'physical violence right now', 'beating me right now', 'hostage', 'kidnapped', 'knife', 'gun', 'weapon'
]

CATEGORY_TAXONOMY = {
    'cyber': {
        'title': 'Cyber Rights & Online Safety',
        'high': ['cyber', 'phish', 'otp', 'hacker', 'hack', 'upi', 'debit', 'unauthor', 'apk', 'malware', 'ransomware', 'crypto', 'sextortion', 'imperson', 'darknet'],
        'med': ['fraud', 'scam', 'steal', 'onlin', 'link', 'whatsapp', 'telegram', 'instagram', 'facebook', 'password', 'credenti', 'bank', 'account', 'transact', 'netbank', 'sim'],
        'phrases': ['cyber fraud', 'financial fraud', 'unauthorized transaction', 'online scam', 'phishing link', 'otp fraud', 'account debit', 'stole money', 'upi scam', 'bank fraud', 'online financial']
    },
    'property': {
        'title': 'Property Rights, Registration & Land Laws',
        'high': ['landlord', 'tenant', 'evict', 'leas', 'rent', 'patta', 'chitta', 'boundary', 'encroach', 'sro', 'sub-registrar', 'guideline', 'stamp', 'encumbr', 'sale deed', 'title deed', 'tnreginet'],
        'med': ['properti', 'land', 'plot', 'flat', 'apart', 'hous', 'lock', 'trespass', 'squatter', 'ancestral', 'inherit', 'ownership', 'owner', 'immov', 'survey'],
        'phrases': ['changing lock', 'changed lock', 'illegal eviction', 'threw out', 'rent agreement', 'tenancy agreement', 'title deed', 'boundary dispute', 'land encroachment', 'ancestral property', 'without notice', 'land dispute', 'changing the locks']
    },
    'consumer': {
        'title': 'Consumer Rights & Complaint Portals',
        'high': ['consum', 'defect', 'warranti', 'guarante', 'refund', 'replac', 'dcdrc', 'edaakhil', '1915', 'adulter', 'mrp'],
        'med': ['product', 'seller', 'merchant', 'e-commerc', 'shop', 'deliveri', 'purchas', 'bought', 'store', 'order', 'servic defect', 'flight', 'overcharg', 'bill', 'receipt'],
        'phrases': ['defective product', 'defective item', 'defective device', 'defective refrigerator', 'defective phone', 'unfair trade', 'refuse refund', 'refusing refund', 'online seller', 'consumer court', 'consumer commission', 'national consumer helpline']
    },
    'employee': {
        'title': 'Employee Rights & Labour Welfare',
        'high': ['salari', 'wage', 'unpaid', 'provident', 'pf', 'epf', 'esi', 'gratuiti', 'samadhan', 'concili'],
        'med': ['employe', 'employ', 'boss', 'compani', 'worker', 'job', 'termin', 'fire', 'resign', 'notic period', 'overtim', 'work hour', 'contractor'],
        'phrases': ['unpaid salary', 'delayed wage', 'salary not paid', 'wrongful termination', 'illegal termination', 'labour court', 'pf deduction', 'labour wage']
    },
    'women': {
        'title': 'Women Rights, Safety Laws & Subsidies',
        'high': ['posh', 'icc', 'dowri', 'domest violenc', 'dv act', 'modesti', 'stalk', 'stridhan', 'magalir', 'awps', '1091', '181', 'harass', 'sexual', 'molest', 'rape', 'inlaw'],
        'med': ['woman', 'women', 'femal', 'wife', 'husband', 'assault', 'cruelti', 'touch', 'inappropri', '498a', 'bns 85', 'bns 75', 'bns 74', 'dir'],
        'phrases': ['sexual harassment', 'sexually harassing', 'sexually harassed', 'domestic violence', 'workplace harassment', 'demand dowry', 'demanding dowry', 'in-laws beat', 'husband beat', 'protection order', 'women helpline', 'unwanted touching', 'outraging modesty']
    },
    'child': {
        'title': 'Child Rights & Education Protection',
        'high': ['pocso', 'child labor', 'cwc', 'childlin', '1098', 'juvenil', 'dcpu'],
        'med': ['child', 'kid', 'minor', 'underag', 'pedophil', 'orphan', 'adopt', 'school safeti'],
        'phrases': ['child labour', 'child labor', 'child abuse', 'sexual assault on child', 'minor child', 'under 18', 'child safety', 'child welfare']
    },
    'senior': {
        'title': 'Senior Citizen Rights & Elderline',
        'high': ['senior citizen', 'elderlin', '14567', 'mainten tribunal', 'rdo'],
        'med': ['elder', 'parent', 'old age', 'pension'],
        'phrases': ['senior citizen', 'elder abuse', 'abandoned parents', 'maintenance of parents', 'gift deed cancellation', 'elderly parents']
    },
    'scst': {
        'title': 'SC / ST Rights & Atrocities Protection',
        'high': ['sc/st', 'schedul cast', 'schedul tribe', 'dalit', 'poa act', 'atroc'],
        'med': ['cast', 'untouch', 'slur', 'inter-cast'],
        'phrases': ['prevention of atrocities', 'caste discrimination', 'caste abuse', 'sc st act', 'scheduled caste', 'scheduled tribe']
    },
    'education': {
        'title': 'Education Rights & Student Welfare',
        'high': ['rag', 'anti-rag', 'ugc', 'capit fee', 'student grievanc'],
        'med': ['student', 'colleg', 'univers', 'school', 'tuit', 'marksheet', 'degre', 'admiss', 'exam', 'scholarship'],
        'phrases': ['anti ragging', 'college ragging', 'withholding marksheet', 'excessive fee', 'ragging in college']
    },
    'travel': {
        'title': 'Travel & Passenger Rights',
        'high': ['railmadad', '139', 'irctc', 'train ticket', 'mact'],
        'med': ['passeng', 'train', 'railway', 'bus', 'flight', 'airlin', 'baggag', 'board', 'conductor', 'vehicl', 'accid'],
        'phrases': ['train delay', 'railway refund', 'road accident', 'good samaritan', 'passenger rights', 'train accident']
    },
    'family': {
        'title': 'Family Rights, Custody & Maintenance',
        'high': ['divorc', 'alimoni', 'conjug', 'famili court', 'guardianship', '125 crpc', '144 bnss'],
        'med': ['custodi', 'separ', 'marriag', 'matrimoni', 'mediat'],
        'phrases': ['child custody', 'mutual consent divorce', 'monthly maintenance', 'conjugal rights', 'family dispute', 'custody of child']
    },
    'legalaid': {
        'title': 'Free Legal Aid & NALSA Assistance',
        'high': ['legal aid', 'free lawyer', 'dlsa', 'tlsc', 'nalsa', '15100', 'lok adalat', 'articl 39a'],
        'med': ['indig', 'court fee exempt', 'free advocat'],
        'phrases': ['free legal aid', 'free lawyer', 'district legal services', 'lok adalat', 'article 39a', 'legal aid advocate']
    }
}


def stem_token(t: str) -> str:
    """Normalize English tokens and morphological variations."""
    if t in IRREGULAR_STEMS:
        return IRREGULAR_STEMS[t]
    for s in ('ing', 'tions', 'tion', 'ments', 'ment', 'ies', 'ed', 'es', 's'):
        if t.endswith(s) and len(t) - len(s) >= 3:
            return t[:-len(s)]
    return t


def detect_emergency(text: str) -> bool:
    """Identify immediate physical threats or violence requiring instant emergency dispatch."""
    if not text:
        return False
    t = text.lower()
    return any(term in t for term in EMERGENCY_SIGNALS)


def classify_legal_query(text: str) -> dict:
    """
    Robust rule-based and weighted n-gram classification engine:
    - Normalizes case and punctuation
    - Strips common stop words and generic filler
    - Computes category scores using weighted domain terminology and multi-word phrases
    - Enforces confidence thresholds to prevent false positives and first-category bias
    """
    if not text or not text.strip():
        return {
            'category_slug': None,
            'category_title': 'Clarification Needed / General Guidance',
            'confidence': 'low',
            'is_confident': False,
            'score': 0.0,
            'is_out_of_domain': False
        }

    q_clean = text.lower()
    q_norm = q_clean.replace('-', '')
    raw_tokens = [w for w in re.findall(r'[a-z0-9]+', q_norm) if w not in STOP_WORDS]
    stemmed = [stem_token(w) for w in raw_tokens]

    if not raw_tokens:
        return {
            'category_slug': None,
            'category_title': 'Clarification Needed / General Guidance',
            'confidence': 'low',
            'is_confident': False,
            'score': 0.0,
            'is_out_of_domain': False
        }

    scores = {}
    for slug, tax in CATEGORY_TAXONOMY.items():
        s = 0.0
        # Multi-word phrase bonus
        for phrase in tax.get('phrases', []):
            if phrase in q_clean or phrase in q_norm:
                s += 5.5
        # Token matches with specificity weighting
        for t in stemmed:
            for h in tax.get('high', []):
                if t == h or (len(h) >= 4 and t.startswith(h)):
                    s += 5.0
                    break
            for m in tax.get('med', []):
                if t == m or (len(m) >= 4 and t.startswith(m)):
                    s += 2.5
                    break
        scores[slug] = s

    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_slug, top_score = sorted_scores[0]
    second_slug, second_score = sorted_scores[1]

    # Strict confidence check: score >= 4.5 and score > 0
    is_confident = (top_score >= 4.5) and (top_score > second_score or len(raw_tokens) == 1)
    
    # Margin check for ambiguous queries where two categories score virtually equally
    if is_confident and top_score > 0 and second_score > 0:
        ratio = top_score / (second_score + 1e-5)
        if ratio < 1.15 and (top_score - second_score) < 2.0:
            is_confident = False

    is_out_of_domain = (top_score == 0.0 and len(raw_tokens) >= 2)

    if is_confident:
        return {
            'category_slug': top_slug,
            'category_title': CATEGORY_TAXONOMY[top_slug]['title'],
            'confidence': 'high' if top_score >= 10.0 else 'medium',
            'is_confident': True,
            'score': top_score,
            'is_out_of_domain': False
        }
    else:
        return {
            'category_slug': None,
            'category_title': 'Clarification Needed / General Guidance',
            'confidence': 'low',
            'is_confident': False,
            'score': top_score,
            'is_out_of_domain': is_out_of_domain
        }


def search_legal_knowledge(query: str, max_results: int = 4):
    """
    Retrieve grounded statutory sections and authorities from verified Indian law knowledge base.
    Prevents false category defaults (e.g. Women's Rights) and ties citations strictly to matched records.
    """
    if not query or not RIGHTS_DATA:
        return []

    classification = classify_legal_query(query)
    if not classification['is_confident'] or not classification['category_slug']:
        return []

    cat_slug = classification['category_slug']
    cat_data = RIGHTS_DATA.get(cat_slug)
    if not cat_data:
        return []

    q_clean = query.lower()
    raw_tokens = [w for w in re.findall(r'[a-z0-9]+', q_clean) if w not in STOP_WORDS]
    stemmed = [stem_token(w) for w in raw_tokens]

    authorities = cat_data.get('authorities', [])
    laws = cat_data.get('laws', [])
    scored_laws = []

    for law in laws:
        act_name = law.get('actName', '')
        section = law.get('section', '')
        desc = law.get('description', '')
        bare_text = law.get('bareActText', '')
        combined_text = f"{cat_data.get('title', '')} {act_name} {section} {desc} {bare_text}".lower()

        law_score = 0.0
        for t in stemmed:
            pattern = r'\b' + re.escape(t) + r'\b'
            matches = len(re.findall(pattern, combined_text))
            if matches > 0:
                law_score += min(matches, 3) * 2.0

        for phrase in [
            'sexual harassment', 'workplace', 'posh', 'domestic violence', 'dowry', 'cruelty',
            'zero fir', 'identity theft', 'cyber cheating', 'wages', 'overtime',
            'unregistered deed', 'pocso', 'child labour', 'consumer protection', 'patta'
        ]:
            if phrase in q_clean and phrase in combined_text:
                law_score += 5.0

        scored_laws.append({
            'category': cat_data.get('title'),
            'category_slug': cat_slug,
            'actName': act_name,
            'section': section,
            'description': desc,
            'punishment': law.get('punishment', ''),
            'bareActText': bare_text,
            'officialSource': law.get('officialSource', 'India Code'),
            'officialUrl': law.get('officialUrl', ''),
            'authorities': authorities,
            'score': round(law_score, 2),
            'confidence': classification['confidence']
        })

    # Sort intra-category laws by topical relevance
    scored_laws.sort(key=lambda x: x['score'], reverse=True)
    return scored_laws[:max_results]


def map_officers_for_category(category_slug: str, query: str = ''):
    """
    Determine verified statutory officers and authorities to meet based strictly on incident category.
    Eliminates arbitrary query string overrides that previously caused cross-category contamination.
    """
    q_lower = (query or '').lower()

    if category_slug == 'cyber':
        return [
            {
                'designation': 'Station House Officer / Inspector (Cyber Crime Police Station)',
                'office': 'Designated Cyber Crime Police Station / District Cyber Crime Wing',
                'whereToFind': 'Available at every District Police Headquarters / City Commissionerate (e.g., Vepery Cyber Cell, Chennai).',
                'howToApproach': 'Lodge an online complaint at https://cybercrime.gov.in or visit with bank account statements showing transaction UTR numbers.',
                'whatToCarry': 'Bank statements, transaction reference (UTR/IMPS/UPI IDs), chat transcripts, URL links, and caller phone numbers.'
            },
            {
                'designation': 'National Cyber Crime Helpline Desk Officer (1930)',
                'office': 'Citizen Financial Cyber Fraud Reporting System (CFCFRMS)',
                'whereToFind': 'Dial 1930 immediately (toll-free, 24x7) within 2-4 hours of fraud to freeze funds in transit.',
                'howToApproach': 'Dial 1930 directly from your registered mobile number and state the debit amount, debiting bank, and fraudulent wallet/account.',
                'whatToCarry': 'SMS text received with debit alert, recipient UPI ID or account number.'
            }
        ]
    elif category_slug == 'property':
        if any(w in q_lower for w in ['tenant', 'rent', 'landlord', 'evict', 'lock', 'flat', 'lease']):
            return [
                {
                    'designation': 'Rent Authority / Rent Court',
                    'office': 'Court of Small Causes / Rent Tribunal',
                    'whereToFind': 'Designated Civil Court in your municipal zone.',
                    'howToApproach': 'Under Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act, no tenant can be evicted without an order of the Rent Court.',
                    'whatToCarry': 'Registered Tenancy Agreement, rent payment receipts/bank passbook, and notice received.'
                },
                {
                    'designation': 'Station House Officer (SHO) / Sub-Inspector',
                    'office': 'Jurisdictional Police Station',
                    'whereToFind': 'Local police station covering your residential location.',
                    'howToApproach': 'File a complaint regarding illegal lockout, house-trespass, and criminal intimidation under BNSS 2023.',
                    'whatToCarry': 'Tenancy proof, ID card, photographs of changed locks/belongings, and witness statements.'
                },
                {
                    'designation': 'Secretary / Legal Aid Advocate (DLSA)',
                    'office': 'District Legal Services Authority (DLSA)',
                    'whereToFind': 'District Court Complex.',
                    'howToApproach': 'Approach DLSA for emergency injunction representation against illegal eviction.',
                    'whatToCarry': 'Identity proof and tenancy agreement.'
                }
            ]
        else:
            return [
                {
                    'designation': 'Tahsildar / Zonal Deputy Tahsildar',
                    'office': 'Taluk Office (Revenue Department)',
                    'whereToFind': 'Your local Taluk Office.',
                    'howToApproach': 'Submit an online petition via e-Services (eservices.tn.gov.in) for Patta transfer, survey measurement, or boundary dispute inspection.',
                    'whatToCarry': 'Registered Sale Deed, Parent Document copies, Encumbrance Certificate (EC), and previous Patta numbers.'
                },
                {
                    'designation': 'Sub-Registrar (SRO)',
                    'office': 'Sub-Registrar Office (Registration Department)',
                    'whereToFind': 'Jurisdictional SRO in your municipal zone.',
                    'howToApproach': 'Verify encumbrance certificate, guideline values, and registered title records.',
                    'whatToCarry': 'Survey numbers, previous sale deeds, and EC copies.'
                }
            ]
    elif category_slug == 'consumer':
        return [
            {
                'designation': 'President / Members of District Consumer Commission',
                'office': 'District Consumer Disputes Redressal Commission (DCDRC)',
                'whereToFind': 'District Headquarters Court Complex.',
                'howToApproach': 'Lodge online through e-Daakhil portal (https://edaakhil.nic.in) or call National Consumer Helpline: 1915.',
                'whatToCarry': 'Tax invoice/receipt, warranty card, replacement requests, written email rejection, and proof of monetary transaction.'
            },
            {
                'designation': 'National Consumer Helpline Desk Officer (1915)',
                'office': 'Ministry of Consumer Affairs Grievance Redressal Portal',
                'whereToFind': 'Call 1915 toll-free or WhatsApp to National Consumer Helpline.',
                'howToApproach': 'Register consumer grievance against seller/manufacturer with docket number for pre-litigation settlement.',
                'whatToCarry': 'Invoice number, product serial number, payment reference, and defect photos.'
            }
        ]
    elif category_slug == 'employee':
        return [
            {
                'designation': 'Labour Conciliation Officer / Deputy Labour Commissioner',
                'office': 'Office of the Commissioner of Labour',
                'whereToFind': 'District Labour Department Office (e.g. DMS Complex, Teynampet, Chennai).',
                'howToApproach': 'File a petition under Payment of Wages Act or Industrial Disputes Act regarding unpaid dues or unlawful termination.',
                'whatToCarry': 'Offer letter, appointment contract, payslips, bank statements showing salary credits, and official email correspondence.'
            },
            {
                'designation': 'Assistant Provident Fund Commissioner (APFC)',
                'office': "Employees' Provident Fund Organisation (EPFO) Regional Office",
                'whereToFind': 'Regional EPFO Office in your jurisdictional division.',
                'howToApproach': 'Lodge an official grievance on the EPFiGMS portal (https://epfigms.gov.in) if employer deducted PF but failed to deposit with EPFO.',
                'whatToCarry': 'Universal Account Number (UAN), Member ID, and salary slips showing PF deductions.'
            }
        ]
    elif category_slug == 'women':
        if any(w in q_lower for w in ['workplace', 'office', 'boss', 'colleague', 'posh', 'icc']):
            return [
                {
                    'designation': 'Presiding Officer (Internal Complaints Committee - ICC)',
                    'office': 'Workplace ICC / Local Complaints Committee (LCC at District Collectorate)',
                    'whereToFind': 'Constitutional ICC within employer organization, or LCC headed by District Collector if organization has under 10 employees.',
                    'howToApproach': 'Submit written complaint under Section 9 of POSH Act within 3 months of incident. ICC must complete inquiry within 90 days.',
                    'whatToCarry': 'Written narrative of incident dates, times, digital evidence (messages, emails), and witness names.'
                },
                {
                    'designation': 'Station House Officer - Inspector of Police (AWPS)',
                    'office': 'All Women Police Station (AWPS)',
                    'whereToFind': 'Jurisdictional AWPS in every police sub-division.',
                    'howToApproach': 'Lodge criminal complaint under Section 75 BNS 2023 (Sexual Harassment). Mandatory registration.',
                    'whatToCarry': 'Written complaint, identity proof, digital screenshots, and chronology of harassment.'
                },
                {
                    'designation': 'Secretary / Legal Aid Advocate (DLSA)',
                    'office': 'District Legal Services Authority (DLSA)',
                    'whereToFind': 'District Court Complex.',
                    'howToApproach': 'All women are entitled to 100% free legal representation and court fee exemption under Section 12 Legal Services Authorities Act.',
                    'whatToCarry': 'Identity proof and details of workplace complaint.'
                }
            ]
        elif any(w in q_lower for w in ['husband', 'in-laws', 'inlaw', 'dowry', 'domestic', 'beat', 'marital']):
            return [
                {
                    'designation': 'Protection Officer & District Social Welfare Officer (DSWO)',
                    'office': 'District Social Welfare Office (Collectorate Complex)',
                    'whereToFind': 'Located inside every District Collectorate office across Tamil Nadu.',
                    'howToApproach': 'Submit a Domestic Incident Report (DIR) under Section 9 of the Protection of Women from Domestic Violence Act for immediate residence and protection orders.',
                    'whatToCarry': 'Marriage proof/ration card, residential address, list of stridhan articles, and specific reliefs sought (shelter/maintenance).'
                },
                {
                    'designation': 'Station House Officer - Inspector of Police (AWPS)',
                    'office': 'All Women Police Station (AWPS)',
                    'whereToFind': 'Present in every Police Sub-Division and Taluk across Tamil Nadu and all Indian states.',
                    'howToApproach': 'Walk into the station directly or call 1091 (Women Helpline) or 112. Under BNSS Sec 173, they must register your complaint as Zero FIR if incident happened elsewhere.',
                    'whatToCarry': 'Written chronology of incidents, dates/times, identity card (Aadhaar), medical injury reports (if physical violence), and audio/video proof.'
                },
                {
                    'designation': 'Secretary / Legal Aid Advocate (DLSA)',
                    'office': 'District Legal Services Authority (DLSA)',
                    'whereToFind': 'District Court Complex in every district capital.',
                    'howToApproach': 'Free legal representation under Section 12 of Legal Services Authorities Act.',
                    'whatToCarry': 'Identity proof and details of domestic abuse.'
                }
            ]
        else:
            return [
                {
                    'designation': 'Station House Officer - Inspector of Police (AWPS)',
                    'office': 'All Women Police Station (AWPS)',
                    'whereToFind': 'Present in every Police Sub-Division and Taluk across Tamil Nadu.',
                    'howToApproach': 'Walk into the station directly or call 1091 (Women Helpline) or 112.',
                    'whatToCarry': 'Written statement, photo ID, and corroborating evidence.'
                },
                {
                    'designation': 'Protection Officer & District Social Welfare Officer (DSWO)',
                    'office': 'District Social Welfare Office (Collectorate Complex)',
                    'whereToFind': 'District Collectorate.',
                    'howToApproach': 'Submit Domestic Incident Report (DIR) or seek women protective shelter.',
                    'whatToCarry': 'Identity proof and description of incident.'
                }
            ]
    elif category_slug == 'child':
        return [
            {
                'designation': 'Chairperson & Members, Child Welfare Committee (CWC)',
                'office': 'District Child Protection Unit (DCPU) / CWC Office',
                'whereToFind': 'District Collectorate Complex in every district headquarters.',
                'howToApproach': 'Under Juvenile Justice Act and POCSO Act, CWC functions as a quasi-judicial body with magistrate powers for the safety, rehabilitation, and care of distressed children.',
                'whatToCarry': 'Child age proof/birth certificate (if available), details of incident, names of perpetrators, and medical records.'
            },
            {
                'designation': 'Childline 1098 Emergency Response Officer',
                'office': 'Childline India Foundation / Ministry of Women & Child Development',
                'whereToFind': 'Dial 1098 toll-free (24x7) or report to Special Juvenile Police Unit (SJPU) at District Police HQ.',
                'howToApproach': 'Dial 1098 immediately for 24x7 emergency rescue, medical aid, and shelter intervention.',
                'whatToCarry': 'Current location of the child, employer/factory address, and emergency details.'
            }
        ]
    elif category_slug == 'senior':
        return [
            {
                'designation': 'Presiding Officer / Revenue Divisional Officer (RDO)',
                'office': 'Senior Citizens Maintenance Tribunal',
                'whereToFind': 'Office of the Revenue Divisional Officer (RDO / Sub-Collector) in your sub-division.',
                'howToApproach': 'File application under Maintenance and Welfare of Parents and Senior Citizens Act for monthly maintenance or cancellation of property gift deeds due to abandonment.',
                'whatToCarry': 'Senior citizen age proof (60+ years), parent-child relation proof, property transfer documents, and evidence of neglect.'
            },
            {
                'designation': 'Elderline 14567 Toll-Free Helpline Officer',
                'office': 'National Helpline for Senior Citizens (Elderline)',
                'whereToFind': 'Dial 14567 toll-free (8 AM to 8 PM, all 7 days).',
                'howToApproach': 'Call 14567 for immediate counseling, rescue from elder abuse, legal orientation, and old age pension guidance.',
                'whatToCarry': 'Phone number and address of senior citizen.'
            }
        ]
    elif category_slug == 'scst':
        return [
            {
                'designation': 'Deputy Superintendent of Police (DSP - SJ&HR Cell)',
                'office': 'Social Justice & Human Rights (SJ&HR) Cell, District Police Office',
                'whereToFind': 'District Police Commissionerate / SP Office in every district.',
                'howToApproach': 'Offences under PoA Act 1989 must be investigated directly by an officer not below the rank of DSP. Mandatory registration of non-bailable FIR and state victim relief.',
                'whatToCarry': 'Community Certificate (SC/ST), two copies of complaint, names of accused, and witness statements.'
            },
            {
                'designation': 'District Collector & District Magistrate',
                'office': 'District Vigilance & Monitoring Committee',
                'whereToFind': 'District Collectorate.',
                'howToApproach': 'Submit petition for disbursement of statutory financial relief under PoA Rules.',
                'whatToCarry': 'FIR copy and Caste Certificate.'
            }
        ]
    elif category_slug == 'education':
        return [
            {
                'designation': 'University Ombudsman & Anti-Ragging Committee Nodal Officer',
                'office': 'Institutional Anti-Ragging Cell / UGC National Anti-Ragging Monitoring Agency',
                'whereToFind': 'College Administration Building or report via antiragging.in.',
                'howToApproach': 'Call 24x7 toll-free Anti-Ragging Helpline: 1800-180-5522 or email helpline@antiragging.in. Mandatory institution action within 24 hours.',
                'whatToCarry': 'Student ID card, incident chronology, dates, names of perpetrators, and email correspondence.'
            }
        ]
    elif category_slug == 'travel':
        return [
            {
                'designation': 'Divisional Railway Manager (DRM) / RailMadad Nodal Officer',
                'office': 'Indian Railways Passenger Grievance Redressal Wing',
                'whereToFind': 'Railway Divisional HQ or report via RailMadad portal (railmadad.indianrailways.gov.in) / Dial 139.',
                'howToApproach': 'Dial 139 for real-time onboard assistance, security, medical emergency, or ticket refund disputes.',
                'whatToCarry': 'PNR number, Train Number, Coach/Seat Number, and ticket copy.'
            }
        ]
    elif category_slug == 'family':
        return [
            {
                'designation': 'Principal Judge / Family Court Counselor',
                'office': 'Family Court & Mediation Centre',
                'whereToFind': 'District Court Complex in every district headquarters.',
                'howToApproach': 'File petition under Family Courts Act or Section 144 BNSS / Section 125 CrPC for child custody, maintenance, or conciliation.',
                'whatToCarry': 'Marriage registration certificate, children birth certificates, and income documentation.'
            },
            {
                'designation': 'Secretary / Duty Advocate (DLSA)',
                'office': 'District Legal Services Authority (DLSA)',
                'whereToFind': 'District Court Complex.',
                'howToApproach': 'Free mediation services and free legal aid for matrimonial and custody disputes.',
                'whatToCarry': 'Identity proof and court notices received.'
            }
        ]
    elif category_slug == 'legalaid':
        return [
            {
                'designation': 'Member Secretary / Duty Advocate (DLSA)',
                'office': 'District Legal Services Authority (DLSA / TLSC)',
                'whereToFind': 'Inside the District Court or Taluk Court complex.',
                'howToApproach': 'Walk into the Front Office of DLSA or call toll-free National Legal Aid Helpline: 15100 for 100% free legal advice, court fee exemption, and free appointed advocate.',
                'whatToCarry': 'Identity proof, income documentation (if applicable), and any notices or case papers.'
            }
        ]
    else:
        return [
            {
                'designation': 'Member Secretary / Duty Legal Aid Counsel',
                'office': 'District Legal Services Authority (DLSA / TLSC)',
                'whereToFind': 'Front Office, District Court Complex in your district headquarters.',
                'howToApproach': 'Visit DLSA or call National Legal Aid Helpline: 15100 for free preliminary orientation and legal direction.',
                'whatToCarry': 'Identity proof, written chronology of events, and all related documents.'
            },
            {
                'designation': 'Station House Officer (SHO) / Sub-Inspector',
                'office': 'Jurisdictional Police Station',
                'whereToFind': 'Local police station covering your residential or incident location.',
                'howToApproach': 'Submit a signed representation stating chronological facts. Obtain a CSR (Community Service Register) receipt or diary number.',
                'whatToCarry': 'Two copies of written complaint, government photo ID, and corroborating proof.'
            }
        ]



@app.route("/")
def home():
    """Serve the primary Meyyurai laptop-first desktop application."""
    return render_template("index.html")


# ============================================================================
# AUTHENTICATION & USER PROFILE APIS (SQLite Persisted)
# ============================================================================

@app.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    """Generate 6-digit cryptographic OTP code with cooldown and SMS provider dispatch."""
    try:
        data = request.get_json() or {}
        phone = data.get("phone", "").strip()
        
        # Clean phone
        clean_phone = phone.replace(" ", "").replace("-", "").replace("+91", "")
        if clean_phone.startswith("91") and len(clean_phone) > 10:
            clean_phone = clean_phone[2:]

        if not clean_phone or len(clean_phone) != 10 or not clean_phone.isdigit():
            return jsonify({"status": "error", "error": "Please enter a valid 10-digit mobile number."}), 400

        otp, err_msg, status_code = db.generate_otp_for_phone(clean_phone)
        if err_msg or not otp:
            return jsonify({"status": "error", "error": err_msg}), status_code

        # Dispatch via SMS provider interface
        provider = sms_service.get_sms_provider()
        delivery = provider.send_otp(clean_phone, otp)

        # In automated test mode ONLY, capture OTP in memory for test assertions
        if app.config.get("TESTING"):
            sms_service.set_test_captured_otp(clean_phone, otp)

        # Production response: NEVER return otp or otp_demo
        return jsonify({
            "status": "success",
            "message": f"Verification code request processed for +91 {clean_phone}.",
            "phone": clean_phone,
            "delivery": delivery.get("status", "NOT_CONFIGURED"),
            "delivery_message": delivery.get("message", ""),
            "expires_in_seconds": 300,
            "resend_in_seconds": 60
        })
    except Exception as e:
        print("Error in /api/auth/send-otp:", e)
        return jsonify({"status": "error", "error": "Failed to send verification code. Please try again."}), 500


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    """Verify OTP and authenticate user session (no hardcoded bypasses)."""
    try:
        data = request.get_json() or {}
        phone = data.get("phone", "").strip()
        otp = data.get("otp", "").strip()

        if not phone or not otp:
            return jsonify({"status": "error", "error": "Phone number and OTP code are required."}), 400

        user, err_msg, status_code = db.verify_phone_otp(phone, otp)
        if err_msg or not user:
            return jsonify({"status": "error", "error": err_msg or "Verification failed."}), status_code

        # Session is strictly established ONLY after successful OTP verification
        session["user_id"] = user["id"]
        session["phone"] = user["phone"]

        contacts = db.get_emergency_contacts(user["id"])

        return jsonify({
            "status": "success",
            "message": "Authentication successful. Welcome to Meyyurai.",
            "user": user,
            "emergency_contacts": contacts
        })
    except Exception as e:
        print("Error in /api/auth/verify-otp:", e)
        return jsonify({"status": "error", "error": "Verification failed due to a server error."}), 500


@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    """Get current authenticated user, profile details, and emergency contacts."""
    try:
        user_id = session.get("user_id")

        # STRICT: No query param (?phone=) backdoor permitted!
        if not user_id:
            return jsonify({
                "status": "unauthenticated",
                "authenticated": False,
                "user": None,
                "emergency_contacts": []
            })

        user = db.get_user_by_id(user_id)
        if not user:
            session.clear()
            return jsonify({
                "status": "unauthenticated",
                "authenticated": False,
                "user": None,
                "emergency_contacts": []
            })

        contacts = db.get_emergency_contacts(user_id)
        return jsonify({
            "status": "authenticated",
            "authenticated": True,
            "user": user,
            "emergency_contacts": contacts
        })
    except Exception as e:
        print("Error in /api/auth/me:", e)
        return jsonify({"authenticated": False, "error": str(e)}), 500


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Log out current user and clear session."""
    session.clear()
    return jsonify({"status": "success", "message": "Logged out successfully."})


@app.route("/api/profile/update", methods=["POST"])
def update_profile():
    """Update profile fields for the authenticated user in SQLite."""
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"status": "error", "error": "Unauthorized. Please log in to update your profile."}), 401

        data = request.get_json() or {}
        updated_user = db.update_user_profile(user_id, data)
        return jsonify({
            "status": "success",
            "message": "Profile updated successfully.",
            "user": updated_user
        })
    except Exception as e:
        print("Error in /api/profile/update:", e)
        return jsonify({"status": "error", "error": str(e)}), 500


# ============================================================================
# EMERGENCY CONTACTS MANAGEMENT
# ============================================================================

@app.route("/api/emergency-contacts", methods=["GET", "POST"])
def handle_emergency_contacts():
    """List or add emergency contacts strictly for the authenticated user."""
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"status": "error", "error": "Unauthorized. Authentication required."}), 401

        if request.method == "GET":
            contacts = db.get_emergency_contacts(user_id)
            return jsonify({"status": "success", "contacts": contacts})

        # POST: Add new contact
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        phone = data.get("phone", "").strip()
        relationship = data.get("relationship", "Family").strip()
        is_primary = bool(data.get("is_primary", False))

        new_contact, err_msg = db.add_emergency_contact(user_id, name, phone, relationship, is_primary)
        if err_msg or not new_contact:
            return jsonify({"status": "error", "error": err_msg or "Failed to add emergency contact."}), 400

        all_contacts = db.get_emergency_contacts(user_id)

        return jsonify({
            "status": "success",
            "message": f"Added {name} to emergency contacts.",
            "contact": new_contact,
            "contacts": all_contacts,
            "all_contacts": all_contacts
        })
    except Exception as e:
        print("Error in /api/emergency-contacts:", e)
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/emergency-contacts/<int:contact_id>", methods=["PUT"])
def update_contact(contact_id):
    """Update an existing emergency contact for the authenticated user."""
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"status": "error", "error": "Unauthorized. Authentication required."}), 401

        data = request.get_json() or {}
        name = data.get("name", "").strip()
        phone = data.get("phone", "").strip()
        relationship = data.get("relationship", "Family").strip()
        is_primary = bool(data.get("is_primary", False))

        contact, err_msg = db.update_emergency_contact(user_id, contact_id, name, phone, relationship, is_primary)
        if err_msg or not contact:
            return jsonify({"status": "error", "error": err_msg or "Failed to update emergency contact."}), 400

        contacts = db.get_emergency_contacts(user_id)
        return jsonify({
            "status": "success",
            "message": "Emergency contact updated successfully.",
            "contact": contact,
            "contacts": contacts
        })
    except Exception as e:
        print("Error in PUT /api/emergency-contacts:", e)
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/emergency-contacts/<int:contact_id>", methods=["DELETE"])
def delete_contact(contact_id):
    """Delete an emergency contact strictly belonging to the authenticated user."""
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"status": "error", "error": "Unauthorized. Authentication required."}), 401

        deleted = db.delete_emergency_contact(user_id, contact_id)
        contacts = db.get_emergency_contacts(user_id)

        return jsonify({
            "status": "success",
            "deleted": deleted,
            "message": "Emergency contact removed.",
            "contacts": contacts
        })
    except Exception as e:
        print("Error deleting contact:", e)
        return jsonify({"status": "error", "error": str(e)}), 500


# ============================================================================
# EMERGENCY SOS TRIGGER & CANCEL (5-Sec Safeguard + GPS + Contact Alert)
# ============================================================================

@app.route("/api/emergency/trigger", methods=["POST"])
def trigger_emergency():
    """
    Trigger Emergency SOS:
    - Validates actual coordinates (never fabricates fake GPS).
    - Distinguishes prepared client actions (WhatsApp/SMS links, 112 dialer) from server delivery.
    - Accurately reports SMS Gateway configuration status.
    - Uses user's saved contacts only (never fabricates fake contacts).
    - In test mode, captures alert without calling real phone numbers.
    """
    try:
        data = request.get_json() or {}
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        address = data.get("address", "Location Unavailable")
        emergency_type = data.get("emergencyType", "Immediate Distress & Protection")

        # Validate actual GPS coordinates
        valid_coords = False
        try:
            if latitude is not None and longitude is not None:
                lat_f = float(latitude)
                lng_f = float(longitude)
                if -90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0 and not (lat_f == 0.0 and lng_f == 0.0):
                    valid_coords = True
                    latitude = lat_f
                    longitude = lng_f
        except (ValueError, TypeError):
            valid_coords = False

        user_id = session.get("user_id")
        user = db.get_user_by_id(user_id) if user_id else None
        user_name = user["name"] if user else "Meyyurai Citizen"
        user_phone = user["phone"] if user else ""

        # Fetch actual registered contacts (do NOT fabricate default contacts)
        contacts = db.get_emergency_contacts(user_id) if user_id else []

        # Construct location string and link
        if valid_coords:
            map_url = f"https://maps.google.com/?q={latitude:.5f},{longitude:.5f}"
            coords_str = f"Live GPS: ({latitude:.5f}, {longitude:.5f})"
            loc_summary = f"{address} {coords_str}"
        else:
            map_url = None
            coords_str = "Live GPS: Location Unavailable (Not shared or GPS disabled)"
            loc_summary = "Location Unavailable"

        # Formulate distress message
        if valid_coords:
            sos_message = (
                f"🚨 EMERGENCY SOS ALERT from {user_name} (Ph: {user_phone})!\n"
                f"I am in immediate danger and need urgent assistance.\n"
                f"📍 My Live Location: {map_url}\n"
                f"Approximate Address: {address} ({latitude:.5f}, {longitude:.5f})\n"
                f"Please call 112 / Police and reach me immediately."
            )
        else:
            sos_message = (
                f"🚨 EMERGENCY SOS ALERT from {user_name} (Ph: {user_phone})!\n"
                f"I am in immediate danger and need urgent assistance.\n"
                f"📍 Location: Live GPS Unavailable / Not Shared by User.\n"
                f"Please call 112 / Police and reach me immediately."
            )

        encoded_msg = urllib.parse.quote(sos_message)

        # Build prepared client-side link payloads (1-tap WhatsApp and 1-tap SMS)
        alerted_list = []
        for c in contacts:
            c_phone = c.get("contact_phone", "").replace("+91", "").replace(" ", "").replace("-", "")
            wa_link = f"https://api.whatsapp.com/send?phone=91{c_phone}&text={encoded_msg}"
            sms_link = f"sms:+91{c_phone}?body={encoded_msg}"
            tel_link = f"tel:+91{c_phone}"
            alerted_list.append({
                "id": c.get("id"),
                "name": c.get("contact_name"),
                "phone": c_phone,
                "relationship": c.get("relationship", "Contact"),
                "is_primary": bool(c.get("is_primary")),
                "whatsapp_url": wa_link,
                "sms_url": sms_link,
                "tel_url": tel_link
            })

        # Automated server-side SMS dispatch via provider interface
        provider = sms_service.get_sms_provider()

        if app.config.get("TESTING"):
            # Automated tests: capture in memory hook, NEVER call real phone numbers
            sms_service.set_test_captured_broadcast({
                "user_id": user_id,
                "contacts": contacts,
                "message": sos_message,
                "valid_coords": valid_coords
            })
            server_dispatch = {
                "status": "TEST_CAPTURED",
                "provider": "test_mock",
                "delivered_count": len(contacts),
                "total_contacts": len(contacts),
                "message": "Broadcast alert captured by test fixture."
            }
        else:
            if contacts:
                server_dispatch = provider.send_emergency_broadcast(contacts, sos_message)
            else:
                server_dispatch = {
                    "status": "NO_CONTACTS",
                    "provider": provider.name,
                    "delivered_count": 0,
                    "total_contacts": 0,
                    "message": "No emergency contacts configured for this account. Dial 112 directly."
                }

        # Save record in database with debouncing against duplicate clicks
        contacts_summary = json.dumps([f"{c['name']} ({c['phone']})" for c in alerted_list])
        sos_id = db.log_emergency_sos(
            user_id,
            latitude if valid_coords else None,
            longitude if valid_coords else None,
            loc_summary,
            contacts_summary,
            status="dispatched"
        )

        return jsonify({
            "status": "alert_initiated",
            "sos_id": sos_id,
            "server_dispatch": server_dispatch,
            "location": {
                "has_live_coords": valid_coords,
                "latitude": latitude if valid_coords else None,
                "longitude": longitude if valid_coords else None,
                "map_url": map_url,
                "coords_text": coords_str,
                "address": address if valid_coords else "Location not shared"
            },
            "contacts_alerted": alerted_list,
            "has_contacts": len(contacts) > 0,
            "sos_text": sos_message,
            "direct_dial_police": "tel:112",
            "helplines": [
                {"name": "National Emergency & Police", "number": "112", "dial": "tel:112"},
                {"name": "Women Helpline (National)", "number": "1091", "dial": "tel:1091"},
                {"name": "Women in Distress (Govt)", "number": "181", "dial": "tel:181"},
                {"name": "Cyber Financial Crime", "number": "1930", "dial": "tel:1930"},
                {"name": "Free Legal Aid (NALSA)", "number": "15100", "dial": "tel:15100"}
            ]
        })
    except Exception as e:
        print("Error in /api/emergency/trigger:", e)
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/emergency/cancel", methods=["POST"])
def cancel_emergency():
    """Cancel an active SOS countdown or alert safely."""
    try:
        data = request.get_json() or {}
        sos_id = data.get("sos_id")
        user_id = session.get("user_id")
        if sos_id:
            db.cancel_emergency_sos(int(sos_id), user_id)
        return jsonify({
            "status": "cancelled",
            "message": "Emergency SOS was safely cancelled. No distress call was placed."
        })
    except Exception as e:
        print("Error cancelling emergency:", e)
        return jsonify({"status": "error", "error": str(e)}), 500


# ============================================================================
# LEGAL ADVISOR (MEYYURAI AI) & STATUTORY RAG
# ============================================================================

@app.route("/api/rights", methods=["GET"])
def get_all_rights():
    """Return all categories with complete statutory information for the Law Library."""
    categories = []
    for cat_slug, cat in RIGHTS_DATA.items():
        item = dict(cat)
        item["slug"] = cat_slug
        item["lawCount"] = len(cat.get("laws", []))
        item["schemeCount"] = len(cat.get("schemes", []))
        item["authorityCount"] = len(cat.get("authorities", []))
        categories.append(item)
    return jsonify({
        "status": "success",
        "count": len(categories),
        "categories": categories
    })


@app.route("/api/rights/<category_slug>", methods=["GET"])
def get_category_detail(category_slug):
    """Return comprehensive statutory sections, schemes, and authorities for a category."""
    cat = RIGHTS_DATA.get(category_slug)
    if not cat:
        return jsonify({"error": f"Category '{category_slug}' not found"}), 404
    return jsonify(cat)


@app.route("/ask", methods=["POST"])
def ask():
    """
    AI Legal & Officer Guidance System:
    - User enters query in simple English.
    - AI looks up grounded statutory provisions from Indian law (BNS 2023, BNSS, IT Act, POSH, Consumer Act, Constitution).
    - Identifies exact officers / authorities to meet depending on the situation.
    - Suggests actionable next steps, evidence preservation, and official portals.
    """
    try:
        data = request.get_json() or {}
        question = data.get("question", "").strip()

        if not question:
            return jsonify({"error": "Please describe your situation or legal query."}), 400

        # Priority 1: Immediate active emergency detection
        if detect_emergency(question):
            emergency_officers = [
                {
                    "designation": "Duty Officer / Emergency Mobile Patrol Unit (ERSS 112)",
                    "office": "Emergency Response Support System (ERSS) / Jurisdictional Police",
                    "whereToFind": "Dial 112 immediately (toll-free, 24x7 nationwide) for GPS-dispatched emergency vehicle.",
                    "howToApproach": "State your exact live location, landmark, and the nature of immediate danger to the 112 dispatcher.",
                    "whatToCarry": "Do not wait for documents; move to a secure, populated location immediately."
                },
                {
                    "designation": "Station House Officer (SHO) - Nearest Police Station",
                    "office": "Nearest Jurisdictional Police Station / All Women Police Station",
                    "whereToFind": "Nearest Police Station to your current location.",
                    "howToApproach": "Seek immediate physical sanctuary and request emergency police escort or Zero FIR registration.",
                    "whatToCarry": "Personal identity card if immediately accessible."
                }
            ]
            return jsonify({
                "status": "emergency_guidance",
                "situation": f"CRITICAL SAFETY ALERT: For immediate physical danger, violence, or threats to life, prioritize immediate physical protection. Do not wait for legal paperwork or statute classification.",
                "category": "Immediate Emergency & Safety Guidance",
                "laws": [
                    {
                        "act": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) & Constitution of India",
                        "section": "Emergency Police Duty & Right to Life and Personal Liberty (Article 21)",
                        "punishment": "Immediate mandatory police dispatch, rescue intervention, and preventive custody.",
                        "source": "Ministry of Home Affairs / Emergency Response Support System (ERSS 112)"
                    }
                ],
                "whom_to_meet": emergency_officers,
                "action_plan": [
                    {
                        "phase": "Immediate 0–15 Minutes: Physical Sanctuary & SOS",
                        "action": "Dial 112 immediately. Trigger in-app Meyyurai SOS to broadcast your live GPS to your emergency contacts."
                    },
                    {
                        "phase": "Immediate 15–60 Minutes: Police Dispatch & Shelter",
                        "action": "Remain on the line with 112 operator until the mobile patrol unit arrives at your coordinates."
                    },
                    {
                        "phase": "Post-Crisis (24–48 Hours): Formal Statutory Filing",
                        "action": "Once physical safety is secured, register formal FIR under BNSS Section 173 and consult DLSA (15100) for free legal aid."
                    }
                ],
                "official_portals": [
                    {"name": "National Emergency Response Support System (ERSS)", "url": "https://112.gov.in"},
                    {"name": "National Commission for Women Emergency Cell", "url": "https://ncw.nic.in"},
                    {"name": "Childline India Foundation", "url": "https://childlineindia.org"}
                ],
                "support": ["National Emergency: 112", "Women in Distress: 1091", "Childline: 1098", "Senior Elderline: 14567"]
            })

        # Priority 2: Structured legal classification & grounded RAG retrieval
        classification = classify_legal_query(question)
        legal_matches = search_legal_knowledge(question, max_results=4)

        # Priority 3: Low-confidence / vague / out-of-domain safe fallback
        if not classification['is_confident'] or not legal_matches:
            fallback_officers = map_officers_for_category('legalaid', question)
            clarification_msg = (
                "Your inquiry does not contain enough specific factual details or recognized statutory keywords "
                "to reliably determine an exact legal classification (such as tenancy rights, cyber financial fraud, "
                "labor wage claim, consumer product defect, or domestic violence protection). "
                "Please provide more context (such as: What occurred? Who are the involved parties? "
                "Are there contracts, bank debits, or rent receipts? Did any physical harassment or property dispute take place?) "
                "so we can pinpoint the applicable Indian statutes."
            )
            if classification.get('is_out_of_domain'):
                clarification_msg = (
                    "Meyyurai is a dedicated statutory awareness and legal guidance navigator for Indian law "
                    "(Bharatiya Nyaya Sanhita, Cyber Crime, Labor Welfare, Tenancy, Consumer Rights, and NALSA). "
                    "Your query appears to relate to a general or non-legal topic. "
                    "If you are facing a legal rights violation or statutory dispute in India, please describe the legal facts."
                )

            return jsonify({
                "status": "complete",
                "situation": f"Preliminary Guidance: '{question}'. {clarification_msg}\n\nNotice: This preliminary assessment provides general procedural orientation and does not cite verified statutory sections until specific factual details are clarified.",
                "category": "Clarification Needed / General Guidance",
                "laws": [
                    {
                        "act": "Legal Services Authorities Act, 1987 & Constitution of India (Article 39A)",
                        "section": "Preliminary Intake & Right to Free Legal Counseling",
                        "punishment": "Not applicable — factual clarification required before specific statutory provisions can be determined.",
                        "source": "National Legal Services Authority (NALSA) / District Legal Services Authority (DLSA)"
                    }
                ],
                "whom_to_meet": fallback_officers,
                "action_plan": [
                    {
                        "phase": "Step 1: Clarify Specific Facts & Evidence",
                        "action": "Compile a factual chronological timeline: dates, names of parties involved, monetary loss, notices received, or contracts signed."
                    },
                    {
                        "phase": "Step 2: Free Legal Aid Intake (DLSA / TLSC)",
                        "action": "Call National Legal Aid Helpline 15100 or visit the Front Office of your District Legal Services Authority (DLSA) for free confidential counseling."
                    },
                    {
                        "phase": "Step 3: Formal Redress Once Jurisdiction Is Established",
                        "action": "Once your legal situation is classified, approach the designated statutory authority (Consumer Forum, Rent Court, Cyber Police, or Labour Commissioner)."
                    }
                ],
                "official_portals": [
                    {"name": "National Legal Services Authority (NALSA)", "url": "https://nalsa.gov.in"},
                    {"name": "National Cybercrime Reporting Portal", "url": "https://cybercrime.gov.in"},
                    {"name": "National Consumer Helpline", "url": "https://consumerhelpline.gov.in"}
                ],
                "support": ["National Emergency: 112", "Free Legal Aid: 15100", "Cyber Crime: 1930", "Women Helpline: 1091", "Childline: 1098"]
            })

        # Priority 4: Confident legal classification with verified grounded records
        top_category_slug = classification['category_slug']
        designated_officers = map_officers_for_category(top_category_slug, question)

        legal_context_str = "OFFICIAL STATUTORY RECORDS IN REPOSITORY:\n"
        for m in legal_matches:
            legal_context_str += f"- Act: {m['actName']} | Section: {m['section']} | Details: {m['description']} | Punishment: {m['punishment']} | Source: {m['officialSource']}\n"

        prompt = f"""
You are Meyyurai (மெய்யுரை) — an authoritative, sharp, and compassionate legal awareness navigator for India.
Grounded in official laws (Bharatiya Nyaya Sanhita 2023 - BNS, Bharatiya Nagarik Suraksha Sanhita 2023 - BNSS, Constitution of India, IT Act 2000, POSH Act 2013, Consumer Protection Act, Labor laws, NALSA).

Citizen Query / Incident:
"{question}"

{legal_context_str}

YOUR TASK:
Analyze the situation in plain, reassuring, simple English and tell the citizen:
1. Clear situation classification and their legal rights.
2. The exact official statutory laws invoked (Act name, section, bare act summary, punishment).
3. Exactly WHOM TO SEE / MEET (Station House Officer, Protection Officer under DV Act, DLSA Secretary for free lawyer, Cyber Crime Nodal Officer, Labour Commissioner, etc.) and what evidence to carry.
4. Step-by-step lawful action plan (Immediate 24-hour protection, documentation, formal filing).
5. Direct official government portals and emergency hotlines.

OUTPUT FORMAT: Return STRICTLY valid JSON with no markdown tags or conversational filler outside the JSON:
{{
  "status": "complete",
  "situation": "Clear human explanation of what the citizen is facing and their fundamental rights",
  "category": "{classification['category_title']}",
  "laws": [
    {{
      "act": "Name of Act (e.g. Bharatiya Nyaya Sanhita, 2023)",
      "section": "Section number and title",
      "punishment": "Official statutory penalty or sentence",
      "source": "Official source (e.g. India Code / Ministry of Law & Justice)"
    }}
  ],
  "whom_to_meet": [
    {{
      "designation": "Specific Officer Title (e.g. Inspector - All Women Police Station / DLSA Member Secretary)",
      "office": "Exact office or premises",
      "whereToFind": "Where this officer is located (e.g. District Collectorate / Taluk Court / Police Station)",
      "howToApproach": "Concrete instructions on how to meet them or file",
      "whatToCarry": "Essential evidentiary documents to take"
    }}
  ],
  "action_plan": [
    {{"phase": "Phase 1: Immediate Protection (0-24 Hours)", "action": "Clear step to protect evidence and safety"}},
    {{"phase": "Phase 2: Formal Notice / Representation (Days 1-3)", "action": "Drafting representation or seeking DLSA free legal aid"}},
    {{"phase": "Phase 3: Institutional Filing & Escalation", "action": "Official lodging via portal or magistrate petition"}}
  ],
  "official_portals": [
    {{"name": "Portal Name (e.g. National Cybercrime Portal)", "url": "Official .gov.in URL"}}
  ],
  "support": ["National Emergency: 112", "Cyber Helpline: 1930", "Free Legal Aid (NALSA): 15100"]
}}
"""

        # Call Gemini if initialized
        if gemini_model:
            try:
                response = gemini_model.generate_content(prompt)
                text = response.text.strip()
                text = text.replace("```json", "").replace("```", "").strip()

                parsed = None
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    match = re.search(r"\{.*\}", text, re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))

                if parsed and isinstance(parsed, dict) and "situation" in parsed:
                    if not parsed.get("whom_to_meet"):
                        parsed["whom_to_meet"] = designated_officers
                    return jsonify(parsed)
            except Exception as gemini_err:
                print("Gemini API call notice, falling back to grounded statutory records:", gemini_err)

        # High-Fidelity Local Grounded Fallback
        laws_list = []
        for m in legal_matches[:3]:
            laws_list.append({
                "act": m["actName"],
                "section": m["section"],
                "punishment": m.get("punishment", "Cognizable offence under statutory provisions."),
                "source": m.get("officialSource", "India Code / Ministry of Law & Justice")
            })

        # Category-tailored action roadmap
        category_plans = {
            'cyber': [
                {"phase": "Immediate Freeze (0–4 Hours)", "action": "Dial 1930 immediately or log in to https://cybercrime.gov.in to freeze defrauded amounts in transit before money leaves recipient accounts."},
                {"phase": "Bank & Evidence Documentation (Days 1–2)", "action": "Obtain bank statements showing UTR/IMPS/UPI IDs, screenshot phishing SMS/messages, and submit formal written dispute with bank manager."},
                {"phase": "Cyber Police Filing (Days 2–5)", "action": "Visit District Cyber Crime Police Station with acknowledgment docket from 1930 to convert report into FIR."}
            ],
            'property': [
                {"phase": "Evidence Preservation (0–24 Hours)", "action": "Photograph the changed locks or boundary encroachment, gather tenancy agreement copy, rent receipts, or registered sale deed."},
                {"phase": "Statutory Representation (Days 1–3)", "action": "Approach the Rent Court for urgent restoration of possession or Tahsildar / Revenue Office for boundary survey."},
                {"phase": "Free Legal Counsel (Days 3–7)", "action": "Contact DLSA at 15100 for a free advocate for representation before Civil Court / Rent Tribunal."}
            ],
            'consumer': [
                {"phase": "Written Grievance to Merchant (0–48 Hours)", "action": "Issue formal email notice to seller/manufacturer with tax invoice, defect photographs, and 7-day refund or replacement demand."},
                {"phase": "National Consumer Helpline (Days 2–7)", "action": "Dial 1915 or register grievance on consumerhelpline.gov.in with invoice number for docket assignment."},
                {"phase": "District Consumer Commission Filing (Post 15 Days)", "action": "File formal consumer petition on e-Daakhil (edaakhil.nic.in) for refund, replacement, and compensation for deficiency in service."}
            ],
            'employee': [
                {"phase": "Document Retention (0–48 Hours)", "action": "Save appointment contracts, monthly payslips, bank statements showing salary credits, and official email trail regarding unpaid dues."},
                {"phase": "Conciliation Petition (Days 3–7)", "action": "Submit statutory petition before Regional Labour Commissioner on SAMADHAN portal (samadhan.labour.gov.in)."},
                {"phase": "Statutory Recovery", "action": "Labour Conciliation Officer issues summons to employer under Payment of Wages Act / Industrial Disputes Act."}
            ],
            'women': [
                {"phase": "Immediate Safety & Evidence Preservation (0–24 Hours)", "action": "Dial 1091 (Women Helpline) or 112 if in danger. Preserve all digital messages, call recordings, emails, and medical reports without modification."},
                {"phase": "Statutory Representation (Days 1–3)", "action": "Submit written complaint to Internal Complaints Committee (ICC under POSH Act) or Protection Officer (DSWO under DV Act) for protective orders."},
                {"phase": "Free Legal Aid & Police Escalation (Days 3–7)", "action": "Approach All Women Police Station (AWPS) for FIR under BNS 2023 and contact DLSA (15100) for 100% free advocate representation."}
            ],
            'child': [
                {"phase": "Immediate Rescue Intervention (0–24 Hours)", "action": "Dial Childline 1098 immediately or notify Special Juvenile Police Unit (SJPU) for emergency rescue and medical aid."},
                {"phase": "CWC Production (Days 1–2)", "action": "Produce child before Child Welfare Committee (CWC) for rehabilitation, protective shelter, and care under Juvenile Justice Act."},
                {"phase": "Mandatory Statutory FIR", "action": "Ensure police register mandatory FIR under Section 19 POCSO Act or Child Labour (Prohibition) Act."}
            ]
        }

        default_action_plan = [
            {"phase": "Immediate Steps (Within 24 Hours)", "action": "Preserve all physical and electronic evidence immediately (screenshots, bank transaction UTRs, audio notes, email headers) without modification."},
            {"phase": "Approaching Designated Officer (Days 1–3)", "action": "Approach the designated statutory officer listed above with two copies of your written complaint and obtain an official acknowledgment (CSR / Diary Number)."},
            {"phase": "Free Legal Counsel (Days 3–7)", "action": "If facing procedural delay, contact the District Legal Services Authority (DLSA) at 15100 for a free appointed advocate under Article 39A."}
        ]

        action_plan = category_plans.get(top_category_slug, default_action_plan)

        portals_map = {
            'cyber': [
                {"name": "National Cybercrime Reporting Portal", "url": "https://cybercrime.gov.in"},
                {"name": "Citizen Financial Cyber Fraud Reporting System (1930)", "url": "https://cybercrime.gov.in"}
            ],
            'property': [
                {"name": "TNREGINET Property Registration Portal", "url": "https://tnreginet.gov.in"},
                {"name": "Tamil Nadu Land Revenue e-Services (Patta / Chitta)", "url": "https://eservices.tn.gov.in"}
            ],
            'consumer': [
                {"name": "e-Daakhil Consumer Court Online Portal", "url": "https://edaakhil.nic.in"},
                {"name": "National Consumer Helpline Portal", "url": "https://consumerhelpline.gov.in"}
            ],
            'employee': [
                {"name": "SAMADHAN Labour Dispute Conciliation Portal", "url": "https://samadhan.labour.gov.in"},
                {"name": "EPFiGMS Provident Fund Grievance Portal", "url": "https://epfigms.gov.in"}
            ],
            'women': [
                {"name": "National Commission for Women (NCW)", "url": "https://ncw.nic.in"},
                {"name": "Tamil Nadu CM Helpline Portal", "url": "https://cmhelpline.tnega.org/"}
            ],
            'child': [
                {"name": "Childline India Foundation", "url": "https://childlineindia.org"},
                {"name": "National Commission for Protection of Child Rights (NCPCR)", "url": "https://ncpcr.gov.in"}
            ],
            'senior': [
                {"name": "National Senior Citizens Portal (Elderline)", "url": "https://elderline.dosje.gov.in"}
            ],
            'scst': [
                {"name": "National Commission for Scheduled Castes", "url": "https://ncsc.nic.in"},
                {"name": "Adi Dravidar and Tribal Welfare Portal", "url": "https://adwelfare.tn.gov.in"}
            ],
            'education': [
                {"name": "UGC National Anti-Ragging Portal", "url": "https://antiragging.in"},
                {"name": "UGC e-Samadhan Student Portal", "url": "https://samadhan.ugc.ac.in"}
            ],
            'travel': [
                {"name": "RailMadad Railway Passenger Portal", "url": "https://railmadad.indianrailways.gov.in"}
            ],
            'family': [
                {"name": "e-Courts Services Portal", "url": "https://districts.ecourts.gov.in"}
            ],
            'legalaid': [
                {"name": "National Legal Services Authority (NALSA)", "url": "https://nalsa.gov.in"},
                {"name": "District Legal Services Authority (DLSA)", "url": "https://nalsa.gov.in"}
            ]
        }

        official_portals = portals_map.get(top_category_slug, [
            {"name": "National Legal Services Authority (NALSA)", "url": "https://nalsa.gov.in"},
            {"name": "National Cybercrime Reporting Portal", "url": "https://cybercrime.gov.in"}
        ])

        support_map = {
            'cyber': ["Cyber Financial Crime: 1930", "National Emergency: 112", "Free Legal Aid: 15100"],
            'property': ["Toll-Free Revenue Helpline: 1800-425-6020", "Free Legal Aid (DLSA): 15100", "National Emergency: 112"],
            'consumer': ["National Consumer Helpline: 1915", "Free Legal Aid: 15100", "National Emergency: 112"],
            'employee': ["Labour Ministry Helpline: 14489", "EPFO Toll-Free: 1800-118-005", "Free Legal Aid: 15100"],
            'women': ["Women Helpline: 1091", "Women in Distress: 181", "National Emergency: 112", "Free Legal Aid: 15100"],
            'child': ["Childline: 1098", "National Emergency: 112", "Free Legal Aid: 15100"],
            'senior': ["Elderline: 14567", "National Emergency: 112", "Free Legal Aid: 15100"],
            'scst': ["Atrocities Helpline: 18555", "National Emergency: 112", "Free Legal Aid: 15100"],
            'education': ["Anti-Ragging 24x7: 1800-180-5522", "National Emergency: 112", "Free Legal Aid: 15100"],
            'travel': ["Railways Integrated Helpline: 139", "Highway Accident Emergency: 1033", "National Emergency: 112"],
            'family': ["Family Court Mediation: 15100", "Women Helpline: 1091", "National Emergency: 112"],
            'legalaid': ["National Legal Aid: 15100", "National Emergency: 112"]
        }

        support_list = support_map.get(top_category_slug, [
            "National Emergency: 112", "Free Legal Aid: 15100", "Cyber Crime: 1930", "Women Helpline: 1091"
        ])

        return jsonify({
            "status": "complete",
            "situation": f"Assessment for citizen inquiry: '{question}'. Grounded in official Indian law ({classification['category_title']}), you have statutory remedies and protective legal rights.",
            "category": classification['category_title'],
            "laws": laws_list,
            "whom_to_meet": designated_officers,
            "action_plan": action_plan,
            "official_portals": official_portals,
            "support": support_list
        })

    except Exception as e:
        print("Error in /ask:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/draft-complaint", methods=["POST"])
def draft_complaint():
    """Generate a structured, formal complaint draft distinguishing allegations from facts."""
    try:
        data = request.get_json() or {}
        complainant_name = data.get("complainantName", "Concerned Citizen")
        complainant_contact = data.get("contact", "[Phone / Email]")
        recipient_authority = data.get("authority", "Station House Officer / Competent Authority")
        incident_date = data.get("incidentDate", "Recent")
        incident_location = data.get("location", "Jurisdiction Area")
        allegations = data.get("allegations", "").strip()
        category = data.get("category", "General Offence")

        if not allegations:
            return jsonify({"error": "Incident details and allegations are required"}), 400

        # RAG search for statutory grounding
        legal_matches = search_legal_knowledge(allegations, max_results=3)
        cited_sections = []
        for m in legal_matches:
            cited_sections.append(f"{m['actName']} {m['section']}")
        sections_str = ", ".join(cited_sections) if cited_sections else "Relevant statutory provisions to be determined upon factual verification by Competent Authority / DLSA"

        complaint_text = f"""FORMAL COMPLAINT & LEGAL REPRESENTATION

To:
The {recipient_authority}
Subject: Formal Complaint regarding {category} at {incident_location} on or about {incident_date}

Complainant Information:
Name: {complainant_name}
Contact: {complainant_contact}

1. STATEMENT OF FACTS & INCIDENT CHRONOLOGY:
The Complainant respectfully submits the following facts for official inquiry and registration:
"{allegations}"

2. CLASSIFICATION & STATUTORY PROVISIONS INVOKED:
Based on official statutory law and the Constitution of India, the alleged acts prima facie invoke:
{sections_str}
(Official grounding derived from India Code & Ministry of Law and Justice).

3. PRESERVED EVIDENCE & ANNEXURES ATTACHED:
- Annexure A: Written communications, timestamps, receipts, photographs, and electronic records.
- Annexure B: Identification and contact details of involved parties and corroborating witnesses.

4. PRAYER / SPECIFIC RELIEF SOUGHT:
The Complainant humbly requests the Competent Authority to:
a) Register this complaint in the official records (General Diary / First Information Report) under Section 173 BNSS 2023.
b) Initiate prompt preliminary inquiry into the facts stated herein and issue protective directions.
c) Provide the Complainant with an official copy / CSR acknowledgment free of cost.

VERIFICATION:
I, {complainant_name}, do hereby state that the statements made above are true to my knowledge and belief. No material facts have been concealed.

Date: {incident_date}
Place: {incident_location}

_________________________
Signature of Complainant
(Draft prepared via Meyyurai AI Legal Awareness System. Ready for official filing.)
"""

        return jsonify({
            "status": "success",
            "complaintDraft": complaint_text.strip(),
            "sectionsCited": sections_str,
            "category": category
        })

    except Exception as e:
        print("Error in /draft-complaint:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/action-plan", methods=["POST"])
def generate_action_plan():
    """Turn a legal situation into an ordered, step-by-step action plan."""
    try:
        data = request.get_json() or {}
        issue = data.get("issue", "").strip()
        if not issue:
            return jsonify({"error": "Issue description is required"}), 400

        classification = classify_legal_query(issue)
        legal_matches = search_legal_knowledge(issue, max_results=2)
        primary_cat = classification["category_title"] if classification.get("is_confident") else "Legal Rights Guidance (Preliminary Intake)"

        hotline = "112 / 15100 (Free Legal Aid)"
        cat_slug = classification.get("category_slug")
        if cat_slug == "cyber":
            hotline = "Cyber Crime Helpline: 1930 / Emergency: 112"
        elif cat_slug == "consumer":
            hotline = "National Consumer Helpline: 1915 / DLSA: 15100"
        elif cat_slug == "women":
            hotline = "Women Helpline: 1091 / Emergency: 112"
        elif cat_slug == "child":
            hotline = "Childline: 1098 / Emergency: 112"
        elif cat_slug == "senior":
            hotline = "Elderline: 14567 / Free Legal Aid: 15100"

        steps = [
            {
                "phase": "Immediate Steps (Within 24 Hours)",
                "action": "Preserve all physical and electronic evidence immediately (screenshots, bank transaction UTRs, audio notes, email headers).",
                "authority": "Local Police / Cyber Helpline (1930) / Bank nodal officer"
            },
            {
                "phase": "Document Organization (Days 1–3)",
                "action": "Create a chronological timeline of events with dates, names, and exact statements made by the counterparty.",
                "authority": "Self-record / Legal Aid Clinic"
            },
            {
                "phase": "Formal Pre-Litigation Remedy (Days 3–7)",
                "action": "Issue a formal written notice or statutory grievance petition giving a 7 to 15-day rectification window.",
                "authority": "Registered Post with Acknowledgment Due (RPAD) or official portal"
            },
            {
                "phase": "Institutional Escalation (Post 15 Days)",
                "action": "File formal complaint with District Legal Services Authority (DLSA), Consumer Commission, or jurisdictional Magistrate.",
                "authority": "DLSA (15100) or Jurisdictional Court"
            }
        ]

        return jsonify({
            "status": "success",
            "category": primary_cat,
            "issue": issue,
            "roadmap": steps,
            "recommendedHotline": hotline
        })

    except Exception as e:
        print("Error in /action-plan:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)