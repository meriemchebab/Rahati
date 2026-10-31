"use client";

import {
  createContext,
  useCallback,
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
  logout,
  refreshAccessToken,
  type AuthUser,
  type ProfessionalProfile,
} from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  profile: ProfessionalProfile | null;
  loading: boolean;
  profileError: string | null;
  reloadProfile: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const signOut = useCallback(() => {
    logout();

    setUser(null);
    setProfile(null);
    setProfileError(null);

    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }, []);

  const reloadProfile = useCallback(async () => {
    const currentUser = await getCurrentUser();

    setUser(currentUser);

    try {
      const currentProfile = await getProfessionalProfile();

      setProfile(currentProfile);
      setProfileError(null);
    } catch (error) {
      setProfile(null);

      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to load professional profile.",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    const pathname = window.location.pathname;

    // Public pages must not attempt automatic session restoration.
    // Otherwise, a missing refresh token can cause an infinite redirect loop.
    const isPublicPage =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/login/") ||
      pathname.startsWith("/register/");

    if (isPublicPage) {
      setLoading(false);

      return () => {
        active = false;
      };
    }

    const handleSessionExpired = () => {
      if (!active) return;

      setUser(null);
      setProfile(null);
      setProfileError(null);

      // Avoid reloading the login page if the user is already there.
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    };

    window.addEventListener("rahati-session-expired", handleSessionExpired);

    async function initialize() {
      try {
        // Restore an existing session only on protected pages.
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        const currentUser = await getCurrentUser();

        if (!active) return;

        setUser(currentUser);

        try {
          const currentProfile = await getProfessionalProfile();

          if (active) {
            setProfile(currentProfile);
            setProfileError(null);
          }
        } catch (error) {
          if (active) {
            setProfile(null);

            setProfileError(
              error instanceof Error
                ? error.message
                : "Unable to load professional profile.",
            );
          }
        }
      } catch {
        clearTokens();

        if (active) {
          setUser(null);
          setProfile(null);
          setProfileError(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;

      window.removeEventListener(
        "rahati-session-expired",
        handleSessionExpired,
      );
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileError,
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
