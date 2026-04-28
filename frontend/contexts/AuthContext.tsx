"use client";

// frontend/contexts/AuthContext.tsx
// Global auth state — wraps the entire app in layout.tsx.
// Stores user, role, and token in React state (never localStorage).

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type User } from "firebase/auth";
import {
  signInWithEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "@/lib/firebase";
import { post } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "admin" | "volunteer" | "field_volunteer" | null;

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: Role;
  organization: string | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [organization, setOrganization] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Called whenever Firebase auth state changes (login, logout, tab restore)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          // Force-refresh to get the very latest token after sign-in
          const idToken = await firebaseUser.getIdToken(true);
          setToken(idToken);

          // Fetch role and org from backend
          const verifiedUser = await post<{ uid: string; role: string; email: string; organization?: string }>(
            "/auth/verify-token"
          );

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          });
          setRole((verifiedUser.role as Role) ?? "volunteer");
          setOrganization(verifiedUser.organization ?? "");
        } catch (err) {
          // Log the actual error so it appears in the browser console
          console.error("[AuthContext] verify-token failed:", err);
          // Token invalid or backend unreachable — sign out cleanly
          await firebaseSignOut();
          setUser(null);
          setRole(null);
          setOrganization(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setOrganization(null);
        setToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Don't touch loading here — onAuthStateChanged owns the loading lifecycle.
    // This prevents a race where setLoading(false) fires before verify-token completes.
    await signInWithEmail(email, password);
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut();
    // onAuthStateChanged fires with null and clears state
  }, []);

  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, role, organization, token, loading, isAdmin, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
