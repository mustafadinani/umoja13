import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, type ProfileSource, type UserProfile } from "@umoja/shared";
import { auth, db } from "../lib/firebase";
import { useResolvedProfile } from "../hooks/useResolvedProfile";

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  /** Which Firestore DB the profile was loaded from (seed users vs Outreach). */
  profileSource: ProfileSource | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { profile, profileSource, loading: profileLoading } = useResolvedProfile(user?.uid);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const now = Date.now();
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email,
      displayName,
      roles: ["fan"],
      primaryRole: "fan",
      followedTeamIds: [],
      createdAt: now,
      updatedAt: now,
    };
    // New app signups land in umoja13-app / users (seed/test path), not Outreach profiles.
    await setDoc(doc(db, COLLECTIONS.users, cred.user.uid), newProfile);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profileSource,
        loading: authLoading || (!!user && profileLoading),
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const hmrFallback: AuthContextValue = {
  user: null,
  profile: null,
  profileSource: null,
  loading: true,
  signIn: async () => {
    throw new Error("useAuth must be used within AuthProvider");
  },
  signUp: async () => {
    throw new Error("useAuth must be used within AuthProvider");
  },
  signOut: async () => {
    throw new Error("useAuth must be used within AuthProvider");
  },
  resetPassword: async () => {
    throw new Error("useAuth must be used within AuthProvider");
  },
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  // Vite HMR can briefly remount Layout outside AuthProvider; don't crash the tree.
  if (!ctx) return hmrFallback;
  return ctx;
}
