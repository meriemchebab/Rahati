"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getProfile,
  updateProfile,
  type ProfessionalProfile,
} from "@/lib/professional-api";

type Tab = "profile" | "account";

const EMPTY_PROFILE: ProfessionalProfile = {
  display_name: "",
  bio: "",
  city: "",
  address: "",
  wilaya: "",
  credential_kind: "",
  status: "",
  credential_uploaded_at: null,
};

const inputClass =
  "mt-2 w-full rounded-xl border border-[#f0dfe9] bg-[#fffafd] px-4 py-3 text-sm text-[#59384f] outline-none transition focus:border-[#c58eac] focus:ring-2 focus:ring-[#f5e5ee]";

function Field({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-[#68475c]">
      {label}

      {multiline ? (
        <textarea
          className={inputClass}
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfessionalProfile>(EMPTY_PROFILE);

  const [savedProfile, setSavedProfile] =
    useState<ProfessionalProfile>(EMPTY_PROFILE);

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());

    async function loadProfile() {
      try {
        const result = await getProfile();

        setProfile(result);
        setSavedProfile(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your professional profile.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  const changeProfile = (field: keyof ProfessionalProfile, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateProfile({
        display_name: profile.display_name,
        bio: profile.bio,
        city: profile.city,
        address: profile.address,
        wilaya: profile.wilaya,
      });

      setProfile(updated);
      setSavedProfile(updated);

      window.dispatchEvent(new Event("rahati-profile-updated"));

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save your profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setProfile(savedProfile);
    setError("");
    setSuccess("");
  };

  const status = (profile.status || "").toLowerCase();

  const statusConfig = {
    verified: {
      label: "Verified",
      description:
        "Your professional account has been verified. You have access to the professional workspace.",
      className: "bg-[#edf7f1] text-[#527f68]",
      dotClass: "bg-[#72a987]",
    },
    pending: {
      label: "Pending",
      description: "Your professional credentials are awaiting review.",
      className: "bg-[#fff5e8] text-[#a8783d]",
      dotClass: "bg-[#d6a45e]",
    },
    rejected: {
      label: "Rejected",
      description: "Your professional verification was not approved.",
      className: "bg-red-50 text-red-700",
      dotClass: "bg-red-500",
    },
  };

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || {
    label: profile.status || "Unavailable",
    description: "Your verification status is currently unavailable.",
    className: "bg-[#f7f1f5] text-[#94758a]",
    dotClass: "bg-[#bda8b7]",
  };

  const tabs = [
    {
      id: "profile" as const,
      label: "Professional profile",
      description: "Your professional information",
      icon: UserRound,
    },
    {
      id: "account" as const,
      label: "Account",
      description: "Verification and credentials",
      icon: ShieldCheck,
    },
  ];

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage="Settings"
      pendingRequests={0}
      formattedDate={
        today
          ? today.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
          : ""
      }
      notificationsOpen={notificationsOpen}
      onNavigate={(label) => {
        const routes: Record<string, string> = {
          Overview: "/",
          Calendar: "/calendar",
          Requests: "/requests",
          Patients: "/patients",
          Settings: "/settings",
        };

        router.push(routes[label] || "/");
      }}
      onCloseSidebar={() => setSidebarOpen(false)}
      onOpenSidebar={() => setSidebarOpen(true)}
      onToggleNotifications={() => setNotificationsOpen((value) => !value)}
    >
      <div>
        {/* HEADER */}
        <header className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b77b9d]">
            YOUR WORKSPACE
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-[#59384f]">
            Settings
          </h1>

          <p className="mt-2 text-sm text-[#94758a]">
            Manage your professional profile and account information.
          </p>
        </header>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl bg-[#edf7f1] p-4 text-sm text-[#527f68]"
          >
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#bd83a3]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* SETTINGS NAVIGATION */}
            <aside className="rounded-2xl bg-white/85 p-3 shadow-sm">
              <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-[#b39aab]">
                SETTINGS
              </p>

              <nav className="space-y-1" aria-label="Settings">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setError("");
                        setSuccess("");
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition ${
                        active
                          ? "bg-[#f8edf4] text-[#80536f]"
                          : "text-[#846b7c] hover:bg-[#fcf6fa]"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {tab.label}
                        </span>

                        <span className="mt-1 block text-xs leading-relaxed opacity-75">
                          {tab.description}
                        </span>
                      </span>

                      <ChevronRight size={15} className="shrink-0 opacity-60" />
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* MAIN PANEL */}
            <main className="min-w-0 rounded-2xl bg-white/85 p-5 shadow-sm sm:p-7">
              {/* PROFILE */}
              {activeTab === "profile" && (
                <form onSubmit={saveProfile} className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-[#59384f]">
                      Professional profile
                    </h2>

                    <p className="mt-1 text-sm text-[#94758a]">
                      Keep your professional information up to date.
                    </p>
                  </div>

                  <Field
                    label="Display name"
                    value={profile.display_name}
                    required
                    onChange={(value) => changeProfile("display_name", value)}
                  />

                  <Field
                    label="Professional bio"
                    value={profile.bio}
                    multiline
                    onChange={(value) => changeProfile("bio", value)}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="City"
                      value={profile.city}
                      onChange={(value) => changeProfile("city", value)}
                    />

                    <Field
                      label="Wilaya"
                      value={profile.wilaya}
                      onChange={(value) => changeProfile("wilaya", value)}
                    />
                  </div>

                  <Field
                    label="Professional address"
                    value={profile.address}
                    onChange={(value) => changeProfile("address", value)}
                  />

                  <div className="rounded-xl bg-[#fff5fa] p-4">
                    <p className="text-sm font-semibold text-[#68475c]">
                      Verification status
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${currentStatus.dotClass}`}
                      />

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${currentStatus.className}`}
                      >
                        {currentStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-[#f5e7ef] pt-5">
                    <button
                      type="button"
                      onClick={cancelChanges}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl border border-[#eadce6] px-4 py-3 text-sm text-[#805b73] transition hover:bg-[#fcf5f9] disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      Discard changes
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-[#b77b9d] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#a96d8f] disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}

                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              )}

              {/* ACCOUNT */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#59384f]">
                      Account information
                    </h2>

                    <p className="mt-1 text-sm text-[#94758a]">
                      Your professional account and verification details.
                    </p>
                  </div>

                  {/* VERIFICATION CARD */}
                  <div className="rounded-2xl bg-[#fff5fa] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#b77b9d]">
                        <ShieldCheck size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#68475c]">
                          Professional verification
                        </p>

                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${currentStatus.className}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${currentStatus.dotClass}`}
                            />
                            {currentStatus.label}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-[#94758a]">
                          {currentStatus.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CREDENTIAL INFORMATION */}
                  <div className="rounded-xl border border-[#f2e6ed] p-5">
                    <h3 className="text-sm font-semibold text-[#68475c]">
                      Professional credentials
                    </h3>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-sm text-[#94758a]">
                        Credential type
                      </span>

                      <span className="text-sm font-medium text-[#68475c]">
                        {profile.credential_kind || "Not available"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-sm text-[#94758a]">
                        Credential uploaded
                      </span>

                      <span className="text-sm font-medium text-[#68475c]">
                        {profile.credential_uploaded_at
                          ? new Date(
                              profile.credential_uploaded_at,
                            ).toLocaleDateString("en-GB")
                          : "Not available"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#fcf5f9] p-4">
                    <p className="text-sm leading-relaxed text-[#94758a]">
                      Your verification status is managed by Rahati. If you need
                      to update your professional credentials or have questions
                      about your verification, please contact the platform
                      administrator.
                    </p>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
