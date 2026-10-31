"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronRight,
  Globe,
  Loader2,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getProfile,
  updateProfile,
  type ProfessionalProfile,
} from "@/lib/professional-api";

type Tab =
  | "profile"
  | "preferences"
  | "notifications"
  | "appearance"
  | "account";
type Language = "en" | "fr" | "ar";
type Theme = "light" | "soft" | "dark";

type Preferences = {
  language: Language;
  theme: Theme;
  appointmentReminders: boolean;
  newRequests: boolean;
  sessionUpdates: boolean;
  weeklySummary: boolean;
};

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

const DEFAULT_PREFERENCES: Preferences = {
  language: "en",
  theme: "soft",
  appointmentReminders: true,
  newRequests: true,
  sessionUpdates: true,
  weeklySummary: false,
};

const COPY = {
  en: {
    account: "ACCOUNT",
    title: "Settings",
    subtitle: "Manage your profile and workspace preferences.",
    profile: "Profile information",
    preferences: "Preferences",
    notifications: "Notifications",
    appearance: "Appearance",
    security: "Account",
    profileDesc: "Your professional information",
    preferencesDesc: "Language and regional settings",
    notificationsDesc: "Manage your notification preferences",
    appearanceDesc: "Personalize your workspace",
    securityDesc: "Your account and verification status",
    name: "Display name",
    bio: "Professional bio",
    city: "City",
    wilaya: "Wilaya",
    address: "Professional address",
    verification: "Verification status",
    credential: "Credential type",
    language: "Application language",
    english: "English",
    french: "French",
    arabic: "Arabic",
    theme: "Workspace appearance",
    light: "Light",
    soft: "Soft",
    dark: "Dark",
    reminders: "Appointment reminders",
    remindersDesc: "Remind me about upcoming sessions",
    requests: "New appointment requests",
    requestsDesc: "Notify me about incoming requests",
    updates: "Session updates",
    updatesDesc: "Notify me when session details change",
    summary: "Weekly summary",
    summaryDesc: "A summary of your professional activity",
    save: "Save changes",
    cancel: "Discard changes",
    savePreferences: "Save preferences",
    saving: "Saving...",
    loading: "Loading settings...",
    saved: "Changes saved successfully.",
    preferencesSaved: "Preferences saved on this device.",
    loadError: "Unable to load your professional profile.",
    unavailable: "Not available",
    pending: "Pending",
    verified: "Verified",
    rejected: "Rejected",
    comingSoon: "Coming soon",
    localNotice:
      "Language and notification preferences are saved in this browser. Actual push notifications require a notification service.",
    themeNotice:
      "This saves your appearance preference. Applying the theme throughout every page requires shared application-wide theme support.",
  },
  fr: {
    account: "COMPTE",
    title: "Paramètres",
    subtitle: "Gérez votre profil et les préférences de votre espace.",
    profile: "Informations du profil",
    preferences: "Préférences",
    notifications: "Notifications",
    appearance: "Apparence",
    security: "Compte",
    profileDesc: "Vos informations professionnelles",
    preferencesDesc: "Langue et paramètres régionaux",
    notificationsDesc: "Gérez vos préférences de notification",
    appearanceDesc: "Personnalisez votre espace",
    securityDesc: "Votre compte et votre statut de vérification",
    name: "Nom affiché",
    bio: "Biographie professionnelle",
    city: "Ville",
    wilaya: "Wilaya",
    address: "Adresse professionnelle",
    verification: "Statut de vérification",
    credential: "Type de justificatif",
    language: "Langue de l'application",
    english: "Anglais",
    french: "Français",
    arabic: "Arabe",
    theme: "Apparence de l'espace",
    light: "Clair",
    soft: "Doux",
    dark: "Sombre",
    reminders: "Rappels de rendez-vous",
    remindersDesc: "Recevoir des rappels avant les séances",
    requests: "Nouvelles demandes",
    requestsDesc: "Être informée des nouvelles demandes",
    updates: "Mises à jour des séances",
    updatesDesc: "Être informée des changements de séance",
    summary: "Résumé hebdomadaire",
    summaryDesc: "Un résumé de votre activité professionnelle",
    save: "Enregistrer",
    cancel: "Annuler les modifications",
    savePreferences: "Enregistrer les préférences",
    saving: "Enregistrement...",
    loading: "Chargement des paramètres...",
    saved: "Modifications enregistrées.",
    preferencesSaved: "Préférences enregistrées sur cet appareil.",
    loadError: "Impossible de charger votre profil professionnel.",
    unavailable: "Non disponible",
    pending: "En attente",
    verified: "Vérifié",
    rejected: "Refusé",
    comingSoon: "Bientôt disponible",
    localNotice:
      "Les préférences sont enregistrées dans ce navigateur. Les notifications réelles nécessitent un service dédié.",
    themeNotice:
      "Le choix est enregistré. L'application du thème à toutes les pages nécessite une prise en charge globale.",
  },
  ar: {
    account: "الحساب",
    title: "الإعدادات",
    subtitle: "إدارة ملفك المهني وتفضيلات مساحة العمل.",
    profile: "معلومات الملف الشخصي",
    preferences: "التفضيلات",
    notifications: "الإشعارات",
    appearance: "المظهر",
    security: "الحساب",
    profileDesc: "معلوماتك المهنية",
    preferencesDesc: "اللغة والإعدادات الإقليمية",
    notificationsDesc: "إدارة تفضيلات الإشعارات",
    appearanceDesc: "تخصيص مساحة العمل",
    securityDesc: "حسابك وحالة التحقق",
    name: "الاسم المعروض",
    bio: "نبذة مهنية",
    city: "المدينة",
    wilaya: "الولاية",
    address: "العنوان المهني",
    verification: "حالة التحقق",
    credential: "نوع الوثيقة",
    language: "لغة التطبيق",
    english: "الإنجليزية",
    french: "الفرنسية",
    arabic: "العربية",
    theme: "مظهر مساحة العمل",
    light: "فاتح",
    soft: "هادئ",
    dark: "داكن",
    reminders: "تذكيرات المواعيد",
    remindersDesc: "التذكير بالجلسات القادمة",
    requests: "طلبات المواعيد الجديدة",
    requestsDesc: "الإشعار عند وصول طلب جديد",
    updates: "تحديثات الجلسات",
    updatesDesc: "الإشعار عند تغيير تفاصيل الجلسة",
    summary: "الملخص الأسبوعي",
    summaryDesc: "ملخص نشاطك المهني",
    save: "حفظ التغييرات",
    cancel: "إلغاء التغييرات",
    savePreferences: "حفظ التفضيلات",
    saving: "جارٍ الحفظ...",
    loading: "جارٍ تحميل الإعدادات...",
    saved: "تم حفظ التغييرات بنجاح.",
    preferencesSaved: "تم حفظ التفضيلات على هذا الجهاز.",
    loadError: "تعذر تحميل ملفك المهني.",
    unavailable: "غير متاح",
    pending: "قيد الانتظار",
    verified: "تم التحقق",
    rejected: "مرفوض",
    comingSoon: "قريبًا",
    localNotice:
      "تُحفظ التفضيلات في هذا المتصفح. تحتاج الإشعارات الفعلية إلى خدمة مخصصة.",
    themeNotice:
      "يُحفظ اختيار المظهر. يتطلب تطبيقه على جميع الصفحات دعمًا عامًا للسمات.",
  },
} as const;

function loadPreferences(): Preferences {
  try {
    const value = localStorage.getItem("rahati-preferences");
    if (value) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(value) };
    }
  } catch {
    // Use default preferences if local storage is unavailable.
  }
  return DEFAULT_PREFERENCES;
}

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

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-[#b77b9d]" : "bg-[#dfd4dc]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfessionalProfile>(EMPTY_PROFILE);
  const [savedProfile, setSavedProfile] =
    useState<ProfessionalProfile>(EMPTY_PROFILE);

  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [savedPreferences, setSavedPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  const t = COPY[preferences.language];

  useEffect(() => {
    setToday(new Date());

    const stored = loadPreferences();
    setPreferences(stored);
    setSavedPreferences(stored);

    async function loadProfile() {
      try {
        const result = await getProfile();
        setProfile(result);
        setSavedProfile(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : COPY.en.loadError);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    document.documentElement.lang = preferences.language;
    document.documentElement.dir =
      preferences.language === "ar" ? "rtl" : "ltr";
  }, [preferences.language]);

  const changeProfile = (field: keyof ProfessionalProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSuccess("");
  };

  const changePreference = <K extends keyof Preferences>(
    field: K,
    value: Preferences[K],
  ) => {
    setPreferences((current) => ({ ...current, [field]: value }));
    setSuccess("");
  };

  const saveLocalPreferences = () => {
    try {
      localStorage.setItem("rahati-preferences", JSON.stringify(preferences));
      setSavedPreferences(preferences);
      setSuccess(t.preferencesSaved);
      setError("");
    } catch {
      setError("Unable to save preferences in this browser.");
    }
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

      // Refresh the professional name in the sidebar and Overview greeting.
      window.dispatchEvent(new Event("rahati-profile-updated"));

      try {
        localStorage.setItem("rahati-preferences", JSON.stringify(preferences));
        setSavedPreferences(preferences);
      } catch {
        // The profile was saved by Django even if browser storage fails.
      }

      setSuccess(t.saved);
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
    setPreferences(savedPreferences);
    setError("");
    setSuccess("");
  };

  const tabs: {
    id: Tab;
    label: string;
    description: string;
    icon: typeof UserRound;
  }[] = [
    {
      id: "profile",
      label: t.profile,
      description: t.profileDesc,
      icon: UserRound,
    },
    {
      id: "preferences",
      label: t.preferences,
      description: t.preferencesDesc,
      icon: Globe,
    },
    {
      id: "notifications",
      label: t.notifications,
      description: t.notificationsDesc,
      icon: Bell,
    },
    {
      id: "appearance",
      label: t.appearance,
      description: t.appearanceDesc,
      icon: Sun,
    },
    {
      id: "account",
      label: t.security,
      description: t.securityDesc,
      icon: ShieldCheck,
    },
  ];

  const status = (profile.status || "").toLowerCase();
  const statusLabel =
    status === "verified"
      ? t.verified
      : status === "pending"
        ? t.pending
        : status === "rejected"
          ? t.rejected
          : profile.status || t.unavailable;

  const dateLocale =
    preferences.language === "fr"
      ? "fr-FR"
      : preferences.language === "ar"
        ? "ar-DZ"
        : "en-US";

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage="Settings"
      pendingRequests={0}
      formattedDate={today ? today.toLocaleDateString(dateLocale) : ""}
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
      <div dir={preferences.language === "ar" ? "rtl" : "ltr"}>
        <header className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b77b9d]">
            {t.account}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#59384f]">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-[#94758a]">{t.subtitle}</p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

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
            {/* RESTORED LEFT SETTINGS MENU */}
            <aside className="rounded-2xl bg-white/85 p-3 shadow-sm">
              <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-[#b39aab]">
                {t.title}
              </p>

              <nav className="space-y-1" aria-label={t.title}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
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

            {/* ACTIVE SETTINGS PANEL */}
            <main className="min-w-0 rounded-2xl bg-white/85 p-5 shadow-sm sm:p-7">
              {activeTab === "profile" && (
                <form onSubmit={saveProfile} className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-[#59384f]">
                      {t.profile}
                    </h2>
                    <p className="mt-1 text-sm text-[#94758a]">
                      {t.profileDesc}
                    </p>
                  </div>

                  <Field
                    label={t.name}
                    value={profile.display_name}
                    required
                    onChange={(value) => changeProfile("display_name", value)}
                  />
                  <Field
                    label={t.bio}
                    value={profile.bio}
                    multiline
                    onChange={(value) => changeProfile("bio", value)}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label={t.city}
                      value={profile.city}
                      onChange={(value) => changeProfile("city", value)}
                    />
                    <Field
                      label={t.wilaya}
                      value={profile.wilaya}
                      onChange={(value) => changeProfile("wilaya", value)}
                    />
                  </div>

                  <Field
                    label={t.address}
                    value={profile.address}
                    onChange={(value) => changeProfile("address", value)}
                  />

                  <div className="rounded-xl bg-[#fff5fa] p-4">
                    <p className="text-sm font-semibold text-[#68475c]">
                      {t.verification}
                    </p>
                    <p className="mt-1 text-sm text-[#94758a]">{statusLabel}</p>
                    <p className="mt-3 text-xs text-[#a58c9c]">
                      {t.credential}: {profile.credential_kind || t.unavailable}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-[#f5e7ef] pt-5">
                    <button
                      type="button"
                      onClick={cancelChanges}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl border border-[#eadce6] px-4 py-3 text-sm text-[#805b73] hover:bg-[#fcf5f9] disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-[#b77b9d] px-5 py-3 text-sm font-medium text-white hover:bg-[#a96d8f] disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      {saving ? t.saving : t.save}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#59384f]">
                      {t.preferences}
                    </h2>
                    <p className="mt-1 text-sm text-[#94758a]">
                      {t.preferencesDesc}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#68475c]">
                      {t.language}
                    </label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          ["en", t.english],
                          ["fr", t.french],
                          ["ar", t.arabic],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => changePreference("language", value)}
                          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
                            preferences.language === value
                              ? "border-[#bd83a3] bg-[#fff1f8] font-semibold text-[#80536f]"
                              : "border-[#f0dfe9] text-[#68475c] hover:bg-[#fcf5f9]"
                          }`}
                        >
                          {label}
                          {preferences.language === value && (
                            <Check size={16} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="rounded-xl bg-[#fcf5f9] p-4 text-xs leading-relaxed text-[#94758a]">
                    {t.localNotice}
                  </p>

                  <button
                    type="button"
                    onClick={saveLocalPreferences}
                    className="flex items-center gap-2 rounded-xl bg-[#b77b9d] px-5 py-3 text-sm font-medium text-white hover:bg-[#a96d8f]"
                  >
                    <Save size={16} />
                    {t.savePreferences}
                  </button>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#59384f]">
                      {t.notifications}
                    </h2>
                    <p className="mt-1 text-sm text-[#94758a]">
                      {t.notificationsDesc}
                    </p>
                  </div>

                  {(
                    [
                      ["appointmentReminders", t.reminders, t.remindersDesc],
                      ["newRequests", t.requests, t.requestsDesc],
                      ["sessionUpdates", t.updates, t.updatesDesc],
                      ["weeklySummary", t.summary, t.summaryDesc],
                    ] as const
                  ).map(([key, title, description]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 border-b border-[#f5e7ef] pb-5 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#68475c]">
                          {title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#94758a]">
                          {description}
                        </p>
                      </div>
                      <Switch
                        checked={preferences[key]}
                        onChange={(value) => changePreference(key, value)}
                      />
                    </div>
                  ))}

                  <p className="rounded-xl bg-[#fcf5f9] p-4 text-xs leading-relaxed text-[#94758a]">
                    {t.localNotice}
                  </p>

                  <button
                    type="button"
                    onClick={saveLocalPreferences}
                    className="flex items-center gap-2 rounded-xl bg-[#b77b9d] px-5 py-3 text-sm font-medium text-white hover:bg-[#a96d8f]"
                  >
                    <Save size={16} />
                    {t.savePreferences}
                  </button>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#59384f]">
                      {t.appearance}
                    </h2>
                    <p className="mt-1 text-sm text-[#94758a]">
                      {t.appearanceDesc}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-[#68475c]">
                    {t.theme}
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        ["light", t.light, Sun],
                        ["soft", t.soft, Check],
                        ["dark", t.dark, Moon],
                      ] as const
                    ).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => changePreference("theme", value)}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${
                          preferences.theme === value
                            ? "border-[#bd83a3] bg-[#fff1f8] font-semibold text-[#80536f]"
                            : "border-[#f0dfe9] text-[#68475c] hover:bg-[#fcf5f9]"
                        }`}
                      >
                        <Icon size={18} />
                        {label}
                        {preferences.theme === value && (
                          <Check size={15} className="ms-auto" />
                        )}
                      </button>
                    ))}
                  </div>

                  <p className="rounded-xl bg-[#fcf5f9] p-4 text-xs leading-relaxed text-[#94758a]">
                    {t.themeNotice}
                  </p>

                  <button
                    type="button"
                    onClick={saveLocalPreferences}
                    className="flex items-center gap-2 rounded-xl bg-[#b77b9d] px-5 py-3 text-sm font-medium text-white hover:bg-[#a96d8f]"
                  >
                    <Save size={16} />
                    {t.savePreferences}
                  </button>
                </div>
              )}

              {activeTab === "account" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-[#59384f]">
                      {t.security}
                    </h2>
                    <p className="mt-1 text-sm text-[#94758a]">
                      {t.securityDesc}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#fff5fa] p-5">
                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        className="mt-0.5 text-[#b77b9d]"
                        size={21}
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#68475c]">
                          {t.verification}
                        </p>
                        <p className="mt-2 text-sm text-[#94758a]">
                          {statusLabel}
                        </p>
                        <p className="mt-3 text-xs text-[#a58c9c]">
                          {t.credential}:{" "}
                          {profile.credential_kind || t.unavailable}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[#94758a]">{t.comingSoon}</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
