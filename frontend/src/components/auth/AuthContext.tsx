"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  clearTokens,
  getAccessToken,
  getCurrentUser,
  getProfessionalProfile,
  refreshAccessToken,
  type AuthUser,
  type ProfessionalProfile,
} from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  profile: ProfessionalProfile | null;
  loading: boolean;
  reloadProfile: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function reloadProfile() {
    try {
      if (!getAccessToken()) {
        await refreshAccessToken();
      }

      const [currentUser, professionalProfile] = await Promise.all([
        getCurrentUser(),
        getProfessionalProfile(),
      ]);

      setUser(currentUser);
      setProfile(professionalProfile);
    } catch {
      clearTokens();
      setUser(null);
      setProfile(null);
    }
  }

  function signOut() {
    clearTokens();
    setUser(null);
    setProfile(null);
  }

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        const [currentUser, professionalProfile] = await Promise.all([
          getCurrentUser(),
          getProfessionalProfile(),
        ]);

        if (active) {
          setUser(currentUser);
          setProfile(professionalProfile);
        }
      } catch {
        clearTokens();

        if (active) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        reloadProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
