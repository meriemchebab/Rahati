"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";

export default function ProfessionalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
