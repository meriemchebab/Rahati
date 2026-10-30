"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, LoaderCircle } from "lucide-react";

import AuthLayout from "@/components/auth/AuthLayout";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await login({
        email: email.trim(),
        password,
      });

      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to access your professional workspace."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#68475e] mb-2"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b49aaa]" />

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-[#eadde6] bg-[#fdfafd] text-[#68475e] placeholder:text-[#b9a8b4] outline-none transition focus:border-[#b783a0] focus:ring-4 focus:ring-[#f2e5ed]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#68475e] mb-2"
          >
            Password
          </label>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b49aaa]" />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full h-12 pl-12 pr-12 rounded-xl border border-[#eadde6] bg-[#fdfafd] text-[#68475e] placeholder:text-[#b9a8b4] outline-none transition focus:border-[#b783a0] focus:ring-4 focus:ring-[#f2e5ed]"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a58b9d] hover:text-[#68475e]"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[#95617f] hover:bg-[#80516d] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition flex items-center justify-center gap-2 shadow-md shadow-[#95617f]/15"
        >
          {loading ? (
            <>
              <LoaderCircle className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#947f8e]">
        Don't have a professional account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#95617f] hover:text-[#68475e]"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
