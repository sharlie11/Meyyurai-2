# Meyyurai REST API Reference

Meyyurai backend exposes a secure, rate-limited REST API integrated with Supabase Authentication. It is modularly implemented using TanStack Start Server Routes.

---

## Global API Rules

1.  **Base URL**: `/api`
2.  **CORS**: Enabled for all endpoints. Returns appropriate pre-flight headers (`Access-Control-Allow-Origin: *`).
3.  **Content-Type**: `application/json` (except for binary files upload endpoints, which support `multipart/form-data`).
4.  **Authentication**: Requests to protected endpoints must supply a JWT bearer token in the `Authorization` header:
    ```http
    Authorization: Bearer <your_jwt_access_token>
    ```
5.  **Rate Limiting**: Limited to **120 requests per minute** per client IP. Exceeding this limit returns HTTP `429 Too Many Requests`.

---

## Error Responses

All error endpoints return a standard error format:

```json
{
  "error": "Error message description details"
}
```

Common status codes:

- `200 OK` / `210 Custom Code` - Success.
- `400 Bad Request` - Missing parameters, validation failure.
- `401 Unauthorized` - Token missing, expired, or invalid.
- `403 Forbidden` - User lacks role permissions (e.g. non-admin attempting admin routes).
- `404 Not Found` - Endpoint or DB row not found.
- `429 Too Many Requests` - IP Rate limit hit.
- `500 Internal Server Error` - Database or execution failure.

---

## API Endpoints Index

### 1. User Authentication

#### POST `/api/auth/signup`

Creates a user account on Supabase. Mirrors the user into `public.users` and `public.profiles`.

- **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123",
    "full_name": "Jane Doe",
    "phone": "+919876543210"
  }
  ```
- **Response (200)**:
  ```json
  {
    "message": "Registration successful",
    "user": { "id": "uuid", "email": "user@example.com" },
    "session": { "access_token": "...", "refresh_token": "..." }
  }
  ```

#### POST `/api/auth/login`

Authenticates user using email and password. Returns session details.

- **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (200)**:
  ```json
  {
    "message": "Login successful",
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 3600
    },
    "user": { "id": "uuid", "email": "user@example.com" }
  }
  ```

#### POST `/api/auth/forgot-password`

Triggers email recovery link.

- **Payload**:
  ```json
  { "email": "user@example.com" }
  ```
- **Response (200)**:
  ```json
  { "message": "Password reset email dispatched" }
  ```

#### POST `/api/auth/phone-otp`

Dispatches SMS OTP sign-in verification code.

- **Payload**:
  ```json
  { "phone": "+919876543210" }
  ```
- **Response (200)**:
  ```json
  { "message": "OTP SMS code dispatched successfully" }
  ```

#### POST `/api/auth/verify-otp`

Verifies OTP code and authenticates session.

- **Payload**:
  ```json
  {
    "phone": "+919876543210",
    "token": "123456"
  }
  ```
- **Response (200)**: Returns user record and session JWT tokens.

---

### 2. User & Profiles

#### GET `/api/users/me` [Protected]

Retrieves authenticated user metadata.

- **Response (200)**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone_number": "+919876543210",
      "created_at": "timestamp",
      "last_active_at": "timestamp"
    }
  }
  ```

#### DELETE `/api/users/me` [Protected]

Performs full account deletion. Deletes record from Supabase Auth (cascading public profiles, contacts, and logs).

- **Response (200)**:
  ```json
  { "message": "Account deleted successfully" }
  ```

#### GET `/api/profiles/me` [Protected]

Retrieves home state, preferred language, and onboarding status.

- **Response (200)**:
  ```json
  {
    "profile": {
      "id": "uuid",
      "full_name": "Jane Doe",
      "avatar_url": "https://...",
      "preferred_language": "en",
      "country": "India",
      "state": "Karnataka",
      "city": "Bengaluru",
      "onboarded": true
    }
  }
  ```

#### PUT `/api/profiles/me` [Protected]

Updates profile fields.

- **Payload**: Any profile fields to update.
- **Response (200)**: Returns modified profile JSON.

---

### 3. Emergency & Trusted Contacts

#### GET `/api/contacts` [Protected]

Retrieves emergency contacts and trusted contacts. Automatically decrypts fields in DB.

- **Response (200)**:
  ```json
  {
    "emergency_contacts": [
      {
        "id": "uuid",
        "name": "Father Doe",
        "relationship": "Father",
        "phone": "+919999988888",
        "alternate_phone": null,
        "email": "father@example.com",
        "priority_order": 1,
        "is_primary": true
      }
    ],
    "trusted_contacts": [
      {
        "id": "uuid",
        "name": "Lawyer Friend",
        "phone": "+918888877777",
        "email": null,
        "status": "accepted",
        "priority_order": 1
      }
    ]
  }
  ```

#### POST `/api/contacts` [Protected]

Registers emergency or trusted contact. Encrypts fields.

- **Payload**:
  ```json
  {
    "type": "emergency", // or "trusted"
    "name": "Mother Doe",
    "relationship": "Mother", // emergency only
    "phone": "+919999977777",
    "alternate_phone": null,
    "email": "mother@example.com",
    "priority_order": 2,
    "is_primary": false
  }
  ```
- **Response (210)**:
  ```json
  {
    "message": "Emergency contact added",
    "id": "uuid"
  }
  ```

#### PUT `/api/contacts/<contact_id>` [Protected]

Modifies contact fields. Encrypts updated values.

- **Response (200)**: `{ "message": "Emergency contact updated" }`

#### DELETE `/api/contacts/<contact_id>` [Protected]

Removes contact record.

- **Response (200)**: `{ "message": "Contact deleted successfully" }`

#### PUT `/api/contacts/<contact_id>/primary` [Protected]

Marks specific contact as primary and resets others to false.

- **Response (200)**: `{ "message": "Contact marked as primary emergency contact" }`

---

### 4. SOS System & Location Tracking

#### POST `/api/sos` [Protected]

Fires SOS trigger. Creates incident record, sends automated warnings to emergency contacts.

- **Payload**:
  ```json
  {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "accuracy": 15.2,
    "device_info": {
      "os": "Android 13",
      "battery": "78%",
      "network": "5G"
    },
    "emergency_type": "SOS",
    "notes": "Emergency assistance requested immediately."
  }
  ```
- **Response (210)**:
  ```json
  {
    "message": "SOS event recorded. Emergency contacts notified.",
    "emergency_id": "uuid",
    "alerts": [
      { "contact_name": "Father Doe", "phone_notified": "+919999988888", "status": "dispatched" }
    ]
  }
  ```

#### GET `/api/sos/history` [Protected]

Returns chronological list of historical SOS incidents logged by user.

- **Response (200)**: List of emergency event logs.

#### POST `/api/tracking/start` [Protected]

Starts a location sharing session.

- **Payload (Optional)**: `{ "session_id": "optional-uuid" }`
- **Response (200)**: `{ "session_id": "uuid", "message": "Live tracking session active" }`

#### POST `/api/tracking/stop` [Protected]

Stops the tracking session.

- **Payload**: `{ "session_id": "uuid" }`
- **Response (200)**: `{ "message": "Live tracking session terminated" }`

#### POST `/api/tracking/log` [Protected]

Feeds GPS breadcrumbs coordinates.

- **Payload**:
  ```json
  {
    "session_id": "uuid",
    "latitude": 12.972,
    "longitude": 77.595,
    "accuracy": 5.0
  }
  ```
- **Response (200)**: `{ "success": true }`

---

### 5. AI Assistant & Voice Support

#### POST `/api/ai/chat` [Protected]

Interacts with the AI Rights & Safety advisor. Performs urgency checks.

- **Payload**:
  ```json
  {
    "question": "My husband locks me in the house and took my ID cards, what can I do?",
    "language": "en"
  }
  ```
- **Response (200)**:
  ```json
  {
    "conversation_id": "uuid",
    "answer": "WARNING: Critical situation detected. We recommend calling emergency services (112) or women helpline (1091) immediately...",
    "urgency_level": "HIGH",
    "urgency_detected": true,
    "actions_recommended": [
      "Call 112 immediately",
      "Contact family protection cell",
      "Alert primary contact"
    ]
  }
  ```

#### GET `/api/ai/history` [Protected]

Retrieves historical questions/responses of user.

#### POST `/api/voice/upload` [Protected]

Uploads a voice recording and simulates transcription. Supports binary form-data or JSON url linking.

- **Form-Data Payload**: `file` - binary audio recording file.
- **Response (210)**:
  ```json
  {
    "message": "Voice note uploaded & transcribed",
    "voice_note": {
      "id": "uuid",
      "audio_url": "https://.../voice_notes/userId/file.mp3",
      "transcript": "Simulated transcript: Help needed...",
      "duration_seconds": 10
    }
  }
  ```

---

### 6. Evidence & Uploads

#### POST `/api/uploads` [Protected]

Uploads photos/documents evidence and logs automatic security scanning results.

- **Form-Data Payload**: `file` - binary file (JPG, PNG, PDF, DOCX).
- **Response (210)**:
  ```json
  {
    "message": "File uploaded and analyzed",
    "file": {
      "id": "uuid",
      "file_name": "evidence.png",
      "file_path": "https://...",
      "file_type": "image/png",
      "file_size": 102400
    },
    "analysis": {
      "malware_check": "CLEAN",
      "ocr_summary": "Scanned file evidence.png. Verified..."
    }
  }
  ```

---

### 7. Rights Education & Resources

#### GET `/api/rights/categories` [Public]

Returns list of rights categories.

- **Response (200)**: Returns categories (Women Rights, Child Rights, Cyber Rights, etc.).

#### GET `/api/rights/articles?category=<slug>` [Public]

Returns legislation documents under category.

- **Response (200)**: List of procedures, emergency numbers, resources.

#### GET `/api/resources?category=<category>&q=<search>&lat=<lat>&lng=<lng>` [Public]

Searches nearby assistance entities sorted by proximity (Haversine distance) if lat/lng are supplied.

- **Response (200)**:
  ```json
  {
    "resources": [
      {
        "name": "Central Police Station",
        "category": "Police",
        "address": "Main Road",
        "contact_number": "100",
        "distance_km": 0.8
      }
    ]
  }
  ```

---

### 8. Admin Panel Dashboard

#### GET `/api/admin/metrics` [Admin Protected]

Aggregates dashboard stats metrics.

- **Response (200)**:
  ```json
  {
    "metrics": {
      "total_users": 1500,
      "active_users_24h": 432,
      "emergency_events": 45,
      "ai_requests": 3450,
      "file_uploads": 234
    }
  }
  ```
