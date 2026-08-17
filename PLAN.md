# FixLens AI — Production Mobile Application Development Plan

> **Status:** Approved implementation blueprint  
> **Platforms:** iOS and Android  
> **Application stack:** Expo SDK 57, React Native 0.86, React 19.2, TypeScript  
> **Last architecture review:** 2026-08-17

## 1. Purpose and implementation rules

This document is the sequential source of truth for building FixLens AI, a public-production mobile application that turns household-problem photos and user-supplied symptoms into cautious, structured diagnoses and guided repair workflows.

The core product loop is:

`Authenticate → onboard → photograph/describe → clarify → assess safety → diagnose → repair safely → save outcome`

Implementation agents must follow these rules:

1. Complete phases in order. A phase is complete only when all of its acceptance criteria and tests pass.
2. Inspect the exact Expo SDK 57 documentation before changing native dependencies or configuration. Do not copy older Expo examples.
3. Treat every household image as private data and every AI response as untrusted input.
4. Never expose OpenAI, RevenueCat secret, Clerk secret, webhook, or other server credentials to the client.
5. Never authorize with a client-provided `userId`. Resolve Clerk identity inside Convex and check resource ownership.
6. Never present an AI assessment as a guaranteed diagnosis, model match, part match, repair cost, or financial outcome.
7. Never generate invasive repair steps for an orange or red safety result.
8. Do not add placeholders, fake buttons, hard-coded account/subscription state, or mock production AI paths.
9. Do not support Expo web in V1. Shared code may remain portable, but product behavior and QA target native iOS and Android only.

### 1.1 Current repository baseline

- The repository is a minimal Expo SDK 57 project using `src/app`, strict TypeScript, Expo Router typed routes, React Compiler, and automatic appearance.
- Existing starter-file deletions and edits are user-owned and must not be reverted as part of implementation.
- Nine reference sheets are present in `/design`; all were reviewed while preparing this plan.
- Node 22 LTS is the project runtime baseline. Add an engine constraint and CI runtime; do not standardize development on experimental Node versions.
- SDK 57 supports React Native 0.86, React 19.2.3, iOS 16.4+, Android 7+, and Android compile/target SDK 36. Verify these values again before store submission.

### 1.2 Design gate

The references are available, so Phase 1 is not blocked. UI implementation is nevertheless gated on a documented design audit. Before building product screens, create:

- an inventory mapping each reference sheet to its represented screens;
- sampled and accessibility-checked semantic colors, not guessed hex values;
- typography, spacing, radius, shadow, icon, image-ratio, and motion tokens;
- reusable primitives demonstrated in a development-only component gallery;
- light and intentionally derived dark themes;
- a short discrepancy log for anything that cannot be reproduced natively.

No product screen may introduce a new visual convention without first adding it to the token/component system.

## 2. Product definition

### 2.1 Vision and goals

FixLens AI should feel like a calm, trustworthy home-repair companion—not a generic chat wrapper or a technician dashboard. It should help users:

- identify an appliance, fixture, visible defect, label, or error code;
- understand observations, likely causes, confidence, severity, and uncertainty;
- decide whether continued use and DIY work are appropriate;
- complete low-risk troubleshooting with tools, parts, prerequisites, and progress tracking;
- preserve appliance, repair, and maintenance history;
- recognize when to stop and contact a licensed professional.

Launch success means the complete 40-screen scope is functional, safety-evaluated, accessible, observable, purchase-ready, and accepted by both stores. Product KPIs are specified as event contracts for future analytics, but V1 sends only reliability telemetry to Sentry and stores billing/AI audit facts in Convex.

### 2.2 Audience

Primary users are homeowners, renters, first-time homeowners, DIY users, and cost-conscious households. Property-manager workflows are future scope. Guidance must use plain language and adapt explanatory detail to Beginner, Comfortable, or Experienced preferences without weakening safety constraints.

### 2.3 Supported V1 subjects

Supported subjects include common household appliances, plumbing fixtures, furniture/cabinet/door/window/wall/ceiling/floor damage, HVAC awareness, household fixtures, control panels, model/serial labels, and appliance error codes. The system must explicitly classify unsupported, insufficient-evidence, and unsafe cases.

Excluded from DIY instructions include gas leaks and gas appliances, exposed mains wiring, electrical panels, burning/smoke/fire conditions, high voltage, refrigerants, structural failure, serious flooding, high-pressure systems, suspected asbestos, and dangerous mold. These cases may receive shutdown/evacuation/emergency guidance and professional escalation, but not disassembly or repair steps.

## 3. Business model and entitlements

| Capability | Free | Pro Monthly | Pro Yearly |
|---|---:|---:|---:|
| Price target | $0 | $7.99/month | $34.99/year |
| Store entitlement | none | `pro` | `pro` |
| Diagnosis allowance | 3 lifetime | 15/UTC month | 15/UTC month |
| Images per diagnosis | up to 3 | up to 3 | up to 3 |
| Clarification rounds | up to 3 | up to 3 | up to 3 |
| AI assistant replies/session | unavailable | 5 | 5 |
| Appliance profiles | 1 | unlimited | unlimited |
| Repair history | unlimited | unlimited | unlimited |
| Detailed steps/tools/parts | basic | full | full |
| Maintenance/reminders | locked | included | included |
| Repair vs replace | locked | included | included |

The yearly package is selected by default and marked **BEST VALUE**. Display localized price strings and billing periods from RevenueCat packages. Marketing copy may show the configured target prices, but purchase controls must not construct localized prices manually.

### 3.1 Usage rules

- A diagnosis is one server-created session concerning one problem, not one image.
- Pro periods are calendar months from 00:00 UTC on day 1. They are independent of store renewal dates.
- Pro use never consumes free lifetime credits. Previous free use remains if Pro expires.
- Atomically reserve a credit immediately before the first full assessment call.
- Consume it only after storing a schema-valid assessment, including a valid safety escalation or supported-scope inconclusive assessment.
- Release it for OpenAI/Convex/system failure, invalid model output after retry exhaustion, or an additional-evidence request.
- Additional images, clarification answers, retries with the same idempotency key, and five allowed Pro follow-ups do not consume another diagnosis.
- A session expires after 24 hours of inactivity before assessment. Expired sessions cannot be revived; unconsumed reservations are released.
- Limits, session expiry, model routing, and assistant caps live in backend configuration, not scattered constants.

## 4. Technical architecture

### 4.1 Selected stack

| Concern | Selection |
|---|---|
| Runtime | Expo SDK 57, React Native 0.86, React 19.2, Node 22 LTS |
| Language | TypeScript strict mode; no untyped external boundaries |
| Navigation | Expo Router with protected route groups and a custom `Tabs` bar |
| Styling | NativeWind plus semantic TypeScript design tokens |
| Server/database/realtime/files | Convex |
| Authentication | Clerk Expo SDK, custom flows, native Apple/Google hooks |
| Forms/validation | React Hook Form and Zod; Convex argument/return validators server-side |
| AI | OpenAI Responses API through Convex actions |
| Purchases | RevenueCat React Native SDK and `pro` entitlement |
| Camera/media | `expo-camera`, `expo-image-picker`, `expo-image-manipulator`, `expo-image` |
| Secure client storage | `expo-secure-store` for Clerk token cache only |
| Notifications | `expo-notifications`, Expo push service, Convex scheduler |
| Connectivity | NetInfo for offline-aware UI |
| Errors/performance | Sentry React Native/Expo integration |
| Tests | Vitest or Jest-compatible Expo preset, React Native Testing Library, Convex test helpers, Maestro |
| Delivery | EAS development/preview/production builds, EAS Submit, controlled OTA updates |

Use Expo development builds from the first native integration milestone. Expo Go is not an acceptance environment for Clerk native sign-in, RevenueCat purchases, push notifications, or production Sentry validation.

### 4.2 Runtime boundaries and data flow

```text
Expo client
  ├─ Clerk session/token cache
  ├─ Expo Router and transient scan/repair reducers
  ├─ Convex authenticated queries/mutations
  ├─ RevenueCat CustomerInfo for responsive purchase UI
  └─ Native camera, image processing, notifications, Sentry
        │
        ▼
Convex
  ├─ Clerk JWT validation and ownership helpers
  ├─ Transactional database and usage ledger
  ├─ Private file upload/read/delete orchestration
  ├─ Internal mutations/actions and scheduled reminders
  ├─ Clerk and RevenueCat authenticated webhooks
  └─ OpenAI actions with schema validation and safety policy
        │
        ├─ OpenAI Responses API
        ├─ RevenueCat REST verification fallback
        └─ Expo push service
```

Convex queries are the canonical remote state. Do not add Redux or a general server-cache library. Use feature-scoped context/reducers only for unsaved camera review, clarification answers, and repair-step navigation. Persist user preferences and durable progress in Convex; keep only secrets/tokens in SecureStore and disposable drafts in local storage.

### 4.3 Repository structure

```text
src/
  app/
    _layout.tsx
    index.tsx
    (public)/welcome.tsx
    (auth)/{sign-in,sign-up,forgot-password,verify-email}.tsx
    (onboarding)/{features,interests,experience,safety}.tsx
    (tabs)/
      _layout.tsx
      home.tsx
      repairs.tsx
      scan.tsx
      my-home.tsx
      profile.tsx
    scan/{camera,review,analyzing,clarify}.tsx
    diagnosis/[sessionId].tsx
    repair/[repairId]/{index,step,assistant,tools,complete}.tsx
    repairs/[repairId].tsx
    appliance/{add,scan,[applianceId]}.tsx
    maintenance/{index,[taskId]}.tsx
    subscription/{paywall,usage,index}.tsx
    settings/{index,notifications}.tsx
    support/help.tsx
    legal/{privacy,terms,ai-safety}.tsx
  components/
    ui/ scan/ diagnosis/ repair/ appliance/ maintenance/ subscription/ states/
  features/
    auth/ onboarding/ diagnoses/ repairs/ appliances/ maintenance/ subscriptions/ notifications/
  providers/
  hooks/
  lib/{clerk,convex,revenuecat,notifications,sentry,telemetry}/
  constants/
  types/
  utils/
  i18n/
convex/
  schema.ts
  auth.config.ts
  http.ts
  lib/{auth,errors,ownership,config,idempotency,safety}/
  users.ts homes.ts appliances.ts diagnoses.ts repairs.ts
  maintenance.ts subscriptions.ts usage.ts notifications.ts
  ai/{actions,prompts,schemas,models,usage}.ts
  webhooks/{clerk,revenuecat}.ts
  crons.ts
assets/
design/
tests/{unit,integration,contracts,fixtures}/
.maestro/
```

Route files orchestrate feature modules and remain thin. UI components never call OpenAI, RevenueCat secret APIs, or unauthenticated private-file URLs.

## 5. Design system implementation

### 5.1 Reference findings

The nine sheets define the primary visual language:

- warm white/off-white surfaces with near-black headings and cool gray supporting text;
- vivid blue primary buttons, selected borders, progress, links, and the elevated Scan control;
- large, bold, compact headings with plain-language supporting copy;
- thin neutral card borders, subtle shadows, generous rounded corners, and roomy vertical rhythm;
- image-led cards with consistent clipping and neutral image backgrounds;
- green safe/success, amber caution/moderate, orange advanced, and red professional-required states;
- numbered/progress repair timelines, checklist rows, selectable tiles, full-width CTAs, and bottom sheets;
- minimal line icons with blue icon tiles; icons are never the sole carrier of meaning;
- a five-item bottom bar with the center Scan action elevated and filled blue.

The screenshots are iOS-framed, but Android must retain their information hierarchy while respecting system back behavior, safe areas, keyboard behavior, and accessibility conventions.

### 5.2 Required tokens and primitives

Define semantic tokens for background, surface, surface-muted, text-primary/secondary, border, primary and pressed/disabled variants, focus, safe/caution/advanced/danger, overlay, and skeleton. Define typography roles, 4-point spacing rhythm, radii, shadows/elevation, icon sizes, tap targets, image ratios, z-index layers, and motion durations/easing.

Build and test these primitives before screens: `Screen`, `Header`, `Text`, `Button`, `IconButton`, `Card`, `ListRow`, `TextField`, `PasswordField`, `ChoiceCard`, `Checkbox`, `Radio`, `Badge`, `Progress`, `Skeleton`, `EmptyState`, `ErrorState`, `PermissionState`, `BottomSheet`, `Dialog`, `Toast`, `ImageCard`, `StatCard`, `SafetyBanner`, and `TabBar`.

Use system fonts unless references reveal a licensed bundled typeface. Respect Dynamic Type; critical copy may wrap rather than truncate. Reduced-motion mode replaces scanning sweeps/celebrations with fades and static progress states.

## 6. Authentication, onboarding, and identity

### 6.1 Route state machine

```text
booting
  ├─ no Clerk session → welcome/auth
  ├─ authenticated + onboarding incomplete → onboarding/features
  └─ authenticated + onboarding complete → tabs/home
```

The welcome screen is the only unauthenticated product introduction. Functional onboarding and all app data require authentication. Root routing waits for both Clerk and Convex auth readiness to avoid flashes or unauthorized queries.

### 6.2 Clerk setup

- Use `<ClerkProvider>` with an Expo SecureStore token cache and `ConvexProviderWithClerk`.
- Configure distinct Clerk instances and issuer domains for development, staging, and production.
- Build custom screens to match `/design`; do not depend on beta prebuilt native auth UI.
- Enable email/password, email verification, password reset, native Apple on iOS, and native Google on both platforms.
- Use development builds and configure bundle/package identifiers, Google credentials, Apple capability, and URL schemes per environment.
- Use immutable Clerk subject as the RevenueCat app user ID and as `users.clerkId`.
- Synchronize create/update/delete via signed Clerk webhooks. Also idempotently ensure the user record after first authenticated Convex connection so webhook delay cannot block onboarding.
- Account deletion requires recent Clerk reverification, displays subscription-cancellation guidance, calls a protected deletion workflow, deletes the Clerk account only after application cleanup is accepted, and is idempotently resumable.

## 7. Convex data model

All user-owned rows include `ownerId: Id<"users">`. Denormalized owner IDs are intentional: they make authorization and indexed cleanup direct. Store timestamps as UTC epoch milliseconds. Every public function declares argument and return validators.

### 7.1 Schema dictionary

| Table | Essential fields | Indexes | Lifecycle/deletion |
|---|---|---|---|
| `users` | `clerkId`, name, email, avatar, onboarding status, interests, DIY level, locale, units, appearance, deletion state | unique `by_clerk_id`, `by_email` | Root owner; purge dependents before final deletion |
| `homes` | owner, name, optional timezone/location label, default flag | `by_owner`, `by_owner_default` | Cascade rooms; appliance rows are deleted or reassigned explicitly |
| `rooms` | owner, home, name, sort order | `by_home`, `by_owner` | Reject deletion until appliances are moved or confirm cascade |
| `appliances` | owner, home/room, name, category, brand/model/serial with confidence/source, image, purchase/warranty dates, notes, status | `by_owner`, `by_room`, `by_home`, `by_owner_category` | Delete image, maintenance, documents, links; repairs remain with nullable appliance snapshot |
| `diagnosisSessions` | owner, appliance optional, status, category, description, error code, clarification count, image count, prompt/schema versions, idempotency key, activity/expiry | `by_owner_updated`, `by_owner_status`, `by_idempotency`, `by_expiry` | Cascade images, results, steps/messages and linked active repair |
| `diagnosisImages` | owner, session, storage ID, purpose, MIME, size, dimensions, checksum, upload state | `by_session`, `by_owner`, `by_checksum` | Delete storage object before/with record cleanup |
| `diagnosisResults` | owner, session, identified item, issue, observations, assumptions, confidence, safety, causes, usage guidance, difficulty/time/cost, professional flag, raw schema version | unique `by_session`, `by_owner_created` | Preserve with diagnosis; never store unvalidated output |
| `repairSteps` | owner, session/result, order, title, instruction, safety note, image/ref, completion requirement | `by_session_order` | Generated only for green/yellow; cascade with session |
| `repairs` | owner, session, appliance optional, status, current step, started/completed dates, outcome, notes, actual cost/time, saved flag | `by_owner_updated`, `by_owner_status`, `by_appliance` | Unlimited history; deletion cascades session if user requests full deletion |
| `aiMessages` | owner, session/repair, role, text, optional image, step context, model/usage ref, created time | `by_repair_created`, `by_session_created` | Maximum five assistant messages for Pro; cascade images/messages |
| `maintenanceTasks` | owner, appliance, title, instructions, tools, cadence, next due, status, reminder state, scheduled function ID | `by_owner_due`, `by_appliance`, `by_status_due` | Cancel schedule on delete/snooze/reschedule |
| `maintenanceHistory` | owner, appliance/task snapshot, completion date, notes | `by_appliance_completed`, `by_owner_completed` | Retained with appliance unless account purge |
| `usageLedger` | owner, session, entitlement class, period key, state, reservation/consume/release time, idempotency key, reason | `by_owner_period_state`, unique `by_idempotency`, unique `by_session` | Immutable transitions; never hard-delete except account purge |
| `aiUsage` | owner, session/message, request type, model/snapshot, image count/detail, input/output/reasoning tokens, estimated cost, latency, status, OpenAI request ID | `by_owner_created`, `by_session`, `by_model_created` | Billing/operations audit; exclude prompt text and image URL |
| `subscriptionState` | owner, RevenueCat ID, entitlement, product, active, will renew, environment, expiry, billing issue, event time, verified time | unique `by_owner`, `by_revenuecat_id` | Webhook-derived cache; never source a secret from client |
| `notificationPreferences` | owner, category booleans, quiet hours, timezone, permission status | unique `by_owner` | Default transactional categories on, promotions off |
| `pushTokens` | owner, Expo token, platform/device ID, environment, last seen, disabled reason | `by_owner`, unique `by_token` | Disable on receipt error; purge on logout/account delete |
| `webhookEvents` | provider, external ID, type, received/processed time, status, error summary | unique `by_provider_external_id`, `by_status` | Idempotency/audit with bounded retention |

Embedded cause/tool/part/result objects are acceptable where they are always loaded with one diagnosis. Use separate tables only for independently mutable or indexed entities. Store appliance snapshots on historical repairs so deleting an appliance does not destroy the meaning of repair history.

### 7.2 Backend function boundaries

- Public queries return only the authenticated owner's data and never return raw storage URLs.
- Public mutations validate ownership, enforce state transitions, and call internal functions for multi-record invariants.
- OpenAI and RevenueCat network access occurs only in actions; actions delegate writes to internal mutations.
- Scheduled work calls internal functions, not client-callable public endpoints.
- HTTP routes are limited to authenticated image delivery and verified Clerk/RevenueCat webhooks.
- Define structured domain errors: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `OFFLINE`, `LIMIT_REACHED`, `ENTITLEMENT_REQUIRED`, `UNSAFE`, `AI_UNAVAILABLE`, and `RETRYABLE`.

## 8. Public contracts and validation

Create these as shared, versioned TypeScript/Zod contracts. Convex validators mirror the external boundary; generated Convex types remain the database authority.

```ts
export type SafetyLevel = "green" | "yellow" | "orange" | "red";
export type ConfidenceLevel = "low" | "medium" | "high";
export type DiagnosisStatus =
  | "draft" | "uploading" | "queued" | "analyzing"
  | "needs_evidence" | "completed" | "failed" | "expired";

export interface EvidenceRequest {
  kind: "photo" | "choice" | "text" | "error_code";
  title: string;
  prompt: string;
  imagePurpose?: "overview" | "problem" | "control_panel" | "model_label";
  choices?: Array<{ id: string; label: string }>;
  skippable: boolean;
}

export interface DiagnosisResultV1 {
  schemaVersion: "1";
  identifiedItem: {
    category: string;
    brand: string | null;
    model: string | null;
    confidence: ConfidenceLevel;
  };
  observations: string[];
  assumptions: string[];
  issue: { title: string; summary: string; confidence: ConfidenceLevel };
  safety: {
    level: SafetyLevel;
    canContinueUsing: boolean | null;
    warning: string;
    immediateActions: string[];
    prohibitedActions: string[];
  };
  causes: Array<{
    rank: number;
    title: string;
    likelihood: ConfidenceLevel;
    explanation: string;
  }>;
  repair: {
    allowed: boolean;
    difficulty: "easy" | "moderate" | "advanced" | "professional";
    estimatedMinutes: { min: number; max: number } | null;
    estimatedCost: { min: number; max: number; currency: string } | null;
    tools: ToolSuggestion[];
    parts: PartSuggestion[];
    prerequisites: string[];
    steps: RepairStepDraft[];
  };
  requiresProfessional: boolean;
  additionalEvidence: EvidenceRequest | null;
  disclaimer: string;
}

export interface PartSuggestion {
  name: string;
  category: string;
  mayBeRequired: boolean;
  compatibility: "unknown" | "possible" | "model_verified";
  compatibilityWarning: string;
}

export interface ToolSuggestion {
  name: string;
  required: boolean;
  substitute: string | null;
  safetyNote: string | null;
}

export interface RepairStepDraft {
  order: number;
  title: string;
  instruction: string;
  safetyNote: string | null;
  stopConditions: string[];
  completionConfirmation: string;
}

export type RepairStatus = "saved" | "active" | "fixed" | "unresolved";

export interface SubscriptionState {
  plan: "free" | "pro";
  entitlement: "pro" | null;
  productId: string | null;
  active: boolean;
  willRenew: boolean | null;
  expiresAt: number | null;
  billingIssueDetectedAt: number | null;
  verifiedAt: number;
}

export interface NotificationPreferences {
  maintenance: boolean;
  repairFollowUps: boolean;
  warranty: boolean;
  productAnnouncements: boolean;
  promotions: boolean;
  quietHours: { start: string; end: string; timezone: string } | null;
}

export interface UserSettings {
  appearance: "system" | "light" | "dark";
  units: "metric" | "imperial";
  locale: "en";
  explanationDetail: "simple" | "standard" | "detailed";
}

export interface UsageSummary {
  plan: "free" | "pro";
  allowance: number;
  consumed: number;
  reserved: number;
  remaining: number;
  period: "lifetime" | "calendar_month_utc";
  resetsAt: number | null;
}

export type TelemetryEvent =
  | { name: "diagnosis_started"; sessionId: string; source: string }
  | { name: "diagnosis_completed"; sessionId: string; safety: SafetyLevel }
  | { name: "diagnosis_failed"; sessionId: string; errorCode: string }
  | { name: "purchase_result"; productId: string; result: "success" | "cancel" | "failure" };
```

Database IDs and timestamps are added to stored/API representations rather than to AI-generated drafts. Never put image bytes/URLs, symptom prose, chat text, email, serial numbers, or full AI prompts in telemetry.

## 9. AI diagnosis architecture

### 9.1 Model routing

Use the OpenAI Responses API. Initial evaluation candidates are:

- `gpt-5.6-luna` for label/error-code extraction, supported-scope classification, concise clarifications, and assistant replies;
- `gpt-5.6-terra` for complete multi-image diagnosis, safety assessment, and repair-plan generation.

These names are configuration defaults, not permanent code constants. The official OpenAI documentation currently lists both as image-input and Structured Outputs capable. Before production, run the evaluation suite, choose reasoning effort per request type, record price metadata, and pin validated snapshots when official snapshots are available. A model/prompt/schema change is a release requiring evaluation—not a dashboard-only casual edit.

### 9.2 Pipeline

1. Authenticate, load the owned session, and reject invalid state or expiry.
2. Check RevenueCat-backed entitlement snapshot, refresh server-side if stale, and calculate usage.
3. Validate image count, types, dimensions, checksums, ownership, description, and clarification caps.
4. Run deterministic hazard keyword/rule precheck on user text and previous context.
5. Run low-cost scope/item/error-code extraction when it can avoid a full call.
6. If evidence is insufficient, store one structured `EvidenceRequest`, release any reservation, and return `needs_evidence`.
7. Atomically reserve a usage credit with a stable idempotency key.
8. Send compressed private images directly from server storage plus minimal relevant context to the full model.
9. Request strict schema output, validate it, normalize bounded values, and reject extra/unexpected fields.
10. Apply the independent server safety policy. It may only raise risk, remove steps, or require a professional; it may never downgrade model risk.
11. Retry a transient provider error with bounded exponential backoff and jitter. Retry one schema failure with a repair instruction; never loop indefinitely.
12. In one internal transaction, store result/allowed steps, consume the reservation, update session state, and record token/cost metadata.
13. On final system failure, mark retryable failure and release reservation. Preserve enough audit data to reconcile without storing private prompt content.

### 9.3 Safety policy

- Green: low-risk DIY steps allowed with normal precautions.
- Yellow: steps allowed only with explicit prerequisites/cautions and stop conditions.
- Orange: no invasive steps; show safe observation/shutdown actions and recommend a qualified professional.
- Red: no repair steps or assistant troubleshooting; show immediate stop, isolation/evacuation/emergency guidance appropriate to the detected hazard.
- The assistant rechecks safety on every turn. A new hazard immediately locks further repair guidance.
- A user's DIY experience and “detailed” preference change vocabulary, not safety level or prohibited actions.
- Output must distinguish visible observations, user-reported symptoms, model assumptions, and uncertain matches.

### 9.4 Assistant context and limits

The Pro assistant receives only the owned diagnosis summary, safety policy, allowed repair steps, current step, prior messages, and optionally one newly attached optimized image. It returns at most five assistant messages per diagnosis. Free users see the paywall rather than a disabled composer. Red results have no composer; orange results allow only a fixed professional-help explanation, not open-ended repair chat.

### 9.5 Evaluation and cost control

- Maintain de-identified/consented fixtures covering supported categories, bad lighting, multiple objects, model labels, error codes, ambiguity, unsupported items, prompt injection in images/text, and all hazard groups.
- Required release metrics: 100% red-hazard recall on the release-blocking set, no invasive orange/red steps, 100% schema validity after permitted retry, no fabricated exact model/part compatibility in adversarial fixtures, and product-approved usefulness on green/yellow cases.
- Track request type, configured model and snapshot, image count/detail, latency, token use, estimated cost, outcome, and OpenAI request ID.
- Resize before upload, send only relevant images, cap output schemas, summarize prior chat, and avoid resending redundant history.

## 10. Camera, image storage, and privacy

- `CameraView` is mounted only while the camera route is focused; only one preview may be active.
- Request camera permission in context with a clear rationale. Denial state offers Settings and gallery fallback.
- Gallery permission is requested only when used. Support HEIC input but normalize AI uploads to JPEG unless PNG is needed for readable labels.
- Up to three images per session, individually classified as overview, problem, control panel, or model label.
- Client processing strips EXIF/location metadata, corrects orientation, creates a display thumbnail, and resizes the AI copy to a configurable long edge (initially 2048 px, JPEG quality 0.8). Validate on real labels before reducing quality.
- Use checksums to prevent accidental duplicate uploads. Do not claim perceptual duplicate detection in V1.
- Upload through a short-lived Convex upload URL issued only after ownership and session-state checks.
- Do not return `ctx.storage.getUrl()` for household photos. Deliver images through an authenticated HTTP action that validates the Clerk token and owner/session relationship on every request. The client fetches with a fresh bearer token into protected app cache for display.
- Convex AI actions read blobs directly from storage. OpenAI credentials and storage identifiers never appear in analytics or logs.
- Delete local capture/cache files after successful upload and when a draft is discarded. Cascade storage deletion on diagnosis/appliance/account deletion; scheduled cleanup removes abandoned uploads.

## 11. RevenueCat and subscriptions

### 11.1 Configuration

- One RevenueCat project with separate Apple/Google apps and sandbox/production controls.
- Products: monthly `$7.99` target and yearly `$34.99` target; both attach to entitlement `pro`.
- Offering `default` contains monthly and yearly packages; yearly is the default selection.
- Configure the SDK only after Clerk authentication using immutable Clerk subject as RevenueCat App User ID. There is no anonymous purchase path, so anonymous-to-identified merging is unnecessary.

### 11.2 Source of truth and synchronization

- RevenueCat remains the purchase/entitlement source of truth.
- CustomerInfo updates client UI immediately but never authorize backend AI by themselves.
- A signed/HMAC RevenueCat webhook writes an idempotent Convex `subscriptionState` snapshot.
- Before paid AI work, accept a fresh active snapshot; if stale, missing, or contradictory, query RevenueCat server-side and update the snapshot.
- Handle active, expired, canceled-but-active-until-expiry, billing issue, grace period, sandbox, product change, refund, and transfer events.
- Purchase completion refreshes CustomerInfo and polls/query-syncs Convex briefly; show a recoverable “activating purchase” state rather than granting unverified backend access.
- Restore works on both platforms. Manage Subscription opens the platform/RevenueCat-supported management destination.
- Deleting FixLens data does not cancel a store subscription; disclose this immediately before deletion.

## 12. Navigation and screen contracts

### 12.1 Navigation map

```text
Root Stack
├─ Splash/route resolver
├─ Public: Welcome
├─ Auth: Sign In, Sign Up, Forgot Password, Email Verification
├─ Onboarding: Features, Repair Interests, DIY Experience, Safety
├─ Tabs: Home | Repairs | Scan | My Home | Profile
├─ Scan modal stack: Camera → Review → Analyzing ↔ Clarification → Diagnosis
├─ Repair stack: Overview → Step/Progress ↔ Assistant/Tools → Completion
├─ Appliance/Maintenance stacks
├─ Subscription stack: Paywall, AI Usage, Subscription
└─ Settings/Help/Legal stacks
```

Back/close behavior must never strand an active camera or corrupt a session. Exiting an unsaved capture confirms discard; exiting an active server session preserves it in Repairs. Deep links to private routes wait for auth and ownership validation, then show Not Found rather than leaking existence.

### 12.2 Required screens

Every screen uses skeletons for initial remote loading, an inline retry for recoverable failures, accessible labels, offline behavior, and a defined empty state where applicable.

| # | Screen/route | Content and actions | Data, gating, and exceptional behavior |
|---:|---|---|---|
| 1 | Splash / `index` | Logo/brand background while restoring session and loading config | Routes to Welcome, Onboarding, or Home; timeout exposes retry, never a blank screen |
| 2 | Welcome | Reference hero, “Fix anything with a photo,” Get Started, existing-account link | Public; both actions enter auth; no anonymous diagnosis |
| 3 | Onboarding—Features | Scan, understand, repair benefit pages with progress | Auth required; resumable; Next/Back |
| 4 | Repair Interests | Multi-select supported categories and Everything | Persist draft and server value; accessible selected state; require at least one |
| 5 | DIY Experience | Beginner, Comfortable, Experienced choice cards | One required choice; changes explanation detail only |
| 6 | Safety | Four risk categories, limitations, required acknowledgment | Continue disabled until acknowledged; store policy version/time |
| 7 | Sign In | Apple, Google, email/password, recovery/sign-up/legal links | Native-provider errors mapped to friendly retry/cancel states |
| 8 | Sign Up | Name, email, password/confirm, terms acceptance, Apple/Google | Validate locally and in Clerk; route unverified email to #10 |
| 9 | Forgot Password | Email request, code/new-password sequence | Prevent account enumeration in copy; resend cooldown |
| 10 | Email Verification | Code, resend, change email, status | Handles expired/invalid code and Clerk pending tasks |
| 11 | Home | Greeting, home selector, scan/describe CTA, usage, stats, recent repairs, maintenance | Auth/onboarding required; honest counts; empty CTAs; offline cached shell only |
| 12 | Scan Camera | Preview, close/help, flash, gallery, category, capture | Camera lifecycle/permission states; prominent frame; inactive when unfocused |
| 13 | Photo Review | Image carousel, Use/Retake/Add, 300-char symptoms, count | Enforce three images, optimize/upload with cancel/retry; duplicate warning |
| 14 | AI Analyzing | Non-percentage stages and animated scan treatment | Stages reflect actual state categories, not fabricated progress; safe cancel/background resume |
| 15 | Additional Evidence | Requested photo/label/error code or structured question | Up to three rounds; no credit consumed; “cannot find it” yields honest inconclusive route |
| 16 | Diagnosis Result | Item/model confidence, issue, safety, continued-use advice, causes, difficulty/time/cost | Safety level includes icon/text; orange/red removes Start Repair; low confidence remains explicit |
| 17 | Repair Overview | Prerequisites, difficulty/time/cost, tools, parts, warnings, ready CTA | Green/yellow only; mandatory prerequisites must be acknowledged |
| 18 | Repair Steps/Progress | Current step, image, instruction, safety note, completion check, previous/next/save | Persist progress transactionally; prevent skipping mandatory safety steps without confirmation |
| 19 | AI Repair Assistant | Diagnosis/step context, suggestions, composer, optional photo | Pro only; five replies; remaining count; safety recheck; no orange/red open chat |
| 20 | Tools & Parts | Required tools, possible parts, compatibility status/warning | No V1 affiliate checkout; external search only if configured and clearly labeled |
| 21 | Repair Completion | Did it fix it, fixed/not yet branches, actual time/cost, save | Not yet offers assistant, rescan, or professional escalation; no forced celebration motion |
| 22 | Repairs | Search; All/Active/Fixed/Saved; image, issue, severity/status/date | Unlimited history all plans; pagination; no-results and no-repairs states |
| 23 | Repair Detail | Images, result, causes, steps, tools/parts, chat summary, notes, cost/outcome | Owner only; run another diagnosis creates a new session, not reuse credit |
| 24 | My Home | Home/room sections, appliance/repair/due stats, add CTA | Free max one appliance; second add invokes paywall; room/home empty states |
| 25 | Add Appliance | Scan appliance, scan label, manual options | Pro gate only when Free already has one profile |
| 26 | Appliance Scanner | Camera/label modes, review, detected fields and confidence | Does not consume diagnosis credit; separate stricter rate limit; manual correction required before save |
| 27 | Appliance Profile | Image/details/age/warranty/room; repair history, maintenance, documents, notes; Diagnose CTA | Owner only; serial masked in list views; delete/move flows |
| 28 | Maintenance | Due-soon summary, upcoming list, all tasks | Pro; Done/Snooze/Reschedule; notification-permission education |
| 29 | Maintenance Detail | Reason, cadence, instructions, tools/time, due date, complete | Pro; completion writes history and calculates next due atomically |
| 30 | Repair vs Replace | Repair/replace ranges, age/history/lifespan factors, recommendation/disclaimer | Pro; estimates are ranges and assumptions; never financial certainty |
| 31 | Paywall | Benefits, yearly/monthly cards, localized prices, CTA, restore, legal/manage | Yearly default/BEST VALUE; purchase loading/cancel/failure/activation states |
| 32 | AI Usage | Remaining/allowance, period/reset, same-session explanation | Free shows lifetime; Pro shows UTC reset in user's locale; reserved work labeled processing |
| 33 | Notifications | Maintenance, follow-up, warranty, product, promotions toggles | System denial does not fake enabled state; promotions default off |
| 34 | Profile | Identity, plan, usage; account/subscription/app/support/legal; logout/delete | PII-safe; destructive actions confirmed; logout clears local private cache |
| 35 | Subscription | Current plan, billing frequency, renewal/expiry/billing issue, manage/restore | RevenueCat state; graceful unavailable state; no unsupported payment-method editor |
| 36 | Settings | System/light/dark, metric/imperial, language-ready, AI detail | English only V1; safety never overridden; sync durable settings |
| 37 | Help Center | Searchable local/remote articles by requested categories, Contact Support | Ship core articles in app for offline access; support channel configured before launch |
| 38 | Privacy Policy | Versioned policy content and external canonical link | Accessible without active subscription; record published version |
| 39 | Terms | Versioned terms and subscription terms | Accessible from auth/paywall/profile |
| 40 | AI Safety Information | Limitations, uncertainty, risk categories, emergency/pro guidance | Accessible from onboarding, results, profile, and assistant |

Legal text must be supplied/reviewed by qualified counsel; engineers must not invent final legal promises.

## 13. Key user flows

### 13.1 First launch

Splash restores Clerk → Welcome → authentication → feature onboarding → interests → DIY level → safety acknowledgment → Home. Returning authenticated users skip completed steps. Onboarding progress resumes at the first incomplete required step.

### 13.2 Diagnosis and clarification

Home/Scan → server eligibility preflight → camera/gallery/description → optimize/upload → review → analysis. The backend either requests one evidence item or completes an assessment. Evidence loops at most three times and remains one session. Usage is visible before starting and after completion.

### 13.3 Unsafe result

Analysis → server policy marks orange/red → result shows explicit risk and safe immediate actions → Start Repair and open chat are absent → professional/emergency guidance and save actions remain. Navigating back cannot reveal previously generated unsafe steps because disallowed steps are never stored.

### 13.4 Repair completion

Green/yellow result → overview/prerequisites → step progress with optional Pro assistant → completion question. Fixed records outcome/time/cost and maintenance suggestion. Not fixed retains active repair and offers remaining safe troubleshooting, rescan as a new diagnosis, or professional help.

### 13.5 Subscription and exhausted allowance

Eligibility returns limit reached → limit sheet → Paywall → select RevenueCat package → purchase → refresh CustomerInfo → wait for verified Convex entitlement → retry original action once. Cancel returns without error. Restore follows the same server-verification step.

### 13.6 Account deletion

Profile → Delete Account → explain permanent deletion and separate store-subscription cancellation → recent reauthentication → mark deletion in progress → revoke push tokens/cancel schedules → delete blobs and owned rows in bounded resumable batches → delete Clerk identity → clear local caches/session → Welcome. Repeated calls resume safely.

## 14. Errors, loading, offline, and resilience

- Define one error translator from Clerk, Convex, OpenAI, RevenueCat, Expo, and network errors to domain errors and user copy.
- Use route-level error boundaries and a root fatal fallback with restart/support actions.
- Do not retry validation, forbidden, limit, unsafe, or purchase-canceled results.
- Retry transient uploads and AI provider failures with bounded backoff and the original idempotency key.
- Disable duplicate CTAs while pending. Mutations display confirmed success only after server acknowledgement.
- Offline users may browse already cached non-sensitive summaries and drafts but cannot start AI, purchase, restore, or mutate server state. Clearly label stale content.
- Analysis survives app backgrounding because session state is server-owned; reopening queries current status.
- Use skeletons for known layouts, spinners only for compact actions, and static explanatory states for longer AI operations.
- Empty states include No repairs, No appliances, No maintenance, No AI history, and No search results, each with a valid next action.

## 15. Notifications and maintenance scheduling

- Ask for notification permission only after the user enables a reminder or completes relevant onboarding—not at first launch.
- Store Expo push tokens by owner/device/environment and reconcile them on app foreground/login.
- Maintenance task mutations cancel and replace scheduled jobs atomically. Scheduled mutations enqueue an internal delivery action; failed actions are recorded and retried by an explicit retry policy.
- Support maintenance, repair follow-up, warranty, product announcement, and promotional categories. Promotions default off and respect consent/region requirements.
- Notification payloads contain opaque route/resource IDs and generic copy, never problem descriptions, serial numbers, private URLs, or AI text.
- Tapping resolves authentication and ownership before navigation. Invalid/deleted resources route safely to Home with a notice.

## 16. Security, privacy, and abuse controls

### 16.1 Authorization checklist

Every public operation must authenticate, resolve `users` by Clerk subject, load the target, compare `ownerId`, validate the requested state transition, and return the minimum fields. List queries start from owner indexes. Internal functions are not exported to the client.

### 16.2 Webhook and secret security

- Verify Clerk webhook signatures and RevenueCat HMAC/authorization before parsing business data.
- Store webhook external IDs before processing and make updates idempotent/out-of-order safe.
- Put secrets only in Convex/EAS secret stores. `.env.example` contains names and descriptions, never values.
- Redact authorization headers, signed URLs, image identifiers, prompt content, emails, serials, Clerk IDs, and RevenueCat IDs from Sentry.

### 16.3 Rate limiting

Apply transactional backend limits in addition to entitlements:

- diagnosis start: configurable burst limit per user and bounded daily attempt limit;
- appliance recognition: separate lower-cost quota;
- uploads: count, MIME, byte, dimension, and abandoned-storage limits;
- clarification and assistant: per-session caps plus short-window throttles;
- webhook endpoints: signature required, payload cap, idempotency, provider-level throttling;
- suspicious concurrency: one active full assessment per user; duplicate idempotency keys return the existing operation.

Never rely on device IDs as authorization. Record security-relevant failures without private content.

### 16.4 Retention

- User-chosen repairs and appliance images remain until the user deletes them or the account.
- Abandoned uploads and expired incomplete sessions are deleted by scheduled cleanup.
- Raw client originals are not retained after optimized upload.
- Do not store uncontrolled raw AI output after parsing; retain validated result, version metadata, request ID, and usage.
- Publish exact retention windows in the privacy policy after legal/product review.

## 17. Accessibility, localization, and themes

- Meet WCAG 2.2 AA contrast where applicable and platform accessibility guidance.
- Minimum 44×44 pt iOS / 48×48 dp Android targets; descriptive labels/hints; logical focus; accessible modal focus trapping.
- Safety, selection, status, progress, and errors use text/icon/shape as well as color.
- Support large text without clipped CTAs, screen-reader announcements for analysis/result changes, and reduced motion.
- Externalize all user strings, interpolation, plurals, dates, currency, units, and list formatting from the start. English is the only launch locale.
- Units are presentation preferences; canonical stored quantities use SI or explicit unit fields.
- System/light/dark are supported. Dark mode is semantically designed from reference tokens, not inverted.

## 18. Telemetry, Sentry, and operational visibility

- Initialize Sentry after consent/config bootstrap with environment, release, distribution, and source maps.
- Capture crashes, unhandled errors, selected handled domain errors, navigation failures, Convex/OpenAI latency spans, and release health.
- Set conservative trace sampling by environment and higher sampling for failed AI/purchase paths. No session replay.
- Add privacy-safe breadcrumbs for the event names requested by product: onboarding, auth completion, scan/image/diagnosis lifecycle, clarification, repair lifecycle, appliance/maintenance actions, paywall/purchase/restore, and limit reached.
- Keep the initial typed event catalog explicit: `onboarding_started`, `onboarding_completed`, `signup_completed`, `login_completed`, `scan_started`, `image_uploaded`, `diagnosis_started`, `diagnosis_completed`, `diagnosis_failed`, `additional_photo_requested`, `repair_started`, `repair_step_completed`, `repair_completed`, `ai_chat_message`, `appliance_added`, `maintenance_completed`, `paywall_viewed`, `plan_selected`, `purchase_started`, `purchase_completed`, `purchase_failed`, `subscription_restored`, and `free_limit_reached`.
- The typed telemetry facade is provider-neutral. In V1 its event method creates Sentry breadcrumbs/spans only; it does not send a product analytics stream.
- Billing-critical state belongs in subscription/webhook/usage tables, and AI operations in `aiUsage`; Sentry is not a billing ledger.
- Dashboards/alerts: crash-free sessions, fatal startup errors, AI error/latency rate, schema failures, red safety result rate shifts, upload failures, webhook backlog, purchase activation delay, push failure, and deletion failures.

## 19. Testing strategy

### 19.1 Unit tests

Test Zod/Convex validators, safety escalation and step stripping, entitlement math, UTC month boundaries, lifetime usage, reservation transitions, cost estimates, reducer transitions, formatting, notification recurrence, and error mapping. Use fake clocks for month/DST behavior.

### 19.2 Component and navigation tests

Render primitives and every screen in light/dark, large text, loading, empty, error, offline, and relevant entitlement/safety states. Test route guards, deep links, Android back, camera unmount, keyboard behavior, and screen-reader labels.

### 19.3 Backend integration tests

Use isolated Convex test databases to prove:

- users cannot read/mutate another owner's rows or images;
- unauthenticated calls fail consistently;
- upload ownership, cleanup, and private image endpoint checks work;
- concurrent diagnosis starts do not double reserve/consume;
- completed, failed, evidence-requested, expired, and retried usage transitions reconcile;
- out-of-order/duplicate RevenueCat and Clerk webhooks are idempotent;
- stale entitlement refresh gates paid AI correctly;
- account deletion removes blobs/rows/tokens/schedules and resumes after partial failure.

### 19.4 AI contract and safety evaluation

Run recorded response fixtures in normal CI and live-provider evaluation in a protected scheduled/pre-release job. Include safe repairs, ambiguous scenes, unreadable labels, unsupported items, prompt injections, electrical/gas/fire/water/structural/refrigerant/mold/asbestos hazards, and follow-up attempts to bypass warnings. Any invasive orange/red guidance blocks release.

### 19.5 Maestro E2E and device matrix

Automate sign-up/verification, returning login, onboarding resume, denied camera/gallery, three-image diagnosis, evidence loop, safe result and repair, red escalation, assistant five-message limit, history/search, free appliance limit, maintenance completion, paywall purchase/cancel/restore, diagnosis exhaustion, offline recovery, logout, and deletion.

Validate on at least one small and one large supported iPhone, current iOS, one API-24-class Android where practical, one current Android, and physical devices for camera, Apple/Google sign-in, RevenueCat sandbox purchases, notifications, deep links, background/foreground, and low-memory recovery.

## 20. Environment and deployment

### 20.1 Environment variables

Client-visible values are identifiers/configuration, not secrets:

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CONVEX_SITE_URL=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_EAS_PROJECT_ID=
```

CLI/deployment and server-only values (not bundled into application JavaScript):

```env
CONVEX_DEPLOYMENT=
CLERK_JWT_ISSUER_DOMAIN=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL_EXTRACT=gpt-5.6-luna
OPENAI_MODEL_DIAGNOSE=gpt-5.6-terra
OPENAI_MODEL_CHAT=gpt-5.6-luna
REVENUECAT_SECRET_KEY=
REVENUECAT_PROJECT_ID=
REVENUECAT_WEBHOOK_SECRET=
EXPO_ACCESS_TOKEN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

Add backend config for allowances, assistant/clarification/image caps, period rules, session expiry, rate limits, entitlement staleness, prompt/schema versions, model price metadata, and kill switches. Secrets must never use `EXPO_PUBLIC_`.

### 20.2 Environments and CI/CD

- Separate development, staging, and production Clerk, Convex, RevenueCat app configuration, Sentry environment, bundle/package IDs or channels where practical.
- EAS profiles: development (dev client), preview/internal, production/store. Commit `eas.json`; keep credentials in EAS-managed secure storage.
- CI gates: install with lockfile, Expo dependency/version check, TypeScript, lint, unit/integration/component tests, AI fixture tests, build-config validation, and secret scan.
- Preview builds run Maestro smoke tests. Production promotion requires manual approval, RevenueCat sandbox evidence, and safety-eval report.
- Deploy backend/schema/functions first when backward compatible, then binary/OTA. Additive schema changes precede readers; destructive migrations use expand/backfill/switch/contract.
- OTA updates may ship compatible JS/assets only. Native dependency/config changes require a new binary and matching runtime version.

### 20.3 Store readiness

Prepare final icon/splash, screenshots, preview copy, support/privacy/terms URLs, category/age rating, subscription metadata, restore/manage behavior, Apple account deletion, Sign in with Apple, Google Play listing/subscription metadata and Data Safety form, Apple privacy nutrition labels/manifests, encryption/export answers, camera/photo/Expo Notifications permission strings, AI disclosure, content reporting/support process, and reviewer credentials/instructions.

Verify store rules and SDK requirements immediately before submission because they change independently of this plan.

## 21. Delivery phases

### Phase 1 — Foundation, design, auth, backend, navigation, CI

**Objective:** Establish a production-compatible shell, audited design system, authenticated Convex connection, route guards, environments, and quality gates.

**Modules:** root configuration, providers, `src/app`, `components/ui`, theme/i18n, auth/onboarding features, Convex schema/auth/users/homes, test and EAS configuration.

**Frontend work:**

- Pin Node/Expo-compatible packages and configure native-only app identifiers, typed routes, NativeWind, fonts, themes, safe areas, gestures, keyboard handling, and error boundary.
- Complete reference inventory/token audit and component gallery.
- Implement Splash, Welcome, four auth screens, four onboarding screens, tab shell, placeholder-free Home shell, Settings foundations, and legal-content loader.
- Implement Clerk custom flows and secure token cache; integrate Convex auth readiness.

**Backend work:**

- Initialize Convex deployments, schema, Clerk JWT config, ownership/error helpers, signed Clerk webhook, idempotent user provisioning, homes/default preferences.
- Add environment/config validation and protected health/config queries.

**Dependencies:** Approved design audit, Clerk dev/staging apps, bundle/package IDs, baseline legal/safety copy, EAS project.

**Acceptance criteria:** All route branches work without auth flashes; cross-user fixtures are denied; all primitives match references in light mode and pass initial contrast/tap-target checks; no starter UI remains; preview builds launch on both platforms.

**Tests/device checks:** Type/lint/unit/component/auth integration, onboarding resume, Apple/Google/email on real development builds, dark/large-text primitive gallery, cold/warm start.

**Completion gate:** Design audit approved, auth/Convex integration proven, CI green, and both development builds install.

### Phase 2 — Camera, private images, AI diagnosis, safety, results

**Objective:** Deliver the full scan-to-structured-result loop, including evidence requests and hard safety enforcement.

**Modules:** scan/diagnosis routes/components, camera/media hooks, diagnosis/image/result/usage tables, private HTTP delivery, OpenAI model/prompt/schema/safety services.

**Frontend work:** Implement Home scan/describe entry, Camera, Photo Review, Analyzing, Additional Evidence, Diagnosis Result, permission/offline/upload/error states, and resume behavior.

**Backend work:** Implement session state machine, eligibility, uploads/checksums/cleanup, authenticated image delivery, reservation ledger, AI actions, schema validation, safety post-policy, result persistence, cost audit, expiry cleanup, and rate limiting.

**Dependencies:** OpenAI project/key and budget alerts, curated safety fixtures, product-approved disclaimers, physical camera devices.

**Acceptance criteria:** One session accepts at most three images/three clarifications; requests are idempotent; valid assessments consume exactly one credit; evidence/provider failure consumes none; orange/red never stores invasive steps; private images cannot be fetched across users or without auth.

**Tests/device checks:** Backend concurrency/security tests, live/recorded AI contract suite, hazard release-blocker suite, camera/gallery/rotation/HEIC/large-label tests, app background resume, network interruption, small/large devices.

**Completion gate:** Safety thresholds pass, privacy review passes, AI cost per fixture is recorded, and scan flow succeeds on real iOS/Android devices.

### Phase 3 — Repair guidance, assistant, completion, history

**Objective:** Turn allowed diagnoses into persistent, resumable repair workflows and unlimited repair history.

**Modules:** repair routes/components/reducer, repairs/steps/messages backend, assistant action, search/filter/detail queries.

**Frontend work:** Repair Overview, Steps/Progress, Assistant, Tools & Parts, Completion/Success, Repairs list, Repair Detail, not-fixed branches, all empty/loading/error states.

**Backend work:** Materialize only safe steps, enforce progress transitions, persist completion metrics/notes, implement five-reply Pro assistant with safety recheck, paginate/search owned history, cascade deletion.

**Dependencies:** Phase 2 result schema frozen at V1, assistant prompt/eval fixtures, final tool/part compatibility copy.

**Acceptance criteria:** Repair progress resumes across devices; red/orange cannot enter steps/chat; fifth assistant reply is the last accepted; Free repair history is unlimited; no part is called compatible without verified model evidence.

**Tests/device checks:** Reducer/state tests, assistant cap/concurrency/safety tests, progress/resume E2E, long-copy/large-text layouts, not-fixed and deletion flows.

**Completion gate:** Complete green/yellow and unsafe E2E journeys pass with no safety bypass.

### Phase 4 — My Home, appliances, maintenance, repair vs replace

**Objective:** Deliver retention features: inventory, appliance profiles, maintenance scheduling/history, and cautious repair-vs-replace analysis.

**Modules:** home/appliance/maintenance routes/components, appliances/tasks/history backend, appliance recognition action, scheduler/push preparation.

**Frontend work:** My Home, Add Appliance, Appliance Scanner/Detected, Appliance Profile, Maintenance, Maintenance Detail, Repair vs Replace, free appliance-limit paywall entry.

**Backend work:** Home/room/appliance CRUD, one-appliance Free enforcement, scan/manual merge, maintenance recurrence/completion/snooze/reschedule, repair links, range-based replace analysis, cleanup.

**Dependencies:** Appliance category taxonomy, default maintenance templates reviewed by domain expert, Pro entitlement interface from Phase 5 stubbed behind server gate.

**Acceptance criteria:** Free cannot create a second appliance under races; Pro can create multiple; task recurrence is deterministic; deleting/moving appliances preserves intended repair history; estimates show sources/assumptions and disclaimers.

**Tests/device checks:** CRUD/ownership/concurrency, recurrence fake-clock tests, appliance scan correction E2E, empty homes/rooms, large inventories and list performance.

**Completion gate:** Home and maintenance data models are migration-reviewed and all retention flows pass.

### Phase 5 — RevenueCat, paywall, entitlements, production usage gates

**Objective:** Make subscription purchase, restore, backend entitlement verification, and all feature/usage gates production-correct.

**Modules:** RevenueCat client/provider, paywall/usage/subscription screens, subscription/usage/webhook backend, store configuration.

**Frontend work:** Paywall, limit sheet, AI Usage, Subscription Management, purchase/restore/activation/billing-issue states, contextual gates for assistant/appliances/maintenance/replace.

**Backend work:** Verified idempotent RevenueCat webhook, server REST fallback, snapshot staleness policy, calendar-month ledger queries, refund/expiry/grace/transfer handling, reconciliation job.

**Dependencies:** Approved App Store/Play products and offering, RevenueCat keys/webhook, sandbox tester accounts, subscription legal copy.

**Acceptance criteria:** Localized packages render; yearly defaults; purchases/restores do not unlock backend before verification; duplicate webhooks/requests cannot double count; expiry immediately respects verified access rules; Free and Pro counters are exact at UTC boundaries.

**Tests/device checks:** Sandbox purchase/cancel/restore on both stores, webhook permutations, stale/offline activation, month rollover, upgrade/downgrade/refund, concurrent diagnosis starts.

**Completion gate:** RevenueCat sandbox evidence and billing/usage reconciliation report approved.

### Phase 6 — Notifications, settings, Sentry, hardening, stores

**Objective:** Complete all supporting screens and production hardening, then submit release candidates.

**Modules:** notifications/push/scheduler, profile/settings/help/legal, Sentry/telemetry, accessibility/i18n, performance, EAS/store assets and runbooks.

**Frontend work:** Notifications, Profile, Settings, Help, Privacy, Terms, AI Safety, account deletion, final dark theme, accessibility and reduced-motion pass.

**Backend work:** Push token/preferences/delivery, scheduling/retries, deletion workflow, operational queries/alerts, retention jobs, production secrets/config.

**Dependencies:** Final legal documents, support process, notification copy, production vendor projects/keys, store accounts/assets, privacy/security review.

**Acceptance criteria:** All 40 screens meet their contracts; deletion is complete/resumable; notifications respect consent; Sentry receives symbolicated test errors without PII; performance budgets and store checklists pass; no high-severity security/privacy/safety findings remain.

**Tests/device checks:** Full unit/integration/contract/Maestro suites, screen-reader/large-text/reduced-motion audit, push scenarios, deletion chaos test, release build smoke, TestFlight/internal Play testing, store sandbox regression.

**Completion gate:** Signed release approval from product, design, safety/domain review, privacy/security, and QA; production builds and backend rollback plan ready.

## 22. Performance budgets and quality bars

- Cold start must show branded UI promptly and never block indefinitely on network; define numeric device-tier budgets during Phase 1 profiling.
- Camera opens without another mounted preview; analysis animations remain smooth while network work is server-side.
- Lists paginate and use stable keys/virtualization; avoid live Convex subscriptions for off-screen/high-cardinality collections.
- Thumbnails, not full AI images, power lists. Decode dimensions are bounded.
- No fatal crashes, unhandled promise rejections, TypeScript errors, lint errors, missing accessible names on actionable controls, or secrets in bundles.
- Set measurable p50/p95 targets for upload, AI, purchase activation, and query latency from staging data before launch; alert on regression rather than inventing unsupported numbers now.

## 23. Operational runbooks

Document and rehearse:

1. **OpenAI degradation:** enable diagnosis kill switch, preserve drafts/reservations, show retry, release failed reservations, inspect request IDs.
2. **Unsafe output report:** disable affected prompt/model version, preserve audit metadata, run safety suite, notify designated reviewer, ship server policy/prompt fix, re-evaluate.
3. **RevenueCat lag/outage:** use cached unexpired entitlement within approved staleness window for non-AI UI, server verification for AI, queue reconciliation, never fabricate purchase success.
4. **Webhook backlog:** verify signature failures versus provider delay, replay idempotently, reconcile snapshots from provider API.
5. **Push failures:** disable invalid tokens, retry transient batches, keep maintenance state correct even without notification.
6. **Deletion failure:** resume by deletion job ID until all blobs/data/identity are gone; provide support escalation without exposing data.
7. **Bad release:** stop OTA rollout or publish previous compatible update; for native defects halt store rollout; backend changes remain backward compatible during rollback window.
8. **Secret exposure:** revoke/rotate, inspect access logs, redeploy, assess notification obligations, and verify no client bundle contains replacements.

## 24. Launch checklist

- [ ] All nine design sheets inventoried and component/token audit approved.
- [ ] All 40 screen contracts implemented in light/dark and required states.
- [ ] Apple, Google, email, verification, recovery, logout, and deletion pass production-like testing.
- [ ] Cross-user authorization and private image tests pass.
- [ ] AI schema/safety evaluation meets release thresholds with pinned configuration.
- [ ] Free/Pro limits, five assistant replies, one Free appliance, and UTC reset pass concurrency tests.
- [ ] RevenueCat products, offering, entitlement, webhook, purchase, restore, expiry, refund, and billing issues pass sandbox tests.
- [ ] Camera/gallery/image cleanup and physical-device flows pass.
- [ ] Notifications, recurrence, snooze/reschedule, token invalidation, and consent pass.
- [ ] Accessibility audit and English string extraction complete.
- [ ] Sentry releases/source maps/privacy filters/alerts verified; session replay absent.
- [ ] Privacy, Terms, AI Safety, support, deletion, store disclosures, and reviewer notes approved.
- [ ] CI, Maestro, TestFlight, internal Play, performance, low-network, background, and release smoke tests pass.
- [ ] Production secrets, budgets, rate limits, kill switches, backups/export needs, runbooks, and on-call ownership confirmed.
- [ ] Backend deployed compatibly before signed store builds; rollback artifacts retained.

## 25. Post-launch priorities

Prioritize using support reports, Sentry, AI usage/cost, and safety review—not uninstrumented guesswork:

1. Add a consented product analytics provider behind the existing telemetry interface if funnel analysis becomes necessary.
2. Expand and continuously review the safety/evaluation corpus and model routing.
3. Add additional languages after full safety/legal localization review.
4. Add document/receipt/manual storage to appliance profiles.
5. Add opt-in parts/tool affiliate search with explicit sponsored/compatibility disclosures.
6. Add professional lead generation only after licensing, location, safety, marketplace, and privacy design.
7. Add property-manager multi-property roles with a new authorization model—never overload single-owner assumptions.
8. Explore warranties, energy insights, and predictive maintenance using explicit consent and auditable data sources.

## 26. Authoritative references

Recheck these exact-version/current primary sources at implementation time:

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Expo SDK 57 Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/)
- [Expo SDK 57 ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/)
- [Expo SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [OpenAI models](https://developers.openai.com/api/docs/models)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI images and vision](https://developers.openai.com/api/docs/guides/images-vision)
- [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart)
- [Convex with Clerk](https://docs.convex.dev/auth/clerk)
- [Convex file serving security](https://docs.convex.dev/file-storage/serve-files)
- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks)

If a dependency's current primary documentation conflicts with this plan, stop that phase, document the incompatibility and migration impact, and update this plan through review before implementation.
