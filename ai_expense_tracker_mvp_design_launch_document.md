# AI Expense Tracker – MVP Design & Launch Document

## 1. Product Goal
Build a cross-platform (iOS + Android) mobile app using Expo that allows users to **log income and expenses via natural language chat**, powered by AI, with a clear path to monetisation and App Store approval.

---

## 2. Target User (MVP)
- Freelancers
- Small business owners
- Solo professionals
- Vendors who prefer chat over forms

Primary pain point: *Manual expense entry is time-consuming and inconsistent.*

---

## 3. MVP Scope (Strict)

### Included
- Chat-based income/expense logging
- AI-assisted parsing with user confirmation
- Monthly summary
- Transaction list
- Subscription-based limits

### Explicitly Excluded
- Bank sync
- Budgets
- Goals
- Multi-currency
- Complex charts
- Team accounts

---

## 4. MVP Screens (6 Screens Only)

### 4.1 Login / Onboarding
**Purpose**: Identity, consent, compliance
- Email + OTP login
- Terms & Privacy consent

---

### 4.2 Home / Chat (Core Screen)
**Purpose**: Primary interaction
- Month selector
- Net balance (income – expense)
- Chat interface
- AI response as confirmation card

Flow:
User message → AI parses → confirmation card → user saves

---

### 4.3 Edit Entry (Modal / Bottom Sheet)
**Purpose**: Human correction & trust
- Type (Income / Expense)
- Amount
- Category
- Date
- Payment mode
- Notes

---

### 4.4 Monthly Summary
**Purpose**: Value demonstration & upsell
- Total income
- Total expense
- Net balance
- Category-wise breakdown
- Export (Pro)

---

### 4.5 Transaction List
**Purpose**: Transparency & control
- Date-grouped list
- Tap to edit

---

### 4.6 Profile / Settings
**Purpose**: Subscription & compliance
- Subscription status
- Upgrade button
- Export data
- Privacy Policy
- Terms of Service
- Delete account
- Logout

---

## 5. AI Expense Parsing Design

The app uses a **hybrid AI parsing strategy** with a **device-first approach**, falling back to cloud AI when needed.

---

### 5.1 Parsing Strategy (Priority Order)

1. **On-device AI (Preferred)**
   - Used on capable devices (modern iOS / Android / supported browsers)
   - Fast, offline-capable, privacy-friendly
   - Handles common expense/income phrasing

2. **Cloud AI (Fallback)**
   - Used when:
     - Device AI is unavailable
     - Confidence is low
     - Complex or ambiguous input
   - Powered by **OpenAI API**

3. **OpenAI Apps Platform (Optional Entry Point)**
   - Users can interact via a **Custom GPT**
   - GPT calls the same backend APIs
   - Uses the same parsing logic and schemas

---

### 5.2 Unified Parsing Rules

Regardless of where parsing happens (device or cloud):
- Output must match the same Zod schema
- No auto-saving
- User confirmation required
- Backend re-validates all AI output

---

### 5.3 Output Schema (Shared)
```
{
  "type": "expense | income | refund | null",
  "amount": number | null,
  "currency": "INR",
  "category": string | null,
  "subcategory": string | null,
  "payment_mode": "cash | upi | card | bank | wallet | unknown | null",
  "date": "YYYY-MM-DD" | null,
  "confidence": number,
  "needs_confirmation": boolean
}
```

---

### 5.2 Output Schema
```
{
  "type": "expense | income | refund | null",
  "amount": number | null,
  "currency": "INR",
  "category": string | null,
  "subcategory": string | null,
  "payment_mode": "cash | upi | card | bank | wallet | unknown | null",
  "date": "YYYY-MM-DD" | null,
  "confidence": number,
  "needs_confirmation": boolean
}
```

---

### 5.3 Key AI Rules
- Amount and type are mandatory; otherwise ask for clarification
- Default date = today
- Category inferred from keywords
- Confidence decreases with inference

---

## 6. Tech Stack

### 6.1 Frontend Architecture (Unified)

A **shared Next.js + Expo architecture** is used to support **Web + Mobile** from a single codebase.

- **Next.js (App Router)** – Web frontend
- **Expo (React Native)** – iOS & Android apps
- **Expo Router** – Shared routing patterns
- **TypeScript** – End-to-end type safety

Monorepo setup allows sharing:
- UI components
- Business logic
- API types

---

### 6.2 UI & Design System

#### Web
- **shadcn/ui** (Radix-based)
- Tailwind CSS
- Modern, minimal, accessible UI

#### Mobile
- **NativeWind** (Tailwind for React Native)
- Custom RN components aligned with shadcn tokens

Design principles:
- Clean typography
- Minimal color palette
- Form-less, chat-first UX

---

### 6.3 Data & State Management

- **tRPC** – End-to-end type-safe APIs
- **TanStack Query** – Server state & caching
- **Zustand** – Local UI/auth state
- **AsyncStorage** (mobile) – Temporary chat cache

---

### 6.4 Backend

- **Next.js Route Handlers** (or separate Node service)
- **tRPC** for API layer
- **PostgreSQL**
- **Drizzle ORM** (type-safe, SQL-first)

Core tables:
- users
- sessions
- transactions
- ai_logs
- subscriptions

Zod schemas act as the source of truth for:
- API inputs
- API outputs
- AI-parsed payloads

---

### 6.5 AI Layer

- **OpenAI API**
- Single tRPC procedure: `parseTransaction`
- Stateless AI execution
- All validation enforced server-side

---

### 6.6 Auth, Validation & Payments

#### Authentication
- **BetterAuth** (primary)
- Supported login methods:
  - Google
  - Apple
  - Email + OTP / magic link
- Unified identity across:
  - Web app
  - Mobile apps
  - OpenAI Apps Platform (via backend tokens)
- No anonymous users (App Store compliant)

#### Validation
- **Zod**
  - Request/response validation
  - AI output validation before persistence
  - Shared schemas between frontend and backend

#### Subscriptions
- **RevenueCat**
  - Unified iOS + Android subscription handling
  - Web uses feature flags synced from backend

---

### 6.7 Hosting & Infrastructure

- **Web**: Vercel
- **API / tRPC**: Vercel or Fly.io
- **Database**: Neon / Supabase Postgres
- **Secrets**: Environment variables only

---

### 6.2 Backend
- Node.js + NestJS
- PostgreSQL
- Prisma ORM

Tables:
- users
- transactions
- ai_logs
- subscriptions

---

### 6.3 AI Layer
- OpenAI API
- Single endpoint: `/parse-transaction`
- Stateless AI, server-enforced rules

---

### 6.4 Auth & Hosting
- Auth: Clerk or Supabase Auth
- API Hosting: Fly.io / Render / Railway
- DB: Neon / Supabase Postgres

---

## 7. Monetisation Model

### Free Tier
- 30–50 entries per month

### Pro Tier
- Unlimited entries
- Export (PDF / Excel)
- Yearly summary

Pricing (India):
- ₹99–149 / month
- ₹999 / year

---

## 8. App Store & Play Store Approval Checklist

### 8.1 Apple App Store

Required:
- Login
- Working core feature
- Privacy Policy & Terms inside app
- Delete account option
- Subscription disclosures

AI Compliance:
- No auto-saving AI output
- User confirmation required
- Clear AI disclaimer

Common Rejection Causes:
- App too simple
- Missing delete account
- Broken login during review

---

### 8.2 Google Play Store

Required:
- Privacy Policy URL
- Data Safety form
- Honest AI & financial data declaration

Avoid:
- Unused permissions
- Background mic access

---

## 9. Security & Compliance
- HTTPS only
- Rate limiting on AI endpoints
- No sensitive data in logs
- GDPR-style delete account

---

## 10. Recommended Build Order

1. Backend + AI parser
2. Chat + confirmation flow
3. Transactions & summary
4. Subscription gating
5. Privacy & delete account
6. Store listings

---

## 11. Voice Input (MVP+)

### 11.1 Voice Capture

#### Mobile
- **expo-av** or **expo-speech** (capture only)
- Push-to-talk button in chat input
- Permission requested at time of use only

#### Web
- Browser MediaRecorder API

---

### 11.2 Speech-to-Text

Speech-to-text is handled **entirely using native platform APIs**, not server-side AI transcription.

#### Mobile (Expo)
- Uses **native OS speech recognition APIs** via Expo-supported libraries
- Audio is transcribed **on-device**
- Only the resulting text is sent to the backend

#### Web
- Uses **Web Speech API** (browser-native)
- Transcription happens locally in the browser

Rules:
- No raw audio is sent to the server
- No audio is stored
- Only transcribed text enters the AI parsing pipeline

This significantly reduces:
- AI costs
- Latency
- Privacy concerns

---

### 11.3 App Store & Play Store Compliance (Voice)

- Clear microphone permission explanation
- No background recording
- No audio storage
- Voice is optional, not mandatory

---

## 12. Future Extensions (Post-MVP)

- Voice input improvements
- GST tagging & reports
- Domain-specific variants
- Custom GPT using the same backend

