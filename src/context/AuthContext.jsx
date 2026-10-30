import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load the Firestore profile + admin role for the signed-in user
  const loadProfile = useCallback(async (user) => {
    if (!user || !db) {
      setUserProfile(null);
      setIsAdmin(false);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUserProfile({ id: snap.id, ...snap.data() });
      } else {
        setUserProfile(null);
      }
      const adminSnap = await getDoc(doc(db, 'admin_users', user.uid));
      setIsAdmin(adminSnap.exists());
    } catch (err) {
      console.error('Failed to load profile:', err);
      setUserProfile(null);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await loadProfile(user);
      setLoading(false);
    });
    return unsub;
  }, [loadProfile]);

  /** Register a new user: Auth account + Firestore profile doc. */
  async function register(name, email, password, phone) {
    if (!auth || !db) throw new Error('Firebase is not configured.');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const profile = {
      uid: cred.user.uid,
      name,
      email,
      phone,
      emergencyPhrase: '',
      alarmDurationSec: 0, // 0 = until stopped manually
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    try {
      await sendEmailVerification(cred.user);
    } catch (e) {
      console.warn('Verification email could not be sent:', e);
    }
    setUserProfile({ id: cred.user.uid, ...profile });
    return cred.user;
  }

  async function login(email, password) {
    if (!auth) throw new Error('Firebase is not configured.');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await loadProfile(cred.user);
    return cred.user;
  }

  async function resetPassword(email) {
    if (!auth) throw new Error('Firebase is not configured.');
    return sendPasswordResetEmail(auth, email);
  }

  async function logout() {
    if (!auth) return;
    setUserProfile(null);
    setIsAdmin(false);
    return signOut(auth);
  }

  /** Update the users/{uid} profile document. */
  async function updateUserProfile(fields) {
    if (!db || !currentUser) throw new Error('Not signed in.');
    await updateDoc(doc(db, 'users', currentUser.uid), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
    await loadProfile(currentUser);
  }

  /** Re-read profile + admin role (e.g. after admin doc is added). */
  async function refreshRoles() {
    await loadProfile(currentUser);
  }

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    loading,
    register,
    login,
    resetPassword,
    logout,
    updateUserProfile,
    refreshRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
