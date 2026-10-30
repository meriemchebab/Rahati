"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "./AuthContext";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const blocked = loading || !user;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  return (
    <>
      {/* Always render the route so Next.js can validate it. */}
      <div className={blocked ? "invisible" : "visible"} aria-hidden={blocked}>
        {children}
      </div>

      {/* Display a loading screen while authentication is checked. */}
      {blocked && (
        <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#f7f0f5]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#e8d8e5] border-t-[#95617f]" />
            <p className="text-sm text-[#8d788c]">Loading your workspace...</p>
          </div>
        </div>
      )}
    </>
  );
}
