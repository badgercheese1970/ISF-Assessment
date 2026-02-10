import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

const LA_COLLECTION = 'send_local_authorities';
const SCHOOLS_COLLECTION = 'independent_schools';
const ISOCHRONE_COLLECTION = 'isochrone_cache';

export interface LocalAuthority {
  id: string;
  la_name: string;
  la_id: string;
  statistical_neighbours?: string[];
  [key: string]: unknown;
}

export interface SchoolData {
  id: string;
  urn?: string;
  name?: string;
  [key: string]: unknown;
}

export async function getLocalAuthority(laCode: string): Promise<LocalAuthority | null> {
  // LA documents use ONS codes (E10000011) as doc IDs, but schools store DfE LA codes (845).
  // We need to search by la_id field, or try the la_name approach.
  // First, try querying by la_id field
  const q = query(collection(db, LA_COLLECTION), where("la_id", "==", laCode));
  let snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    // Try with ONS-style code directly as doc ID
    const docRef = doc(db, LA_COLLECTION, laCode);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as LocalAuthority;
    }
    
    // Try querying where la_id matches as ONS code
    const q2 = query(collection(db, LA_COLLECTION), where("la_id", "==", `E${laCode}`));
    snapshot = await getDocs(q2);
    if (snapshot.empty) return null;
  }
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LocalAuthority;
}

export async function getLocalAuthorityByName(laName: string): Promise<LocalAuthority | null> {
  const q = query(collection(db, LA_COLLECTION), where("la_name", "==", laName));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LocalAuthority;
}

export async function getAllLocalAuthorities(): Promise<LocalAuthority[]> {
  const snapshot = await getDocs(collection(db, LA_COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as LocalAuthority);
}

export async function searchSchool(searchTerm: string): Promise<SchoolData[]> {
  const snapshot = await getDocs(collection(db, SCHOOLS_COLLECTION));
  const term = searchTerm.toLowerCase();
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }) as SchoolData)
    .filter(s => {
      const name = (s.name as string || '').toLowerCase();
      const urn = (s.urn as string || '');
      return name.includes(term) || urn === searchTerm;
    });
}

export async function getSchoolByUrn(urn: string): Promise<SchoolData | null> {
  // Try direct doc lookup first (doc IDs are URNs)
  const docRef = doc(db, SCHOOLS_COLLECTION, urn);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as SchoolData;
  }
  
  // Fallback to query
  const q = query(collection(db, SCHOOLS_COLLECTION), where("urn", "==", urn));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SchoolData;
}

export async function getCachedIsochrone(schoolId: string): Promise<unknown | null> {
  const q = query(collection(db, ISOCHRONE_COLLECTION), where("schoolId", "==", schoolId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}
