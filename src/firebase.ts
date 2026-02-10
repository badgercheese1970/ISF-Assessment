import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAZEQyzxp21CqFCEYIBXsODeWlT9Usf0l0",
  authDomain: "phoenix-education-123.firebaseapp.com",
  projectId: "phoenix-education-123",
  storageBucket: "phoenix-education-123.firebasestorage.app",
  messagingSenderId: "774055993913",
  appId: "1:774055993913:web:isf-assess"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
