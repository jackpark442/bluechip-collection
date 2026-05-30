# Garage OS — Premium Vehicle Collection Management

A production-ready fleet management platform for serious collectors. Built with Next.js 14, Tailwind CSS, and Supabase. Features automatic MOT data import via the official DVSA MOT History API.

---

## Features

- **Secure authentication** — Supabase Auth with email/password
- **Fleet dashboard** — stats, compliance overview, recent activity
- **Full vehicle profiles** — specs, photos, notes, financial history
- **DVSA MOT integration** — auto-import MOT records by registration number
- **MOT tracking** — full test history, advisories, failures, certificate numbers
- **Insurance management** — policy tracking with renewal reminders
- **Vehicle tax tracking** — with historic vehicle exemption support
- **Maintenance logs** — full service history with cost tracking
- **Document storage** — categorised uploads to Supabase Storage (PDFs, images)
- **Image galleries** — drag-and-drop photo management with cover selection
- **Reminders system** — auto-generated from MOT/insurance/tax records, snooze/complete
- **Valuation dashboard** — collection value, gains/losses, by-category breakdown
- **Universal search** — vehicles, service records, documents in one place
- **Mobile responsive** — works on all screen sizes

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| Storage | Supabase Storage |
| MOT Data | DVSA MOT History API (official gov.uk) |
| Charts | Recharts |
| File uploads | react-dropzone |
| Fonts | Playfair Display + DM Sans |

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd garage-os
npm install
```

### 2. Supabase project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase-schema.sql`
3. Go to **Storage** and create two buckets:
   - `vehicle-images` — set to **Public**
   - `vehicle-documents` — set to **Private**
4. Run the storage policy SQL (commented at the bottom of `supabase-schema.sql`) in the SQL Editor

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL and keys from your project's **Settings → API** page.

### 4. DVSA MOT History API (optional but recommended)

The MOT auto-import feature uses the official [DVSA MOT History API](https://documentation.history.mot.api.gov.uk/).

**To register:**
1. Visit https://documentation.history.mot.api.gov.uk/mot-history-api/register
2. Fill in the application form (free for approved trade/fleet purposes)
3. DVSA will email you: Client ID, Client Secret, API Key, Token URL (with tenantId), and Scope

**Add to `.env.local`:**
```env
DVSA_CLIENT_ID=your_client_id
DVSA_CLIENT_SECRET=your_client_secret
DVSA_API_KEY=your_api_key
DVSA_TOKEN_URL=https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
DVSA_SCOPE=https://tapi.dvsa.gov.uk/.default
```

**What it does:**
- Looks up any UK registration and returns the full MOT test history
- Auto-fills vehicle colour, fuel type, and engine size if not already recorded
- Imports the latest MOT expiry date, mileage, advisories, and fail reasons
- Access tokens are cached server-side for 60 minutes to avoid rate limits
- Client secrets expire every 2 years — DVSA emails you reminders at 30 and 14 days

**Without DVSA credentials**, all features work normally — MOT records are just entered manually.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/mot/lookup?reg=AB12CDE` | Look up MOT data from DVSA (no DB write) |
| `POST` | `/api/mot/sync` | Fetch from DVSA and save to mot_records |
| `GET/POST` | `/api/vehicles` | List or create vehicles |
| `GET/PATCH/DELETE` | `/api/vehicles/[id]` | Single vehicle CRUD |
| `POST` | `/api/documents/upload` | Upload document to Supabase Storage |
| `POST/DELETE` | `/api/images/upload` | Upload or delete vehicle image |

---

## Database

All tables use Row Level Security — users can only access their own data. Key tables:

- `vehicles` — core vehicle records
- `vehicle_images` — photos stored in Supabase Storage
- `mot_records` — MOT test history
- `insurance_policies` — insurance policies
- `vehicle_tax` — road tax / VED records
- `maintenance_records` — service history
- `documents` — uploaded files metadata
- `reminders` — auto-generated and manual reminders
- `valuations` — historical value snapshots

The `fleet_overview` view joins all compliance tables for efficient dashboard queries.

Database triggers automatically create/update reminders whenever MOT, insurance, or tax records are added.

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

### Self-hosted

```bash
npm run build
npm start
```

---

## DVSA API Notes

- **Rate limits:** 500 requests/hour for registration lookups (per DVSA documentation)
- **Data coverage:** Great Britain and Northern Ireland registered vehicles
- **Historic vehicles:** Pre-1960 vehicles may have limited MOT history
- **Token expiry:** Access tokens are valid for 60 minutes and cached server-side
- **Secret expiry:** Client secrets expire every 2 years — rotate via `/credentials` endpoint or DVSA support

---

## Project Structure

```
garage-os/
├── app/
│   ├── api/
│   │   ├── mot/lookup/      # DVSA lookup endpoint
│   │   ├── mot/sync/        # DVSA sync + DB write
│   │   ├── vehicles/        # Vehicle CRUD
│   │   ├── documents/       # Document upload
│   │   └── images/          # Image upload
│   ├── auth/login/
│   ├── auth/register/
│   ├── dashboard/
│   ├── vehicles/
│   │   ├── new/
│   │   └── [id]/
│   ├── reminders/
│   ├── valuation/
│   ├── search/
│   └── settings/
├── components/
│   ├── layout/              # Sidebar, Header, AppLayout
│   ├── dashboard/           # DashboardClient
│   ├── vehicles/            # FleetClient, VehicleProfile, VehicleForm
│   │   └── modals/          # Add MOT/Insurance/Tax/Maintenance/Document
│   ├── RemindersClient.tsx
│   ├── ValuationClient.tsx
│   ├── SearchClient.tsx
│   └── SettingsClient.tsx
├── lib/
│   ├── supabase/            # client.ts, server.ts
│   ├── dvsa-mot.ts          # DVSA API integration
│   └── utils.ts
├── types/index.ts
├── supabase-schema.sql
└── middleware.ts
```
