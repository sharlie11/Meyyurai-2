import json
import pytest
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app import app
import db
import sms_service


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test_meyyurai_secure_secret_key"
    sms_service.clear_test_captured_otps()
    with app.test_client() as client:
        yield client
    sms_service.clear_test_captured_otps()


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
    # Ensure Demo OTP and auto-fill buttons are completely absent from HTML
    assert "Demo OTP" not in html
    assert "Auto-Fill OTP" not in html
    assert "otpSimulationBox" not in html
    assert "autoFillOtp" not in html


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


def test_production_otp_flow(client):
    """
    Test production cryptographic OTP generation, delivery flag, and session authentication:
    - Never exposes OTP or otp_demo in API responses.
    - Captures via secure test hook in testing mode only.
    - Authenticates and establishes session only after verification.
    """
    phone = "9876543210"

    # Clean existing state for clean test
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # 1. Request OTP
    res_send = client.post("/api/auth/send-otp", json={"phone": phone})
    assert res_send.status_code == 200
    data_send = json.loads(res_send.data)

    assert data_send["status"] == "success"
    assert "otp" not in data_send
    assert "otp_demo" not in data_send  # Strict production check!
    assert data_send["delivery"] in ("NOT_CONFIGURED", "DELIVERED")
    assert data_send["resend_in_seconds"] == 60

    # Retrieve OTP strictly from server-side test fixture
    captured_otp = sms_service.get_test_captured_otp(phone)
    assert captured_otp is not None
    assert len(captured_otp) == 6
    assert captured_otp.isdigit()

    # Verify user is NOT authenticated yet
    res_me_before = client.get("/api/auth/me")
    assert res_me_before.status_code == 200
    assert json.loads(res_me_before.data)["authenticated"] is False

    # 2. Verify with correct OTP
    res_verify = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": captured_otp})
    assert res_verify.status_code == 200
    data_verify = json.loads(res_verify.data)
    assert data_verify["status"] == "success"
    assert data_verify["user"]["phone"] == phone

    # 3. Check /api/auth/me now retains session
    res_me_after = client.get("/api/auth/me")
    assert res_me_after.status_code == 200
    data_me = json.loads(res_me_after.data)
    assert data_me["status"] == "authenticated"
    assert data_me["authenticated"] is True
    assert data_me["user"]["phone"] == phone


def test_no_bypass_allowed(client):
    """Verify that hardcoded codes like 123456 or 000000 do NOT authenticate."""
    phone = "9876543211"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Request code
    client.post("/api/auth/send-otp", json={"phone": phone})
    real_otp = sms_service.get_test_captured_otp(phone)

    # Attempt hardcoded 123456 (if real_otp happens not to be 123456)
    fake_code = "123456" if real_otp != "123456" else "654321"
    res_bypass = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": fake_code})
    assert res_bypass.status_code == 400
    data = json.loads(res_bypass.data)
    assert data["status"] == "error"
    assert "Invalid verification code" in data["error"]


def test_resend_cooldown_rate_limiting(client):
    """Test 60-second cooldown preventing rapid OTP resend attacks."""
    phone = "9876543212"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # First request: Success
    res1 = client.post("/api/auth/send-otp", json={"phone": phone})
    assert res1.status_code == 200

    # Immediate second request: Must be rate-limited (429 Too Many Requests)
    res2 = client.post("/api/auth/send-otp", json={"phone": phone})
    assert res2.status_code == 429
    data2 = json.loads(res2.data)
    assert data2["status"] == "error"
    assert "wait" in data2["error"].lower()


def test_brute_force_lockout_and_invalidation(client):
    """Test that 5 consecutive failed verification attempts lock out and invalidate the OTP."""
    phone = "9876543213"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Generate OTP
    client.post("/api/auth/send-otp", json={"phone": phone})
    real_otp = sms_service.get_test_captured_otp(phone)
    bad_code = "000000" if real_otp != "000000" else "111111"

    # Attempts 1 to 4 should return 400 with remaining attempts notice
    for i in range(1, 5):
        res = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": bad_code})
        assert res.status_code == 400
        data = json.loads(res.data)
        assert f"{5 - i} attempt(s) remaining" in data["error"]

    # 5th attempt must trigger lockout (429) and delete the OTP code
    res5 = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": bad_code})
    assert res5.status_code == 429
    data5 = json.loads(res5.data)
    assert "Maximum verification attempts exceeded" in data5["error"]

    # Even if attacker now submits the real OTP, it is already deleted/invalidated
    res_late_real = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": real_otp})
    assert res_late_real.status_code == 400
    assert "No active verification code found" in json.loads(res_late_real.data)["error"]


def test_auth_me_rejects_query_param_backdoor(client):
    """Ensure GET /api/auth/me?phone=... does NOT authenticate or log in a user without session."""
    phone = "9876543210"
    res = client.get(f"/api/auth/me?phone={phone}")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["authenticated"] is False
    assert data["user"] is None


def test_route_protection_unauthorized_access(client):
    """Ensure profile and emergency contacts endpoints reject unauthenticated access with 401."""
    # 1. Update profile without session
    res_prof = client.post("/api/profile/update", json={"name": "Attacker", "phone": "9876543210"})
    assert res_prof.status_code == 401

    # 2. Get contacts without session
    res_contacts_get = client.get("/api/emergency-contacts?phone=9876543210")
    assert res_contacts_get.status_code == 401

    # 3. Post contact without session
    res_contacts_post = client.post("/api/emergency-contacts", json={
        "name": "Unauthorized Contact",
        "phone": "9840112233",
        "user_phone": "9876543210"
    })
    assert res_contacts_post.status_code == 401


def test_logout_clears_session(client):
    """Test that logout immediately revokes session and renders subsequent requests unauthenticated."""
    phone = "9876543214"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Authenticate
    client.post("/api/auth/send-otp", json={"phone": phone})
    otp = sms_service.get_test_captured_otp(phone)
    client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})

    # Verify session active
    res_me = client.get("/api/auth/me")
    assert json.loads(res_me.data)["authenticated"] is True

    # Logout
    res_logout = client.post("/api/auth/logout")
    assert res_logout.status_code == 200

    # Verify session is dead
    res_me_dead = client.get("/api/auth/me")
    assert json.loads(res_me_dead.data)["authenticated"] is False


def test_profile_update_authenticated(client):
    """Test updating profile for an authenticated user."""
    phone = "9876543215"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Authenticate
    client.post("/api/auth/send-otp", json={"phone": phone})
    otp = sms_service.get_test_captured_otp(phone)
    client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})

    # Update profile
    payload = {
        "name": "Murthy Production",
        "email": "murthy_prod@example.com",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "blood_group": "O+ Positive",
        "medical_notes": "None"
    }
    res_update = client.post("/api/profile/update", json=payload)
    assert res_update.status_code == 200
    data_update = json.loads(res_update.data)
    assert data_update["status"] == "success"
    assert data_update["user"]["name"] == "Murthy Production"
    assert data_update["user"]["blood_group"] == "O+ Positive"


def test_emergency_contacts_crud(client):
    """Test adding, listing, and deleting emergency contacts for an authenticated session."""
    phone = "9876543216"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Authenticate
    client.post("/api/auth/send-otp", json={"phone": phone})
    otp = sms_service.get_test_captured_otp(phone)
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


# ============================================================================
# PHASE 3 — PRODUCTION EMERGENCY SOS & CONTACT DELIVERY TESTS
# ============================================================================

def test_emergency_sos_with_valid_location(client):
    """Test emergency SOS with valid coordinates: live coords flagged, Google Maps link built."""
    sos_payload = {
        "latitude": 13.0827,
        "longitude": 80.2707,
        "address": "Chennai Central Railway Station"
    }
    res_trigger = client.post("/api/emergency/trigger", json=sos_payload)
    assert res_trigger.status_code == 200
    data = json.loads(res_trigger.data)

    assert data["status"] == "alert_initiated"
    assert "sos_id" in data
    assert data["location"]["has_live_coords"] is True
    assert data["location"]["latitude"] == 13.0827
    assert data["location"]["longitude"] == 80.2707
    assert "maps.google.com" in data["location"]["map_url"]
    assert "q=13.08270,80.27070" in data["location"]["map_url"]
    assert "maps.google.com" in data["sos_text"]
    assert data["direct_dial_police"] == "tel:112"


def test_emergency_sos_with_unavailable_or_invalid_location(client):
    """Test emergency SOS when location is unavailable or denied: coords never fabricated."""
    # 1. Null location
    res1 = client.post("/api/emergency/trigger", json={"latitude": None, "longitude": None})
    assert res1.status_code == 200
    data1 = json.loads(res1.data)
    assert data1["location"]["has_live_coords"] is False
    assert data1["location"]["map_url"] is None
    assert "Live GPS Unavailable" in data1["sos_text"]
    assert "13.0827" not in data1["sos_text"]  # Ensure no fabricated Chennai fallback

    # 2. Out-of-bounds invalid location
    res2 = client.post("/api/emergency/trigger", json={"latitude": 999.0, "longitude": -500.0})
    assert res2.status_code == 200
    data2 = json.loads(res2.data)
    assert data2["location"]["has_live_coords"] is False
    assert data2["location"]["map_url"] is None


def test_emergency_sos_no_contacts_zero_state(client):
    """Verify that unauthenticated user or user with 0 contacts gets an empty contact list (no fake fallbacks)."""
    # Trigger as guest (no session)
    res = client.post("/api/emergency/trigger", json={"latitude": None, "longitude": None})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["has_contacts"] is False
    assert data["contacts_alerted"] == []
    # Ensure no fabricated "Emergency Guardian" or fake numbers are present
    assert not any("Emergency Guardian" in str(c) for c in data["contacts_alerted"])


def test_emergency_sos_with_registered_contacts_and_dispatch(client):
    """Test emergency SOS with registered contacts: prepared URLs and server dispatch capture."""
    phone = "9876543220"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Authenticate user
    client.post("/api/auth/send-otp", json={"phone": phone})
    otp = sms_service.get_test_captured_otp(phone)
    client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})

    # Add contact
    client.post("/api/emergency-contacts", json={
        "name": "Sister Priya",
        "phone": "9840112233",
        "relationship": "Sister",
        "is_primary": True
    })

    sms_service.clear_test_captured_broadcasts()

    # Trigger SOS
    res = client.post("/api/emergency/trigger", json={
        "latitude": 13.0827,
        "longitude": 80.2707,
        "address": "Park Town"
    })
    assert res.status_code == 200
    data = json.loads(res.data)

    assert data["has_contacts"] is True
    assert len(data["contacts_alerted"]) == 1
    contact_alert = data["contacts_alerted"][0]
    assert contact_alert["name"] == "Sister Priya"
    assert contact_alert["phone"] == "9840112233"
    assert "https://api.whatsapp.com/send?phone=919840112233" in contact_alert["whatsapp_url"]
    assert "sms:+919840112233" in contact_alert["sms_url"]
    assert "tel:+919840112233" in contact_alert["tel_url"]

    # In testing mode: automated broadcast captured in memory hook, NO real SMS gateway contacted
    assert data["server_dispatch"]["status"] == "TEST_CAPTURED"
    captured_broadcasts = sms_service.get_test_captured_broadcasts()
    assert len(captured_broadcasts) >= 1
    assert captured_broadcasts[-1]["contacts"][0]["contact_name"] == "Sister Priya"


def test_emergency_sos_cancellation(client):
    """Test that cancelling an active SOS marks its status as cancelled in the database."""
    res_trigger = client.post("/api/emergency/trigger", json={
        "latitude": 12.9716,
        "longitude": 77.5946
    })
    assert res_trigger.status_code == 200
    sos_id = json.loads(res_trigger.data)["sos_id"]
    assert sos_id is not None

    # Cancel via API
    res_cancel = client.post("/api/emergency/cancel", json={"sos_id": sos_id})
    assert res_cancel.status_code == 200
    data_cancel = json.loads(res_cancel.data)
    assert data_cancel["status"] == "cancelled"

    # Verify status in database
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM emergency_sos_logs WHERE id = ?", (sos_id,))
    row = cursor.fetchone()
    conn.close()
    assert row is not None
    assert row["status"] == "cancelled"


def test_duplicate_sos_debouncing(client):
    """Test that rapid successive triggers within 5 seconds return the existing SOS ID to avoid duplicate dispatches."""
    phone = "9876543221"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Authenticate
    client.post("/api/auth/send-otp", json={"phone": phone})
    otp = sms_service.get_test_captured_otp(phone)
    client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})

    # First trigger
    res1 = client.post("/api/emergency/trigger", json={"latitude": 13.0, "longitude": 80.0})
    sos_id_1 = json.loads(res1.data)["sos_id"]

    # Immediate second trigger
    res2 = client.post("/api/emergency/trigger", json={"latitude": 13.0, "longitude": 80.0})
    sos_id_2 = json.loads(res2.data)["sos_id"]

    # Must be debounced to the same SOS ID
    assert sos_id_1 == sos_id_2


def test_emergency_contact_crud_and_validation(client):
    """Test contact phone number validation and PUT update endpoint."""
    phone = "9876543222"
    conn = db.get_connection()
    conn.cursor().execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))
    conn.commit()
    conn.close()

    # Authenticate
    client.post("/api/auth/send-otp", json={"phone": phone})
    otp = sms_service.get_test_captured_otp(phone)
    client.post("/api/auth/verify-otp", json={"phone": phone, "otp": otp})

    # 1. Invalid phone numbers (non-digit, < 10 digits, > 10 digits)
    res_bad1 = client.post("/api/emergency-contacts", json={"name": "Bad", "phone": "12345"})
    assert res_bad1.status_code == 400
    assert "10-digit" in json.loads(res_bad1.data)["error"]

    res_bad2 = client.post("/api/emergency-contacts", json={"name": "Bad", "phone": "abcdefghij"})
    assert res_bad2.status_code == 400

    # 2. Empty name
    res_bad3 = client.post("/api/emergency-contacts", json={"name": "", "phone": "9840112233"})
    assert res_bad3.status_code == 400

    # 3. Valid contact creation
    res_add = client.post("/api/emergency-contacts", json={
        "name": "Original Name",
        "phone": "+91 9840112233",
        "relationship": "Friend",
        "is_primary": False
    })
    assert res_add.status_code == 200
    contact_id = json.loads(res_add.data)["contact"]["id"]

    # 4. PUT update contact
    res_put = client.put(f"/api/emergency-contacts/{contact_id}", json={
        "name": "Updated Name",
        "phone": "9840998877",
        "relationship": "Advocate",
        "is_primary": True
    })
    assert res_put.status_code == 200
    data_put = json.loads(res_put.data)
    assert data_put["contact"]["contact_name"] == "Updated Name"
    assert data_put["contact"]["contact_phone"] == "9840998877"
    assert data_put["contact"]["relationship"] == "Advocate"
    assert data_put["contact"]["is_primary"] == 1


def test_emergency_contact_isolation_between_users(client):
    """
    CRITICAL SECURITY TEST: Ensure contacts of User A are strictly isolated from User B.
    User B cannot view, update, or delete User A's contacts.
    """
    # 1. Setup User A
    phone_a = "9876543230"
    client.post("/api/auth/send-otp", json={"phone": phone_a})
    otp_a = sms_service.get_test_captured_otp(phone_a)
    client.post("/api/auth/verify-otp", json={"phone": phone_a, "otp": otp_a})

    res_a_contact = client.post("/api/emergency-contacts", json={
        "name": "User A Private Contact",
        "phone": "9840000001",
        "relationship": "Family"
    })
    contact_a_id = json.loads(res_a_contact.data)["contact"]["id"]

    # Logout User A
    client.post("/api/auth/logout")

    # 2. Setup User B
    phone_b = "9876543231"
    client.post("/api/auth/send-otp", json={"phone": phone_b})
    otp_b = sms_service.get_test_captured_otp(phone_b)
    client.post("/api/auth/verify-otp", json={"phone": phone_b, "otp": otp_b})

    # User B lists contacts: Must NOT see User A's contact
    res_b_list = client.get("/api/emergency-contacts")
    b_contacts = json.loads(res_b_list.data)["contacts"]
    assert not any(c["id"] == contact_a_id for c in b_contacts)
    assert not any(c["contact_name"] == "User A Private Contact" for c in b_contacts)

    # User B attempts to UPDATE User A's contact: Must fail
    res_b_put = client.put(f"/api/emergency-contacts/{contact_a_id}", json={
        "name": "Hacked Contact",
        "phone": "9840000999"
    })
    assert res_b_put.status_code == 400 or res_b_put.status_code == 404

    # User B attempts to DELETE User A's contact: Must not delete it
    res_b_del = client.delete(f"/api/emergency-contacts/{contact_a_id}")
    assert res_b_del.status_code == 200
    assert json.loads(res_b_del.data)["deleted"] is False

    # Verify User A's contact is still safely intact in DB
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_contacts WHERE id = ?", (contact_a_id,))
    row = cursor.fetchone()
    conn.close()
    assert row is not None
    assert row["contact_name"] == "User A Private Contact"


def test_sms_gateway_not_configured_provider_status():
    """Verify that NotConfiguredProvider returns NOT_CONFIGURED status without false delivery claims."""
    provider = sms_service.NotConfiguredProvider()
    assert provider.is_configured() is False
    assert provider.name == "none"

    # Test OTP delivery status
    otp_res = provider.send_otp("9876543210", "123456")
    assert otp_res["success"] is False
    assert otp_res["status"] == "NOT_CONFIGURED"
    assert "SMS Gateway is not configured" in otp_res["message"]

    # Test emergency broadcast delivery status
    broadcast_res = provider.send_emergency_broadcast(
        contacts=[{"contact_name": "Test", "contact_phone": "9840123456"}],
        message="Distress message"
    )
    assert broadcast_res["success"] is False
    assert broadcast_res["status"] == "NOT_CONFIGURED"
    assert broadcast_res["delivered_count"] == 0
    assert "safe alternative" in broadcast_res["message"].lower() or "whatsapp" in broadcast_res["message"].lower()


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
