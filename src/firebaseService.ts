
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { db, auth, ensureAuthenticated } from './firebase';

export interface UserAccessData {
  uid?: string;
  email?: string;
  isForever: boolean;
  trialRemaining: number;
  redeemedCodes: string[];
  updatedAt: any;
}

export const getUserAccess = async (userId: string): Promise<UserAccessData | null> => {
  const userDoc = await getDoc(doc(db, 'user_access', userId));
  if (userDoc.exists()) {
    return userDoc.data() as UserAccessData;
  }
  return null;
};

export const initializeUserAccess = async (userId: string) => {
  const initialData: UserAccessData = {
    isForever: false,
    trialRemaining: 3,
    redeemedCodes: [],
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'user_access', userId), initialData);
  return initialData;
};

export const redeemCode = async (userId: string, code: string) => {
  const codeDoc = await getDoc(doc(db, 'license_codes', code));
  if (!codeDoc.exists() || !codeDoc.data()?.isActive) {
    throw new Error("Invalid or inactive code");
  }

  const codeData = codeDoc.data();
  const userRef = doc(db, 'user_access', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await initializeUserAccess(userId);
  }

  const userData = userDoc.exists() ? (userDoc.data() as UserAccessData) : null;
  if (userData?.redeemedCodes.includes(code)) {
    throw new Error("Code already redeemed by this user");
  }

  const updates: any = {
    redeemedCodes: arrayUnion(code),
    updatedAt: serverTimestamp()
  };

  if (codeData.type === 'forever') {
    updates.isForever = true;
  } else if (codeData.type === 'trial3') {
    updates.trialRemaining = (userData?.trialRemaining || 0) + 3;
  }

  await updateDoc(userRef, updates);
  return updates;
};

import { EXTERNAL_LINKS } from './config';

export const verifyLicense = async (email: string, orderId: string): Promise<boolean> => {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanKey = (orderId || '').trim();

  if (!cleanEmail && !cleanKey) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    const baseUrl = isNative ? EXTERNAL_LINKS.API_BASE_URL : '';

    const response = await fetch(`${baseUrl}/api/verify-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, orderId: cleanKey }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        const activeKey = cleanEmail || result.license?.email || cleanKey;
        localStorage.setItem('digicap_active_license', activeKey);
        return true;
      }
    }
  } catch (error) {
    console.error("Error verifying license via backend API:", error);
  }

  // Client-side Firestore fallback check if server API was unreachable
  try {
    if (cleanEmail) {
      const active = await checkLicenseByEmail(cleanEmail);
      if (active) {
        localStorage.setItem('digicap_active_license', cleanEmail);
        return true;
      }
    }
  } catch (fallbackErr) {
    console.error("Client fallback license verification failed:", fallbackErr);
  }

  return false;
};

export const checkLicenseByEmail = async (email: string): Promise<boolean> => {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  try {
    const licenseDoc = await getDoc(doc(db, 'licenses', cleanEmail));
    if (licenseDoc.exists()) {
      const data = licenseDoc.data();
      const validStatuses = ['active', 'on_trial', 'past_due', 'subscribed', 'paid'];
      return validStatuses.includes(data?.status);
    }
    return false;
  } catch (error) {
    console.error("Error checking license by email:", error);
    return false;
  }
};

export const decrementTrial = async (userId: string): Promise<UserAccessData | null> => {
  const userRef = doc(db, 'user_access', userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return null;

  const userData = userDoc.data() as UserAccessData;
  if (!userData.isForever && userData.trialRemaining > 0) {
    const updatedTrial = userData.trialRemaining - 1;
    await updateDoc(userRef, {
      trialRemaining: updatedTrial,
      updatedAt: serverTimestamp()
    });
    return { ...userData, trialRemaining: updatedTrial };
  }
  return userData;
};

export const logUserActivity = async (email: string, action: string, details?: any) => {
  if (!email) return;
  // Guard: Only write telemetry to Cloud Firestore if the client has loaded/finished authentication
  if (!auth.currentUser) {
    console.log("[TELEMETRY] local cache / offline mode - skipping cloud write for:", action);
    return;
  }
  try {
    const sanitizedEmail = email.toLowerCase().trim();
    const cleanAction = action.replace(/[\/\s]/g, '_');
    const docId = `${sanitizedEmail}_${cleanAction}_${Date.now()}`;
    await setDoc(doc(db, 'user_activity', docId), {
      email: sanitizedEmail,
      action,
      details: details || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error logging activity to Firebase:", error);
  }
};
