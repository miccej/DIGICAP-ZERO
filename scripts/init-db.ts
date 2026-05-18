
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function init() {
  console.log("Initializing database with license codes...");
  
  const codes = [
    { id: 'qualitas', type: 'trial3', isActive: true },
    { id: 'qualitas forever', type: 'forever', isActive: true }
  ];

  for (const code of codes) {
    await setDoc(doc(db, 'license_codes', code.id), {
      type: code.type,
      isActive: code.isActive
    });
    console.log(`- Created code: ${code.id}`);
  }

  console.log("Database initialized.");
}

init().catch(console.error);
