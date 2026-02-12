/**
 * Enrich independent_schools Firestore docs with Companies House data.
 * Runs server-side, writes to Firestore subcollection assess_ch_cache.
 *
 * REQUIRES environment variables:
 *   - FIREBASE_API_KEY: Firebase Web API key
 *   - CH_API_KEY: Companies House API key
 *   - FIREBASE_USER_EMAIL: Email for Firebase authentication
 *   - FIREBASE_USER_PASSWORD: Password for Firebase authentication
 *
 * Usage: node enrich-schools.js [urn]
 *   If URN provided, enriches just that school.
 *   Otherwise enriches all schools with company numbers.
 */

require('dotenv').config(); // Load from .env.local

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const CH_API_KEY = process.env.CH_API_KEY;
const FIREBASE_USER_EMAIL = process.env.FIREBASE_USER_EMAIL;
const FIREBASE_USER_PASSWORD = process.env.FIREBASE_USER_PASSWORD;
const PROJECT_ID = 'phoenix-education-123';

// Validate required environment variables
if (!FIREBASE_API_KEY || !CH_API_KEY || !FIREBASE_USER_EMAIL || !FIREBASE_USER_PASSWORD) {
  console.error('ERROR: Missing required environment variables');
  console.error('Required: FIREBASE_API_KEY, CH_API_KEY, FIREBASE_USER_EMAIL, FIREBASE_USER_PASSWORD');
  console.error('Set them in .env.local file');
  process.exit(1);
}

async function getAuthToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: FIREBASE_USER_EMAIL,
        password: FIREBASE_USER_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (!data.idToken) {
    console.error('Authentication failed:', data.error?.message || 'Unknown error');
    process.exit(1);
  }
  return data.idToken;
}

async function fetchCH(path) {
  const auth = 'Basic ' + Buffer.from(CH_API_KEY + ':').toString('base64');
  const res = await fetch(`https://api.company-information.service.gov.uk${path}`, {
    headers: { Authorization: auth, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function writeToFirestore(token, docPath, data) {
  // Convert JS object to Firestore field format
  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
    if (typeof val === 'object') {
      const fields = {};
      for (const [k, v] of Object.entries(val)) {
        fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    console.error(`  Firestore write error for ${docPath}:`, err.error?.message || JSON.stringify(err));
    return false;
  }
  return true;
}

async function enrichSchool(token, urn, companyNumber) {
  console.log(`Enriching URN ${urn} (company ${companyNumber})...`);
  
  const [profile, officers] = await Promise.all([
    fetchCH(`/company/${companyNumber}`),
    fetchCH(`/company/${companyNumber}/officers`),
  ]);

  if (!profile) {
    console.log(`  No profile found for ${companyNumber}`);
    return;
  }

  const cacheData = {
    company_number: companyNumber,
    company_name: profile.company_name || '',
    company_status: profile.company_status || '',
    company_type: profile.type || '',
    date_of_creation: profile.date_of_creation || '',
    has_charges: profile.has_charges || false,
    has_insolvency_history: profile.has_insolvency_history || false,
    registered_office: profile.registered_office_address || {},
    sic_codes: profile.sic_codes || [],
    accounts: profile.accounts || {},
    officers: officers?.items?.slice(0, 10)?.map(o => ({
      name: o.name,
      role: o.officer_role,
      appointed: o.appointed_on || '',
      resigned: o.resigned_on || '',
    })) || [],
    officers_total: officers?.total_results || 0,
    enriched_at: new Date().toISOString(),
  };

  const success = await writeToFirestore(token, `assess_ch_cache/${urn}`, cacheData);
  if (success) {
    console.log(`  ✓ Cached CH data for ${profile.company_name}`);
  }
}

async function getSchoolsWithCompanyNumbers(token) {
  // Fetch all independent_schools and find ones with company numbers in pillar_details
  let allDocs = [];
  let pageToken = null;
  
  do {
    let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/independent_schools?pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    
    if (data.documents) {
      allDocs = allDocs.concat(data.documents);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Found ${allDocs.length} schools total`);
  
  const schools = [];
  for (const doc of allDocs) {
    const urn = doc.name.split('/').pop();
    const p4 = doc.fields?.pillar_details?.mapValue?.fields?.pillar4?.mapValue?.fields;
    const companyNumber = p4?.company_number?.stringValue;
    if (companyNumber) {
      schools.push({ urn, companyNumber });
    }
  }
  
  console.log(`${schools.length} schools have company numbers`);
  return schools;
}

async function main() {
  const targetUrn = process.argv[2];
  const token = await getAuthToken();
  
  if (targetUrn) {
    // Get just this school's company number
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/independent_schools/${targetUrn}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const doc = await res.json();
    const p4 = doc.fields?.pillar_details?.mapValue?.fields?.pillar4?.mapValue?.fields;
    const companyNumber = p4?.company_number?.stringValue;
    if (companyNumber) {
      await enrichSchool(token, targetUrn, companyNumber);
    } else {
      console.log(`No company number found for URN ${targetUrn}`);
    }
  } else {
    const schools = await getSchoolsWithCompanyNumbers(token);
    let count = 0;
    for (const { urn, companyNumber } of schools) {
      await enrichSchool(token, urn, companyNumber);
      count++;
      // Rate limit: CH allows 600 requests per 5 minutes
      if (count % 50 === 0) {
        console.log(`  Processed ${count}/${schools.length}, pausing...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    console.log(`Done. Enriched ${count} schools.`);
  }
}

main().catch(console.error);
