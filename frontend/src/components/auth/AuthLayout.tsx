import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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
    <main className="min-h-screen bg-[#f7f0f5] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl min-h-[650px] grid md:grid-cols-2 overflow-hidden rounded-[28px] bg-white shadow-[0_20px_70px_rgba(103,55,85,0.09)]">
        {/* Branding section */}
        <section className="relative hidden md:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#BDCFFF] via-[#C8B6FE] to-[#E7C5FF] p-12">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#FED5FF]/60 blur-3xl" />

          <Link href="/login" className="relative z-10">
            <Image
              src="/images/rahati-logo.svg"
              alt="Rahati"
              width={150}
              height={65}
              priority
              className="h-auto w-[145px] object-contain"
            />
          </Link>

          <div className="relative z-10 max-w-md">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#68475e]">
              Rahati for professionals
            </span>

            <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#49364f]">
              A space dedicated to better care.
            </h1>

            <p className="mt-5 text-base leading-7 text-[#59465f]">
              Manage your practice, organize appointments, and support the women
              in your care through one dedicated workspace.
            </p>
          </div>

          <p className="relative z-10 text-xs text-[#68475e]/75">
            © 2026 Rahati. All rights reserved.
          </p>
        </section>

        {/* Form section */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-10 md:hidden">
              <Image
                src="/images/rahati-logo.svg"
                alt="Rahati"
                width={130}
                height={55}
                priority
                className="h-auto w-[130px] object-contain"
              />
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-[#49364f]">
              {title}
            </h2>

            <p className="mt-3 mb-8 text-sm leading-6 text-[#8d788c]">
              {description}
            </p>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
