# SportMates Platform Implementation Plan

## Repository baseline

- Expo 58, React Native 0.88, Expo Router, and Supabase JS are already in use.
- Routes currently cover welcome, signup/login, home, athlete onboarding, profile,
  athlete search, activity creation/listing/chat, player profile, and racket stats.
- Existing functionality includes authentication, owner-scoped athlete onboarding,
  public profile/avatar editing, activity creation and participation, activity
  group chat with Realtime, and persisted Tennis/Padel match statistics.
- Existing migrations cover activity joining/capacity enforcement, avatar storage,
  racket match tracking, and athlete profile storage/RLS.
- The repository does not define the base `profiles`, `activities`,
  `activity_participants`, or `activity_messages` schemas. Their live columns,
  constraints, and RLS policies therefore remain unverified.
- `npx tsc --noEmit` currently reports errors in `app-navbar.tsx`, `app-tabs.tsx`,
  `app-tabs.web.tsx`, and `use-theme.ts`. There is no test script in `package.json`.

## Delivery phases

### Phase 0 — Establish a safe baseline

- Obtain and inspect the live/base Supabase schema and RLS policies before changing
  those tables or adding foreign-key-dependent migrations.
- Resolve the existing TypeScript baseline failures; add focused coverage for the
  critical authentication, navigation, and data-access flows.
- Verify which existing migrations are deployed; never apply or duplicate them
  implicitly.

**Gate:** app compiles and existing sign-in, profile, activity, chat, and racket
statistics flows have an agreed baseline.

### Phase 1 — Navigation and application shell

- Add consistent, tested navigation for Home, Explore, Create Activity, Tracking,
  Messages, and Profile; use mobile-appropriate navigation and preserve the
  responsive web layout.
- Add working route destinations and clear loading, empty, and error states.
- Keep authentication and athlete-onboarding redirects intact.

**Gate:** each navigation item works on web and mobile; completed profiles skip
onboarding and incomplete profiles resume it.

### Phase 2 — Activity discovery and lifecycle

- Expand activity creation only with columns confirmed in the database; validate
  skill, duration, visibility, time, and participant capacity.
- Add activity discovery filters and a detail route with organizer/participant
  information, join/leave, and organizer management.
- Preserve the existing capacity-safe join operation; add safe server-side
  operations and RLS for cancellation/updates where needed.
- Personalize activity ordering using athlete preferences without hiding other
  activities or fabricating recommendations.

**Gate:** create, discover, join, leave, capacity rejection, and organizer actions
work against Supabase, including concurrent join attempts.

### Phase 3 — Messaging and notifications

- Preserve the existing activity group chat and its Realtime behavior.
- Add athlete-to-athlete conversations, message history, unread state, and
  participant-scoped RLS.
- Add notifications for supported real events and mark-as-read operations.

**Gate:** users can only read/write conversations and notifications they are
authorized to access; new messages appear in real time.

### Phase 4 — Training capture and statistics

- Add running-session capture with platform-verified location support and explicit
  permission/error handling.
- Add persisted football and gym session records, building on existing racket
  match records.
- Build dashboards from saved records only; show empty states rather than
  invented totals or records.

**Gate:** saved sessions produce reproducible totals and no synthetic
performance data is displayed.

### Phase 5 — Social, profile, and settings

- Add athlete profile sections, privacy controls, and activity/statistics views.
- Add follow, like, comment, and challenge functionality only with corresponding
  schema, RLS, and actual user-visible interactions.
- Add search and account/settings flows, including secure deletion after data
  retention behavior is defined.

**Gate:** private profile fields remain private and all community actions enforce
ownership and authorization.

### Phase 6 — Cross-platform release validation

- Run focused tests, lint, type-check, Expo diagnostics, and route smoke tests.
- Exercise registration, login/logout, onboarding resume/edit, activity lifecycle,
  messaging, and saved-statistics flows on Web, Android, and iOS.
- Record remaining platform or environment blockers explicitly.

## Cross-cutting constraints

- Preserve existing Expo Router, Supabase auth, profile, activity, chat, and racket
  statistics behavior.
- Make database changes additive, idempotent where practical, and protected by
  RLS; do not assume the live database matches repository code.
- Do not expose service-role credentials or fabricate performance statistics.
- Avoid adding dependencies unless a required platform feature cannot be delivered
  with installed Expo modules.
