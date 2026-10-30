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
  LockKeyhole,
  Palette,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";

type Language = "English" | "Français" | "العربية";
type Section = "profile" | "preferences" | "notifications" | "appearance";
type Appearance = "Light" | "Soft" | "System";

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
  bio: "",
};

const initialNotifications: NotificationPreferences = {
  appointmentRequests: true,
  appointmentReminders: true,
  patientUpdates: false,
};

const translations = {
  English: {
    title: "Settings",
    subtitle: "Manage your profile and workspace preferences.",
    profile: "Profile information",
    profileDescription: "Your professional details",
    preferences: "Preferences",
    preferencesDescription: "Language and appointments",
    notifications: "Notifications",
    notificationsDescription: "Choose what you receive",
    appearance: "Appearance",
    appearanceDescription: "Your interface preferences",
    personalDetails: "Personal information",
    personalDescription: "Keep your professional information up to date.",
    fullName: "Full name",
    email: "Email address",
    specialty: "Specialty",
    phone: "Phone number",
    bio: "Professional bio",
    namePlaceholder: "Enter your full name",
    emailPlaceholder: "Enter your email address",
    specialtyPlaceholder: "Your specialty",
    phonePlaceholder: "Enter your phone number",
    bioPlaceholder: "Tell patients a little about yourself...",
    save: "Save changes",
    cancel: "Cancel",
    saved: "Your changes have been saved.",
    profileSaved: "Profile updated successfully.",
    preferencesTitle: "Workspace preferences",
    preferencesDescriptionFull:
      "Customize your language and appointment reminders.",
    language: "Display language",
    languageDescription: "Choose the language used on this page.",
    reminderTime: "Appointment reminder",
    reminderDescription:
      "Choose how long before an appointment you want a reminder.",
    minutes15: "15 minutes before",
    minutes30: "30 minutes before",
    hour1: "1 hour before",
    hours24: "24 hours before",
    notificationTitle: "Notification preferences",
    notificationDescription: "Choose which updates you would like to receive.",
    requests: "Appointment requests",
    requestsDescription: "Get notified when a woman requests an appointment.",
    reminders: "Appointment reminders",
    remindersDescription: "Receive reminders about upcoming sessions.",
    patientUpdates: "Patient updates",
    patientUpdatesDescription: "Receive updates about the women in your care.",
    appearanceTitle: "Workspace appearance",
    appearanceDescriptionFull:
      "Choose your preferred appearance for the workspace.",
    light: "Light",
    lightDescription: "A bright, clean interface",
    soft: "Soft",
    softDescription: "Gentle colors and a calming feel",
    system: "System",
    systemDescription: "Follow your device preferences",
    security: "Account security",
    securityDescription:
      "Authentication and password management will be available when login is connected.",
    comingSoon: "Coming soon",
    required: "Please enter your name and a valid email address.",
    settingsMenu: "Settings sections",
    languageChanged: "Language changed.",
    professional: "Professional workspace",
  },

  Français: {
    title: "Paramètres",
    subtitle: "Gérez votre profil et les préférences de votre espace.",
    profile: "Informations du profil",
    profileDescription: "Vos informations professionnelles",
    preferences: "Préférences",
    preferencesDescription: "Langue et rendez-vous",
    notifications: "Notifications",
    notificationsDescription: "Choisissez les notifications à recevoir",
    appearance: "Apparence",
    appearanceDescription: "Préférences de votre interface",
    personalDetails: "Informations personnelles",
    personalDescription: "Gardez vos informations professionnelles à jour.",
    fullName: "Nom complet",
    email: "Adresse e-mail",
    specialty: "Spécialité",
    phone: "Numéro de téléphone",
    bio: "Présentation professionnelle",
    namePlaceholder: "Saisissez votre nom complet",
    emailPlaceholder: "Saisissez votre adresse e-mail",
    specialtyPlaceholder: "Votre spécialité",
    phonePlaceholder: "Saisissez votre numéro de téléphone",
    bioPlaceholder: "Présentez-vous brièvement aux patientes...",
    save: "Enregistrer les modifications",
    cancel: "Annuler",
    saved: "Vos modifications ont été enregistrées.",
    profileSaved: "Profil mis à jour avec succès.",
    preferencesTitle: "Préférences de l’espace",
    preferencesDescriptionFull:
      "Personnalisez la langue et les rappels de rendez-vous.",
    language: "Langue d’affichage",
    languageDescription: "Choisissez la langue utilisée sur cette page.",
    reminderTime: "Rappel de rendez-vous",
    reminderDescription:
      "Choisissez le délai avant le rendez-vous pour recevoir un rappel.",
    minutes15: "15 minutes avant",
    minutes30: "30 minutes avant",
    hour1: "1 heure avant",
    hours24: "24 heures avant",
    notificationTitle: "Préférences de notification",
    notificationDescription:
      "Choisissez les notifications que vous souhaitez recevoir.",
    requests: "Demandes de rendez-vous",
    requestsDescription:
      "Soyez informée lorsqu’une femme demande un rendez-vous.",
    reminders: "Rappels de rendez-vous",
    remindersDescription: "Recevez des rappels pour les prochaines séances.",
    patientUpdates: "Actualités des patientes",
    patientUpdatesDescription:
      "Recevez des mises à jour concernant les femmes que vous accompagnez.",
    appearanceTitle: "Apparence de l’espace",
    appearanceDescriptionFull:
      "Choisissez l’apparence de votre espace de travail.",
    light: "Clair",
    lightDescription: "Une interface lumineuse et épurée",
    soft: "Doux",
    softDescription: "Des couleurs douces et apaisantes",
    system: "Système",
    systemDescription: "Suivre les préférences de votre appareil",
    security: "Sécurité du compte",
    securityDescription:
      "La gestion de l’authentification et du mot de passe sera disponible lorsque la connexion sera intégrée.",
    comingSoon: "Bientôt disponible",
    required: "Veuillez saisir votre nom et une adresse e-mail valide.",
    settingsMenu: "Sections des paramètres",
    languageChanged: "Langue modifiée.",
    professional: "Espace professionnel",
  },

  العربية: {
    title: "الإعدادات",
    subtitle: "إدارة ملفك الشخصي وتفضيلات مساحة العمل.",
    profile: "معلومات الملف الشخصي",
    profileDescription: "معلوماتك المهنية",
    preferences: "التفضيلات",
    preferencesDescription: "اللغة والمواعيد",
    notifications: "الإشعارات",
    notificationsDescription: "اختاري الإشعارات التي تريدين تلقيها",
    appearance: "المظهر",
    appearanceDescription: "تفضيلات الواجهة",
    personalDetails: "المعلومات الشخصية",
    personalDescription: "حافظي على تحديث معلوماتك المهنية.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    specialty: "التخصص",
    phone: "رقم الهاتف",
    bio: "نبذة مهنية",
    namePlaceholder: "أدخلي اسمك الكامل",
    emailPlaceholder: "أدخلي بريدك الإلكتروني",
    specialtyPlaceholder: "تخصصك",
    phonePlaceholder: "أدخلي رقم هاتفك",
    bioPlaceholder: "عرّفي المراجعات بنفسك باختصار...",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    saved: "تم حفظ التغييرات.",
    profileSaved: "تم تحديث الملف الشخصي بنجاح.",
    preferencesTitle: "تفضيلات مساحة العمل",
    preferencesDescriptionFull: "خصصي اللغة وتذكيرات المواعيد.",
    language: "لغة العرض",
    languageDescription: "اختاري اللغة المستخدمة في هذه الصفحة.",
    reminderTime: "التذكير بالموعد",
    reminderDescription: "اختاري المدة التي تسبق الموعد لإرسال التذكير.",
    minutes15: "قبل 15 دقيقة",
    minutes30: "قبل 30 دقيقة",
    hour1: "قبل ساعة واحدة",
    hours24: "قبل 24 ساعة",
    notificationTitle: "تفضيلات الإشعارات",
    notificationDescription: "اختاري الإشعارات التي ترغبين في تلقيها.",
    requests: "طلبات المواعيد",
    requestsDescription: "إشعار عند طلب إحدى المراجعات موعدًا.",
    reminders: "تذكيرات المواعيد",
    remindersDescription: "تلقي تذكيرات بالجلسات القادمة.",
    patientUpdates: "تحديثات المراجعات",
    patientUpdatesDescription: "تلقي تحديثات متعلقة بالنساء اللواتي تتابعينهن.",
    appearanceTitle: "مظهر مساحة العمل",
    appearanceDescriptionFull: "اختاري المظهر المناسب لمساحة عملك.",
    light: "فاتح",
    lightDescription: "واجهة مشرقة وبسيطة",
    soft: "هادئ",
    softDescription: "ألوان ناعمة ومريحة",
    system: "النظام",
    systemDescription: "اتباع إعدادات جهازك",
    security: "أمان الحساب",
    securityDescription:
      "ستتوفر إعدادات تسجيل الدخول وكلمة المرور بعد ربط نظام المصادقة.",
    comingSoon: "قريبًا",
    required: "يرجى إدخال الاسم وبريد إلكتروني صالح.",
    settingsMenu: "أقسام الإعدادات",
    languageChanged: "تم تغيير اللغة.",
    professional: "مساحة العمل المهنية",
  },
} as const;

export default function SettingsPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("English");
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [savedProfile, setSavedProfile] = useState<Profile>(initialProfile);
  const [notifications, setNotifications] =
    useState<NotificationPreferences>(initialNotifications);
  const [reminderTime, setReminderTime] = useState("30");
  const [appearance, setAppearance] = useState<Appearance>("Soft");
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  const t = translations[language];
  const isArabic = language === "العربية";

  useEffect(() => {
    const now = new Date();

    setCurrentDate(
      now.toLocaleDateString(
        language === "Français"
          ? "fr-FR"
          : language === "العربية"
            ? "ar"
            : "en-US",
        {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        },
      ),
    );
  }, [language]);

  const navigationItems: {
    id: Section;
    title: string;
    description: string;
    icon: typeof UserRound;
  }[] = [
    {
      id: "profile",
      title: t.profile,
      description: t.profileDescription,
      icon: UserRound,
    },
    {
      id: "preferences",
      title: t.preferences,
      description: t.preferencesDescription,
      icon: Globe,
    },
    {
      id: "notifications",
      title: t.notifications,
      description: t.notificationsDescription,
      icon: Bell,
    },
    {
      id: "appearance",
      title: t.appearance,
      description: t.appearanceDescription,
      icon: Palette,
    },
  ];

  function showMessage(text: string) {
    setMessage(text);
    setError("");

    window.setTimeout(() => setMessage(""), 3000);
  }

  function updateProfile(field: keyof Profile, value: string) {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function saveProfile() {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email);

    if (!profile.fullName.trim() || !validEmail) {
      setError(t.required);
      setMessage("");
      return;
    }

    setSavedProfile({ ...profile });
    showMessage(t.profileSaved);
  }

  function cancelProfileChanges() {
    setProfile({ ...savedProfile });
    setError("");
    setMessage("");
  }

  function toggleNotification(key: keyof NotificationPreferences) {
    setNotifications((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  function navigateToSection(section: Section) {
    setActiveSection(section);

    document
      .getElementById(section)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const cardClass =
    "rounded-3xl border border-[#F0E7F0] bg-white/90 p-6 shadow-[0_8px_30px_rgba(102,67,101,0.045)] sm:p-7";

  const inputClass =
    "mt-2 w-full rounded-xl border border-[#E9DFEA] bg-[#FFFCFE] px-4 py-3 text-sm text-[#49394D] outline-none transition placeholder:text-[#B4A6B8] focus:border-[#B59BCB] focus:ring-4 focus:ring-[#B59BCB]/10";

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage="Settings"
      pendingRequests={3}
      formattedDate={currentDate}
      notificationsOpen={notificationsOpen}
      onNavigate={(path: string) => router.push(path)}
      onCloseSidebar={() => setSidebarOpen(false)}
      onOpenSidebar={() => setSidebarOpen(true)}
      onToggleNotifications={() =>
        setNotificationsOpen((previous) => !previous)
      }
    >
      <main
        dir={isArabic ? "rtl" : "ltr"}
        className="min-h-screen bg-gradient-to-br from-[#FFF9FC] via-[#FCF8FF] to-[#F8F7FF] px-4 py-7 text-[#49394D] sm:px-7 lg:px-9 lg:py-9"
      >
        <div className="mx-auto max-w-7xl">
          {/* Page heading */}
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 text-xs font-semibold tracking-wide text-[#9978A4] shadow-sm ring-1 ring-[#F0E7F0]">
                <Settings2 size={15} />
                {t.professional}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-[#49394D] sm:text-4xl">
                {t.title}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#95849A] sm:text-base">
                {t.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-2xl border border-[#F0E7F0] bg-white/80 px-4 py-3 text-sm text-[#8F7D96] sm:self-auto">
              <CalendarDays size={17} className="text-[#AD8AB8]" />
              <span>{currentDate}</span>
            </div>
          </header>

          {/* Feedback messages */}
          {message && (
            <div
              role="status"
              className="mb-5 flex items-center gap-3 rounded-2xl border border-[#D9EBDD] bg-[#F2FAF3] px-4 py-3 text-sm text-[#477A59]"
            >
              <Check size={18} />
              <span>{message}</span>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
                className="ms-auto rounded-lg p-1 hover:bg-[#E5F4E8]"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-[#F0D6DD] bg-[#FFF5F7] px-4 py-3 text-sm text-[#A54E67]"
            >
              {error}
            </div>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[265px_minmax(0,1fr)]">
            {/* Settings navigation */}
            <aside className="lg:sticky lg:top-6">
              <div className="rounded-3xl border border-[#F0E7F0] bg-white/85 p-3 shadow-[0_8px_30px_rgba(102,67,101,0.04)]">
                <p className="px-3 pb-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B09DB6]">
                  {t.settingsMenu}
                </p>

                <nav className="space-y-1.5">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateToSection(item.id)}
                        aria-current={isActive ? "location" : undefined}
                        className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-start transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-[#F7EAF2] to-[#F0ECFC] text-[#795B83] shadow-sm"
                            : "text-[#8F8095] hover:bg-[#FCF7FC] hover:text-[#795B83]"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            isActive
                              ? "bg-white text-[#A27EAD] shadow-sm"
                              : "bg-[#FAF5FA] text-[#B09CB7] group-hover:bg-white"
                          }`}
                        >
                          <Icon size={19} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[#A596AA]">
                            {item.description}
                          </span>
                        </span>

                        <ChevronRight
                          size={16}
                          className={`shrink-0 transition-transform ${
                            isActive
                              ? "translate-x-0 text-[#A27EAD]"
                              : "text-[#C7B9CC] group-hover:translate-x-0.5"
                          }`}
                        />
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Security information */}
              <div className="mt-4 rounded-3xl border border-[#EAE4F6] bg-gradient-to-br from-[#F4EFFB] to-[#FFF5F9] p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-[#9D83B6] shadow-sm">
                  <ShieldCheck size={20} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-[#725A7D]">
                  {t.security}
                </h3>

                <p className="mt-2 text-xs leading-5 text-[#95849D]">
                  {t.securityDescription}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#9C82A6]">
                  <LockKeyhole size={13} />
                  {t.comingSoon}
                </div>
              </div>
            </aside>

            {/* Settings sections */}
            <div className="min-w-0 space-y-6">
              {/* PROFILE */}
              <section id="profile" className={cardClass}>
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7EAF2] text-[#AC80A1]">
                    <UserRound size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#49394D]">
                      {t.personalDetails}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#9A8A9F]">
                      {t.personalDescription}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-[#6F5C75]">
                    {t.fullName}
                    <input
                      type="text"
                      autoComplete="name"
                      value={profile.fullName}
                      onChange={(event) =>
                        updateProfile("fullName", event.target.value)
                      }
                      placeholder={t.namePlaceholder}
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-medium text-[#6F5C75]">
                    {t.email}
                    <input
                      type="email"
                      autoComplete="email"
                      value={profile.email}
                      onChange={(event) =>
                        updateProfile("email", event.target.value)
                      }
                      placeholder={t.emailPlaceholder}
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-medium text-[#6F5C75]">
                    {t.specialty}
                    <input
                      type="text"
                      value={profile.specialty}
                      onChange={(event) =>
                        updateProfile("specialty", event.target.value)
                      }
                      placeholder={t.specialtyPlaceholder}
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-medium text-[#6F5C75]">
                    {t.phone}
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={profile.phone}
                      onChange={(event) =>
                        updateProfile("phone", event.target.value)
                      }
                      placeholder={t.phonePlaceholder}
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-medium text-[#6F5C75] sm:col-span-2">
                    {t.bio}
                    <textarea
                      rows={4}
                      value={profile.bio}
                      onChange={(event) =>
                        updateProfile("bio", event.target.value)
                      }
                      placeholder={t.bioPlaceholder}
                      className={`${inputClass} resize-y`}
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#F5EEF5] pt-5">
                  <button
                    type="button"
                    onClick={cancelProfileChanges}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#EAE0EB] bg-white px-4 py-2.5 text-sm font-medium text-[#8D7A93] transition hover:bg-[#FCF7FC]"
                  >
                    <X size={16} />
                    {t.cancel}
                  </button>

                  <button
                    type="button"
                    onClick={saveProfile}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B88FAE] to-[#A294CE] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-[0.97] hover:shadow-md"
                  >
                    <Save size={16} />
                    {t.save}
                  </button>
                </div>
              </section>

              {/* PREFERENCES */}
              <section id="preferences" className={cardClass}>
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEEAFB] text-[#9485C5]">
                    <Globe size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#49394D]">
                      {t.preferencesTitle}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#9A8A9F]">
                      {t.preferencesDescriptionFull}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-2xl bg-[#FCF9FD] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#A58BB2] shadow-sm">
                        <Globe size={17} />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-[#6F5C75]">
                          {t.language}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-[#A092A5]">
                          {t.languageDescription}
                        </p>
                      </div>
                    </div>

                    <select
                      value={language}
                      onChange={(event) => {
                        setLanguage(event.target.value as Language);
                        setMessage("");
                        setError("");
                      }}
                      aria-label={t.language}
                      className="w-full rounded-xl border border-[#E9DFEA] bg-white px-4 py-3 text-sm text-[#6F5C75] outline-none transition focus:border-[#B59BCB] focus:ring-4 focus:ring-[#B59BCB]/10 sm:w-48"
                    >
                      <option value="English">English</option>
                      <option value="Français">Français</option>
                      <option value="العربية">العربية</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl bg-[#FCF9FD] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#A58BB2] shadow-sm">
                        <Clock size={17} />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-[#6F5C75]">
                          {t.reminderTime}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-[#A092A5]">
                          {t.reminderDescription}
                        </p>
                      </div>
                    </div>

                    <select
                      value={reminderTime}
                      onChange={(event) => setReminderTime(event.target.value)}
                      aria-label={t.reminderTime}
                      className="w-full rounded-xl border border-[#E9DFEA] bg-white px-4 py-3 text-sm text-[#6F5C75] outline-none transition focus:border-[#B59BCB] focus:ring-4 focus:ring-[#B59BCB]/10 sm:w-48"
                    >
                      <option value="15">{t.minutes15}</option>
                      <option value="30">{t.minutes30}</option>
                      <option value="60">{t.hour1}</option>
                      <option value="1440">{t.hours24}</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* NOTIFICATIONS */}
              <section id="notifications" className={cardClass}>
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FBEAF0] text-[#C0809B]">
                    <Bell size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#49394D]">
                      {t.notificationTitle}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#9A8A9F]">
                      {t.notificationDescription}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {(
                    [
                      {
                        key: "appointmentRequests",
                        title: t.requests,
                        description: t.requestsDescription,
                      },
                      {
                        key: "appointmentReminders",
                        title: t.reminders,
                        description: t.remindersDescription,
                      },
                      {
                        key: "patientUpdates",
                        title: t.patientUpdates,
                        description: t.patientUpdatesDescription,
                      },
                    ] as const
                  ).map((item) => {
                    const enabled = notifications[item.key];

                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-2xl px-3 py-4 transition-colors hover:bg-[#FCF8FC] sm:px-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-[#6F5C75]">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-[#A092A5]">
                            {item.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={item.title}
                          onClick={() => toggleNotification(item.key)}
                          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B59BCB]/25 ${
                            enabled ? "bg-[#A99AE8]" : "bg-[#DDD6E8]"
                          }`}
                        >
                          <span
                            className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ${
                              enabled ? "left-[26px]" : "left-[2px]"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* APPEARANCE */}
              <section id="appearance" className={cardClass}>
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAEFFC] text-[#8194C8]">
                    <Palette size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#49394D]">
                      {t.appearanceTitle}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#9A8A9F]">
                      {t.appearanceDescriptionFull}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      {
                        value: "Light",
                        title: t.light,
                        description: t.lightDescription,
                        preview: "bg-white",
                        accent: "bg-[#F4EAF2]",
                      },
                      {
                        value: "Soft",
                        title: t.soft,
                        description: t.softDescription,
                        preview: "bg-[#FCF7FC]",
                        accent: "bg-[#EDE4F7]",
                      },
                      {
                        value: "System",
                        title: t.system,
                        description: t.systemDescription,
                        preview: "bg-gradient-to-br from-white to-[#F0ECF9]",
                        accent: "bg-[#DCD3F1]",
                      },
                    ] as const
                  ).map((option) => {
                    const selected = appearance === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setAppearance(option.value as Appearance)
                        }
                        className={`rounded-2xl border p-3 text-start transition-all duration-200 ${
                          selected
                            ? "border-[#B59BCB] bg-[#FAF5FC] ring-2 ring-[#B59BCB]/15"
                            : "border-[#F0E7F0] bg-white hover:border-[#DCCBE2] hover:bg-[#FFFBFE]"
                        }`}
                      >
                        <div
                          className={`mb-3 h-20 overflow-hidden rounded-xl border border-[#F0E7F0] p-2 ${option.preview}`}
                        >
                          <div className="flex h-full gap-2">
                            <div
                              className={`w-1/4 rounded-md ${option.accent}`}
                            />
                            <div className="flex flex-1 flex-col gap-2 pt-1">
                              <div className="h-2 w-3/4 rounded-full bg-[#DCCFE1]" />
                              <div className="h-2 w-full rounded-full bg-[#EDE5EF]" />
                              <div className="h-2 w-2/3 rounded-full bg-[#EDE5EF]" />
                              <div className="mt-auto h-5 rounded-md bg-[#E9DCEB]" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#6F5C75]">
                            {option.title}
                          </span>

                          {selected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B59BCB] text-white">
                              <Check size={12} />
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs leading-5 text-[#A092A5]">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs leading-5 text-[#A092A5]">
                  {t.appearanceDescriptionFull}
                </p>
              </section>

              {/* Footer */}
              <footer className="px-2 pb-5 pt-1 text-center text-xs text-[#B0A1B5]">
                Rahati · {t.professional}
              </footer>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
