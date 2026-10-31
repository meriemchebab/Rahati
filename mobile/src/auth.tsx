import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, loadConfig, loadProNames, Me, setSignedOutHandler } from "./api";

type AuthState = {
  ready: boolean;
  me: Me | null;
  signIn: (nickname: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  forget: () => void;
};

const Ctx = createContext<AuthState>(null as never);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const refreshMe = useCallback(async () => {
    setMe(await api.me());
  }, []);

  useEffect(() => {
    setSignedOutHandler(() => setMe(null));
    (async () => {
      const { signedIn } = await loadConfig();
      await loadProNames();
      if (signedIn) {
        try {
          await refreshMe();
        } catch {
          setMe(null);
        }
      }
      setReady(true);
    })();
  }, [refreshMe]);

  const signIn = useCallback(
    async (nickname: string, password: string) => {
      await api.login(nickname, password);
      await refreshMe();
    },
    [refreshMe]
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setMe(null);
    }
  }, []);

  return (
    <Ctx.Provider value={{ ready, me, signIn, signOut, refreshMe, forget: () => setMe(null) }}>
      {children}
    </Ctx.Provider>
  );
}
