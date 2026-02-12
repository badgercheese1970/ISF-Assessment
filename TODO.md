# ISF Assess - Improvement Roadmap

**Last Updated**: February 10, 2025
**Project**: ISF School Assessment Tool
**Live URL**: https://isf-assess.web.app

---

## ✅ Completed Tasks

### 1. Fix Critical Security Vulnerabilities ✅ (Feb 10, 2025)
**Status**: COMPLETED

**What was done**:
- ✅ Moved hardcoded admin emails from `AuthContext.tsx` to `.env.local`
- ✅ Moved Firebase config to environment variables
- ✅ Created `.env.local` with all sensitive configuration
- ✅ Created `.env.example` template for developers
- ✅ Updated Firestore rules to require authentication
- ✅ Added report ownership validation (users can only modify their own reports)
- ✅ Secured Companies House API key in environment variables

**Files Modified**:
- `src/contexts/AuthContext.tsx`
- `src/firebase.ts`
- `firestore.rules`
- `.env.local` (created)
- `.env.example` (created)

---

### 2. Create CLAUDE.md Project Documentation ✅ (Feb 10, 2025)
**Status**: COMPLETED

**What was done**:
- ✅ Created comprehensive `CLAUDE.md` with architecture details
- ✅ Documented three-project architecture (ISF suite integration)
- ✅ Listed all data sources and APIs
- ✅ Documented 23-step assessment framework
- ✅ Listed known issues from Opus 4.6 review
- ✅ Added deployment and development instructions

**File Created**:
- `CLAUDE.md`

---

### 3. Add Ofsted Rating Integration and Scoring ✅ (Feb 10, 2025)
**Status**: COMPLETED

**What was done**:
- ✅ Added Ofsted fields to GIAS interface (`OfstedRating`, `OfstedLastInsp`, etc.)
- ✅ Created `scoreOfstedRating()` function in auto-assess
- ✅ Implemented scoring logic:
  - Outstanding = 5 points
  - Good = 4 points
  - Requires Improvement = 2 points
  - Inadequate = 1 point
  - ISI-inspected = 3 points (assumed acceptable)
- ✅ Added confidence adjustments for stale data (>5 years)
- ✅ Updated weighted scoring to include Ofsted (weight: 2)
- ✅ Added Ofsted display to Assessment UI

**Files Modified**:
- `src/services/gias.ts`
- `src/services/auto-assess.ts`
- `src/services/scoring.ts`
- `src/pages/Assessment.tsx`

**New Scoring Structure** (9 criteria, total weight: 15):
1. Commissioning Demand (Weight: 3)
2. **Ofsted Rating (Weight: 2)** ← NEW
3. Financial Health (Weight: 2)
4. Building Condition (Weight: 2)
5. Staffing/Leadership (Weight: 2)
6. Legals/Compliance (Weight: 1)
7. Location/Access (Weight: 1)
8. Reputation (Weight: 1)
9. Synergy (Weight: 1)

---

### 4. Add ISF Branding ✅ (Feb 10, 2025)
**Status**: COMPLETED

**What was done**:
- ✅ Copied ISF logo from SEND Dashboard (22KB optimized PNG)
- ✅ Updated all pages with dark theme (slate-900 background)
- ✅ Added ISF logo to login page, dashboard header
- ✅ Implemented cyan accent colors throughout
- ✅ Updated page title and favicon
- ✅ Added theme-color meta tag (#0f172a)
- ✅ Styled all cards, buttons, inputs with ISF brand colors

**Design System**:
- Background: `slate-900` (#0f172a)
- Cards: `slate-800` with `slate-700` borders
- Primary Accent: `cyan-600`
- Text: `white` / `slate-300` / `slate-400`
- Hover Effects: Cyan glow shadows

**Files Modified**:
- `index.html`
- `src/pages/LoginPage.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Assessment.tsx`
- `public/logo.png` (added)

---

## 🔴 High Priority Tasks (Quick Wins)

### 5. Replace Alerts with Toast Notifications
**Status**: PENDING
**Estimated Time**: 15-20 minutes
**Priority**: HIGH (UX improvement)

**Current Issue**:
- `Assessment.tsx:134-137` uses browser `alert()` for success/error messages
- Poor user experience, blocks interaction

**Solution**:
```bash
npm install react-hot-toast
```

**Implementation**:
1. Install `react-hot-toast` library
2. Add `<Toaster />` component to `App.tsx`
3. Replace all `alert()` calls:
   ```typescript
   // Before
   alert('Report saved!');
   alert('Error saving report');

   // After
   import toast from 'react-hot-toast';
   toast.success('Report saved successfully!');
   toast.error('Failed to save report');
   ```

**Files to Modify**:
- `package.json` (add dependency)
- `src/App.tsx` (add Toaster component)
- `src/pages/Assessment.tsx` (replace alerts)
- Any other files using `alert()`

---

### 6. Add Error Boundary and Input Validation
**Status**: PENDING
**Estimated Time**: 20-30 minutes
**Priority**: HIGH (stability and UX)

**Part A: Error Boundary**

**Current Issue**: No React error boundaries for graceful error handling

**Implementation**:
1. Create `src/components/ErrorBoundary.tsx`:
```typescript
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App error:', error, errorInfo);
    // TODO: Log to error reporting service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-md">
            <h1 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <p className="text-slate-300 mb-4">
              The application encountered an error. Please refresh the page or contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

2. Wrap `App` component in `src/main.tsx`:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Part B: Input Validation**

**Current Issue**: `Dashboard.tsx:15-32` only checks for whitespace, no proper validation

**Implementation**:
1. Create validation utility in `src/utils/validation.ts`:
```typescript
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSearchQuery(query: string): ValidationResult {
  const trimmed = query.trim();

  if (!trimmed) {
    return { valid: false, error: 'Please enter a search term' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Search term must be at least 2 characters' };
  }

  // Check if it's a URN (should be 6 digits)
  if (/^\d+$/.test(trimmed) && trimmed.length !== 6) {
    return { valid: false, error: 'URN must be exactly 6 digits' };
  }

  return { valid: true };
}
```

2. Update `Dashboard.tsx` to use validation:
```typescript
import { validateSearchQuery } from '../utils/validation';

const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();

  const validation = validateSearchQuery(query);
  if (!validation.valid) {
    setError(validation.error || 'Invalid search');
    return;
  }

  // ... rest of search logic
};
```

**Files to Create**:
- `src/components/ErrorBoundary.tsx`
- `src/utils/validation.ts`

**Files to Modify**:
- `src/main.tsx`
- `src/pages/Dashboard.tsx`

---

### 7. Extract Magic Numbers to Configuration
**Status**: PENDING
**Estimated Time**: 15-20 minutes
**Priority**: MEDIUM (code maintainability)

**Current Issue**:
- Hardcoded thresholds in `auto-assess.ts:85-90`
- Commissioning demand thresholds, financial ratios scattered throughout code

**Implementation**:
1. Create `src/config/scoring-thresholds.ts`:
```typescript
export const COMMISSIONING_THRESHOLDS = {
  VERY_HIGH: { awaitingMin: 200, poolMax: 2, score: 5, confidence: 'HIGH' as const },
  HIGH: { awaitingMin: 100, poolMax: 2, score: 4, confidence: 'HIGH' as const },
  MEDIUM_POOL_3: { awaitingMin: 100, pool: 3, score: 3, confidence: 'MEDIUM' as const },
  MEDIUM: { awaitingMin: 50, score: 3, confidence: 'MEDIUM' as const },
  LOW: { awaitingMin: 20, score: 2, confidence: 'MEDIUM' as const },
  MINIMAL: { score: 1, confidence: 'MEDIUM' as const },
} as const;

export const FINANCIAL_THRESHOLDS = {
  EXCELLENT: { max: 3, score: 5 },
  GOOD: { max: 6, score: 4 },
  ACCEPTABLE: { max: 10, score: 3 },
  CONCERNING: { max: 15, score: 2 },
  CRITICAL: { score: 1 },
} as const;

export const OFSTED_RATINGS = {
  OUTSTANDING: { score: 5, keywords: ['outstanding'] },
  GOOD: { score: 4, keywords: ['good'] },
  REQUIRES_IMPROVEMENT: { score: 2, keywords: ['requires improvement', 'satisfactory'] },
  INADEQUATE: { score: 1, keywords: ['inadequate', 'serious weaknesses', 'special measures'] },
  ISI_DEFAULT: { score: 3, label: 'ISI-Inspected (Assumed Acceptable)' },
} as const;

export const CAPACITY_UTILIZATION = {
  LOW: { max: 60, score: 5 },
  MEDIUM_LOW: { max: 75, score: 4 },
  MEDIUM: { max: 85, score: 3 },
  HIGH: { max: 95, score: 2 },
  VERY_HIGH: { score: 1 },
} as const;

export const LOCATION_RISK = {
  EXCELLENT: { max: 0, score: 5 },
  GOOD: { max: 2, score: 4 },
  ACCEPTABLE: { max: 4, score: 3 },
  CONCERNING: { score: 2 },
} as const;

export const COMPLIANCE_RISK = {
  NONE: { max: 0, score: 5 },
  LOW: { max: 2, score: 4 },
  MEDIUM: { max: 4, score: 3 },
  HIGH: { max: 6, score: 2 },
  CRITICAL: { score: 1 },
} as const;

export const DECISION_THRESHOLDS = {
  GO: 75,           // >= 75%
  INVESTIGATE: 50,  // 50-74%
  AVOID: 0,         // < 50%
} as const;

export const DATA_FRESHNESS = {
  STALE_YEARS: 5,  // Ofsted data older than this is considered stale
} as const;
```

2. Update `auto-assess.ts` to use these constants
3. Update `scoring.ts` decision thresholds

**Files to Create**:
- `src/config/scoring-thresholds.ts`

**Files to Modify**:
- `src/services/auto-assess.ts`
- `src/services/scoring.ts`

---

## 🟡 Medium Priority Tasks

### 8. Create Proper TypeScript Interfaces
**Status**: PENDING
**Estimated Time**: 30-45 minutes
**Priority**: MEDIUM (type safety)

**Current Issue**:
- Heavy use of `as any` throughout codebase, especially in `Assessment.tsx:167-171`
- Defeats TypeScript's purpose and can lead to runtime errors

**Implementation**:
1. Create `src/types/school.ts`:
```typescript
export interface SchoolMetrics {
  school_capacity?: number;
  pupil_count?: number;
  capacity_utilization?: number;
  age_range?: string;
  boarders?: string;
}

export interface SchoolLocation {
  town?: string;
  county?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
}

export interface SchoolContact {
  phone?: string;
  email?: string;
  website?: string;
}

export interface Headteacher {
  title?: string;
  first_name?: string;
  last_name?: string;
  preferred_job_title?: string;
}

export interface VulnerabilityScore {
  total: number;
  pillar2_liquidity: number;
  pillar3_regulatory: number;
  pillar4_governance: number;
  pillar5_assets: number;
  status: string;
  action: string;
}

export interface PillarDetails {
  pillar3?: {
    no_ofsted_data?: {
      flag: string;
      points: number;
    };
  };
  pillar4?: {
    company_number?: string;
    trustee_benefits?: {
      flag: string;
      points: number;
    };
  };
  pillar5?: {
    rural_isolation?: {
      flag: string;
      points: number;
    };
    lease_data_unavailable?: boolean;
  };
  pillar6?: {
    has_boarding?: {
      flag: string;
      status: string;
    };
  };
}

export interface CompanyProfile {
  company_name: string;
  company_number: string;
  company_status: string;
  type: string;
  date_of_creation?: string;
  has_charges?: boolean;
  has_insolvency_history?: boolean;
  sic_codes?: string[];
  registered_office_address?: any;
}

export interface CompanyOfficers {
  items: Array<{
    name: string;
    officer_role: string;
    appointed_on?: string;
    resigned_on?: string;
  }>;
  total_results: number;
}
```

2. Update all files to use proper types instead of `as any`
3. Replace type assertions with proper interfaces

**Files to Create**:
- `src/types/school.ts`
- `src/types/assessment.ts`
- `src/types/localAuthority.ts`

**Files to Modify**:
- `src/pages/Assessment.tsx`
- `src/services/auto-assess.ts`
- `src/services/send-insights.ts`

---

### 9. Clarify Financial Scoring Business Logic
**Status**: PENDING - **REQUIRES USER INPUT**
**Estimated Time**: 15 minutes (once clarified)
**Priority**: MEDIUM (business logic clarity)

**Current Issue**:
- Comments in `auto-assess.ts:129-138` contradict the implementation
- Unclear whether struggling schools are opportunities or risks

**Current Comment**:
```typescript
// Higher vulnerability = BETTER for ISF (school more likely to need help)
// But financial health score = how financially stressed they are
// For ISF assessment, a struggling school = opportunity, but also risk
// Score 5 = healthy finances (low vulnerability), 1 = severe distress
```

**Current Logic**:
- Lower vulnerability score (0-3) = 5 points (best)
- Higher vulnerability score (15+) = 1 point (worst)

**Question for User**:
From ISF's acquisition/commissioning perspective:
- **Option A**: Financially healthy schools are better targets (current implementation)
  - Low risk, stable operations, easier acquisition
  - Current scoring is CORRECT

- **Option B**: Struggling schools are opportunities (inverse needed)
  - Schools in distress may be more willing to sell/partner
  - Can provide turnaround value
  - Need to INVERT the scoring

**Action Required**:
- User must clarify ISF's acquisition strategy
- Update comments to match implementation OR
- Invert scoring logic if struggling schools are targets

**Files to Review**:
- `src/services/auto-assess.ts` (lines 129-152)

---

## 🔵 Lower Priority Tasks

### 10. Implement Companies House Cloud Function Proxy
**Status**: PENDING
**Estimated Time**: 45-60 minutes
**Priority**: LOW (current cache workaround functional)

**Current Issue**:
- Static `ch-cache.json` workaround for CORS issues
- Cache will become stale without manual updates
- Cannot fetch live Companies House data

**Solution**: Firebase Cloud Function proxy

**Implementation**:
1. Create `functions/src/companies-house-proxy.ts`:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const CH_API_BASE = 'https://api.company-information.service.gov.uk';

export const companiesHouseProxy = functions
  .region('europe-west2')
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be logged in to access Companies House data'
      );
    }

    const { endpoint, companyNumber } = data;

    if (!endpoint || !companyNumber) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters'
      );
    }

    try {
      const apiKey = functions.config().companies_house.api_key;
      const auth = Buffer.from(`${apiKey}:`).toString('base64');

      const response = await fetch(`${CH_API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Companies House API error: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Companies House proxy error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to fetch Companies House data',
        error.message
      );
    }
  });
```

2. Set Firebase function secret (recommended for security):
```bash
firebase functions:secrets:set CH_API_KEY
# When prompted, enter your Companies House API key
```

3. Update `src/services/companies-house.ts` to call Cloud Function:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const chProxy = httpsCallable(functions, 'companiesHouseProxy');

export async function getCompanyProfile(companyNumber: string) {
  const result = await chProxy({
    endpoint: `/company/${companyNumber}`,
    companyNumber,
  });
  return result.data;
}
```

4. Deploy functions:
```bash
firebase deploy --only functions
```

**Files to Create**:
- `functions/src/companies-house-proxy.ts`

**Files to Modify**:
- `src/services/companies-house.ts`
- `functions/src/index.ts` (export new function)

**Benefits**:
- Live Companies House data
- No stale cache issues
- Server-side authentication
- Rate limiting control

---

### 11. Refactor Assessment.tsx into Smaller Components
**Status**: PENDING
**Estimated Time**: 1-2 hours
**Priority**: LOW (works but could be cleaner)

**Current Issue**:
- `Assessment.tsx` is 487 lines
- Too many concerns in one component (data fetching, scoring, rendering)
- Hard to test and maintain

**Implementation**:
Extract into smaller, focused components:

**1. Create `src/components/assessment/SchoolOverviewCard.tsx`**:
```typescript
interface Props {
  school: SchoolData;
  gias: GIASSchool | null;
}

export function SchoolOverviewCard({ school, gias }: Props) {
  // Display school basic info, capacity, Ofsted rating
}
```

**2. Create `src/components/assessment/VulnerabilityAnalysisCard.tsx`**:
```typescript
interface Props {
  vulnerabilityScore: VulnerabilityScore;
}

export function VulnerabilityAnalysisCard({ vulnerabilityScore }: Props) {
  // Display vulnerability breakdown
}
```

**3. Create `src/components/assessment/LocalAuthorityCard.tsx`**:
```typescript
interface Props {
  la: LocalAuthority;
}

export function LocalAuthorityCard({ la }: Props) {
  // Display LA data, safety valve info, unplaced learners
}
```

**4. Create `src/components/assessment/CompaniesHouseCard.tsx`**:
```typescript
interface Props {
  company: CompanyProfile | null;
  officers: CompanyOfficers | null;
}

export function CompaniesHouseCard({ company, officers }: Props) {
  // Display company info, directors, charges
}
```

**5. Create `src/components/assessment/ScoringPanel.tsx`**:
```typescript
interface Props {
  scores: AutoScores;
  overrides: Record<string, number | null>;
  onOverride: (key: string, value: number | null) => void;
  scoringResult: ScoringResult;
}

export function ScoringPanel({ scores, overrides, onOverride, scoringResult }: Props) {
  // Display all criteria with scores and override UI
}
```

**6. Refactor `Assessment.tsx`**:
- Keep only orchestration logic
- Use extracted components
- Reduce to ~150 lines

**Files to Create**:
- `src/components/assessment/SchoolOverviewCard.tsx`
- `src/components/assessment/VulnerabilityAnalysisCard.tsx`
- `src/components/assessment/LocalAuthorityCard.tsx`
- `src/components/assessment/CompaniesHouseCard.tsx`
- `src/components/assessment/ScoringPanel.tsx`

**Files to Modify**:
- `src/pages/Assessment.tsx` (major refactor)

**Benefits**:
- Easier to test individual components
- Better code organization
- Reusable components
- Easier to maintain

---

## 📊 Missing Features (Future Enhancements)

### Testing
- [ ] Unit tests with Jest + React Testing Library
- [ ] Integration tests with Firebase Emulator
- [ ] E2E tests with Cypress
- [ ] Test coverage targets (>80%)

### Monitoring & Logging
- [ ] Error tracking (Sentry integration)
- [ ] Analytics (Google Analytics or similar)
- [ ] Performance monitoring
- [ ] User activity logging

### Data Management
- [ ] Data refresh mechanism (not just on page reload)
- [ ] Pagination for search results
- [ ] Bulk export functionality
- [ ] Audit trail for assessments

### UI/UX Improvements
- [ ] Loading skeletons instead of spinners
- [ ] Search history/recent schools
- [ ] Keyboard shortcuts
- [ ] Dark/light mode toggle (currently dark only)
- [ ] Mobile-responsive improvements

### Business Features
- [ ] Comparison view (side-by-side schools)
- [ ] Custom scoring weights (per user/team)
- [ ] PDF report export
- [ ] Email sharing of reports
- [ ] Bulk assessment import

---

## 🚀 Deployment Checklist

### Before Each Deployment
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in dev mode
- [ ] Test key user flows (search, assessment, save)
- [ ] Check mobile responsiveness
- [ ] Review environment variables in `.env.local`

### Deployment Commands
```bash
# Build
npm run build

# Deploy hosting only
firebase deploy --only hosting:assess

# Deploy hosting + Firestore rules
firebase deploy --only hosting:assess,firestore:rules

# Deploy functions (when added)
firebase deploy --only functions

# Full deployment
firebase deploy
```

### Post-Deployment
- [ ] Test live URL: https://isf-assess.web.app
- [ ] Verify authentication works
- [ ] Test school search
- [ ] Run a full assessment
- [ ] Check Firebase Console for errors

---

## 📞 Support

**Primary Contact**: noah.price@isf.ltd
**Firebase Project**: phoenix-education-123
**GitHub**: [TBD - Create repository]

**Related Projects**:
- SEND Insights Dashboard: `/Users/noahprice/Documents/_Antigravity/National SEND Insight Dashboard`
- ISF Website: `/Users/noahprice/Documents/_Antigravity/ISG-Website`
- SEND Calculator: `/Users/noahprice/Documents/_Antigravity/SEND-School-Setup-Calculator`

---

## 📝 Notes

### Code Review Summary (Opus 4.6)
**Overall Rating**: 7.5/10
- **Strengths**: Excellent architecture, sophisticated auto-assessment, good error handling
- **Main Issues**: Security (fixed), TypeScript gaps, UX polish needed
- **Standout Feature**: Auto-assessment engine with confidence-based scoring

### Development Environment
- **Node.js**: v18+ recommended
- **Package Manager**: npm
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4

### API Keys Location
- **Companies House**: Stored in `.env.local` and Firebase config
- **Firebase**: Stored in `.env.local`
- **Service Account**: Not in repo, contact noah.price@isf.ltd

---

**END OF TODO**
