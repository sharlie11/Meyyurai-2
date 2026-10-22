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

load_dotenv()

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.getenv("SECRET_KEY", "meyyurai_secure_key_2026_sos_portal")

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


def search_legal_knowledge(query: str, max_results: int = 4):
    """Retrieve relevant statutory sections and designated authorities from Indian law knowledge base (RAG)."""
    if not query or not RIGHTS_DATA:
        return []

    q_lower = query.lower()
    results = []

    for cat_key, cat_data in RIGHTS_DATA.items():
        title = cat_data.get("title", "")
        overview = cat_data.get("overview", "")
        authorities = cat_data.get("authorities", [])
        
        # Check laws
        for law in cat_data.get("laws", []):
            act_name = law.get("actName", "")
            section = law.get("section", "")
            desc = law.get("description", "")
            bare_text = law.get("bareActText", "")
            combined_text = f"{title} {act_name} {section} {desc} {bare_text} {overview}".lower()

            score = 0
            for word in q_lower.split():
                if len(word) > 2 and word in combined_text:
                    score += 1

            if score > 0:
                results.append({
                    "category": cat_data.get("title"),
                    "category_slug": cat_key,
                    "actName": act_name,
                    "section": section,
                    "description": desc,
                    "punishment": law.get("punishment", ""),
                    "bareActText": bare_text,
                    "officialSource": law.get("officialSource", "India Code"),
                    "officialUrl": law.get("officialUrl", ""),
                    "authorities": authorities,
                    "score": score
                })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:max_results]


def map_officers_for_category(category_slug: str, query: str):
    """Determine the exact statutory officers and authorities to meet based on incident category."""
    q_lower = query.lower()
    
    if "cyber" in category_slug or any(w in q_lower for w in ["hack", "scam", "otp", "phishing", "online", "fraud", "blackmail", "instagram", "whatsapp"]):
        return [
            {
                "designation": "Station House Officer / Inspector (Cyber Crime Police Station)",
                "office": "Designated Cyber Crime Police Station / District Cyber Crime Wing",
                "whereToFind": "Available at every District Police Headquarters / City Commissionerate (e.g., Vepery Cyber Cell, Chennai).",
                "howToApproach": "Lodge an online complaint at https://cybercrime.gov.in or visit with bank account statements showing transaction UTR numbers.",
                "whatToCarry": "Bank statements, transaction reference (UTR/IMPS/UPI IDs), chat transcripts, URL links, and caller phone numbers."
            },
            {
                "designation": "National Cyber Crime Helpline Desk Officer (1930)",
                "office": "Citizen Financial Cyber Fraud Reporting System (CFCFRMS)",
                "whereToFind": "Dial 1930 immediately (toll-free, 24x7) within 2-4 hours of fraud to freeze funds in transit.",
                "howToApproach": "Dial 1930 directly from your registered mobile number and state the debit amount, debiting bank, and fraudulent wallet/account.",
                "whatToCarry": "SMS text received with debit alert, recipient UPI ID or account number."
            }
        ]
    elif "women" in category_slug or any(w in q_lower for w in ["woman", "women", "wife", "harass", "stalk", "dowry", "husband", "in-laws", "domestic", "abuse"]):
        return [
            {
                "designation": "Station House Officer - Inspector of Police (AWPS)",
                "office": "All Women Police Station (AWPS)",
                "whereToFind": "Present in every Police Sub-Division and Taluk across Tamil Nadu and all Indian states.",
                "howToApproach": "Walk into the station directly or call 1091 (Women Helpline) or 112. Under BNSS Sec 173, they must register your complaint as Zero FIR if incident happened elsewhere.",
                "whatToCarry": "Written chronology of incidents, dates/times, identity card (Aadhaar), medical injury reports (if physical violence), and audio/video proof."
            },
            {
                "designation": "Protection Officer & District Social Welfare Officer (DSWO)",
                "office": "District Social Welfare Office (Collectorate Complex)",
                "whereToFind": "Located inside every District Collectorate office across Tamil Nadu.",
                "howToApproach": "Submit a Domestic Incident Report (DIR) under Section 9 of the Protection of Women from Domestic Violence Act for immediate residence and protection orders.",
                "whatToCarry": "Marriage proof/ration card, residential address, list of stridhan articles, and specific reliefs sought (shelter/maintenance)."
            },
            {
                "designation": "Secretary / Legal Aid Advocate (DLSA)",
                "office": "District Legal Services Authority (DLSA)",
                "whereToFind": "District Court Complex in every district capital.",
                "howToApproach": "Under Section 12 of Legal Services Authorities Act, ALL women are entitled to 100% free legal representation and court fee exemption.",
                "whatToCarry": "Identity proof and details of pending dispute or police complaint."
            }
        ]
    elif "employee" in category_slug or any(w in q_lower for w in ["salary", "boss", "company", "fired", "pf", "provident", "unpaid", "gratuity", "wage"]):
        return [
            {
                "designation": "Labour Conciliation Officer / Deputy Labour Commissioner",
                "office": "Office of the Commissioner of Labour",
                "whereToFind": "District Labour Department Office (e.g. DMS Complex, Teynampet, Chennai).",
                "howToApproach": "File a petition under Payment of Wages Act or Industrial Disputes Act regarding unpaid dues or unlawful termination.",
                "whatToCarry": "Offer letter, appointment contract, payslips, bank statements showing salary credits, and official email correspondence."
            },
            {
                "designation": "Assistant Provident Fund Commissioner (APFC)",
                "office": "Employees' Provident Fund Organisation (EPFO) Regional Office",
                "whereToFind": "Regional EPFO Office in your jurisdictional division.",
                "howToApproach": "Lodge an official grievance on the EPFiGMS portal (https://epfigms.gov.in) if employer deducted PF but failed to deposit with EPFO.",
                "whatToCarry": "Universal Account Number (UAN), Member ID, and salary slips showing PF deductions."
            }
        ]
    elif "consumer" in category_slug or any(w in q_lower for w in ["seller", "product", "defective", "refund", "warranty", "flight", "e-commerce"]):
        return [
            {
                "designation": "President / Members of District Consumer Commission",
                "office": "District Consumer Disputes Redressal Commission (DCDRC)",
                "whereToFind": "District Headquarters Court Complex.",
                "howToApproach": "Lodge online through e-Daakhil portal (https://edaakhil.nic.in) or call National Consumer Helpline: 1915.",
                "whatToCarry": "Tax invoice/receipt, warranty card, replacement requests, written email rejection, and proof of monetary transaction."
            }
        ]
    elif "property" in category_slug or any(w in q_lower for w in ["land", "patta", "tenant", "eviction", "rent", "landlord", "flat", "boundary"]):
        return [
            {
                "designation": "Tahsildar / Zonal Deputy Tahsildar",
                "office": "Taluk Office (Revenue Department)",
                "whereToFind": "Your local Taluk Office.",
                "howToApproach": "Submit an online petition via e-Services (eservices.tn.gov.in) for Patta transfer, survey measurement, or Chitta verification.",
                "whatToCarry": "Registered Sale Deed, Parent Document copies, Encumbrance Certificate (EC), and previous Patta numbers."
            },
            {
                "designation": "Rent Authority / Rent Court",
                "office": "Court of Small Causes / Rent Tribunal",
                "whereToFind": "Designated Civil Court in your municipal zone.",
                "howToApproach": "Under Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act, no tenant can be evicted without an order of the Rent Court.",
                "whatToCarry": "Registered Tenancy Agreement, rent payment receipts/bank passbook, and notice received."
            }
        ]
    else:
        return [
            {
                "designation": "Station House Officer (SHO) / Sub-Inspector",
                "office": "Jurisdictional Police Station",
                "whereToFind": "Local police station covering your residential or incident location.",
                "howToApproach": "Submit a signed written representation stating the chronological facts, names, and contact details. Obtain a CSR (Community Service Register) receipt or FIR copy.",
                "whatToCarry": "Two copies of written complaint, government photo ID, and corroborating documents or witness names."
            },
            {
                "designation": "Member Secretary / Duty Advocate",
                "office": "District Legal Services Authority (DLSA / TLSC)",
                "whereToFind": "Inside the District Court or Taluk Court complex.",
                "howToApproach": "Walk into the Front Office of DLSA or call toll-free National Legal Aid Helpline: 15100 for free legal advice and representation.",
                "whatToCarry": "Identity proof and any notices, summons, or letters received."
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
    """Generate 6-digit OTP code for phone login/registration."""
    try:
        data = request.get_json() or {}
        phone = data.get("phone", "").strip()
        
        # Clean phone
        clean_phone = phone.replace(" ", "").replace("-", "").replace("+91", "")
        if not clean_phone or len(clean_phone) != 10 or not clean_phone.isdigit():
            return jsonify({"status": "error", "error": "Please enter a valid 10-digit mobile number."}), 400

        otp = db.generate_otp_for_phone(clean_phone)

        # In local development, provide on-screen demo OTP for convenience while simulating real SMS
        return jsonify({
            "status": "success",
            "message": f"Verification code successfully sent to +91 {clean_phone}",
            "phone": clean_phone,
            "otp_demo": otp,  # Displays in testing toast for seamless onboarding
            "expires_in_seconds": 300
        })
    except Exception as e:
        print("Error in /api/auth/send-otp:", e)
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    """Verify OTP and authenticate user session."""
    try:
        data = request.get_json() or {}
        phone = data.get("phone", "").strip()
        otp = data.get("otp", "").strip()

        if not phone or not otp:
            return jsonify({"status": "error", "error": "Phone number and OTP code are required."}), 400

        user, err_msg = db.verify_phone_otp(phone, otp)
        if err_msg or not user:
            return jsonify({"status": "error", "error": err_msg or "Verification failed."}), 400

        # Save session
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
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    """Get current authenticated user, profile details, and emergency contacts."""
    try:
        user_id = session.get("user_id")
        
        # If no active session, check if query param ?phone= is passed for developer flexibility
        if not user_id:
            dev_phone = request.args.get("phone", "").strip()
            if dev_phone:
                user = db.get_user_by_phone(dev_phone)
                if user:
                    user_id = user["id"]
                    session["user_id"] = user_id

        if not user_id:
            # Return unauthenticated guest state
            return jsonify({
                "status": "unauthenticated",
                "authenticated": False,
                "user": None,
                "emergency_contacts": []
            })

        user = db.get_user_by_id(user_id)
        if not user:
            session.clear()
            return jsonify({"status": "unauthenticated", "authenticated": False, "user": None, "emergency_contacts": []})

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
    """Update profile fields for the logged-in user in SQLite."""
    try:
        user_id = session.get("user_id")
        data = request.get_json() or {}

        if not user_id:
            # Check phone if passed directly
            phone = data.get("phone")
            if phone:
                user = db.get_user_by_phone(phone)
                if user:
                    user_id = user["id"]

        if not user_id:
            return jsonify({"status": "error", "error": "Please log in to update your profile."}), 401

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
    """List or add emergency contacts for the user."""
    try:
        user_id = session.get("user_id")
        if not user_id:
            body = request.get_json(silent=True) or {}
            phone = request.args.get("phone") or body.get("user_phone") or body.get("phone")
            if phone:
                user = db.get_user_by_phone(phone)
                if user:
                    user_id = user["id"]

        if not user_id:
            return jsonify({"status": "error", "error": "Authentication required."}), 401

        if request.method == "GET":
            contacts = db.get_emergency_contacts(user_id)
            return jsonify({"status": "success", "contacts": contacts})

        # POST: Add new contact
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        phone = data.get("phone", "").strip()
        relationship = data.get("relationship", "Family").strip()
        is_primary = bool(data.get("is_primary", False))

        if not name or not phone:
            return jsonify({"status": "error", "error": "Contact name and phone are required."}), 400

        new_contact = db.add_emergency_contact(user_id, name, phone, relationship, is_primary)
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


@app.route("/api/emergency-contacts/<int:contact_id>", methods=["DELETE"])
def delete_contact(contact_id):
    """Delete an emergency contact."""
    try:
        user_id = session.get("user_id")
        if not user_id:
            body = request.get_json(silent=True) or {}
            phone = request.args.get("phone") or body.get("phone")
            if phone:
                user = db.get_user_by_phone(phone)
                if user:
                    user_id = user["id"]

        if not user_id:
            return jsonify({"status": "error", "error": "Authentication required."}), 401

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
    - Captures GPS coordinates and human address.
    - Prepares emergency distress alert with Google Maps link.
    - Broadcasts to registered emergency contacts (with direct WhatsApp & SMS links).
    - Returns primary dialer target (112) and hotlines.
    """
    try:
        data = request.get_json() or {}
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        address = data.get("address", "Current Detected GPS Location")
        emergency_type = data.get("emergencyType", "Immediate Distress & Protection")

        user_id = session.get("user_id")
        user = db.get_user_by_id(user_id) if user_id else None
        user_name = user["name"] if user else "Meyyurai Citizen"
        user_phone = user["phone"] if user else ""

        # Fetch emergency contacts
        contacts = db.get_emergency_contacts(user_id) if user_id else []

        # If no contacts stored yet, use default fallbacks
        if not contacts:
            contacts = [
                {"contact_name": "Emergency Guardian", "contact_phone": "9840123456", "relationship": "Family", "is_primary": 1}
            ]

        # Construct Maps link
        if latitude and longitude:
            map_url = f"https://maps.google.com/?q={latitude},{longitude}"
            coords_str = f"({latitude:.5f}, {longitude:.5f})"
        else:
            map_url = "https://maps.google.com"
            coords_str = "GPS Coordinates pending"

        # Pre-formulated distress alert message
        sos_message = (
            f"🚨 EMERGENCY SOS ALERT from {user_name} (Ph: {user_phone})!\n"
            f"I am in immediate danger and need urgent assistance.\n"
            f"📍 My Live Location: {map_url}\n"
            f"Approximate Address: {address} {coords_str}\n"
            f"Please call 112 / Police and reach me immediately."
        )

        encoded_msg = urllib.parse.quote(sos_message)

        # Build contact notification payloads
        alerted_list = []
        for c in contacts:
            c_phone = c.get("contact_phone", "").replace("+91", "").replace(" ", "").replace("-", "")
            wa_link = f"https://api.whatsapp.com/send?phone=91{c_phone}&text={encoded_msg}"
            sms_link = f"sms:+91{c_phone}?body={encoded_msg}"
            alerted_list.append({
                "name": c.get("contact_name"),
                "phone": c_phone,
                "relationship": c.get("relationship", "Contact"),
                "whatsapp_url": wa_link,
                "sms_url": sms_link
            })

        # Save record in database
        contacts_summary = json.dumps([f"{c['name']} ({c['phone']})" for c in alerted_list])
        sos_id = db.log_emergency_sos(user_id, latitude or 0.0, longitude or 0.0, address, contacts_summary)

        return jsonify({
            "status": "alert_dispatched",
            "sos_id": sos_id,
            "message": "Emergency broadcast successfully initiated. Distress signals prepared for emergency contacts.",
            "sos_text": sos_message,
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "map_url": map_url,
                "address": address
            },
            "contacts_alerted": alerted_list,
            "police_dial_number": "tel:112",
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
        if sos_id:
            db.cancel_emergency_sos(int(sos_id))
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

        # RAG: Retrieve grounded legal passages from official Indian law records
        legal_matches = search_legal_knowledge(question, max_results=4)
        top_category_slug = legal_matches[0]["category_slug"] if legal_matches else "legalaid"
        
        # Determine specific officers to meet
        designated_officers = map_officers_for_category(top_category_slug, question)

        legal_context_str = ""
        if legal_matches:
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
  "category": "e.g. Women Safety & Protection / Cyber Financial Fraud / Labor Dispute / Tenancy Rights",
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
                    # Supplement with fallback designated officers if missing
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

        if not laws_list:
            laws_list = [{
                "act": "Bharatiya Nyaya Sanhita, 2023 (BNS) & Constitution of India",
                "section": "Applicable Penal & Civil Protection Provisions",
                "punishment": "Penal sanctions, injunctions, and civil compensation under statutory law.",
                "source": "Ministry of Law & Justice, Govt of India"
            }]

        return jsonify({
            "status": "complete",
            "situation": f"Assessment for citizen inquiry: '{question}'. Under Indian law and the Constitution, you have statutory remedies and guaranteed rights to representation.",
            "category": legal_matches[0]["category"] if legal_matches else "Citizen Rights & Protection",
            "laws": laws_list,
            "whom_to_meet": designated_officers,
            "action_plan": [
                {
                    "phase": "Immediate Steps (Within 24 Hours)",
                    "action": "Preserve all physical and electronic evidence immediately (screenshots, bank transaction UTRs, audio notes, email headers) without modification."
                },
                {
                    "phase": "Approaching the Designated Officer (Days 1–3)",
                    "action": "Approach the designated officer listed above with two copies of your written complaint and obtain an official acknowledgment (CSR / Diary Number)."
                },
                {
                    "phase": "Free Legal Counsel & Institutional Remedy (Days 3–7)",
                    "action": "If facing procedural delay, contact the District Legal Services Authority (DLSA) at 15100 for a free appointed advocate under Article 39A."
                }
            ],
            "official_portals": [
                {"name": "National Cybercrime Reporting Portal", "url": "https://cybercrime.gov.in"},
                {"name": "National Commission for Women (NCW)", "url": "https://ncw.nic.in"},
                {"name": "National Legal Services Authority (NALSA)", "url": "https://nalsa.gov.in"},
                {"name": "National Consumer Helpline", "url": "https://consumerhelpline.gov.in"}
            ],
            "support": ["National Emergency: 112", "Women Helpline: 1091", "Cyber Financial Crime: 1930", "Free Legal Aid: 15100"]
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
        sections_str = ", ".join(cited_sections) if cited_sections else "Relevant provisions of Bharatiya Nyaya Sanhita 2023 / BNSS"

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

        legal_matches = search_legal_knowledge(issue, max_results=2)
        primary_cat = legal_matches[0]["category"] if legal_matches else "Legal Rights Protection"

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
            "recommendedHotline": "112 / 15100 (Free Legal Aid)"
        })

    except Exception as e:
        print("Error in /action-plan:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)