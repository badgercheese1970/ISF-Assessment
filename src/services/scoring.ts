export interface ScoreCriteria {
  name: string;
  weight: number;
  score: number | null; // 1-5, null if TBC
}

export interface ScoringResult {
  totalScore: number;
  maxPossible: number;
  percentage: number;
  decision: 'GO' | 'INVESTIGATE' | 'AVOID';
  criteria: ScoreCriteria[];
}

const CRITERIA_TEMPLATE = [
  { name: "Commissioning Demand", weight: 3 },
  { name: "Financial Health", weight: 2 },
  { name: "Building Condition", weight: 2 },
  { name: "Staffing/Leadership", weight: 2 },
  { name: "Legals/Compliance", weight: 1 },
  { name: "Location/Access", weight: 1 },
  { name: "Reputation", weight: 1 },
  { name: "Synergy", weight: 1 },
];

export function calculateScore(scores: Record<string, number | null>): ScoringResult {
  let totalScore = 0;
  let maxPossible = 0;
  
  const criteria = CRITERIA_TEMPLATE.map(c => {
    const score = scores[c.name] ?? null;
    if (score !== null) {
      totalScore += score * c.weight;
      maxPossible += 5 * c.weight;
    }
    return { ...c, score };
  });

  const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;

  let decision: 'GO' | 'INVESTIGATE' | 'AVOID' = 'AVOID';
  if (percentage >= 75) decision = 'GO';
  else if (percentage >= 50) decision = 'INVESTIGATE';
  else decision = 'AVOID';

  return {
    totalScore,
    maxPossible,
    percentage,
    decision,
    criteria
  };
}
