import json
import pytest
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app import app
import db

@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test_meyyurai_secret_key"
    with app.test_client() as client:
        yield client

def test_home_page(client):
    """Test that the home page renders the laptop-first interface successfully."""
    response = client.get("/")
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "MEYYURAI" in html
    assert "Emergency" in html
    assert "tab-dashboard" in html
    assert "tab-ai" in html
    assert "tab-resources" in html
    assert "tab-profile" in html
    assert "mainSosTriggerBtn" in html

def test_rights_api(client):
    """Test official statutory knowledge base retrieval."""
    response = client.get("/api/rights")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "categories" in data
    assert data["count"] == 12
    slugs = [c["slug"] for c in data["categories"]]
    assert "women" in slugs
    assert "cyber" in slugs
    assert "employee" in slugs
    assert "property" in slugs
    assert "legalaid" in slugs

def test_rights_category_detail(client):
    """Test retrieving statutory laws for a specific category."""
    response = client.get("/api/rights/women")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["slug"] == "women"
    assert "laws" in data
    assert len(data["laws"]) > 0

def test_otp_flow(client):
    """Test mobile OTP generation and session verification."""
    phone = "9876543210"
    
    # 1. Request OTP
    res_send = client.post("/api/auth/send-otp", json={"phone": phone})
    assert res_send.status_code == 200
    data_send = json.loads(res_send.data)
    assert data_send["status"] == "success"
    otp = data_send["otp_demo"]
    assert len(otp) == 6

    # 2. Verify with correct OTP
    res_verify = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert res_verify.status_code == 200
    data_verify = json.loads(res_verify.data)
    assert data_verify["status"] == "success"
    assert data_verify["user"]["phone"] == phone

    # 3. Check /api/auth/me retains session
    res_me = client.get("/api/auth/me")
    assert res_me.status_code == 200
    data_me = json.loads(res_me.data)
    assert data_me["status"] == "authenticated"
    assert data_me["user"]["phone"] == phone

def test_invalid_otp(client):
    """Test rejection of invalid OTP codes."""
    res = client.post("/api/auth/verify-otp", json={"phone": "9876543210", "otp": "000000"})
    assert res.status_code == 400
    data = json.loads(res.data)
    assert data["status"] == "error"

def test_profile_update(client):
    """Test updating user profile details."""
    phone = "9876543210"
    # Authenticate first
    res_send = client.post("/api/auth/send-otp", json={"phone": phone})
    otp = json.loads(res_send.data)["otp_demo"]
    client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})

    # Update profile
    payload = {
        "name": "Murthy Verified",
        "email": "murthy@example.com",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "blood_group": "O+ Positive",
        "medical_notes": "No allergies"
    }
    res_update = client.post("/api/profile/update", json=payload)
    assert res_update.status_code == 200
    data_update = json.loads(res_update.data)
    assert data_update["status"] == "success"
    assert data_update["user"]["name"] == "Murthy Verified"
    assert data_update["user"]["blood_group"] == "O+ Positive"

def test_emergency_contacts_crud(client):
    """Test adding, listing, and deleting emergency contacts."""
    phone = "9876543210"
    # Authenticate
    res_send = client.post("/api/auth/send-otp", json={"phone": phone})
    otp = json.loads(res_send.data)["otp_demo"]
    client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})

    # 1. Add contact
    contact_payload = {
        "name": "Guardian Sister",
        "phone": "9840998877",
        "relationship": "Sibling",
        "is_primary": True
    }
    res_add = client.post("/api/emergency-contacts", json=contact_payload)
    assert res_add.status_code == 200
    data_add = json.loads(res_add.data)
    assert data_add["status"] == "success"
    contact_id = data_add["contact"]["id"]

    # 2. Get contacts
    res_get = client.get("/api/emergency-contacts")
    assert res_get.status_code == 200
    data_get = json.loads(res_get.data)
    contact_names = [c["contact_name"] for c in data_get["contacts"]]
    assert "Guardian Sister" in contact_names

    # 3. Delete contact
    res_del = client.delete(f"/api/emergency-contacts/{contact_id}")
    assert res_del.status_code == 200
    data_del = json.loads(res_del.data)
    assert data_del["status"] == "success"

def test_emergency_sos_trigger_and_cancel(client):
    """Test triggering emergency SOS and canceling it via the safeguard."""
    # Trigger SOS
    sos_payload = {
        "latitude": 13.0827,
        "longitude": 80.2707,
        "address": "Chennai Central"
    }
    res_trigger = client.post("/api/emergency/trigger", json=sos_payload)
    assert res_trigger.status_code == 200
    data_trigger = json.loads(res_trigger.data)
    assert data_trigger["status"] == "alert_dispatched"
    assert "sos_id" in data_trigger
    assert "maps.google.com" in data_trigger["sos_text"]
    assert len(data_trigger["contacts_alerted"]) > 0

    sos_id = data_trigger["sos_id"]

    # Cancel SOS
    res_cancel = client.post("/api/emergency/cancel", json={"sos_id": sos_id})
    assert res_cancel.status_code == 200
    data_cancel = json.loads(res_cancel.data)
    assert data_cancel["status"] == "cancelled"

def test_ask_ai_statutory_advisor(client):
    """Test AI legal guidance and whom to meet analysis."""
    query_payload = {
        "question": "Someone is blackmailing me on WhatsApp with photos and asking for money."
    }
    res_ask = client.post("/ask", json=query_payload)
    assert res_ask.status_code == 200
    data_ask = json.loads(res_ask.data)
    assert data_ask["status"] == "complete"
    assert "laws" in data_ask
    assert len(data_ask["laws"]) > 0
    assert "whom_to_meet" in data_ask
    assert len(data_ask["whom_to_meet"]) > 0
    assert "action_plan" in data_ask

def test_draft_complaint(client):
    """Test generating a formal legal complaint draft citing official statutes."""
    complaint_payload = {
        "allegations": "Unauthorized debit of 50000 rupees through phishing link",
        "complainantName": "Citizen Murthy",
        "category": "Cyber Financial Crime"
    }
    res_draft = client.post("/draft-complaint", json=complaint_payload)
    assert res_draft.status_code == 200
    data_draft = json.loads(res_draft.data)
    assert "complaintDraft" in data_draft
    draft = data_draft["complaintDraft"]
    assert "FORMAL COMPLAINT" in draft
    assert "Citizen Murthy" in draft
