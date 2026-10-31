"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Lock, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { reloadProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);
      await login({
        username: username.trim(),
        password,
      });

      await reloadProfile();

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
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
            htmlFor="username"
            className="mb-2 block text-sm font-medium text-[#111018]"
          >
            Username
          </label>

          <div className="relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b899d]" />

            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#dcd3e9] bg-white pl-12 pr-4 text-[#111018] outline-none transition placeholder:text-[#8b899d] focus:border-[#7673FF] focus:ring-4 focus:ring-[#ccb9fe]/30"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-[#111018]"
          >
            Password
          </label>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b899d]" />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#dcd3e9] bg-white pl-12 pr-12 text-[#111018] outline-none transition placeholder:text-[#8b899d] focus:border-[#7673FF] focus:ring-4 focus:ring-[#ccb9fe]/30"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b899d] transition hover:text-[#7673FF]"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7673FF] font-medium text-[#111018] shadow-md shadow-[#7673FF]/15 transition hover:bg-[#CCB9FE] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#656376]">
        Don't have a professional account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#7673FF] transition hover:text-[#111018]"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
