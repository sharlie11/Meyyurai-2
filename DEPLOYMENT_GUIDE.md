# Meyyurai Backend Deployment Guide

This guide details the steps required to initialize the Meyyurai database schema, configure storage, set up authentication providers, and deploy the backend APIs.

---

## 1. Supabase Initialization

Meyyurai utilizes **Supabase** (built on PostgreSQL) for database storage, authentication, and file hosting.

### 1.1 Database Schema Application

You can run the SQL schema migration onto your Supabase project in two ways:

#### Option A: Supabase Dashboard SQL Editor (Quickest)

1.  Log in to the [Supabase Dashboard](https://supabase.com).
2.  Open your project and navigate to the **SQL Editor** tab in the sidebar.
3.  Click **New Query** and copy the contents of [21_meyyurai_backend.sql](file:///c:/Users/sharlie/Documents/Meyyurai%20Frontend/supabase/migration/21_meyyurai_backend.sql).
4.  Click **Run** to execute. This will:
    - Enable the `pgcrypto` extension.
    - Create all 16 tables and optimized indexes.
    - Define PostgreSQL auth-synchronization triggers.
    - Set up pgCrypto encryption functions and RPC routines.
    - Enable Row Level Security (RLS) policies.
    - Insert default Categories, articles, and sample nearby resources.

#### Option B: Supabase CLI (Recommended for CI/CD)

If you have Supabase CLI installed, link your project and apply the migrations:

```bash
# Login and link project
supabase login
supabase link --project-ref your_project_ref_id

# Apply migrations
supabase db push
```

---

## 2. Authentication Providers Configuration

Configure authentication in your Supabase dashboard under **Project Settings** -> **Authentication** -> **Providers**.

### 2.1 Email/Password Configuration

- Ensure **Email Provider** is enabled.
- Configure **Confirm Email** to true/false depending on whether you want to require email verification link checks.
- Secure token settings: Set JWT Expiry to `3600` seconds (1 hour).

### 2.2 Google Authentication

1.  Go to the [Google Cloud Console](https://console.cloud.google.com).
2.  Create an OAuth 2.0 Client ID (Web Application category).
3.  Add the Authorized Redirect URI provided by Supabase:
    `https://<your-project-ref>.supabase.co/auth/v1/callback`
4.  In the Supabase console, enable Google Provider and paste the Client ID and Client Secret.

### 2.3 Apple Authentication

1.  Navigate to the [Apple Developer Portal](https://developer.apple.com).
2.  Register an App ID, enable "Sign In with Apple", and register a Service ID linking to Supabase's redirect URI.
3.  Configure Key, Team ID, and Client Secret in Supabase Auth Settings.

### 2.4 Phone OTP Authentication

1.  Set up an SMS provider connection in Supabase (e.g. Twilio, MessageBird, or Vonage).
2.  Under Phone Provider, toggle **Enable Phone Provider** and configure Twilio Credentials (SID, Auth Token, Sender Number).
3.  Enable **SMS OTP** and configure OTP length (default 6 digits) and expiration (default 10 minutes).

---

## 3. Supabase Storage Buckets

Meyyurai's migration automatically creates the buckets, but ensure they are visible under the **Storage** sidebar tab.

Check list of buckets:

- `images` (Public: Enabled) - Profile photos, incident screenshots.
- `voice_notes` (Public: Enabled) - Recorded voice guides, helpline logs.
- `documents` (Public: Enabled) - Guides, legal templates.
- `evidence` (Public: Disabled) - Encrypted/private files (screenshots, photos, reports). Restricts direct access to anyone except the owner.

_Note: The migration script inserts the buckets into `storage.buckets` and registers security RLS policies on `storage.objects` automatically._

---

## 4. Environment Variables Configuration

Create a `.env` file in your root folder. This file contains private credentials.

```ini
# PUBLIC CONFIGURATION (Exposed to the Vite Client)
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
VITE_SUPABASE_PROJECT_ID="your_project_ref"

# PRIVATE SERVER CONFIGURATION (Server-only Secrets)
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"

# JWT and Admin Bypass Secret (Required for administrative functions)
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# Symmetric encryption key for PII contact numbers (AES-256)
ENCRYPTION_SECRET="meyyurai_custom_prod_encryption_secret_key_2026"
```

> [!CAUTION]
> Never commit your `.env` or `SUPABASE_SERVICE_ROLE_KEY` to public repositories. The service role key bypasses Row Level Security (RLS).

---

## 5. Local Development and Testing

The Meyyurai API router is integrated inside the Vite developer lifecycle.

### 5.1 Installation

Install node dependencies using your package manager:

```bash
bun install
# or
npm install
```

### 5.2 Starting Development Server

Launch the local dev environment:

```bash
bun run dev
# or
npm run dev
```

The server will boot locally (typically at `http://localhost:3000`). All API endpoints are accessible at `http://localhost:3000/api/*`.

---

## 6. Production Deployment

TanStack Start compiles the frontend and backend into a unified Nitro deployment package.

### 6.1 Compile Build Bundles

Compile the bundle:

```bash
bun run build
# or
npm run build
```

This outputs a optimized production bundle inside the `.output/` or `.nitro/` directory depending on your build target.

### 6.2 Cloud Host Deployments

- **Netlify / Vercel**: Automatically detected. Link repository, configure environment variables in dashboard settings, and deploy.
- **Docker / VPS**: Run the server node bundle:
  ```bash
  node .output/server/index.mjs
  ```
