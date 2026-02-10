# ISF School Assessment Tool

## Important: Multi-Project Architecture

This project is **one of multiple ISF applications** under the parent directory:

```
/Users/noahprice/Documents/_Antigravity/
├── ISG-Website/                          ← ISF corporate website
│   ├── GitHub: badgercheese1970/ISG-Website
│   ├── Firebase site: isf-website
│   └── Domain: isf.ltd, www.isf.ltd
│
├── National SEND Insight Dashboard/      ← SEND data dashboard
│   ├── GitHub: badgercheese1970/Phoenix-SEND-Insight-Dashboard
│   ├── Firebase site: send-dashboard (default)
│   └── Domains: insights.isf.ltd, send-dashboard.web.app
│
├── SEND-School-Setup-Calculator/         ← SEND cost calculator
│   ├── GitHub: badgercheese1970/SEN-School-Set-Up
│   ├── Firebase site: send-calculator
│   └── Domain: sensetup.isf.ltd
│
└── ISF Assess/                           ← THIS PROJECT (School assessment tool)
    ├── GitHub: [TBD]
    ├── Firebase site: isf-assess
    └── Domain: assess.isf.ltd [TO BE CONFIGURED]
```

**All projects deploy to the same Firebase project** (`phoenix-education-123`) but as **different hosting sites**. This allows:
- Separate codebases and version control
- Independent deployments
- Shared Firebase resources (Firestore, Functions, Auth)
- Consistent user authentication across all applications

**When working on this project**, always ensure you're in the correct directory:
```bash
cd "/Users/noahprice/Documents/_Antigravity/ISF Assess"
```

**Deployment command**:
```bash
firebase deploy --only hosting:assess
```

## Project Overview

An automated 23-step school assessment tool for Independent Schools Futures (ISF) to evaluate acquisition and commissioning opportunities. This tool aggregates data from multiple government sources to provide comprehensive financial, operational, and market analysis for independent schools.

**Firebase Project**: phoenix-education-123
**Hosting Site**: isf-assess
**Target Domain**: assess.isf.ltd [TO BE CONFIGURED]
**Account**: noahprice1@gmail.com

## Project Goals

- Automate the 23-step school assessment process
- Aggregate data from GIAS, Companies House, Charity Commission
- Leverage existing SEND Insights data for catchment analysis
- Provide Go/No-Go decision framework with weighted scoring
- Generate comprehensive assessment reports for decision-makers

## Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite 7
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **Data Parsing**: PapaParse (CSV handling)

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Functions**: Cloud Functions for Firebase
- **Hosting**: Firebase Hosting (Google Cloud)

### Data Integration

#### External APIs
1. **GIAS (Get Information About Schools)**
   - URL: https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/
   - CSV download of all UK schools
   - No authentication required

2. **Companies House API**
   - Base URL: https://api.company-information.service.gov.uk/
   - Authentication: Basic auth with API key
   - **API Key**: Stored in Firebase environment config
   - **CORS Issue**: Requires Cloud Function proxy for browser calls

3. **Charity Commission API**
   - Base URL: https://api.charitycommission.gov.uk/
   - No authentication required
   - Search and details endpoints

4. **SEND Insights Integration**
   - **READ ONLY** access to existing Firestore collections
   - Collections: `send_local_authorities`, `independent_schools`, `isochrone_cache`
   - Used for catchment analysis and LA vulnerability scoring

### ISF Branding
- Logo and color scheme to be aligned with ISF corporate identity
- Dark theme with professional business aesthetic
- Consistent with other ISF applications

## Data Schema

### Firestore Collections

#### New Collections (READ/WRITE)
```
assess_reports/
  {reportId}/
    - schoolUrn: string
    - schoolName: string
    - generatedAt: timestamp
    - generatedBy: string (email)
    - scores: ScoreCard
    - reportMarkdown: string
    - rawData: {
        gias: {},
        companiesHouse: {},
        charity: {},
        sendInsights: {}
      }
```

```
assess_users/
  {userId}/
    - email: string
    - role: 'admin' | 'assessor'
    - createdAt: timestamp
    - lastLogin: timestamp
```

#### Existing Collections (READ ONLY)
- `send_local_authorities` - LA data from SEND Insights
- `independent_schools` - School vulnerability data
- `isochrone_cache` - Travel-time catchment zones

## Assessment Process

### 23-Step Framework

#### Steps 1-11: Data Collection
1. School basic info (GIAS)
2. Location and catchment
3. Capacity and utilization
4. Ofsted rating
5. Financial data (Companies House)
6. Charity Commission registration
7. Governance structure
8. Current ownership
9. Historical performance
10. Safeguarding/compliance checks
11. Legal charges/encumbrances

#### Steps 12-17: Commissioning Forecast
12. Addressable demand calculation
13. Demand ratio analysis
14. LA quality assessment
15. Fill percentage prediction
16. Capacity scenario modeling
17. Revenue forecasting

#### Steps 18-21: Go/No-Go Scoring
18. **Criterion 1**: Addressable Demand & Commissioning Opportunity (Weight: 3)
19. **Criterion 2**: Ofsted Rating & Regulatory Standing (Weight: 2)
20. **Criterion 3**: Physical Capacity & Utilization (Weight: 2)
21. **Criterion 4**: Financial Health (Weight: 2)
22. **Criterion 5**: Governance & Leadership Quality (Weight: 1)
23. **Criterion 6**: Legal/Compliance Risk (Weight: 1)
24. **Criterion 7**: Strategic Fit with ISF Portfolio (Weight: 1)
25. **Criterion 8**: Acquisition Complexity (Weight: 1)

**Total Weight**: 13 points
**Maximum Score**: 65 points (13 criteria × 5 max score)

#### Steps 22-23: Decision & Reporting
22. Calculate weighted score and recommendation
23. Generate comprehensive report

### Scoring Logic

**Decision Thresholds**:
- **GO** (60+ points): Strong acquisition target
- **INVESTIGATE** (40-59 points): Requires deeper due diligence
- **AVOID** (<40 points): Not suitable for acquisition

**Confidence Levels**:
- **HIGH**: Data-backed scoring with multiple sources
- **MEDIUM**: Partial data, some assumptions made
- **LOW**: Significant data gaps, requires manual review
- **MANUAL**: Human judgment required

## Key Features

### 1. Automated Assessment Engine
- Parallel data fetching from multiple sources
- Confidence-based scoring with transparent rationales
- Manual override capability for human judgment
- Error accumulation instead of fail-fast

### 2. School Search & Discovery
- Search by school name or URN (6-digit unique reference number)
- GIAS CSV parsing with fuzzy matching
- Results display with quick actions

### 3. SEND Insights Integration
- Leverages existing LA vulnerability data
- Catchment analysis using isochrone travel zones
- Addressable demand calculations
- Safety Valve pool classifications

### 4. Report Generation
- Structured Markdown reports
- Sections: Overview, Financial Health, Catchment, Forecast, Scoring, Flags, Recommendation
- Quick summary generation
- Download and archive functionality

### 5. Multi-User Authentication
- Email/password authentication
- Admin and assessor roles
- Super admin designation
- Activity logging

## Security Model

### Authentication
- Firebase Auth with email/password
- Role-based access control (admin vs assessor)
- Super admins configured via environment variables

### Firestore Security Rules
```javascript
// READ ONLY access to SEND Insights collections
match /send_local_authorities/{document=**} {
  allow read: if request.auth != null;
  allow write: if false;
}

// Full access to assess_ collections
match /assess_reports/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

### API Keys & Secrets
- **Companies House API**: Stored in Firebase environment config
- **Service Account**: Firebase Admin SDK credentials
- **Never commit API keys to Git**

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Access at http://localhost:5173
```

### Firebase Emulator (Optional)
```bash
firebase emulators:start
```

### Build for Production
```bash
npm run build
```

### Deploy to Firebase
```bash
# Deploy hosting only
firebase deploy --only hosting:assess

# Deploy functions
firebase deploy --only functions

# Deploy firestore rules
firebase deploy --only firestore:rules

# Full deployment
firebase deploy
```

## File Structure

```
/
├── src/
│   ├── App.tsx                          # Main app component with routing
│   ├── main.tsx                         # React entry point
│   ├── firebase.ts                      # Firebase config
│   ├── components/
│   │   └── ProtectedRoute.tsx           # Auth route wrapper
│   ├── contexts/
│   │   └── AuthContext.tsx              # Authentication state
│   ├── pages/
│   │   ├── LoginPage.tsx                # User authentication
│   │   ├── Dashboard.tsx                # School search interface
│   │   ├── Assessment.tsx               # Main assessment page
│   │   └── Reports.tsx                  # Saved reports list
│   ├── services/
│   │   ├── gias.ts                      # GIAS CSV parsing
│   │   ├── companies-house.ts           # Companies House API
│   │   ├── charity-commission.ts        # Charity Commission API
│   │   ├── send-insights.ts             # SEND Dashboard integration
│   │   ├── auto-assess.ts               # Automated scoring engine
│   │   ├── forecast.ts                  # Commissioning forecast
│   │   ├── scoring.ts                   # Go/No-Go decision logic
│   │   └── report-generator.ts          # Markdown report creation
│   └── types/
│       └── index.ts                     # TypeScript type definitions
├── functions/
│   └── src/
│       └── ch-proxy.ts                  # Companies House CORS proxy
├── public/
│   └── data/
│       └── ch-cache.json                # Temporary Companies House cache
├── ch-proxy/                            # Local CORS proxy for development
├── data/                                # Data files and lookups
├── firebase.json                        # Firebase configuration
├── firestore.rules                      # Security rules
├── .firebaserc                          # Firebase project config
└── package.json                         # Dependencies
```

## Known Issues & Technical Debt

### 🔴 Critical Issues (From Opus 4.6 Review)

1. **Security: Hardcoded Admin Emails**
   - Location: `src/contexts/AuthContext.tsx:12-16`
   - Issue: Super admin emails hardcoded in source code
   - Fix: Move to environment variables or Firestore custom claims

2. **TypeScript: Heavy `as any` Usage**
   - Location: Throughout codebase, especially `Assessment.tsx:167-171`
   - Issue: Defeats TypeScript type safety
   - Fix: Create proper interfaces for all data structures

3. **CORS Workaround: Static Companies House Cache**
   - Location: `src/services/companies-house.ts`
   - Issue: Static JSON cache will become stale
   - Fix: Implement Firebase Cloud Function proxy

4. **UX: Alert() Usage**
   - Location: `Assessment.tsx:134-137`
   - Issue: Browser alerts are poor UX
   - Fix: Implement toast notification library (react-hot-toast)

5. **Component Size: Assessment.tsx Too Large**
   - Location: `Assessment.tsx` (487 lines)
   - Issue: Too many concerns in one component
   - Fix: Extract into smaller components:
     - `<SchoolOverviewCard />`
     - `<VulnerabilityAnalysisCard />`
     - `<LocalAuthorityCard />`
     - `<CompaniesHouseCard />`
     - `<ScoringPanel />`

6. **Magic Numbers: Hardcoded Thresholds**
   - Location: `src/services/auto-assess.ts:85-90`
   - Issue: Thresholds scattered throughout code
   - Fix: Extract to configuration file

7. **Missing: Error Boundaries**
   - Issue: No React error boundaries for graceful error handling
   - Fix: Add error boundary wrapper component

8. **Missing: Input Validation**
   - Location: `Dashboard.tsx:15-32`
   - Issue: Only whitespace validation on search
   - Fix: Proper validation for URNs (6 digits) and search terms

9. **Unclear: Financial Scoring Logic**
   - Location: `src/services/auto-assess.ts:129-138`
   - Issue: Comments contradict implementation
   - Fix: Clarify business logic - are struggling schools opportunities or risks?

### 🟡 Missing Features

- No unit tests, integration tests, or E2E tests
- No logging/monitoring (e.g., Sentry)
- No data refresh mechanism
- No pagination for search results
- No bulk export functionality
- No audit trail for assessment history

## Environment Variables

Create `.env.local` for local development:

```bash
# Firebase Config (already in firebase.ts)
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=phoenix-education-123.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=phoenix-education-123

# Companies House API
VITE_COMPANIES_HOUSE_API_KEY=25a59c7c-1311-4a91-a4c6-fe92c543bcfe

# Super Admin Emails (comma-separated)
VITE_SUPER_ADMIN_EMAILS=noahprice1@gmail.com,noah.price@isf.ltd,martyn.ward@isf.ltd
```

For Firebase Functions:
```bash
firebase functions:config:set companies_house.api_key="25a59c7c-1311-4a91-a4c6-fe92c543bcfe"
```

## Custom Domain Configuration

**Domain**: assess.isf.ltd
**DNS Provider**: Cloudflare
**Firebase Hosting Site**: isf-assess

### DNS Records (Cloudflare)
- **CNAME**: `assess` → `isf-assess.web.app` (DNS only, gray cloud)
- **TXT**: `_acme-challenge.assess` → Firebase verification code

### Setup Process
1. Firebase Console → Hosting → Add custom domain
2. Add TXT record to Cloudflare for verification
3. Add CNAME record (DNS only, not proxied)
4. Wait for DNS propagation (up to 24 hours)
5. Firebase provisions SSL certificate automatically

## Business Logic & Formulas

### Addressable Demand
```typescript
addressableDemand = localAuthority.metrics.awaitingProvision || 0
```

### Demand Ratio
```typescript
demandRatio = addressableDemand / schoolCapacity
```

### Fill Percentage Prediction
Based on lookup table correlating LA Safety Valve pool with fill rates:
- Pool 1 (Sustainable): 85-95%
- Pool 2 (Standard Monitoring): 75-85%
- Pool 3 (DBV): 60-75%
- Pool 4 (SV Paralysis): 40-60%

### Weighted Score Calculation
```typescript
totalScore = Σ(criterion_score × criterion_weight)
maxPossible = Σ(5 × criterion_weight) = 65
percentage = (totalScore / maxPossible) × 100
```

## Testing Strategy

### Unit Tests (To Be Implemented)
- Service layer functions (data fetching, calculations)
- Scoring algorithms
- Data transformations

### Integration Tests (To Be Implemented)
- Firebase Firestore queries
- API integrations
- Authentication flows

### E2E Tests (To Be Implemented)
- Complete assessment workflow
- Report generation
- User authentication

## Maintenance

### Weekly Tasks
- Monitor Companies House API usage
- Review error logs
- Check for stale cached data

### Monthly Tasks
- Update GIAS CSV data
- Review assessment accuracy
- Update scoring thresholds based on outcomes

### Quarterly Tasks
- Audit super admin list
- Review security rules
- Performance optimization

## Support & Documentation

- **GitHub**: [TBD - Create repository]
- **Primary Contact**: noahprice1@gmail.com
- **TODO/Roadmap**: See [TODO.md](TODO.md) for complete improvement roadmap
- **Related Projects**:
  - SEND Insights Dashboard (data source)
  - ISF Website (corporate site)
  - SEND Calculator (companion tool)

## Recent Updates

### February 2025: Initial Creation
- App generated by Claude Code (MoltBot/ClaudeBot)
- Comprehensive code review by Opus 4.6
- Identified security, TypeScript, and UX issues
- Task list created for cleanup and integration

### Planned Improvements
1. Fix critical security vulnerabilities
2. Implement proper TypeScript interfaces
3. Create Companies House Cloud Function proxy
4. Replace alerts with toast notifications
5. Refactor large components
6. Extract configuration constants
7. Add error boundaries and input validation
8. Clarify financial scoring business logic

## License

Proprietary - Independent Schools Futures (ISF)
