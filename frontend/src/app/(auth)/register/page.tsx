"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import AuthLayout from "@/components/auth/AuthLayout";
import { registerProfessional } from "@/lib/auth";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[#eadde7] bg-[#fdfafd] px-4 py-3 text-sm text-[#49364f] outline-none transition placeholder:text-[#b6a5b4] focus:border-[#a77b96] focus:ring-2 focus:ring-[#a77b96]/15";

const labelClass = "text-sm font-medium text-[#59465f]";

const credentialOptions = [
  { value: "diploma", label: "Diploma / Degree" },
  { value: "licence", label: "Professional licence" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
] as const;

export default function RegisterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nickname: "",
    password: "",
    confirmPassword: "",
    language: "fr" as "ar" | "fr" | "en",
    email: "",
    phone: "",
    display_name: "",
    bio: "",
    city: "",
    address: "",
    credential_kind: "diploma" as
      | "diploma"
      | "licence"
      | "certificate"
      | "other",
    terms_accepted: false,
  });

  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredNickname, setRegisteredNickname] = useState("");

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleFileChange(file: File | null) {
    setError("");

    if (!file) {
      setCredentialFile(null);
      return;
    }

    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError("Please upload a PDF, JPG, JPEG, or PNG file.");
      setCredentialFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The document must not exceed 5 MB.");
      setCredentialFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setCredentialFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      setError("Please provide at least an email address or phone number.");
      return;
    }

    if (!credentialFile) {
      setError("Please upload your professional credential document.");
      return;
    }

    if (!form.terms_accepted) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerProfessional({
        nickname: form.nickname,
        password: form.password,
        language: form.language,
        email: form.email,
        phone: form.phone,
        display_name: form.display_name,
        bio: form.bio,
        city: form.city,
        address: form.address,
        credential_kind: form.credential_kind,
        credential_file: credentialFile,
        terms_accepted: form.terms_accepted,
      });

      setRegisteredNickname(result.nickname);
      setRegistered(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <AuthLayout
        title="Registration submitted"
        description="Your professional account has been created successfully."
      >
        <div className="rounded-2xl border border-[#dce9dc] bg-[#f3f8f2] p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e1eee0] text-2xl text-[#63866b]">
            ✓
          </div>

          <h3 className="text-lg font-semibold text-[#49364f]">
            Welcome to Rahati!
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#746477]">
            Your account{" "}
            <span className="font-semibold text-[#49364f]">
              {registeredNickname}
            </span>{" "}
            has been created.
          </p>

          <div className="mt-5 rounded-xl bg-white/80 p-4">
            <p className="text-sm font-semibold text-[#68475e]">
              Your profile is pending verification.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#8d788c]">
              Our team needs to review your professional credentials before your
              professional account can be verified.
            </p>
          </div>

          <Link
            href="/login"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#a77b96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#916681]"
          >
            Continue to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Join Rahati's professional community and manage your practice in one dedicated space."
    >
      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Account information */}
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#a77b96]">
              01 — Account information
            </h3>
            <p className="mt-1 text-xs text-[#a18e9f]">
              Create your login credentials.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="nickname" className={labelClass}>
                Username *
              </label>
              <input
                id="nickname"
                type="text"
                autoComplete="username"
                required
                maxLength={150}
                value={form.nickname}
                onChange={(e) => updateField("nickname", e.target.value)}
                placeholder="Choose a username"
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Create a password"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  placeholder="Repeat password"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="language" className={labelClass}>
                Preferred language *
              </label>

              <select
                id="language"
                value={form.language}
                onChange={(e) =>
                  updateField("language", e.target.value as "ar" | "fr" | "en")
                }
                className={inputClass}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+213..."
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-xs text-[#a18e9f]">
              At least one contact method (email or phone) is required.
            </p>
          </div>
        </section>

        {/* Professional information */}
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#a77b96]">
              02 — Professional information
            </h3>
            <p className="mt-1 text-xs text-[#a18e9f]">
              Tell us about your professional practice.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="display_name" className={labelClass}>
                Professional display name *
              </label>
              <input
                id="display_name"
                type="text"
                required
                maxLength={120}
                value={form.display_name}
                onChange={(e) => updateField("display_name", e.target.value)}
                placeholder="e.g. Dr. Nour"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="bio" className={labelClass}>
                Professional bio
              </label>
              <textarea
                id="bio"
                rows={3}
                maxLength={5000}
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Introduce your experience and areas of expertise..."
                className={`${inputClass} resize-y`}
              />
              <p className="mt-1 text-right text-xs text-[#b6a5b4]">
                {form.bio.length}/5000
              </p>
            </div>

            <div>
              <label htmlFor="city" className={labelClass}>
                City *
              </label>
              <input
                id="city"
                type="text"
                required
                maxLength={80}
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Your city"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>
                Address / District
              </label>
              <input
                id="address"
                type="text"
                maxLength={255}
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Credentials */}
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#a77b96]">
              03 — Professional credentials
            </h3>
            <p className="mt-1 text-xs text-[#a18e9f]">
              Upload a document to support your professional profile.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="credential_kind" className={labelClass}>
                Document type *
              </label>
              <select
                id="credential_kind"
                value={form.credential_kind}
                onChange={(e) =>
                  updateField(
                    "credential_kind",
                    e.target.value as typeof form.credential_kind,
                  )
                }
                className={inputClass}
              >
                {credentialOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="credential_file" className={labelClass}>
                Upload your document *
              </label>

              <div className="mt-1.5 rounded-xl border-2 border-dashed border-[#dfcbdc] bg-[#fdfafd] p-5 text-center transition hover:border-[#a77b96]">
                <input
                  ref={fileInputRef}
                  id="credential_file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  required
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] ?? null)
                  }
                  className="block w-full cursor-pointer text-sm text-[#8d788c] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#eee5ed] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#68475e] hover:file:bg-[#e5d7e4]"
                />

                {credentialFile && (
                  <p className="mt-3 break-all text-sm font-medium text-[#63866b]">
                    ✓ {credentialFile.name}
                  </p>
                )}

                <p className="mt-2 text-xs text-[#a18e9f]">
                  PDF, JPG, JPEG or PNG · Maximum size: 5 MB
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Terms */}
        <section className="rounded-xl bg-[#f8f2f7] p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.terms_accepted}
              onChange={(e) => updateField("terms_accepted", e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#a77b96]"
            />

            <span className="text-sm leading-6 text-[#746477]">
              I confirm that the information provided is accurate and I agree to
              the Rahati terms and conditions. *
            </span>
          </label>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="whitespace-pre-line rounded-xl border border-[#edc9d0] bg-[#fff3f4] px-4 py-3 text-sm leading-6 text-[#a34f62]"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-[#a77b96] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#916681] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating your account..." : "Create professional account"}
        </button>

        <p className="text-center text-sm text-[#8d788c]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#916681] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
