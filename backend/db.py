import sqlite3
import os
import random
import time
from pathlib import Path
from datetime import datetime

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

    # OTP codes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otp_codes (
            phone TEXT PRIMARY KEY,
            otp TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
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

def generate_otp_for_phone(phone: str) -> str:
    """Generate a 6-digit OTP code valid for 5 minutes."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+91"):
        phone = phone[3:]
    
    # 6-digit random code
    otp = str(random.randint(100000, 999999))
    expires_at = int(time.time()) + 300  # 5 minutes expiry

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO otp_codes (phone, otp, expires_at, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(phone) DO UPDATE SET
            otp = excluded.otp,
            expires_at = excluded.expires_at,
            created_at = CURRENT_TIMESTAMP
    """, (phone, otp, expires_at))
    conn.commit()
    conn.close()

    return otp

def verify_phone_otp(phone: str, otp: str):
    """Verify phone and OTP code. If valid, retrieve or create user."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+91"):
        phone = phone[3:]
    otp = otp.strip()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT otp, expires_at FROM otp_codes WHERE phone = ?", (phone,))
    record = cursor.fetchone()

    if not record:
        conn.close()
        return None, "No OTP requested for this phone number."

    stored_otp = record["otp"]
    expires_at = record["expires_at"]

    if int(time.time()) > expires_at:
        conn.close()
        return None, "OTP has expired. Please request a new one."

    # Allow testing OTP 123456 or match stored
    if otp != stored_otp and otp != "123456":
        conn.close()
        return None, "Invalid OTP code. Please enter the correct code."

    # Remove used OTP
    cursor.execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))

    # Check if user already exists
    cursor.execute("SELECT * FROM users WHERE phone = ?", (phone,))
    user = cursor.fetchone()

    if not user:
        cursor.execute("""
            INSERT INTO users (phone, name, email, city, state)
            VALUES (?, ?, ?, ?, ?)
        """, (phone, "Citizen", f"user_{phone[-4:]}@meyyurai.org", "Chennai", "Tamil Nadu"))
        user_id = cursor.lastrowid

        # Insert default sample emergency contacts for instant emergency demonstration
        cursor.execute("""
            INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, is_primary)
            VALUES (?, ?, ?, ?, 1)
        """, (user_id, "Mother / Family Guardian", "9840123456", "Parent",))
        cursor.execute("""
            INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, is_primary)
            VALUES (?, ?, ?, ?, 0)
        """, (user_id, "Trusted Friend / Advocate", "9840987654", "Friend",))

        conn.commit()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
    else:
        conn.commit()

    user_dict = dict(user)
    conn.close()
    return user_dict, None

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
    """Add a new emergency contact for the user."""
    conn = get_connection()
    cursor = conn.cursor()

    if is_primary:
        cursor.execute("UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?", (user_id,))

    cursor.execute("""
        INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, is_primary)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, name.strip(), phone.strip(), relationship.strip(), 1 if is_primary else 0))

    contact_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM emergency_contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_emergency_contact(user_id: int, contact_id: int):
    """Remove an emergency contact."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?", (contact_id, user_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def log_emergency_sos(user_id: int, latitude: float, longitude: float, address: str, contacts_alerted: str):
    """Log an SOS trigger event in the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO emergency_sos_logs (user_id, latitude, longitude, address, contacts_alerted, status)
        VALUES (?, ?, ?, ?, ?, 'dispatched')
    """, (user_id, latitude, longitude, address, contacts_alerted))
    sos_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return sos_id

def cancel_emergency_sos(sos_id: int):
    """Cancel an active SOS record."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE emergency_sos_logs
        SET status = 'cancelled'
        WHERE id = ?
    """, (sos_id,))
    conn.commit()
    conn.close()
    return True

# Initialize tables when imported
init_db()
