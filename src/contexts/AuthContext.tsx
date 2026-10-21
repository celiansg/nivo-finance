import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../services/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      createAccount: async (email, password) => {
        await setPersistence(auth, browserLocalPersistence);
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await sendEmailVerification(credential.user);
        } finally {
          // A newly created account must not enter the private app before the email step completes.
          await signOut(auth);
        }
      },
      logout: () => signOut(auth),
      resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider manquant');
  return context;
}
