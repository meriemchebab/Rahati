import type { ReactNode } from "react";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

export default function AuthLayout({
  children,
  title,
  description,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#fbf5f8] flex items-center justify-center p-5">
      <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-[32px] overflow-hidden shadow-[0_20px_70px_rgba(103,55,85,0.10)]">
        <section className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#f3dce9] via-[#ead8e8] to-[#e5dff1] p-12">
          <Link href="/login" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/80 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6 text-[#95617f]" />
            </div>

            <span className="text-2xl font-semibold tracking-tight text-[#68475e]">
              Rahati
            </span>
          </Link>

          <div className="max-w-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-[#95617f] mb-4">
              Your professional space
            </p>

            <h1 className="text-4xl font-semibold leading-tight text-[#68475e]">
              Care begins with understanding.
            </h1>

            <p className="mt-5 text-[#80677c] leading-relaxed">
              A dedicated space to manage your practice, support women, and
              follow their care journey.
            </p>
          </div>

          <p className="text-sm text-[#987e91]">
            © {new Date().getFullYear()} Rahati. All rights reserved.
          </p>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-12">
          <div className="w-full max-w-md">
            <div className="md:hidden flex items-center gap-2 mb-10">
              <HeartHandshake className="w-7 h-7 text-[#95617f]" />
              <span className="text-2xl font-semibold text-[#68475e]">
                Rahati
              </span>
            </div>

            <h2 className="text-3xl font-semibold text-[#68475e]">{title}</h2>

            <p className="mt-2 mb-8 text-sm text-[#947f8e]">{description}</p>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
