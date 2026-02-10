// Charity Commission API: https://api.charitycommission.gov.uk/register/api
// Requires an Ocp-Apim-Subscription-Key header.
// For MVP, we'll use the public register website as a fallback data source.
// A proper API key can be obtained from https://developer.charitycommission.gov.uk/

export interface CharitySearchResult {
  charityNumber: string;
  name: string;
  status: string;
}

export interface CharityDetails {
  charityNumber: string;
  name: string;
  status: string;
  income: number;
  expenditure: number;
  surplus: number;
  trustees: number;
  regulatoryActions: string[];
}

export interface FinancialYear {
  year: string;
  income: number;
  expenditure: number;
  surplus: number;
}

export async function searchCharity(name: string): Promise<CharitySearchResult[]> {
  // TODO: Implement with API subscription key or HTML scraping
  void name;
  console.warn("Charity search: requires API subscription key or HTML scraping — returning empty for now");
  return [];
}

export async function getCharityDetails(charityNumber: string): Promise<CharityDetails | null> {
  // Public page: https://register-of-charities.charitycommission.gov.uk/charity-details/?regId=XXXXXXX
  // TODO: Implement with API key or HTML scraping
  void charityNumber;
  console.warn(`Charity details: requires API key — returning null for now`);
  return null;
}

export async function getFinancialHistory(charityNumber: string): Promise<FinancialYear[]> {
  // TODO: Implement with API key or HTML scraping
  console.warn(`Financial history for ${charityNumber}: requires API key — returning empty for now`);
  return [];
}
