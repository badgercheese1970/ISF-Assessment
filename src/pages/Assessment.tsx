import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { runAutoAssessment, type AssessmentData, type AutoScore, emptyScores } from '../services/auto-assess';
import { calculateScore, type ScoringResult } from '../services/scoring';
import { generateMarkdownReport } from '../services/report-generator';
import { Save, ArrowLeft, Loader2, AlertTriangle, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const CRITERIA_MAP: { key: keyof typeof emptyScoresRef; label: string; weight: number }[] = [
  { key: 'commissioningDemand', label: 'Commissioning Demand', weight: 3 },
  { key: 'ofstedRating', label: 'Ofsted Rating', weight: 2 },
  { key: 'financialHealth', label: 'Financial Health', weight: 2 },
  { key: 'buildingCondition', label: 'Building Condition', weight: 2 },
  { key: 'staffingLeadership', label: 'Staffing/Leadership', weight: 2 },
  { key: 'legalsCompliance', label: 'Legals/Compliance', weight: 1 },
  { key: 'locationAccess', label: 'Location/Access', weight: 1 },
  { key: 'reputation', label: 'Reputation', weight: 1 },
  { key: 'synergy', label: 'Synergy', weight: 1 },
];

const emptyScoresRef = emptyScores();

function ConfidenceBadge({ confidence }: { confidence: AutoScore['confidence'] }) {
  const styles = {
    HIGH: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-orange-100 text-orange-700',
    MANUAL: 'bg-gray-100 text-gray-500',
  };
  const icons = {
    HIGH: <CheckCircle className="w-3 h-3" />,
    MEDIUM: <AlertTriangle className="w-3 h-3" />,
    LOW: <HelpCircle className="w-3 h-3" />,
    MANUAL: <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[confidence]}`}>
      {icons[confidence]} {confidence}
    </span>
  );
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'];
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${colors[score]}`}>
      {score}
    </span>
  );
}

export default function Assessment() {
  const { urn } = useParams<{ urn: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!urn) return;
    setLoading(true);
    runAutoAssessment(urn).then(result => {
      setData(result);
      // Build initial scores map for the scoring engine
      const initialScores: Record<string, number | null> = {};
      for (const c of CRITERIA_MAP) {
        initialScores[c.label] = result.scores[c.key].score;
      }
      setScoringResult(calculateScore(initialScores));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [urn]);

  const handleOverride = (criteriaKey: string, _label: string, value: number | null) => {
    setOverrides(prev => ({ ...prev, [criteriaKey]: value }));
    // Recalculate
    const newScores: Record<string, number | null> = {};
    for (const c of CRITERIA_MAP) {
      if (c.key === criteriaKey) {
        newScores[c.label] = value;
      } else if (overrides[c.key] !== undefined) {
        newScores[c.label] = overrides[c.key];
      } else {
        newScores[c.label] = data?.scores[c.key].score ?? null;
      }
    }
    setScoringResult(calculateScore(newScores));
  };

  const getEffectiveScore = (key: string): number | null => {
    if (overrides[key] !== undefined) return overrides[key];
    return data?.scores[key as keyof typeof emptyScoresRef]?.score ?? null;
  };

  const handleSave = async () => {
    if (!scoringResult || !data?.school) return;
    setSaving(true);

    const school = data.school;
    const report = {
      urn: school.urn,
      schoolName: school.name,
      date: new Date().toISOString(),
      score: scoringResult,
      autoScores: data.scores,
      overrides,
      laData: data.la ? { la_name: data.la.la_name, la_id: data.la.la_id } : null,
      companyData: data.company ? { company_name: data.company.company_name, company_number: data.company.company_number, company_status: data.company.company_status } : null,
      markdown: generateMarkdownReport({
        schoolOverview: {
          urn: school.urn,
          schoolName: school.name,
          schoolType: school.type || 'Unknown',
          capacity: (school.metrics as any)?.school_capacity || 0,
          proprietor: school.group_name || '',
        },
        financialHealth: data.company,
        catchment: data.la ? { la_name: data.la.la_name, awaiting: data.la.metrics?.placements?.awaiting_provision } : null,
        forecast: null,
        scoring: scoringResult,
        flags: data.errors,
        recommendation: `Decision: ${scoringResult.decision}`
      })
    };

    try {
      await addDoc(collection(db, 'assess_reports'), report);
      alert('Report saved!');
    } catch (e) {
      console.error(e);
      alert('Error saving report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-300">Running assessment...</p>
          <p className="text-sm text-slate-400 mt-1">Fetching school data, LA metrics, Companies House...</p>
        </div>
      </div>
    );
  }

  if (!data?.school) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-red-400 mb-4">School not found (URN: {urn})</p>
          <button onClick={() => navigate('/')} className="text-cyan-400 hover:text-cyan-300 transition-colors">← Back to search</button>
        </div>
      </div>
    );
  }

  const school = data.school;
  const metrics = school.metrics as any || {};
  const location = school.location as any || {};
  const ht = school.headteacher as any;
  const contact = school.contact as any || {};

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-300 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{school.name as string}</h1>
            <p className="text-sm text-slate-400">
              URN: {school.urn as string} · {school.type as string} · {location.town}, {location.postcode}
            </p>
          </div>
          {Boolean(school.target_status) && (
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium
              ${school.target_status === 'TARGET' ? 'bg-green-100 text-green-700' :
                school.target_status === 'WATCHLIST' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'}`}>
              {String(school.target_status)}
            </span>
          )}
        </div>

        {/* Errors */}
        {data.errors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-amber-800 mb-1">Data Warnings</h3>
            {data.errors.map((e: string, i: number) => (
              <p key={i} className="text-sm text-amber-600">• {e}</p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Data Panels */}
          <div className="lg:col-span-2 space-y-6">

            {/* School Overview */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">School Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Capacity</span>
                  <p className="font-semibold">{metrics.school_capacity || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Pupils</span>
                  <p className="font-semibold">{metrics.pupil_count || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Utilisation</span>
                  <p className="font-semibold">{metrics.capacity_utilization ? `${metrics.capacity_utilization}%` : '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Age Range</span>
                  <p className="font-semibold">{metrics.age_range || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Boarders</span>
                  <p className="font-semibold">{metrics.boarders || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Group</span>
                  <p className="font-semibold">{school.group_name as string || '—'}</p>
                </div>
                {data.gias?.OfstedRating && (
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-gray-500">Ofsted Rating</span>
                    <p className="font-semibold text-lg">
                      {data.gias.OfstedRating}
                      {data.gias.OfstedLastInsp && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Last inspection: {data.gias.OfstedLastInsp})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {data.gias?.InspectorateName && !data.gias?.OfstedRating && (
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-gray-500">Inspectorate</span>
                    <p className="font-semibold">{data.gias.InspectorateName}</p>
                  </div>
                )}
                {ht && (
                  <div>
                    <span className="text-gray-500">{ht.preferred_job_title || 'Head'}</span>
                    <p className="font-semibold">{[ht.title, ht.first_name, ht.last_name].filter(Boolean).join(' ')}</p>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <span className="text-gray-500">Phone</span>
                    <p className="font-semibold">{contact.phone}</p>
                  </div>
                )}
                {contact.website && (
                  <div>
                    <span className="text-gray-500">Website</span>
                    <p className="font-semibold"><a href={contact.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">Visit →</a></p>
                  </div>
                )}
              </div>
            </div>

            {/* Vulnerability Analysis */}
            {school.vulnerability_score && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4">Vulnerability Analysis</h2>
                {(() => {
                  const vs = school.vulnerability_score as any;
                  const pillars = [
                    { label: 'Size', score: vs.pillar1_size, max: 5 },
                    { label: 'Liquidity', score: vs.pillar2_liquidity, max: 5 },
                    { label: 'Regulatory', score: vs.pillar3_regulatory, max: 5 },
                    { label: 'Governance', score: vs.pillar4_governance, max: 5 },
                    { label: 'Assets', score: vs.pillar5_assets, max: 5 },
                    { label: 'Boarding', score: vs.pillar6_boarding, max: 5 },
                    { label: 'Resilience', score: vs.pillar7_resilience, max: 5 },
                  ];
                  return (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-3xl font-bold">{vs.total}<span className="text-lg text-gray-400">/35</span></div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium
                            ${vs.status === 'Critical' ? 'bg-red-100 text-red-700' :
                              vs.status === 'Watchlist' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'}`}>
                            {vs.status}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">{vs.action}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {pillars.map(p => (
                          <div key={p.label} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">{p.label}</div>
                            <div className={`text-lg font-bold ${p.score > 3 ? 'text-red-600' : p.score > 1 ? 'text-amber-600' : 'text-green-600'}`}>
                              {p.score}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* LA Data */}
            {data.la && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4">Local Authority: {data.la.la_name}</h2>
                {(() => {
                  const laMetrics = data.la.metrics || {};
                  const op = laMetrics.operational || {};
                  const pl = laMetrics.placements || {};
                  const fin = laMetrics.financial || {};
                  const leg = laMetrics.legal || {};
                  const svp = data.la.safetyValvePool || {};
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Awaiting Provision</span>
                        <p className="font-semibold text-lg">{pl.awaiting_provision ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total EHCPs</span>
                        <p className="font-semibold">{op.total_ehcps ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">EHCP %</span>
                        <p className="font-semibold">{op.ehcp_percentage ? `${op.ehcp_percentage}%` : '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Safety Valve Pool</span>
                        <p className="font-semibold">{svp.pool ? `Pool ${svp.pool}` : '—'}</p>
                        {svp.poolDescription && <p className="text-xs text-gray-400">{svp.poolDescription}</p>}
                      </div>
                      <div>
                        <span className="text-gray-500">Timeliness (20 wks)</span>
                        <p className="font-semibold">{op.timeliness_20_weeks_percent ? `${op.timeliness_20_weeks_percent}%` : '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Requests Total</span>
                        <p className="font-semibold">{op.requests_total ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Appeals Registered</span>
                        <p className="font-semibold">{leg.appeals_registered ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">HN Funding</span>
                        <p className="font-semibold">{fin.high_needs_total ? `£${fin.high_needs_total}bn` : '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Indep. Placement Cost</span>
                        <p className="font-semibold">{fin.independent_placement_cost_avg ? `£${fin.independent_placement_cost_avg.toLocaleString()}` : '—'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Companies House */}
            {data.company && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4">Companies House</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Company</span>
                    <p className="font-semibold">{data.company.company_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status</span>
                    <p className="font-semibold">{data.company.company_status}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Number</span>
                    <p className="font-semibold">{data.company.company_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type</span>
                    <p className="font-semibold">{data.company.type}</p>
                  </div>
                </div>
                {data.officers?.items && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Officers ({data.officers.total_results})</h3>
                    <div className="space-y-1">
                      {data.officers.items.slice(0, 5).map((o: any, i: number) => (
                        <p key={i} className="text-sm text-gray-600">
                          {o.name} — <span className="text-gray-400">{o.officer_role}</span>
                          {o.resigned_on && <span className="text-red-400 ml-1">(resigned {o.resigned_on})</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ISF Rationale */}
            {school.rationale && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h2 className="text-lg font-bold text-blue-900 mb-2">ISF Rationale</h2>
                <p className="text-blue-800">{school.rationale as string}</p>
              </div>
            )}
          </div>

          {/* Right: Scoring Panel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Go/No-Go Scoring
              </h2>

              <div className="space-y-4 mb-6">
                {CRITERIA_MAP.map(c => {
                  const autoScore = data.scores[c.key];
                  const effective = getEffectiveScore(c.key);
                  const isOverridden = overrides[c.key] !== undefined;

                  return (
                    <div key={c.key} className="border-b border-gray-50 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">
                          {c.label} <span className="text-gray-400">(×{c.weight})</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <ScoreDisplay score={effective} />
                          <ConfidenceBadge confidence={isOverridden ? 'HIGH' : autoScore.confidence} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{autoScore.rationale}</p>
                      {autoScore.dataPoints.length > 0 && (
                        <div className="text-xs text-gray-400 space-y-0.5 mb-1">
                          {autoScore.dataPoints.map((dp, i) => <p key={i}>• {dp}</p>)}
                        </div>
                      )}
                      <select
                        className={`w-full p-1.5 border rounded text-sm ${isOverridden ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
                        value={isOverridden ? (overrides[c.key] ?? '') : (autoScore.score ?? '')}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value);
                          handleOverride(c.key, c.label, val);
                        }}
                      >
                        <option value="">
                          {autoScore.score !== null ? `Auto: ${autoScore.score}` : 'Not scored'}
                        </option>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>
                            {n} {autoScore.score === n ? '(auto)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Decision */}
              {scoringResult && (
                <div className={`p-4 rounded-lg mb-6 text-center text-white font-bold text-lg
                  ${scoringResult.decision === 'GO' ? 'bg-green-600' :
                    scoringResult.decision === 'INVESTIGATE' ? 'bg-amber-500' : 'bg-red-600'}`}>
                  {scoringResult.decision}
                  <p className="text-sm font-normal opacity-90 mt-1">
                    {scoringResult.percentage.toFixed(0)}% ({scoringResult.totalScore}/{scoringResult.maxPossible})
                  </p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
