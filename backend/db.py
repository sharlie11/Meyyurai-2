import sqlite3
import os
import secrets
import hashlib
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Tuple

DB_PATH = Path(__file__).resolve().parent / "meyyurai.db"

def get_connection():
    """Create and return a database connection with row factory enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables for users, OTP codes, emergency contacts, and SOS logs."""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            name TEXT DEFAULT 'Citizen',
            email TEXT DEFAULT '',
            city TEXT DEFAULT 'Chennai',
            state TEXT DEFAULT 'Tamil Nadu',
            blood_group TEXT DEFAULT '',
            medical_notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Check and migrate otp_codes schema to production standard if needed
    cursor.execute("PRAGMA table_info(otp_codes)")
    existing_cols = [col["name"] for col in cursor.fetchall()]
    if existing_cols and ("otp_hash" not in existing_cols or "salt" not in existing_cols):
        cursor.execute("DROP TABLE otp_codes")

    # Production OTP codes table (salted hashes, attempt tracking, cooldowns)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otp_codes (
            phone TEXT PRIMARY KEY,
            otp_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 5,
            expires_at INTEGER NOT NULL,
            resend_available_at INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Emergency contacts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            contact_name TEXT NOT NULL,
            contact_phone TEXT NOT NULL,
            relationship TEXT NOT NULL,
            is_primary BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)

    # Emergency SOS logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_sos_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            latitude REAL,
            longitude REAL,
            address TEXT,
            contacts_alerted TEXT,
            status TEXT DEFAULT 'triggered',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully at", DB_PATH)

def generate_otp_for_phone(phone: str):
    """
    Generate a cryptographically secure 6-digit OTP code valid for 5 minutes.
    Enforces a 60-second cooldown between resends.
    Stores only salted SHA-256 hash in SQLite.
    Returns: (plain_otp, error_message, status_code)
    """
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith("91") and len(clean_phone) > 10:
        clean_phone = clean_phone[2:]

    if len(clean_phone) != 10 or not clean_phone.isdigit():
        return None, "Please provide a valid 10-digit Indian mobile number.", 400

    now = int(time.time())

    conn = get_connection()
    cursor = conn.cursor()

    # Check for active cooldown / resend limit
    cursor.execute("SELECT resend_available_at, expires_at FROM otp_codes WHERE phone = ?", (clean_phone,))
    existing = cursor.fetchone()
    if existing:
        resend_at = existing["resend_available_at"]
        if now < resend_at:
            wait_seconds = resend_at - now
            conn.close()
            return None, f"Please wait {wait_seconds} second(s) before requesting a new verification code.", 429

    # Generate 6-digit cryptographically secure OTP
    otp = "".join(secrets.choice("0123456789") for _ in range(6))
    salt = secrets.token_hex(16)
    otp_hash = hashlib.sha256(f"{salt}:{otp}".encode("utf-8")).hexdigest()

    expires_at = now + 300            # 5 minutes expiry
    resend_available_at = now + 60    # 60 seconds cooldown

    cursor.execute("""
        INSERT INTO otp_codes (phone, otp_hash, salt, attempts, max_attempts, expires_at, resend_available_at, created_at)
        VALUES (?, ?, ?, 0, 5, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(phone) DO UPDATE SET
            otp_hash = excluded.otp_hash,
            salt = excluded.salt,
            attempts = 0,
            max_attempts = 5,
            expires_at = excluded.expires_at,
            resend_available_at = excluded.resend_available_at,
            created_at = CURRENT_TIMESTAMP
    """, (clean_phone, otp_hash, salt, expires_at, resend_available_at))

    conn.commit()
    conn.close()

    return otp, None, 200

def verify_phone_otp(phone: str, submitted_otp: str):
    """
    Verify phone and submitted OTP code with rate-limiting & constant-time hash comparison.
    - No bypass codes or hardcoded OTPs allowed.
    - Enforces 5 maximum attempts.
    - Invalidates code immediately upon success or max attempts exceeded.
    Returns: (user_dict, error_message, status_code)
    """
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith("91") and len(clean_phone) > 10:
        clean_phone = clean_phone[2:]

    code = submitted_otp.strip()
    if not code or len(code) != 6 or not code.isdigit():
        return None, "Verification code must be exactly 6 digits.", 400

    now = int(time.time())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT otp_hash, salt, attempts, max_attempts, expires_at
        FROM otp_codes
        WHERE phone = ?
    """, (clean_phone,))
    record = cursor.fetchone()

    if not record:
        conn.close()
        return None, "No active verification code found for this phone number. Please request a new one.", 400

    stored_hash = record["otp_hash"]
    salt = record["salt"]
    attempts = record["attempts"]
    max_attempts = record["max_attempts"]
    expires_at = record["expires_at"]

    # 1. Check expiration
    if now > expires_at:
        cursor.execute("DELETE FROM otp_codes WHERE phone = ?", (clean_phone,))
        conn.commit()
        conn.close()
        return None, "Verification code has expired. Please request a new one.", 400

    # 2. Check previous failed attempts
    if attempts >= max_attempts:
        cursor.execute("DELETE FROM otp_codes WHERE phone = ?", (clean_phone,))
        conn.commit()
        conn.close()
        return None, "Maximum verification attempts exceeded. For security, please request a new code.", 429

    # 3. Constant-time hash comparison (NO bypasses!)
    candidate_hash = hashlib.sha256(f"{salt}:{code}".encode("utf-8")).hexdigest()
    is_valid = secrets.compare_digest(stored_hash, candidate_hash)

    if not is_valid:
        new_attempts = attempts + 1
        remaining = max_attempts - new_attempts
        if remaining <= 0:
            cursor.execute("DELETE FROM otp_codes WHERE phone = ?", (clean_phone,))
            conn.commit()
            conn.close()
            return None, "Maximum verification attempts exceeded. For security, this code has been invalidated. Please request a new code.", 429
        else:
            cursor.execute("UPDATE otp_codes SET attempts = ? WHERE phone = ?", (new_attempts, clean_phone))
            conn.commit()
            conn.close()
            return None, f"Invalid verification code. {remaining} attempt(s) remaining.", 400

    # 4. Success: Invalidate used OTP immediately
    cursor.execute("DELETE FROM otp_codes WHERE phone = ?", (clean_phone,))

    # Retrieve or create user record
    cursor.execute("SELECT * FROM users WHERE phone = ?", (clean_phone,))
    user = cursor.fetchone()

    if not user:
        cursor.execute("""
            INSERT INTO users (phone, name, email, city, state)
            VALUES (?, ?, ?, ?, ?)
        """, (clean_phone, "Citizen", f"user_{clean_phone[-4:]}@meyyurai.org", "Chennai", "Tamil Nadu"))
        user_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
    else:
        conn.commit()

    user_dict = dict(user)
    conn.close()
    return user_dict, None, 200

def get_user_by_id(user_id: int):
    """Fetch user by primary key."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_phone(phone: str):
    """Fetch user by phone number."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+91"):
        phone = phone[3:]
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE phone = ?", (phone,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_profile(user_id: int, data: dict):
    """Update profile fields for a user."""
    conn = get_connection()
    cursor = conn.cursor()

    name = data.get("name")
    email = data.get("email")
    city = data.get("city")
    state = data.get("state")
    blood_group = data.get("blood_group")
    medical_notes = data.get("medical_notes")

    cursor.execute("""
        UPDATE users
        SET name = COALESCE(?, name),
            email = COALESCE(?, email),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            blood_group = COALESCE(?, blood_group),
            medical_notes = COALESCE(?, medical_notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (name, email, city, state, blood_group, medical_notes, user_id))

    conn.commit()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    updated = cursor.fetchone()
    conn.close()
    return dict(updated) if updated else None

def get_emergency_contacts(user_id: int):
    """Fetch all emergency contacts for a given user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM emergency_contacts
        WHERE user_id = ?
        ORDER BY is_primary DESC, id ASC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_emergency_contact(user_id: int, name: str, phone: str, relationship: str, is_primary: bool = False):
    """Add a new emergency contact for the user with phone number and name validation."""
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith("91") and len(clean_phone) > 10:
        clean_phone = clean_phone[2:]

    if not clean_phone or len(clean_phone) != 10 or not clean_phone.isdigit():
        return None, "Contact mobile number must be a valid 10-digit Indian phone number."

    clean_name = name.strip()
    if not clean_name:
        return None, "Contact name cannot be empty."

    clean_rel = relationship.strip() or "Contact"

    conn = get_connection()
    cursor = conn.cursor()

    if is_primary:
        cursor.execute("UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?", (user_id,))

    cursor.execute("""
        INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, is_primary)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, clean_name, clean_phone, clean_rel, 1 if is_primary else 0))

    contact_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM emergency_contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None, None


def update_emergency_contact(user_id: int, contact_id: int, name: str, phone: str, relationship: str, is_primary: bool = False):
    """Update an existing emergency contact strictly for the authenticated user."""
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith("91") and len(clean_phone) > 10:
        clean_phone = clean_phone[2:]

    if not clean_phone or len(clean_phone) != 10 or not clean_phone.isdigit():
        return None, "Contact mobile number must be a valid 10-digit Indian phone number."

    clean_name = name.strip()
    if not clean_name:
        return None, "Contact name cannot be empty."

    clean_rel = relationship.strip() or "Contact"

    conn = get_connection()
    cursor = conn.cursor()

    if is_primary:
        cursor.execute("UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?", (user_id,))

    cursor.execute("""
        UPDATE emergency_contacts
        SET contact_name = ?, contact_phone = ?, relationship = ?, is_primary = ?
        WHERE id = ? AND user_id = ?
    """, (clean_name, clean_phone, clean_rel, 1 if is_primary else 0, contact_id, user_id))

    updated = cursor.rowcount > 0
    conn.commit()
    if not updated:
        conn.close()
        return None, "Contact not found or unauthorized."

    cursor.execute("SELECT * FROM emergency_contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None, None


def delete_emergency_contact(user_id: int, contact_id: int):
    """Remove an emergency contact strictly belonging to the authenticated user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?", (contact_id, user_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def log_emergency_sos(user_id: Optional[int], latitude: Optional[float], longitude: Optional[float], address: str, contacts_alerted: str, status: str = 'dispatched'):
    """Log an SOS trigger event in the database, with a 5-second debounce check to prevent duplicates."""
    conn = get_connection()
    cursor = conn.cursor()

    # Debounce check: if this user triggered an SOS in the last 5 seconds, return that active record
    if user_id:
        cursor.execute("""
            SELECT id FROM emergency_sos_logs
            WHERE user_id = ? AND status = 'dispatched'
            AND (strftime('%s', 'now') - strftime('%s', created_at)) < 5
            ORDER BY id DESC LIMIT 1
        """, (user_id,))
        recent = cursor.fetchone()
        if recent:
            conn.close()
            return recent["id"]

    cursor.execute("""
        INSERT INTO emergency_sos_logs (user_id, latitude, longitude, address, contacts_alerted, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, latitude, longitude, address, contacts_alerted, status))
    sos_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return sos_id


def cancel_emergency_sos(sos_id: int, user_id: Optional[int] = None):
    """Cancel an active SOS record with user ownership check when user_id is provided."""
    conn = get_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("""
            UPDATE emergency_sos_logs
            SET status = 'cancelled'
            WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        """, (sos_id, user_id))
    else:
        cursor.execute("""
            UPDATE emergency_sos_logs
            SET status = 'cancelled'
            WHERE id = ?
        """, (sos_id,))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated

# Initialize tables when imported
init_db()
