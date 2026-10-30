"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Globe,
  Heart,
  LockKeyhole,
  Palette,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";

type Profile = {
  fullName: string;
  email: string;
  specialty: string;
  phone: string;
  bio: string;
};

type NotificationPreferences = {
  appointmentRequests: boolean;
  appointmentReminders: boolean;
  patientUpdates: boolean;
};

const initialProfile: Profile = {
  fullName: "Dr. Sarah Benali",
  email: "sarah.benali@example.com",
  specialty: "Psychologist",
  phone: "",
  bio: "Dedicated to supporting women's mental health and emotional well-being.",
};

const initialNotifications: NotificationPreferences = {
  appointmentRequests: true,
  appointmentReminders: true,
  patientUpdates: false,
};

const inputClassName =
  "w-full rounded-2xl border border-[#E8E2F2] bg-white/80 px-4 py-3 text-sm text-[#51466B] outline-none transition placeholder:text-[#B2A9C4] focus:border-[#B8C0FF] focus:ring-4 focus:ring-[#B8C0FF]/20";

const labelClassName = "mb-2 block text-sm font-medium text-[#655A7C]";

export default function SettingsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [savedProfile, setSavedProfile] = useState<Profile>(initialProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [successMessage, setSuccessMessage] = useState("");

  const [language, setLanguage] = useState("English");
  const [reminderTime, setReminderTime] = useState("30 minutes");
  const [appearance, setAppearance] = useState("Light");

  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(initialNotifications);

  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timeout = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const updateProfile = (field: keyof Profile, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveProfile = () => {
    if (!profile.fullName.trim() || !profile.email.trim()) {
      setSuccessMessage("Please enter your name and email address.");
      return;
    }

    setSavedProfile({ ...profile });
    setIsEditing(false);
    setSuccessMessage("Your profile changes have been saved locally.");
  };

  const handleCancelEditing = () => {
    setProfile({ ...savedProfile });
    setIsEditing(false);
  };

  const toggleNotification = (key: keyof NotificationPreferences) => {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const navigationItems = [
    {
      id: "profile",
      label: "Profile information",
      description: "Your professional details",
      icon: UserRound,
    },
    {
      id: "preferences",
      label: "Preferences",
      description: "Language and appointments",
      icon: Settings2,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Choose what you receive",
      icon: Bell,
    },
    {
      id: "appearance",
      label: "Appearance",
      description: "Your interface preferences",
      icon: Palette,
    },
  ];

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage="Settings"
      pendingRequests={3}
      formattedDate={formattedDate}
      notificationsOpen={notificationsOpen}
      onNavigate={(path) => router.push(path)}
      onCloseSidebar={() => setSidebarOpen(false)}
      onOpenSidebar={() => setSidebarOpen(true)}
      onToggleNotifications={() => setNotificationsOpen((current) => !current)}
    >
      <div className="min-h-full bg-gradient-to-br from-[#FDFBFF] via-[#FAF7FF] to-[#F5F5FF] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Page heading */}
          <header className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-r from-[#FDEBFA] via-[#F0E8FF] to-[#E8EDFF] p-6 shadow-[0_8px_35px_rgba(137,116,184,0.08)] sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/40 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/60 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#8271A7]">
                  <Settings2 size={14} />
                  YOUR WORKSPACE
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-[#514366] sm:text-3xl">
                  Settings & profile
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#81758F] sm:text-base">
                  Manage your professional information and personalize your
                  Rahati workspace.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start rounded-2xl border border-white/80 bg-white/60 px-4 py-3 sm:self-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E7C5FF] to-[#B8C0FF] text-[#66558E]">
                  <Heart size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#514366]">
                    Your space, your way
                  </p>
                  <p className="mt-1 text-xs text-[#8C809D]">
                    {formattedDate || "Professional workspace"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Feedback message */}
          {successMessage && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-[#D8ECDD] bg-[#F0FAF3] px-4 py-3 text-sm text-[#46785B]"
            >
              <Check size={18} className="mt-0.5 shrink-0" />
              <p>{successMessage}</p>

              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                aria-label="Dismiss message"
                className="ml-auto rounded-lg p-1 transition hover:bg-white/70"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Main content */}
          <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* Settings navigation */}
            <aside className="rounded-[1.75rem] border border-white bg-white/75 p-4 shadow-[0_8px_35px_rgba(137,116,184,0.06)] backdrop-blur-sm">
              <div className="px-3 pb-4 pt-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A197B5]">
                  Account settings
                </p>
              </div>

              <nav aria-label="Settings sections" className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-[#F4E6FF] to-[#EEF0FF] shadow-sm"
                          : "hover:bg-[#FAF7FF]"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                          isActive
                            ? "bg-white text-[#8270B8] shadow-sm"
                            : "bg-[#F8F5FC] text-[#9A8EAF] group-hover:text-[#8270B8]"
                        }`}
                      >
                        <Icon size={19} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium ${
                            isActive ? "text-[#62517F]" : "text-[#756A88]"
                          }`}
                        >
                          {item.label}
                        </span>

                        <span className="mt-1 block text-xs text-[#A198B1]">
                          {item.description}
                        </span>
                      </span>

                      <ChevronRight
                        size={16}
                        className={
                          isActive ? "text-[#9B88C8]" : "text-[#D0C8DD]"
                        }
                      />
                    </button>
                  );
                })}
              </nav>

              <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#FDF0FA] to-[#F0EEFF] p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#957DB9]">
                  <ShieldCheck size={19} />
                </div>

                <p className="text-sm font-semibold text-[#66567D]">
                  Your privacy matters
                </p>

                <p className="mt-2 text-xs leading-5 text-[#9386A4]">
                  Rahati is designed to support a respectful and private
                  professional workspace.
                </p>
              </div>
            </aside>

            {/* Selected settings section */}
            <div className="min-w-0 space-y-6">
              {/* PROFILE */}
              {activeSection === "profile" && (
                <>
                  <section className="overflow-hidden rounded-[1.75rem] border border-white bg-white/85 shadow-[0_8px_35px_rgba(137,116,184,0.06)]">
                    <div className="border-b border-[#F0EBF7] bg-gradient-to-r from-[#FBF5FF] to-[#F5F3FF] px-6 py-5 sm:px-8">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-[#514366]">
                            Profile information
                          </h2>
                          <p className="mt-1 text-sm text-[#9488A5]">
                            Keep your professional details up to date.
                          </p>
                        </div>

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfile({ ...savedProfile });
                              setIsEditing(true);
                            }}
                            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#79669F] shadow-sm ring-1 ring-[#EDE5F7] transition hover:bg-[#F9F5FF]"
                          >
                            Edit profile
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-6 sm:p-8">
                      <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#FBF2FC] to-[#F1F1FF] p-5 sm:flex-row sm:items-center">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#E7C5FF] via-[#C8B6FE] to-[#B8C0FF] text-xl font-semibold text-white shadow-sm">
                          {profile.fullName
                            .trim()
                            .split(/\s+/)
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "DR"}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-[#514366]">
                            {profile.fullName || "Your name"}
                          </h3>

                          <p className="mt-1 text-sm text-[#8E81A1]">
                            {profile.specialty || "Your specialty"}
                          </p>

                          <p className="mt-2 break-all text-xs text-[#A197B1]">
                            {profile.email}
                          </p>
                        </div>

                        <div className="sm:ml-auto">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-[#7C6B9E]">
                            <span className="h-2 w-2 rounded-full bg-[#9BCBAA]" />
                            Professional account
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="fullName" className={labelClassName}>
                            Full name
                          </label>

                          <input
                            id="fullName"
                            value={profile.fullName}
                            disabled={!isEditing}
                            onChange={(event) =>
                              updateProfile("fullName", event.target.value)
                            }
                            className={`${inputClassName} disabled:cursor-default disabled:bg-[#FAF8FC] disabled:text-[#82768F]`}
                          />
                        </div>

                        <div>
                          <label htmlFor="email" className={labelClassName}>
                            Email address
                          </label>

                          <input
                            id="email"
                            type="email"
                            value={profile.email}
                            disabled={!isEditing}
                            onChange={(event) =>
                              updateProfile("email", event.target.value)
                            }
                            className={`${inputClassName} disabled:cursor-default disabled:bg-[#FAF8FC] disabled:text-[#82768F]`}
                          />
                        </div>

                        <div>
                          <label htmlFor="specialty" className={labelClassName}>
                            Professional specialty
                          </label>

                          <input
                            id="specialty"
                            value={profile.specialty}
                            disabled={!isEditing}
                            onChange={(event) =>
                              updateProfile("specialty", event.target.value)
                            }
                            placeholder="e.g. Psychologist"
                            className={`${inputClassName} disabled:cursor-default disabled:bg-[#FAF8FC] disabled:text-[#82768F]`}
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className={labelClassName}>
                            Phone number
                          </label>

                          <input
                            id="phone"
                            type="tel"
                            value={profile.phone}
                            disabled={!isEditing}
                            onChange={(event) =>
                              updateProfile("phone", event.target.value)
                            }
                            placeholder="Add your phone number"
                            className={`${inputClassName} disabled:cursor-default disabled:bg-[#FAF8FC] disabled:text-[#82768F]`}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label htmlFor="bio" className={labelClassName}>
                            Professional bio
                          </label>

                          <textarea
                            id="bio"
                            rows={4}
                            value={profile.bio}
                            disabled={!isEditing}
                            onChange={(event) =>
                              updateProfile("bio", event.target.value)
                            }
                            placeholder="Tell patients a little about your professional approach..."
                            className={`${inputClassName} resize-y disabled:cursor-default disabled:bg-[#FAF8FC] disabled:text-[#82768F]`}
                          />
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#F0EBF7] pt-6">
                          <button
                            type="button"
                            onClick={handleCancelEditing}
                            className="rounded-xl px-5 py-3 text-sm font-medium text-[#857997] transition hover:bg-[#F8F5FC]"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#A99AE8] to-[#9BA9F5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                          >
                            <Save size={16} />
                            Save changes
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-white bg-white/85 p-6 shadow-[0_8px_35px_rgba(137,116,184,0.05)] sm:p-8">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1ECFF] text-[#8D7BB8]">
                        <LockKeyhole size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-[#514366]">
                          Account security
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-[#9387A4]">
                          Password changes and authentication settings will be
                          available when the login and backend authentication
                          flow is integrated.
                        </p>

                        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F8F4FC] px-3 py-1.5 text-xs font-medium text-[#9382AC]">
                          <Clock size={13} />
                          Coming with authentication
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* PREFERENCES */}
              {activeSection === "preferences" && (
                <section className="rounded-[1.75rem] border border-white bg-white/85 p-6 shadow-[0_8px_35px_rgba(137,116,184,0.06)] sm:p-8">
                  <div className="mb-7">
                    <h2 className="text-lg font-semibold text-[#514366]">
                      Your preferences
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#9387A4]">
                      Personalize how you use your professional workspace.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1ECFF] text-[#8D7BB8]">
                          <Globe size={19} />
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-[#5C5071]">
                            Language
                          </h3>
                          <p className="mt-1 text-sm text-[#9B90AA]">
                            Choose your preferred interface language.
                          </p>
                        </div>
                      </div>

                      <select
                        aria-label="Preferred language"
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        className={`${inputClassName} sm:max-w-52`}
                      >
                        <option>English</option>
                        <option>Français</option>
                        <option>العربية</option>
                      </select>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-[#EEE7F6] to-transparent" />

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FDF0FA] text-[#BA83B6]">
                          <CalendarDays size={19} />
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-[#5C5071]">
                            Appointment reminders
                          </h3>
                          <p className="mt-1 text-sm text-[#9B90AA]">
                            Choose when you prefer to receive reminders.
                          </p>
                        </div>
                      </div>

                      <select
                        aria-label="Appointment reminder time"
                        value={reminderTime}
                        onChange={(event) =>
                          setReminderTime(event.target.value)
                        }
                        className={`${inputClassName} sm:max-w-52`}
                      >
                        <option>15 minutes</option>
                        <option>30 minutes</option>
                        <option>1 hour</option>
                        <option>1 day</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#FBF3FC] to-[#F0F0FF] p-4">
                    <p className="text-sm font-medium text-[#6D5C87]">
                      Your preferences
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#998CAB]">
                      These choices currently apply only to this page. They will
                      be saved to your account after API integration.
                    </p>
                  </div>
                </section>
              )}

              {/* NOTIFICATIONS */}
              {activeSection === "notifications" && (
                <section className="rounded-[1.75rem] border border-white bg-white/85 p-6 shadow-[0_8px_35px_rgba(137,116,184,0.06)] sm:p-8">
                  <div className="mb-7">
                    <h2 className="text-lg font-semibold text-[#514366]">
                      Notification settings
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#9387A4]">
                      Choose which updates you want to receive.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        key: "appointmentRequests" as const,
                        title: "New appointment requests",
                        description:
                          "Get notified when a patient requests an appointment.",
                        icon: CalendarDays,
                      },
                      {
                        key: "appointmentReminders" as const,
                        title: "Appointment reminders",
                        description:
                          "Receive reminders about your upcoming sessions.",
                        icon: Clock,
                      },
                      {
                        key: "patientUpdates" as const,
                        title: "Patient updates",
                        description:
                          "Receive updates related to your patients' activity.",
                        icon: Heart,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const enabled = notificationPreferences[item.key];

                      return (
                        <div
                          key={item.key}
                          className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#FCFAFF] to-[#F9F8FF] p-4 transition hover:from-[#FAF5FF] hover:to-[#F4F3FF] sm:p-5"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#9B87C2] shadow-sm">
                            <Icon size={19} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-[#5C5071]">
                              {item.title}
                            </h3>

                            <p className="mt-1 text-xs leading-5 text-[#9B90AA] sm:text-sm">
                              {item.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            aria-label={item.title}
                            onClick={() => toggleNotification(item.key)}
                            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                              enabled ? "bg-[#A99AE8]" : "bg-[#DDD6E8]"
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                enabled ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-5 text-xs leading-5 text-[#A197B1]">
                    Notification preferences are temporary until the
                    notification service is connected.
                  </p>
                </section>
              )}

              {/* APPEARANCE */}
              {activeSection === "appearance" && (
                <section className="rounded-[1.75rem] border border-white bg-white/85 p-6 shadow-[0_8px_35px_rgba(137,116,184,0.06)] sm:p-8">
                  <div className="mb-7">
                    <h2 className="text-lg font-semibold text-[#514366]">
                      Appearance
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#9387A4]">
                      Choose how you prefer your workspace to look.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      {
                        name: "Light",
                        description: "Bright and soft",
                        preview:
                          "bg-gradient-to-br from-white via-[#FBF6FF] to-[#EEE9FF]",
                      },
                      {
                        name: "Soft",
                        description: "Pastel and calming",
                        preview:
                          "bg-gradient-to-br from-[#FDEBFA] via-[#E7C5FF] to-[#BDCFFF]",
                      },
                      {
                        name: "System",
                        description: "Follow device settings",
                        preview:
                          "bg-gradient-to-br from-[#DCD5EC] via-[#B8C0FF] to-[#C8B6FE]",
                      },
                    ].map((option) => {
                      const selected = appearance === option.name;

                      return (
                        <button
                          key={option.name}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setAppearance(option.name)}
                          className={`rounded-2xl p-3 text-left transition ${
                            selected
                              ? "bg-[#F5F0FF] ring-2 ring-[#B8A6E8]"
                              : "bg-[#FAF8FC] ring-1 ring-[#EEE8F5] hover:bg-[#F6F1FC]"
                          }`}
                        >
                          <div
                            className={`flex h-28 items-end justify-end rounded-xl p-3 ${option.preview}`}
                          >
                            {selected && (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#8975B9] shadow-sm">
                                <Check size={15} />
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-sm font-semibold text-[#5C5071]">
                            {option.name}
                          </p>

                          <p className="mt-1 text-xs text-[#9B90AA]">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-2xl bg-[#F9F6FD] p-4">
                    <p className="text-sm font-medium text-[#6D5C87]">
                      Selected: {appearance}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#998CAB]">
                      This selection is currently a frontend preference.
                      Applying and saving themes across the application can be
                      added separately.
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="flex flex-col items-center justify-between gap-2 pb-4 text-center text-xs text-[#A79BB6] sm:flex-row sm:text-left">
            <p>Rahati · Your well-being matters.</p>
            <p>Professional workspace</p>
          </footer>
        </div>
      </div>
    </DashboardLayout>
  );
}
