interface ReportData {
  schoolOverview: any;
  financialHealth: any;
  catchment: any;
  forecast: any;
  scoring: any;
  flags: string[];
  recommendation: string;
}

export function generateMarkdownReport(data: ReportData): string {
  return `
# School Assessment Report: ${data.schoolOverview.schoolName}
**Date:** ${new Date().toLocaleDateString()}

## 1. School Overview
- **URN:** ${data.schoolOverview.urn}
- **Type:** ${data.schoolOverview.schoolType}
- **Capacity:** ${data.schoolOverview.capacity}
- **Proprietor:** ${data.schoolOverview.proprietor}

## 2. Financial Health
${data.financialHealth ? `- Company Status: ${data.financialHealth.status}` : '- No financial data available'}

## 3. Catchment Analysis
${JSON.stringify(data.catchment, null, 2)}

## 4. Commissioning Forecast
${JSON.stringify(data.forecast, null, 2)}

## 5. Go/No-Go Score
**Decision:** ${data.scoring.decision}
**Score:** ${data.scoring.percentage.toFixed(1)}% (${data.scoring.totalScore}/${data.scoring.maxPossible})

## 6. Due Diligence Flags
${data.flags.map(f => `- [FLAG] ${f}`).join('\n')}

## 7. Recommendation
${data.recommendation}
  `.trim();
}
