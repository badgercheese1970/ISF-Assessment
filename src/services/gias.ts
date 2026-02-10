import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const SCHOOLS_COLLECTION = 'independent_schools';

export interface GIASSchool {
  URN: string;
  DfENumber?: string;
  LA?: string;
  EstablishmentNumber?: string;
  UKPRN: string;
  EstablishmentStatus: string;
  OpenDate: string;
  EstablishmentName: string;
  HeadTitle: string;
  HeadFirstName: string;
  HeadLastName: string;
  TypeOfEstablishment: string;
  StatutoryLowAge: string;
  StatutoryHighAge: string;
  Gender: string;
  ReligiousCharacter: string;
  Boarders: string;
  OfficialSixthForm: string;
  NurseryProvision: string;
  SchoolCapacity: string;
  NumberOfPupils: string;
  SENStat: string;
  SENNoStat: string;
  Section41Approved: string;
  InspectorateName: string;
  OfstedRating?: string;
  OfstedLastInsp?: string;
  QualityOfEducation?: string;
  BehaviourAndAttitudes?: string;
  PersonalDevelopment?: string;
  EffectivenessOfLeadership?: string;
  EarlyYearsProvision?: string;
  SixthFormProvision?: string;
  PropsName: string;
  UrbanRural: string;
  DistrictAdministrative: string;
  AdministrativeWard: string;
  ParliamentaryConstituency: string;
  Street: string;
  Locality: string;
  Address3: string;
  Town: string;
  County: string;
  Postcode: string;
  Latitude: string;
  Longitude: string;
  [key: string]: string | undefined;
}

// Cache all schools on first load (the collection is ~3000 docs, manageable)
let cachedSchools: GIASSchool[] | null = null;
let cachePromise: Promise<GIASSchool[]> | null = null;

function mapFirestoreDocToGIAS(data: Record<string, any>): GIASSchool {
  // The independent_schools collection may use different field names.
  // Map common variations to the GIASSchool interface.
  return {
    URN: String(data.urn || data.URN || ''),
    DfENumber: data.dfe_number || data.DfENumber || '',
    LA: data.la_code || data.LA || '',
    EstablishmentNumber: data.establishment_number || data.EstablishmentNumber || '',
    UKPRN: data.ukprn || data.UKPRN || '',
    EstablishmentStatus: data.status || data.EstablishmentStatus || data.establishment_status || 'Open',
    OpenDate: data.open_date || data.OpenDate || '',
    EstablishmentName: data.name || data.school_name || data.EstablishmentName || '',
    HeadTitle: data.head_title || data.HeadTitle || '',
    HeadFirstName: data.head_first_name || data.HeadFirstName || '',
    HeadLastName: data.head_last_name || data.HeadLastName || '',
    TypeOfEstablishment: data.type || data.school_type || data.TypeOfEstablishment || '',
    StatutoryLowAge: String(data.low_age || data.StatutoryLowAge || ''),
    StatutoryHighAge: String(data.high_age || data.StatutoryHighAge || ''),
    Gender: data.gender || data.Gender || '',
    ReligiousCharacter: data.religious_character || data.ReligiousCharacter || '',
    Boarders: data.boarders || data.Boarders || '',
    OfficialSixthForm: data.sixth_form || data.OfficialSixthForm || '',
    NurseryProvision: data.nursery || data.NurseryProvision || '',
    SchoolCapacity: String(data.capacity || data.school_capacity || data.SchoolCapacity || '0'),
    NumberOfPupils: String(data.pupils || data.number_of_pupils || data.NumberOfPupils || '0'),
    SENStat: String(data.sen_ehcp || data.SENStat || '0'),
    SENNoStat: String(data.sen_no_ehcp || data.SENNoStat || '0'),
    Section41Approved: data.section41 || data.Section41Approved || '',
    InspectorateName: data.inspectorate || data.InspectorateName || '',
    OfstedRating: data.ofsted_rating || data.OfstedRating || data.overall_effectiveness || '',
    OfstedLastInsp: data.ofsted_last_insp || data.OfstedLastInsp || data.last_inspection_date || '',
    QualityOfEducation: data.quality_of_education || data.QualityOfEducation || '',
    BehaviourAndAttitudes: data.behaviour_and_attitudes || data.BehaviourAndAttitudes || '',
    PersonalDevelopment: data.personal_development || data.PersonalDevelopment || '',
    EffectivenessOfLeadership: data.effectiveness_of_leadership || data.EffectivenessOfLeadership || '',
    EarlyYearsProvision: data.early_years_provision || data.EarlyYearsProvision || '',
    SixthFormProvision: data.sixth_form_provision || data.SixthFormProvision || '',
    PropsName: data.proprietor || data.PropsName || '',
    UrbanRural: data.urban_rural || data.UrbanRural || '',
    DistrictAdministrative: data.district || data.DistrictAdministrative || '',
    AdministrativeWard: data.ward || data.AdministrativeWard || '',
    ParliamentaryConstituency: data.constituency || data.ParliamentaryConstituency || '',
    Street: data.street || data.Street || '',
    Locality: data.locality || data.Locality || '',
    Address3: data.address3 || data.Address3 || '',
    Town: data.town || data.Town || '',
    County: data.county || data.County || '',
    Postcode: data.postcode || data.Postcode || '',
    Latitude: String(data.latitude || data.lat || data.Latitude || ''),
    Longitude: String(data.longitude || data.lng || data.Longitude || ''),
  };
}

async function loadAllSchools(): Promise<GIASSchool[]> {
  if (cachedSchools) return cachedSchools;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      console.log('Loading schools from Firestore...');
      const snapshot = await getDocs(collection(db, SCHOOLS_COLLECTION));
      console.log(`Loaded ${snapshot.size} schools from Firestore`);
      cachedSchools = snapshot.docs.map(doc => mapFirestoreDocToGIAS(doc.data()));
      return cachedSchools;
    } catch (error) {
      console.error('Error loading schools from Firestore:', error);
      cachePromise = null;
      throw error;
    }
  })();

  return cachePromise;
}

export async function fetchGIASData(): Promise<GIASSchool[]> {
  return loadAllSchools();
}

export async function searchSchools(queryStr: string): Promise<GIASSchool[]> {
  const data = await loadAllSchools();
  const lowerQuery = queryStr.toLowerCase().trim();

  if (!lowerQuery) return [];

  return data.filter(s =>
    (s.EstablishmentName && s.EstablishmentName.toLowerCase().includes(lowerQuery)) ||
    (s.URN && s.URN.includes(queryStr))
  ).slice(0, 20);
}

export function extractAssessmentFields(school: GIASSchool) {
  return {
    urn: school.URN,
    dfeNumber: `${school.LA}/${school.EstablishmentNumber}`,
    ukprn: school.UKPRN,
    status: school.EstablishmentStatus,
    openDate: school.OpenDate,
    schoolName: school.EstablishmentName,
    headTeacher: `${school.HeadTitle} ${school.HeadFirstName} ${school.HeadLastName}`.trim(),
    schoolType: school.TypeOfEstablishment,
    ageRange: `${school.StatutoryLowAge} - ${school.StatutoryHighAge}`,
    gender: school.Gender,
    religiousCharacter: school.ReligiousCharacter,
    boarders: school.Boarders,
    sixthForm: school.OfficialSixthForm,
    nursery: school.NurseryProvision,
    capacity: parseInt(school.SchoolCapacity || '0'),
    numberOfPupils: parseInt(school.NumberOfPupils || '0'),
    senWithEHCP: parseInt(school.SENStat || '0'),
    senWithoutEHCP: parseInt(school.SENNoStat || '0'),
    section41: school.Section41Approved,
    inspectorate: school.InspectorateName,
    proprietor: school.PropsName,
    urbanRural: school.UrbanRural,
    district: school.DistrictAdministrative,
    ward: school.AdministrativeWard,
    constituency: school.ParliamentaryConstituency,
    address: [school.Street, school.Locality, school.Address3, school.Town, school.County, school.Postcode].filter(Boolean).join(', '),
    postcode: school.Postcode,
    lat: parseFloat(school.Latitude),
    lng: parseFloat(school.Longitude)
  };
}
