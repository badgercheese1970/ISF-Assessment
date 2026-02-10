# ISF School Assessment Tool

Automated 23-step school assessment process for Independent Schools Futures (ISF).

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Build Tool:** Vite
- **Backend:** Firebase (Firestore + Hosting)
- **Project:** `phoenix-education-123`
- **Region:** `europe-west2`

## Features

### Data Engine Modules

1. **GIAS CSV Parser** (`src/services/gias.ts`)
   - Downloads and parses GIAS establishment data
   - Search by school name or URN
   - Extracts all assessment-relevant fields

2. **Companies House API** (`src/services/companies-house.ts`)
   - Company profile, officers, filing history, charges
   - Basic auth with API key
   - Full company data aggregation

3. **Charity Commission API** (`src/services/charity-commission.ts`)
   - Charity search and details
   - Financial history retrieval
   - Fallback to search API if needed

4. **Commissioning Forecast Calculator** (`src/services/forecast.ts`)
   - Implements Steps 12-17 of assessment process
   - Addressable demand, demand ratios, LA quality analysis
   - Fill percentage predictions using lookup table
   - Multiple capacity scenario modeling

5. **Go/No-Go Scoring Engine** (`src/services/scoring.ts`)
   - Implements Steps 18-21 of assessment process
   - 8 criteria with weighted scoring (3,2,2,2,1,1,1,1)
   - Handles TBC fields gracefully
   - Decision logic: GO / INVESTIGATE / AVOID

6. **SEND Insights Firestore Access** (`src/services/send-insights.ts`)
   - READ ONLY access to existing collections
   - Local authority data queries
   - Independent schools data
   - Catchment analysis using isochrone data

7. **Report Generator** (`src/services/report-generator.ts`)
   - Structured Markdown report generation
   - Sections: Overview, Financial Health, Catchment, Forecast, Scoring, Flags, Recommendation
   - Quick summary generation

### UI Pages

1. **Dashboard** (`src/pages/Dashboard.tsx`)
   - School search by name or URN
   - Results display with quick actions
   - Start assessment workflow

2. **Assessment** (`src/pages/Assessment.tsx`)
   - Run full automated assessment
   - Manual scoring interface for 8 criteria
   - Report generation and download

3. **Reports** (`src/pages/Reports.tsx`)
   - List of saved assessment reports
   - View, download, delete functionality
   - Statistics dashboard

## Firebase Collections

### Existing (READ ONLY)
- `send_local_authorities` — LA data from SEND Insights
- `independent_schools` — School vulnerability data
- `isochrone_cache` — Cached travel zones

### New (READ/WRITE)
- `assess_reports` — Saved assessment reports
- `assess_users` — Authorized users

## Development

### Install Dependencies
```bash
npm install
```

### Run Dev Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Deploy to Firebase
```bash
firebase deploy --only hosting:assess
```

## API Keys

- **Companies House API:** Stored in `/home/moltbot/clawd/.secrets/companies-house-api.json`
- **Google Service Account:** Stored in `/home/moltbot/clawd/.secrets/google-service-account.json`

## Security Rules

- Firestore rules enforce READ ONLY access to existing collections
- All new collections prefixed with `assess_`
- Authentication required for writing reports

## Important Notes

⚠️ **DO NOT** modify ANY files outside `/home/moltbot/clawd/isf-assess/`  
⚠️ **DO NOT** write to existing Firestore collections  
⚠️ **READ ONLY** access to `send_local_authorities`, `independent_schools`, `isochrone_cache`  
⚠️ All new collections **MUST** be prefixed with `assess_`

## License

Proprietary - Independent Schools Futures (ISF)
