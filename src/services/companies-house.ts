/**
 * Companies House data access
 * 
 * Uses a pre-built static cache (public/data/ch-cache.json) populated
 * by the server-side enrichment script. Falls back gracefully if not cached.
 * 
 * The CH API doesn't support browser CORS, so direct calls from the browser
 * will fail. A Firebase Cloud Function proxy is the long-term fix.
 */

let chCache: Record<string, any> | null = null;
let cacheLoading: Promise<void> | null = null;

async function loadCache(): Promise<void> {
  if (chCache !== null) return;
  if (cacheLoading) return cacheLoading;
  
  cacheLoading = (async () => {
    try {
      const res = await fetch('/data/ch-cache.json');
      if (res.ok) {
        chCache = await res.json();
        console.log(`CH cache loaded: ${Object.keys(chCache!).length} entries`);
      } else {
        chCache = {};
      }
    } catch {
      chCache = {};
    }
  })();
  
  return cacheLoading;
}

function getCached(urn: string): any | null {
  return chCache?.[urn] ?? null;
}

// Public API — used by auto-assess with URN context
export async function getCompanyProfileByUrn(urn: string): Promise<any | null> {
  await loadCache();
  const cached = getCached(urn);
  if (cached) {
    return {
      company_name: cached.company_name,
      company_number: cached.company_number,
      company_status: cached.company_status,
      type: cached.type,
      date_of_creation: cached.date_of_creation,
      has_charges: cached.has_charges,
      has_insolvency_history: cached.has_insolvency_history,
      sic_codes: cached.sic_codes,
      registered_office_address: cached.registered_office,
    };
  }
  return null;
}

export async function getOfficersByUrn(urn: string): Promise<any | null> {
  await loadCache();
  const cached = getCached(urn);
  if (cached?.officers) {
    return {
      items: cached.officers.map((o: any) => ({
        name: o.name,
        officer_role: o.role,
        appointed_on: o.appointed,
        resigned_on: o.resigned,
      })),
      total_results: cached.officers_total,
    };
  }
  return null;
}

// Legacy API — kept for compatibility but will fail due to CORS
export async function searchCompany(name: string) {
  void name;
  throw new Error('Direct CH API calls not supported (CORS). Use cached data.');
}

export async function getCompanyProfile(companyNumber: string) {
  void companyNumber;
  throw new Error('Direct CH API calls not supported (CORS). Use getCompanyProfileByUrn().');
}

export async function getOfficers(companyNumber: string) {
  void companyNumber;
  throw new Error('Direct CH API calls not supported (CORS). Use getOfficersByUrn().');
}

export async function getFilingHistory(companyNumber: string) {
  void companyNumber;
  throw new Error('Direct CH API calls not supported (CORS). Use cached data.');
}

export async function getCharges(companyNumber: string) {
  void companyNumber;
  throw new Error('Direct CH API calls not supported (CORS). Use cached data.');
}
