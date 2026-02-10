/**
 * ISF Commissioning Forecast Calculator
 * Implements Steps 12-17 of the School Assessment Process
 */

export interface LAInCatchment {
  laName: string;
  pool: 1 | 2 | 3 | 4;
  coverage: 'full' | 'partial';
  coveragePercent: number;
  students: number;
  ehcps: number;
  unplaced: number;
}

export interface CapacityScenario {
  capacity: number;
  demandRatio: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  openingFillRange: [number, number]; // percentages
  yearOneFillRange: [number, number]; // percentages
  openingPlacesRange: [number, number];
  yearOnePlacesRange: [number, number];
}

export interface ForecastResult {
  totalUnplaced: number;
  addressableDemand: number; // unplaced × 0.34
  totalLAs: number;
  pool1Count: number;
  pool2Count: number;
  pool3Count: number;
  pool4Count: number;
  laQualityPercent: number; // (pool1 + pool2) / total × 100
  scenarios: CapacityScenario[];
  recommendedCapacity: number;
}

// Step 15: Fill percentage lookup table
// Based on demand ratio and LA quality (% Pool 1&2)
interface FillLookup {
  ratioMin: number;
  ratioMax: number;
  qualityMin: number;
  qualityMax: number;
  openingFill: [number, number];
  yearOneFill: [number, number];
}

const FILL_TABLE: FillLookup[] = [
  { ratioMin: 40, ratioMax: Infinity, qualityMin: 70, qualityMax: 100, openingFill: [50, 65], yearOneFill: [85, 100] },
  { ratioMin: 40, ratioMax: Infinity, qualityMin: 40, qualityMax: 70, openingFill: [40, 55], yearOneFill: [75, 90] },
  { ratioMin: 20, ratioMax: 40, qualityMin: 70, qualityMax: 100, openingFill: [40, 55], yearOneFill: [75, 90] },
  { ratioMin: 20, ratioMax: 40, qualityMin: 40, qualityMax: 70, openingFill: [30, 45], yearOneFill: [65, 80] },
  { ratioMin: 10, ratioMax: 20, qualityMin: 70, qualityMax: 100, openingFill: [25, 40], yearOneFill: [55, 70] },
  { ratioMin: 10, ratioMax: 20, qualityMin: 40, qualityMax: 70, openingFill: [20, 30], yearOneFill: [45, 60] },
  { ratioMin: 0, ratioMax: 10, qualityMin: 0, qualityMax: 100, openingFill: [15, 25], yearOneFill: [35, 50] },
];

function lookupFill(demandRatio: number, laQualityPercent: number): { opening: [number, number]; yearOne: [number, number] } {
  for (const row of FILL_TABLE) {
    if (demandRatio >= row.ratioMin && demandRatio < row.ratioMax &&
        laQualityPercent >= row.qualityMin && laQualityPercent <= row.qualityMax) {
      // Handle the edge case where qualityMax is 70 but we want 70 to go to the >70% band
      return { opening: row.openingFill, yearOne: row.yearOneFill };
    }
  }
  // Fallback to lowest band
  return { opening: [15, 25], yearOne: [35, 50] };
}

function getConfidence(demandRatio: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (demandRatio >= 40) return 'HIGH';
  if (demandRatio >= 20) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate the full commissioning forecast
 * @param unplacedCount Total unplaced learners in catchment (from SEND Insights)
 * @param lasInCatchment Array of LAs with their pool classifications
 * @param capacities Capacity scenarios to evaluate (default: [12, 18, 24, 30])
 */
export function calculateForecast(
  unplacedCount: number,
  lasInCatchment: LAInCatchment[],
  capacities: number[] = [12, 18, 24, 30]
): ForecastResult {
  // Step 12: Addressable demand = unplaced × 0.34 (ASD proportion)
  const addressableDemand = Math.round(unplacedCount * 0.34);

  // Step 14: LA quality = (Pool 1 + Pool 2) / total LAs × 100
  const totalLAs = lasInCatchment.length;
  const pool1Count = lasInCatchment.filter(la => la.pool === 1).length;
  const pool2Count = lasInCatchment.filter(la => la.pool === 2).length;
  const pool3Count = lasInCatchment.filter(la => la.pool === 3).length;
  const pool4Count = lasInCatchment.filter(la => la.pool === 4).length;
  const laQualityPercent = totalLAs > 0 ? Math.round(((pool1Count + pool2Count) / totalLAs) * 100) : 0;

  // Steps 13, 15, 16: For each capacity scenario
  const scenarios: CapacityScenario[] = capacities.map(capacity => {
    // Step 13: Demand ratio
    const demandRatio = Math.round(addressableDemand / capacity);
    const confidence = getConfidence(demandRatio);

    // Step 15: Fill percentage lookup
    const fill = lookupFill(demandRatio, laQualityPercent);

    // Step 16: Expected places
    const openingPlacesRange: [number, number] = [
      Math.round(capacity * fill.opening[0] / 100),
      Math.round(capacity * fill.opening[1] / 100),
    ];
    const yearOnePlacesRange: [number, number] = [
      Math.round(capacity * fill.yearOne[0] / 100),
      Math.round(capacity * fill.yearOne[1] / 100),
    ];

    return {
      capacity,
      demandRatio,
      confidence,
      openingFillRange: fill.opening,
      yearOneFillRange: fill.yearOne,
      openingPlacesRange,
      yearOnePlacesRange,
    };
  });

  // Step 17: Recommended capacity = highest where ratio > 40:1
  let recommendedCapacity = capacities[0];
  for (const scenario of scenarios) {
    if (scenario.demandRatio >= 40) {
      recommendedCapacity = scenario.capacity;
    }
  }

  return {
    totalUnplaced: unplacedCount,
    addressableDemand,
    totalLAs,
    pool1Count,
    pool2Count,
    pool3Count,
    pool4Count,
    laQualityPercent,
    scenarios,
    recommendedCapacity,
  };
}
