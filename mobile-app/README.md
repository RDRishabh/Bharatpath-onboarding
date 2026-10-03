# BharatPath Candidate Mobile App

> **AI-Powered Hiring & Career Readiness Platform for India**  
> Built with **React Native (0.81.5)**, **Expo (v54)**, **Expo Router (v6)**, and **TypeScript**.

---

## Table of Contents

- [Overview](#overview)
- [Key Functionalities](#key-functionalities)
  - [1. Authentication & Session Management](#1-authentication--session-management)
  - [2. Guided Onboarding & Resume Intake](#2-guided-onboarding--resume-intake)
  - [3. Resume Extraction & Candidate Review Gate](#3-resume-extraction--candidate-review-gate)
  - [4. BharatPath Readiness Score & Bands](#4-bharatpath-readiness-score--bands)
  - [5. Subscription & Membership Paywall](#5-subscription--membership-paywall)
  - [6. Curated Job Board & Eligibility Matching](#6-curated-job-board--eligibility-matching)
  - [7. Application Tracking Board](#7-application-tracking-board)
  - [8. AI Mock Interviews & Audio Diagnostics](#8-ai-mock-interviews--audio-diagnostics)
  - [9. Work-Style Attribute Check & Quiz](#9-work-style-attribute-check--quiz)
  - [10. Candidate Profile & "Who Has Seen Me"](#10-candidate-profile--who-has-seen-me)
  - [11. Notifications & Communication Preferences](#11-notifications--communication-preferences)
- [Complete Folder Structure](#complete-folder-structure)
- [Libraries & Tech Stack](#libraries--tech-stack)
- [Getting Started & Commands](#getting-started--commands)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
  - [Platform-Specific Execution](#platform-specific-execution)
  - [Quality & Validation Scripts](#quality--validation-scripts)
- [Environment Variables & Configuration](#environment-variables--configuration)
  - [`.env` Configuration](#env-configuration)
  - [API Base URL Resolution Matrix](#api-base-url-resolution-matrix)
  - [App Manifest & Native Permissions (`app.json`)](#app-manifest--native-permissions-appjson)
- [Design System & Theme Tokens](#design-system--theme-tokens)
- [Architecture & Core Invariants](#architecture--core-invariants)
- [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Overview

**BharatPath** is an AI-driven, three-sided hiring marketplace connecting candidates, employers, and colleges across India. The **mobile app** is the dedicated, candidate-facing application designed for job seekers and recent graduates.

It guides candidates through:
1. Creating an account and choosing preferred languages (including Hindi / Devanagari support).
2. Uploading or manually submitting their CV.
3. Reviewing extracted resume sections before confirmation.
4. Receiving a verified, objective **Readiness Score (700–990)** and Readiness Band.
5. Unlocking access to curated, verified job postings matched to their profile.
6. Tracking application progress from "Applied" through "Interviewing", "Offered", and "Hired".
7. Practicing AI-evaluated mock interviews with live microphone recording and feedback.
8. Discovering employer interest via real-time "Who Has Seen Me" tracking.

---

## Key Functionalities

### 1. Authentication & Session Management
- **Cognito Integration & Local Dev Mode**: Integrates with AWS Cognito candidate pools (`email` + `password`). Supports local bypass via `EXPO_PUBLIC_AUTH_USE_DEV_TOKEN=true` for testing without remote AWS credentials.
- **6-Digit OTP Email Verification**: Enforces verification code entry before full account activation.
- **Session Persistence**: Stores JWT access tokens in memory and hydrates user profiles (`AuthContext`).

### 2. Guided Onboarding & Resume Intake
- **Flexible Ingestion Options**:
  - **Document Upload**: PDF and DOCX files picked via `expo-document-picker`.
  - **Paste Text**: Candidates can paste raw resume text with immediate character counts.
  - **Manual Entry**: Guided multi-step form capturing Personal Details, Education, Experience, Skills, and Projects.
- **Pre-signed S3 Upload**: Issues temporary upload tickets (`POST /candidate/resume/upload-ticket`) and uploads binary files directly via `expo-file-system/legacy`.

### 3. Resume Extraction & Candidate Review Gate
- **Live OCR & Parser Status Polling**: Displays real-time parsing state (`QUEUED` $\rightarrow$ `DONE`).
- **Human-in-the-Loop Confirmation Gate**: An essential architectural invariant—candidates explicitly review, correct, and confirm all extracted fields (education, skills, projects, employment history) via `ReviewDetailsScreen` before a score can ever be calculated.
- **Interactive Section Editing**: Modal sheets to add missing sections or tweak extracted bullet points.

### 4. BharatPath Readiness Score & Bands
- **Score Range**: 700 to 990 points.
- **Four Readiness Bands**:
  - **Entry** (700 – 769)
  - **Developing** (770 – 819)
  - **Solid** (820 – 864)
  - **Strong** (865 – 990)
- **Asynchronous Scoring Worker**: Polling mechanism (`GET /candidate/score/me`) handles delayed worker evaluation.
- **Privacy & Integrity Invariant**: The scoring algorithm is never broken down or explained to candidates, preventing gamification.

### 5. Subscription & Membership Paywall
- **Membership-First Access**: Candidacy operations (scoring, job applications, mock interviews, and courses) require an active subscription; requests return `402 Payment Required` (`subscription_required`) if lapsed.
- **Tiered Plans & Coupon Previews**: Fetches real-time plans from `GET /candidate/plans`, supports discount codes (`previewDiscount`), and triggers payment checkout (`PaymentSheet`).

### 6. Curated Job Board & Eligibility Matching
- **Smart Feed**: Displays active, verified openings with company monograms, compensation ranges, locations, and work modes (Remote, Hybrid, Onsite).
- **Eligibility Indicator**: Automatically evaluates whether the candidate meets requirements without disclosing private recruiter cutoff numbers.
- **Cursor-Based Infinite Scroll**: Uses cursor pagination for fast, efficient feed browsing.
- **Comprehensive Filters**: Filter jobs by role title, location/city, work mode, minimum salary, and eligible-only status.

### 7. Application Tracking Board
- **Application Lifecycle**: Track status progression across standardized phases:
  - `APPLIED` $\rightarrow$ `REVIEWING` $\rightarrow$ `INTERVIEWING` $\rightarrow$ `OFFERED` $\rightarrow$ `HIRED` (or `REJECTED` / `WITHDRAWN`).
- **Two-Way Hire Confirmation**: Candidates can formally confirm or dispute hire notifications directly inside `ApplicationDetailScreen`.
- **Voluntary Withdrawal**: Enables candidates to withdraw pending applications gracefully.

### 8. AI Mock Interviews & Audio Diagnostics
- **Hardware Pre-flight Check**: Runs diagnostic audio checks (`DeviceCheckScreen`) validating microphone input, speaker output, and background noise levels before starting an interview session.
- **Timed Question Preparation & Recording**: Displays realistic interview prompts with preparation countdowns and active recording timers powered by `expo-audio`.
- **Answer Keep or Retake**: Allows candidates to review and retake responses.
- **Secure Audio Upload**: Streams candidate voice answers to backend evaluators.
- **Detailed Evaluation Report**: Generates actionable feedback and performance metrics (`InterviewReportScreen`).

### 9. Work-Style Attribute Check & Quiz
- **Attribute Assessment**: Interactive questionnaire assessing work-style preferences, teamwork dynamics, and problem-solving approaches.
- **Visual Trait Report**: Generates a shareable attribute breakdown report.

### 10. Candidate Profile & "Who Has Seen Me"
- **Unified Profile Dashboard (`/you`)**: Shows readiness score, application count, completed courses, and account settings.
- **Transparency Audit**: Displays logs of employer profile views, showing candidates which companies have viewed their profile without leaking unmasked recruiter data.

### 11. Notifications & Communication Preferences
- **Push Notification Registration**: Registers device push tokens via `expo-notifications`.
- **Granular Toggles**: Candidate-controlled toggles for job recommendations, application status updates, and interview reminders.

---

## Complete Folder Structure

```
mobile-app/
├── .env                              # Environment configuration (API base URL, Dev token flag)
├── .gitignore                        # Git exclusion rules
├── .prettierrc                       # Code formatting rules
├── app.json                          # Expo configuration, plugins, permissions & orientation
├── babel.config.js                   # Babel configuration with Expo preset
├── declarations.d.ts                 # Global TypeScript ambient declarations (images, SVGs)
├── eslint.config.js                  # ESLint configuration (Flat config)
├── expo-env.d.ts                     # Expo Router ambient type bindings
├── package.json                      # Project dependencies & npm scripts
├── tsconfig.json                     # TypeScript compiler options & '@/*' path aliases
│
├── app/                              # Expo Router file-based routing routes
│   ├── _layout.tsx                   # Root navigation layout, font loaders, and Providers
│   ├── index.tsx                     # Entry point & state-driven onboarding/auth orchestrator
│   ├── home.tsx                      # Main candidate dashboard route
│   ├── jobs.tsx                      # Jobs feed & search route
│   ├── job-detail.tsx                # Single job view & application submission
│   ├── application-sent.tsx          # Apply confirmation / success route
│   ├── board.tsx                     # Candidate application tracker board route
│   ├── application-detail.tsx        # Application status timeline & hire response route
│   ├── you.tsx                       # Profile, scores, and account statistics route
│   ├── who-has-seen-me.tsx           # Employer view history audit log route
│   ├── mock-interview.tsx            # AI mock interview landing route
│   ├── device-check.tsx              # Audio hardware diagnostic route
│   ├── interview-session.tsx         # Active audio recording session route
│   ├── interview-sessions.tsx        # Completed interview sessions list route
│   ├── interview-report.tsx          # Interview scoring report route
│   ├── attribute-check.tsx           # Work style evaluation landing route
│   ├── attribute-quiz.tsx            # Interactive question quiz route
│   ├── attribute-report.tsx          # Attribute results & trait breakdown route
│   ├── notifications.tsx             # Notification settings & communication toggles route
│   └── +not-found.tsx                # Fallback route for invalid URLs
│
├── screens/                          # Feature-specific screen components
│   ├── auth/                         # Candidate authentication flows
│   │   ├── LoginScreen.tsx           # Email & password sign-in
│   │   ├── SignUpScreen.tsx          # Full name, email, password sign-up
│   │   ├── EmailVerificationScreen.tsx# 6-digit OTP verification screen
│   │   └── index.ts                  # Module exports
│   │
│   ├── onboarding/                   # Onboarding, intake, and scoring screens
│   │   ├── IntroScreen.tsx           # Initial hero welcome screen
│   │   ├── CreateAccountScreen.tsx   # Fast account creation
│   │   ├── LanguageSelectScreen.tsx  # English & Hindi language picker
│   │   ├── HowItWorksScreen.tsx      # Platform visual guide
│   │   ├── ResumeIntakeScreen.tsx    # Upload CV / Paste / Manual entry choice
│   │   ├── ParsingScreen.tsx         # Parser status loader & animation
│   │   ├── ReviewDetailsScreen.tsx   # Human-in-the-loop review of parsed sections
│   │   ├── ScoringScreen.tsx         # Score calculation polling screen
│   │   ├── ScoreRevealScreen.tsx     # Animated score reveal & band badge
│   │   ├── ScoreBreakdownScreen.tsx  # Category preview screen
│   │   ├── SuggestionsScreen.tsx     # Score improvement recommendations
│   │   ├── NotificationPermissionScreen.tsx # Push notification permission prompt
│   │   ├── ShareResultScreen.tsx     # Scorecard sharing card generator
│   │   ├── OtpVerificationScreen.tsx # Onboarding OTP verification modal
│   │   ├── AddSectionModal.tsx       # Modal to add a new CV section
│   │   ├── FixSkillModal.tsx         # Modal to edit/add skills
│   │   ├── FixSuggestionModal.tsx    # Modal to review parser suggestions
│   │   ├── ManualResumeModal.tsx     # Full structured manual resume entry
│   │   ├── PasteTextModal.tsx        # Raw resume text paste modal
│   │   └── SectionEditModal.tsx      # Edit specific resume section text
│   │
│   ├── subscription/                 # Monetization & payment
│   │   ├── SubscribeScreen.tsx       # Membership plans, benefits & promo codes
│   │   └── PaymentSheet.tsx          # Checkout & payment processing sheet
│   │
│   ├── home/                         # Candidate home hub
│   │   └── HomeScreen.tsx            # Dashboard with quick actions, score banner & jobs
│   │
│   ├── jobs/                         # Job search & details
│   │   ├── JobsFeedScreen.tsx        # Searchable jobs list with filters
│   │   ├── JobDetailScreen.tsx       # Detailed job description, requirements & apply CTA
│   │   ├── JobFiltersSheet.tsx       # Bottom sheet with work mode, city, salary filters
│   │   └── ApplicationSentScreen.tsx # Post-application congratulations screen
│   │
│   ├── board/                        # Application management
│   │   ├── ApplicationBoardScreen.tsx# Active & past applications list
│   │   └── ApplicationDetailScreen.tsx# Timeline, interview invites, hire confirmation
│   │
│   ├── interview/                    # AI Mock Interview system
│   │   ├── MockInterviewIntroScreen.tsx# Overview, requirements & start button
│   │   ├── DeviceCheckScreen.tsx     # Mic and audio hardware pre-flight test
│   │   ├── InterviewSessionScreen.tsx# Live question prompt, prep timer, recorder
│   │   ├── InterviewSessionsScreen.tsx# Past sessions archive
│   │   └── InterviewReportScreen.tsx # Performance report & AI feedback
│   │
│   ├── attribute-check/              # Behavioral assessment
│   │   ├── AttributeCheckScreen.tsx  # Work-style assessment intro
│   │   ├── AttributeQuestionsScreen.tsx# Paginated question card quiz
│   │   └── QuestionnaireReportScreen.tsx# Trait score summary report
│   │
│   ├── profile/                      # Candidate profile & settings
│   │   ├── ProfileScreen.tsx         # Candidate details, statistics, and logout
│   │   └── WhoHasSeenMeScreen.tsx    # Log of employer profile view events
│   │
│   ├── notifications/                # Communication center
│   │   └── NotificationScreen.tsx    # In-app notifications list & preference toggles
│   │
│   └── splash/                       # App splash & loading
│       └── SplashScreen.tsx          # Animated logo splash transition
│
├── components/                       # Shared design system components
│   ├── buttons/                      # Standardized buttons
│   │   ├── PrimaryButton.tsx         # Solid brand accent CTA button
│   │   ├── SecondaryButton.tsx       # Outlined / soft surface button
│   │   ├── TertiaryButton.tsx        # Text-only minimal button
│   │   ├── BackButton.tsx            # Standardized navigation back chevron
│   │   └── IconButton.tsx            # Icon-only circular or square touchable
│   ├── cards/                        # Surfaces & cards
│   │   ├── Card.tsx                  # Rounded container with elevation & border
│   │   └── EyebrowRow.tsx            # Uppercase category eyebrow label with icon
│   ├── chips/                        # Pills & tags
│   │   └── SkillChip.tsx             # Skill badge with remove / highlight states
│   ├── feedback/                     # Feedback & messaging states
│   │   ├── EmptyState.tsx            # Empty list placeholder with graphic & action
│   │   ├── LoadingState.tsx          # Centered activity indicator with message
│   │   └── NoteStrip.tsx             # Info / warning / tip colored banner
│   ├── inputs/                       # Form controls
│   │   └── SearchInput.tsx           # Search bar with clear button & debounce
│   ├── layouts/                      # Layout wrappers
│   │   ├── HeroScreen.tsx            # Screen wrapper with prominent colored hero header
│   │   ├── HubScreen.tsx             # Tab hub wrapper with standardized top navigation
│   │   └── StandardScreen.tsx        # Generic scrollable screen with SafeAreaView
│   ├── navigation/                   # Navigation components
│   │   ├── BottomTabBar.tsx          # Custom bottom navigation bar (Home, Jobs, Board, You)
│   │   └── TopBar.tsx                # Universal screen top header bar
│   ├── CTAStickyBand.tsx             # Bottom pinned action bar with drop shadow
│   ├── CompanyMonogram.tsx           # Automatic two-letter monogram logo generator
│   ├── ProgressMeter.tsx             # Visual progress indicator bar
│   ├── ScoreDisplay.tsx              # Prominent score number & band pill badge
│   └── StatusChip.tsx                # Color-coded badge for application stages
│
├── context/                          # React Context state management
│   ├── AuthContext.tsx               # Auth session, JWT token, and profile state
│   └── AppContext.tsx                # App UI state, preferred language, career score
│
├── services/                         # API client & domain business logic
│   ├── api/                          # REST API communication modules
│   │   ├── client.ts                 # Base fetch wrapper, RFC 7807 problem details, base URL
│   │   ├── auth.ts                   # Login, signup, verification, candidate profile API
│   │   ├── resume.ts                 # S3 upload ticket, text paste, manual intake, versions
│   │   ├── scoring.ts                # Score retrieval, band calculations, delta utilities
│   │   ├── jobs.ts                   # Job search, cursor pagination, job details
│   │   ├── applications.ts           # Apply, list applications, withdraw, confirm hire
│   │   ├── subscription.ts           # Plans, coupon preview, subscription checkout
│   │   ├── interview.ts              # Device check, question flow, audio answer upload
│   │   ├── questionnaire.ts          # Attribute check questionnaire, answer submission
│   │   ├── courses.ts                # Completed candidate courses count & list
│   │   └── onboarding.ts             # Onboarding status tracking
│   ├── notifications/                # Hardware & device notification services
│   │   └── device.ts                 # Token registration, notification presentation handler
│   └── profile/                      # Profile data transformation helpers
│       ├── display.ts                # Name initials, email formatting
│       ├── extractedResume.ts        # Parser payload extraction into candidate info
│       ├── name.ts                   # Candidate name resolution hierarchy
│       └── pendingName.ts            # Temporary local name cache
│
├── theme/                            # Design tokens & typography configuration
│   ├── tokens.ts                     # Colors (Navy, OffWhite, Purple, Gold), spacing, radii
│   ├── fonts.ts                      # Custom font loading hook (General Sans, Inter, Space Mono)
│   └── webFonts.ts                   # CSS font injection for Web preview
│
├── hooks/                            # Custom React hooks
│   ├── useAuth.ts                    # Hook exposing session and candidate details
│   ├── useJobs.ts                    # Infinite query, search, and filtering logic
│   ├── useApplications.ts            # Application board data fetching & mutations
│   └── useOnboarding.ts              # Step navigation controller for onboarding
│
├── types/                            # TypeScript interfaces & type definitions
│   ├── application.ts                # Application models, stages, transitions
│   ├── job.ts                        # Job detail, summary, filters, work modes
│   ├── user.ts                       # User profile, score models, resume metadata
│   └── index.ts                      # Barrel export file
│
├── utils/                            # Helper utilities
│   └── helpers.ts                    # Date formatting, currency strings, string utilities
│
├── mocks/                            # Mock data for offline testing & preview
│   └── mockData.ts                   # Fallback candidate score, profile, and job cards
│
└── assets/                           # Media & font assets
    ├── fonts/                        # Font binaries (General Sans, Inter, Space Mono, Devanagari)
    ├── icons/                        # Logos, onboarding illustrations & feature icons
    └── images/                       # App icon and web favicon
```

---

## Libraries & Tech Stack

| Category | Library | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | `react` / `react-dom` | `19.1.0` | Core UI library |
| | `react-native` | `0.81.5` | Native mobile runtime (New Architecture enabled) |
| | `expo` | `~54.0.37` | Mobile application SDK & build tooling |
| **Navigation** | `expo-router` | `~6.0.24` | File-based, typed routing built on React Navigation |
| | `@react-navigation/native` | `^7.0.14` | Core navigation primitives |
| | `@react-navigation/bottom-tabs` | `^7.2.0` | Tab bar container |
| | `react-native-screens` | `~4.16.0` | Native view hierarchy optimization |
| | `react-native-safe-area-context`| `~5.6.0` | Safe area insets management for notches & home bars |
| **Gestures & Animations** | `react-native-reanimated` | `~4.1.1` | High-performance 60fps UI thread animations |
| | `react-native-gesture-handler` | `~2.28.0` | Native touch & gesture interaction handling |
| | `react-native-worklets` | `0.5.1` | Low-level worklet runtime for Reanimated |
| **Audio & Native Hardware** | `expo-audio` | `~1.1.1` | Microphone recording for AI mock interviews |
| | `expo-camera` | `~17.0.10` | Camera hardware integration |
| | `expo-document-picker` | `~14.0.8` | File picker for uploading PDF and DOCX resumes |
| | `expo-file-system` | `~19.0.24` | Binary file reads and presigned S3 uploads |
| | `expo-haptics` | `~15.0.8` | Tactile haptic feedback on button presses & score reveals |
| | `expo-notifications` | `^0.32.17` | Push notification registration and local banners |
| **Icons & Visuals** | `phosphor-react-native` | `^3.0.6` | Primary iconography system across screens |
| | `lucide-react-native` | `^0.544.0` | Secondary functional icons |
| | `@expo/vector-icons` | `^15.0.3` | Expo icon bundles |
| | `react-native-svg` | `15.12.1` | Vector graphics, charts, and custom SVG rendering |
| | `expo-linear-gradient` | `~15.0.8` | Gradient cards, hero headers, and progress bars |
| | `expo-blur` | `~15.0.8` | Backdrop blur and glassmorphism styling |
| **Fonts & Typography** | `expo-font` | `~14.0.12` | Custom TTF font asset loader |
| | `@expo-google-fonts/inter` | `^0.4.2` | Inter font family |
| | `@expo-google-fonts/noto-sans-devanagari` | `^0.4.1` | Hindi / Devanagari script support |
| | `@expo-google-fonts/space-mono` | `^0.4.2` | Monospace typography for scores & numbers |
| **Networking & Web** | `@supabase/supabase-js` | `^2.58.0` | Supabase client integration |
| | `react-native-url-polyfill` | `^2.0.0` | WHATWG URL standard polyfill for React Native |
| | `expo-web-browser` | `~15.0.11` | In-app secure browser for external links & policy pages |
| | `react-native-webview` | `13.15.0` | Embedded web view container |
| | `react-native-web` | `^0.21.0` | Universal web preview execution |
| **Developer Tooling** | `typescript` | `~5.9.2` | Static type checking |
| | `eslint` & `eslint-config-expo`| `^9.0.0` | Code quality and linting |

---

## Getting Started & Commands

### Prerequisites
- **Node.js**: `v18.x` or `v20.x` LTS recommended.
- **npm** or **yarn**.
- **Expo Go App**: Installed on your iOS or Android physical test device (available on App Store and Google Play).
- **Simulator / Emulator** (Optional):
  - Xcode with iOS Simulator (macOS required).
  - Android Studio with Android Virtual Device (AVD).

### Installation

From the repository root or the `mobile-app` directory:

```bash
cd mobile-app
npm install
```

### Running the App

Start the Expo Metro bundler:

```bash
npm run dev
# Or alternatively:
npx expo start
```

### Platform-Specific Execution

Once the Metro bundler is running in your terminal, press the corresponding key:

| Key / Command | Action | Description |
| :--- | :--- | :--- |
| Press `i` | **iOS Simulator** | Launches the app in Xcode's iOS Simulator. |
| Press `a` | **Android Emulator** | Boots the app in Android Studio's AVD. |
| Press `w` | **Web Browser** | Runs the app in your desktop browser. |
| Scan QR Code | **Physical Device** | Scan using the Camera (iOS) or Expo Go (Android). |
| Press `r` | **Reload** | Reloads the JavaScript bundle. |
| Press `m` | **Developer Menu** | Toggles the developer debugging menu. |

#### Useful CLI Flags:
```bash
# Start with a clean Metro cache (recommended after dependency updates)
npx expo start -c

# Start explicitly for iOS
npx expo run:ios

# Start explicitly for Android
npx expo run:android

# Export the bundle for web deployment
npm run build:web
```

### Quality & Validation Scripts

```bash
# Run TypeScript compilation check without emitting files
npm run typecheck

# Run ESLint across all TypeScript and TSX files
npm run lint
```

---

## Environment Variables & Configuration

### `.env` Configuration

Create or modify `mobile-app/.env`:

```ini
# Base URL for the BharatPath backend REST API
EXPO_PUBLIC_API_BASE_URL=http://localhost:8099/api/v1

# Enable local development token (bypasses AWS Cognito during local testing)
EXPO_PUBLIC_AUTH_USE_DEV_TOKEN=true
```

### API Base URL Resolution Matrix

The app automatically selects the correct backend host in `services/api/client.ts` depending on where the app is running:

| Environment | Resolved Host URL | Note |
| :--- | :--- | :--- |
| **Web Browser** (`Platform.OS === 'web'`) | `http://localhost:8099/api/v1` | Directly reaches your machine's localhost. |
| **Android Emulator** | `http://10.0.2.2:8099/api/v1` | Android emulators route `10.0.2.2` to the host machine. |
| **iOS Simulator** | `http://localhost:8099/api/v1` | Shares the Mac network stack directly. |
| **Physical Phone via Expo Go** | `http://<MAC_WIFI_IP>:8099/api/v1` | Automatically extracts host IP from Metro's `hostUri`. |
| **Explicit Override** | Value in `EXPO_PUBLIC_API_BASE_URL` | Used if explicitly configured. |

> **Tip for Physical Device Testing:** Ensure your phone and development computer are connected to the same Wi-Fi network and port `8099` is open.

### App Manifest & Native Permissions (`app.json`)

The app requests permissions for specific features:

```json
{
  "expo": {
    "name": "BharatPath",
    "slug": "bharatpath",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "bharatpath",
    "newArchEnabled": true,
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      [
        "expo-audio",
        {
          "microphonePermission": "Allow BharatPath to record your mock interview answers."
        }
      ],
      [
        "expo-notifications",
        {
          "defaultChannel": "default"
        }
      ]
    ]
  }
}
```

---

## Design System & Theme Tokens

All styles, colors, spacing, and typography are defined in `theme/tokens.ts` and `theme/fonts.ts`. Direct hardcoded hex codes are avoided in favor of design tokens:

### Brand Color Palette
- **Off-White (`#FFFCF7`)**: 60% primary application background, warm paper-tone.
- **Deep Navy (`#0A1931`)**: 25% primary trust surface, text, and headers.
- **Hero Purple (`#5F4DB2` / `#5E4DB2`)**: 15% interactive accent, brand badges, and call-to-actions.
- **Refined Gold (`#B9891A` / `#F4D685`)**: Readiness score highlights, verification badges, and medals.
- **Semantic Accents**:
  - Green (`#1F6B45` / `#E6F1EA`): Match score, active offers, hired status.
  - Amber (`#7A5C0E` / `#F7EFD6`): Pending states, expiring offers.
  - Red (`#993A22` / `#F8E6E0`): Rejected status, errors, failed diagnostics.

### Typography
- **General Sans**: Headings and titles (`GeneralSans-Semibold`, `GeneralSans-Bold`).
- **Inter**: Body text, button labels, and descriptions (`Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`).
- **Space Mono**: Digits, score displays, countdown timers, and salary numbers (`SpaceMono-Bold`).
- **Noto Sans Devanagari**: Native script support for Hindi localized text.

---

## Architecture & Core Invariants

1. **Candidate Scope Only (No Tenant Binding)**  
   Candidates do not belong to an organisation or tenant. API calls authenticate via candidate Bearer tokens.
2. **Readiness Score is Never Explained to Candidates**  
   The platform intentionally does not show a breakdown of individual scoring formulas or recruiter cutoffs (`min_score` is never exposed). This prevents artificial gaming of the scoring system.
3. **Mandatory Candidate Review Gate Before Scoring**  
   Parsed resumes are not automatically confirmed. The candidate must review the extracted sections, make any corrections, and confirm the version before the scoring worker runs.
4. **Subscription-Gated Features (RFC 7807)**  
   Core candidate actions (taking tests, applying to jobs, viewing full match details) require an active subscription. Unsubscribed access returns HTTP `402 Payment Required`, which triggers the membership flow.
5. **Cursor-Based Pagination**  
   The candidate jobs feed and application lists use cursor-based pagination (`next_cursor`). Total item counts are intentionally not displayed to avoid misleading counts.

---

## Troubleshooting & FAQs

### 1. `Network request failed` when connecting from a physical phone or Android Emulator
- **Android Emulator**: Ensure you use `http://10.0.2.2:8099/api/v1` instead of `localhost`.
- **Physical Phone**: Confirm your phone and Mac are on the same Wi-Fi subnet. In `.env`, set `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_MAC_IP>:8099/api/v1`.

### 2. Microphone not recording during Mock Interviews
- Ensure you have granted microphone permissions when prompted.
- On iOS Simulators, verify your Mac's Input Audio Device in **System Settings > Sound > Input**.
- On Android, ensure permissions are granted in **App Info > Permissions > Microphone**.

### 3. Fonts not loading or blank screen on startup
- Clear the Metro cache:
  ```bash
  npx expo start -c
  ```
- Verify that custom TTF fonts exist in `assets/fonts/` and match the font family definitions in `theme/fonts.ts`.

### 4. TypeScript alias `@/*` resolution issues
- Make sure `tsconfig.json` contains:
  ```json
  "paths": {
    "@/*": ["./*"]
  }
  ```
- Restart the TypeScript server in your editor or run `npm run typecheck`.

---

Developed with ❤️ for **BharatPath** — Empowering India's emerging workforce.
