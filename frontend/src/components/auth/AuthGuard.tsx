"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "./AuthContext";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f0f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-4 border-[#e8d8e5] border-t-[#95617f] animate-spin" />
          <p className="text-sm text-[#8d788c]">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
