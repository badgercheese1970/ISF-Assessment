/**
 * Auto-Assessment Engine
 * 
 * Pulls data from multiple sources and auto-scores the 8 criteria:
 * 1. Commissioning Demand (weight 3) — from LA metrics + forecast
 * 2. Financial Health (weight 2) — from vulnerability score + Companies House
 * 3. Building Condition (weight 2) — from inspection data (often manual)
 * 4. Staffing/Leadership (weight 2) — from head teacher data + stability indicators
 * 5. Legals/Compliance (weight 1) — from governance pillar + regulatory data
 * 6. Location/Access (weight 1) — from geographic data + transport
 * 7. Reputation (weight 1) — from rationale + target status
 * 8. Synergy (weight 1) — ISF strategic fit (manual)
 */

import { getSchoolByUrn, getLocalAuthorityByName, type SchoolData } from './send-insights';
import { getCompanyProfileByUrn, getOfficersByUrn } from './companies-house';
import { searchSchools, type GIASSchool } from './gias';

export interface AssessmentData {
  school: SchoolData | null;
  gias: GIASSchool | null;
  la: any | null;
  company: any | null;
  officers: any | null;
  scores: AutoScores;
  loading: boolean;
  errors: string[];
}

export interface AutoScore {
  score: number | null;  // 1-5
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL';
  rationale: string;
  dataPoints: string[];
}

export interface AutoScores {
  commissioningDemand: AutoScore;
  ofstedRating: AutoScore;
  financialHealth: AutoScore;
  buildingCondition: AutoScore;
  staffingLeadership: AutoScore;
  legalsCompliance: AutoScore;
  locationAccess: AutoScore;
  reputation: AutoScore;
  synergy: AutoScore;
}

function emptyScore(): AutoScore {
  return { score: null, confidence: 'MANUAL', rationale: 'Awaiting data', dataPoints: [] };
}

export function emptyScores(): AutoScores {
  return {
    commissioningDemand: emptyScore(),
    ofstedRating: emptyScore(),
    financialHealth: emptyScore(),
    buildingCondition: emptyScore(),
    staffingLeadership: emptyScore(),
    legalsCompliance: emptyScore(),
    locationAccess: emptyScore(),
    reputation: emptyScore(),
    synergy: emptyScore(),
  };
}

// ─── Commissioning Demand ───────────────────────────────────────
function scoreCommissioningDemand(_school: SchoolData, la: any): AutoScore {
  const dataPoints: string[] = [];
  const metrics = la?.metrics || {};
  const placements = metrics?.placements || {};
  const operational = metrics?.operational || {};
  const svp = la?.safetyValvePool || {};

  const awaiting = placements?.awaiting_provision;
  const totalEhcps = operational?.total_ehcps;
  const pool = svp?.pool;

  if (awaiting !== undefined) dataPoints.push(`${awaiting} learners awaiting provision in ${la?.la_name || 'LA'}`);
  if (totalEhcps !== undefined) dataPoints.push(`${totalEhcps} total EHCPs`);
  if (pool !== undefined) dataPoints.push(`Safety Valve Pool ${pool} (${pool === 1 ? 'fastest commissioning' : pool === 2 ? 'good' : pool === 3 ? 'slower' : 'difficult'})`);

  // Score logic
  let score: number | null = null;
  let confidence: AutoScore['confidence'] = 'MANUAL';

  if (awaiting !== undefined && pool !== undefined) {
    // High demand = high score
    if (awaiting >= 200 && pool <= 2) { score = 5; confidence = 'HIGH'; }
    else if (awaiting >= 100 && pool <= 2) { score = 4; confidence = 'HIGH'; }
    else if (awaiting >= 100 && pool === 3) { score = 3; confidence = 'MEDIUM'; }
    else if (awaiting >= 50) { score = 3; confidence = 'MEDIUM'; }
    else if (awaiting >= 20) { score = 2; confidence = 'MEDIUM'; }
    else { score = 1; confidence = 'MEDIUM'; }
  } else if (awaiting !== undefined) {
    if (awaiting >= 150) { score = 4; confidence = 'LOW'; }
    else if (awaiting >= 50) { score = 3; confidence = 'LOW'; }
    else { score = 2; confidence = 'LOW'; }
  }

  const rationale = score !== null
    ? `Based on ${awaiting || '?'} unplaced learners and Pool ${pool || '?'} LA classification.`
    : 'Insufficient data for auto-scoring.';

  return { score, confidence, rationale, dataPoints };
}

// ─── Ofsted Rating & Regulatory Standing ────────────────────────
function scoreOfstedRating(school: SchoolData, giasData?: any): AutoScore {
  const dataPoints: string[] = [];
  const pillarDetails = school?.pillar_details as any;
  const p3 = pillarDetails?.pillar3;

  // Get Ofsted data from GIAS or school data
  const ofstedRating = giasData?.OfstedRating || (school as any)?.ofsted_rating || '';
  const ofstedDate = giasData?.OfstedLastInsp || (school as any)?.last_inspection_date || '';
  const inspectorate = giasData?.InspectorateName || (school as any)?.inspectorate || '';

  // Check for no Ofsted data flag
  const noOfstedData = p3?.no_ofsted_data;

  if (noOfstedData) {
    dataPoints.push('No Ofsted data (likely ISI-inspected)');
    return {
      score: 3,
      confidence: 'MEDIUM',
      rationale: 'Independent school inspected by ISI rather than Ofsted. Assumed acceptable regulatory standing.',
      dataPoints
    };
  }

  if (inspectorate) {
    dataPoints.push(`Inspectorate: ${inspectorate}`);
  }

  if (ofstedRating) {
    dataPoints.push(`Ofsted Rating: ${ofstedRating}`);
  }

  if (ofstedDate) {
    dataPoints.push(`Last Inspection: ${ofstedDate}`);
  }

  // Score based on Ofsted rating
  let score: number | null = null;
  let confidence: AutoScore['confidence'] = 'MANUAL';

  if (ofstedRating) {
    const rating = ofstedRating.toLowerCase();

    if (rating.includes('outstanding')) {
      score = 5;
      confidence = 'HIGH';
    } else if (rating.includes('good')) {
      score = 4;
      confidence = 'HIGH';
    } else if (rating.includes('requires improvement') || rating.includes('satisfactory')) {
      score = 2;
      confidence = 'HIGH';
      dataPoints.push('⚠️ School requires improvement');
    } else if (rating.includes('inadequate') || rating.includes('serious weaknesses') || rating.includes('special measures')) {
      score = 1;
      confidence = 'HIGH';
      dataPoints.push('🚨 Inadequate rating - high regulatory risk');
    } else {
      // Unknown rating format
      score = 3;
      confidence = 'LOW';
    }
  }

  // Check inspection date recency
  if (ofstedDate) {
    const inspDate = new Date(ofstedDate);
    const now = new Date();
    const yearsSince = (now.getTime() - inspDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (yearsSince > 5) {
      dataPoints.push(`⚠️ Inspection data is ${Math.round(yearsSince)} years old`);
      if (score !== null && confidence === 'HIGH') {
        confidence = 'MEDIUM';
      }
    }
  }

  const rationale = score !== null
    ? `Ofsted rating: ${ofstedRating || 'Unknown'}. ${inspectorate === 'Ofsted' ? 'State-inspected.' : inspectorate ? `Inspected by ${inspectorate}.` : ''}`
    : 'No Ofsted rating available. Manual assessment required.';

  return { score, confidence, rationale, dataPoints };
}

// ─── Financial Health ───────────────────────────────────────────
function scoreFinancialHealth(school: SchoolData): AutoScore {
  const dataPoints: string[] = [];
  const vs = school?.vulnerability_score as any;
  const pillarDetails = school?.pillar_details as any;

  if (!vs) {
    return { score: null, confidence: 'MANUAL', rationale: 'No vulnerability data available.', dataPoints };
  }

  const total = vs?.total || 0;
  const liquidityScore = vs?.pillar2_liquidity || 0;
  const governanceScore = vs?.pillar4_governance || 0;
  const status = vs?.status || '';
  const action = vs?.action || '';

  dataPoints.push(`Vulnerability score: ${total}/35`);
  dataPoints.push(`Status: ${status} (${action})`);
  dataPoints.push(`Liquidity risk: ${liquidityScore} points`);
  dataPoints.push(`Governance risk: ${governanceScore} points`);

  // Company number from pillar details
  const companyNum = pillarDetails?.pillar4?.company_number;
  if (companyNum) dataPoints.push(`Company: ${companyNum}`);

  // Higher vulnerability = BETTER for ISF (school more likely to need help)
  // But financial health score = how financially stressed they are
  // For ISF assessment, a struggling school = opportunity, but also risk
  // Score 5 = healthy finances (low vulnerability), 1 = severe distress
  let score: number;
  if (total <= 3) score = 5;
  else if (total <= 6) score = 4;
  else if (total <= 10) score = 3;
  else if (total <= 15) score = 2;
  else score = 1;

  // Liquidity crisis is a specific red flag
  if (liquidityScore >= 4) {
    dataPoints.push('⚠️ Liquidity crisis flagged');
    score = Math.max(1, score - 1);
  }

  return {
    score,
    confidence: 'HIGH',
    rationale: `Vulnerability total ${total}/35. ${action}. ${liquidityScore >= 4 ? 'Liquidity crisis flagged.' : ''}`,
    dataPoints
  };
}

// ─── Building Condition ─────────────────────────────────────────
function scoreBuildingCondition(school: SchoolData): AutoScore {
  const dataPoints: string[] = [];
  const pillarDetails = school?.pillar_details as any;
  const metrics = school?.metrics as any;

  const boarders = metrics?.boarders;
  if (boarders) dataPoints.push(`Boarders: ${boarders}`);

  const capacity = metrics?.school_capacity;
  const pupils = metrics?.pupil_count;
  if (capacity && pupils) {
    const util = ((pupils / capacity) * 100).toFixed(1);
    dataPoints.push(`Capacity utilisation: ${util}% (${pupils}/${capacity})`);
  }

  const p5 = pillarDetails?.pillar5;
  if (p5?.rural_isolation) {
    dataPoints.push(`Rural isolation: ${p5.rural_isolation.flag || 'flagged'}`);
  }
  if (p5?.lease_data_unavailable) {
    dataPoints.push('Lease tenure data not available');
  }

  const p6 = pillarDetails?.pillar6;
  if (p6?.has_boarding) {
    dataPoints.push(`Boarding: ${p6.has_boarding.flag || p6.has_boarding.status || 'Yes'}`);
  }

  // Can only partially auto-score - capacity utilisation gives some indication
  let score: number | null = null;
  let confidence: AutoScore['confidence'] = 'MANUAL';

  if (capacity && pupils) {
    const utilPct = (pupils / capacity) * 100;
    // Low utilisation = more spare space = better for ISF conversion
    if (utilPct < 60) { score = 5; confidence = 'LOW'; }
    else if (utilPct < 75) { score = 4; confidence = 'LOW'; }
    else if (utilPct < 85) { score = 3; confidence = 'LOW'; }
    else if (utilPct < 95) { score = 2; confidence = 'LOW'; }
    else { score = 1; confidence = 'LOW'; }
  }

  return {
    score,
    confidence,
    rationale: score !== null
      ? `Based on capacity utilisation. Physical inspection required for accurate score.`
      : 'No capacity data available. Requires physical inspection.',
    dataPoints
  };
}

// ─── Staffing/Leadership ────────────────────────────────────────
function scoreStaffingLeadership(school: SchoolData): AutoScore {
  const dataPoints: string[] = [];
  const ht = school?.headteacher as any;

  if (ht) {
    const name = [ht.title, ht.first_name, ht.last_name].filter(Boolean).join(' ');
    const role = ht.preferred_job_title || 'Head';
    dataPoints.push(`${role}: ${name}`);
  }

  const groupName = school?.group_name as string;
  if (groupName) {
    dataPoints.push(`Group: ${groupName}`);
  }

  // Largely manual - we don't have enough data to auto-score
  return {
    score: null,
    confidence: 'MANUAL',
    rationale: 'Requires manual assessment of leadership quality and staffing stability.',
    dataPoints
  };
}

// ─── Legals/Compliance ──────────────────────────────────────────
function scoreLegalsCompliance(school: SchoolData): AutoScore {
  const dataPoints: string[] = [];
  const vs = school?.vulnerability_score as any;
  const pillarDetails = school?.pillar_details as any;

  const regScore = vs?.pillar3_regulatory || 0;
  const govScore = vs?.pillar4_governance || 0;
  dataPoints.push(`Regulatory risk: ${regScore} points`);
  dataPoints.push(`Governance risk: ${govScore} points`);

  const p3 = pillarDetails?.pillar3;
  if (p3?.no_ofsted_data) {
    dataPoints.push(p3.no_ofsted_data.flag || 'No Ofsted data (likely ISI)');
  }

  const p4 = pillarDetails?.pillar4;
  if (p4?.trustee_benefits) {
    dataPoints.push(`⚠️ ${p4.trustee_benefits.flag || 'Trustee benefits flagged'}`);
  }

  const combined = regScore + govScore;
  let score: number;
  if (combined === 0) score = 5;
  else if (combined <= 2) score = 4;
  else if (combined <= 4) score = 3;
  else if (combined <= 6) score = 2;
  else score = 1;

  return {
    score,
    confidence: 'MEDIUM',
    rationale: `Combined regulatory + governance risk: ${combined} points.`,
    dataPoints
  };
}

// ─── Location/Access ────────────────────────────────────────────
function scoreLocationAccess(school: SchoolData): AutoScore {
  const dataPoints: string[] = [];
  const location = school?.location as any;
  const pillarDetails = school?.pillar_details as any;

  if (location) {
    const addr = [location.town, location.county, location.postcode].filter(Boolean).join(', ');
    dataPoints.push(`Location: ${addr}`);
  }

  const p5 = pillarDetails?.pillar5;
  const assetPoints = (school?.vulnerability_score as any)?.pillar5_assets || 0;
  dataPoints.push(`Asset risk: ${assetPoints} points`);

  if (p5?.rural_isolation) {
    const ruralPts = p5.rural_isolation.points || 0;
    dataPoints.push(`Rural isolation: ${ruralPts > 0 ? 'Yes' : 'No'} (${ruralPts} pts)`);
  }

  // Score: lower asset risk + urban = better access
  let score: number;
  if (assetPoints === 0) score = 5;
  else if (assetPoints <= 2) score = 4;
  else if (assetPoints <= 4) score = 3;
  else score = 2;

  return {
    score,
    confidence: 'MEDIUM',
    rationale: `Asset risk ${assetPoints} points. ${p5?.rural_isolation?.points > 0 ? 'Rural location.' : 'Urban/suburban.'}`,
    dataPoints
  };
}

// ─── Reputation ─────────────────────────────────────────────────
function scoreReputation(school: SchoolData): AutoScore {
  const dataPoints: string[] = [];
  const rationale_text = school?.rationale as string;
  const targetStatus = school?.target_status as string;

  if (targetStatus) dataPoints.push(`Target status: ${targetStatus}`);
  if (rationale_text) dataPoints.push(`ISF rationale: ${rationale_text}`);

  // Can't really auto-score reputation reliably
  return {
    score: null,
    confidence: 'MANUAL',
    rationale: rationale_text || 'Requires manual assessment of school reputation.',
    dataPoints
  };
}

// ─── Main Assessment Runner ─────────────────────────────────────
export async function runAutoAssessment(urn: string): Promise<AssessmentData> {
  const errors: string[] = [];
  let school: SchoolData | null = null;
  let gias: GIASSchool | null = null;
  let la: any = null;
  let company: any = null;
  let officers: any = null;

  // Step 1: Get school from Firestore
  try {
    school = await getSchoolByUrn(urn);
    if (!school) {
      errors.push('School not found in database');
      return { school: null, gias: null, la: null, company: null, officers: null, scores: emptyScores(), loading: false, errors };
    }
  } catch (e: any) {
    errors.push(`School fetch error: ${e.message}`);
  }

  // Step 1b: Get GIAS data for Ofsted ratings
  try {
    const giasResults = await searchSchools(urn);
    if (giasResults.length > 0) {
      gias = giasResults[0];
    }
  } catch (e: any) {
    errors.push(`GIAS fetch error: ${e.message}`);
  }

  // Step 2: Get LA data (parallel with Companies House)
  const laName = (school as any)?.la_name;

  const promises: Promise<void>[] = [];

  if (laName) {
    promises.push(
      getLocalAuthorityByName(laName).then(result => {
        la = result;
        if (!la) errors.push(`LA "${laName}" not found in database`);
      }).catch(e => { errors.push(`LA fetch error: ${e.message}`); })
    );
  }

  // Companies House data via static cache (indexed by URN)
  promises.push(
    getCompanyProfileByUrn(urn).then(result => {
      company = result;
      // No warning if not cached — CH data is supplementary, not critical
    }).catch(e => { errors.push(`Companies House error: ${e.message}`); })
  );
  promises.push(
    getOfficersByUrn(urn).then(result => {
      officers = result;
    }).catch(e => { errors.push(`Officers fetch error: ${e.message}`); })
  );

  await Promise.allSettled(promises);

  // Step 3: Calculate scores
  const scores: AutoScores = {
    commissioningDemand: school && la ? scoreCommissioningDemand(school, la) : emptyScore(),
    ofstedRating: school ? scoreOfstedRating(school, gias) : emptyScore(),
    financialHealth: school ? scoreFinancialHealth(school) : emptyScore(),
    buildingCondition: school ? scoreBuildingCondition(school) : emptyScore(),
    staffingLeadership: school ? scoreStaffingLeadership(school) : emptyScore(),
    legalsCompliance: school ? scoreLegalsCompliance(school) : emptyScore(),
    locationAccess: school ? scoreLocationAccess(school) : emptyScore(),
    reputation: school ? scoreReputation(school) : emptyScore(),
    synergy: emptyScore(), // Always manual
  };

  return { school, gias, la, company, officers, scores, loading: false, errors };
}
