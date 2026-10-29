"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  UsersRound,
  UserRound,
  CalendarDays,
  Clock3,
  Heart,
  ArrowUpRight,
  MessageCircle,
  CheckCircle2,
  FileText,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";

type PatientStatus = "Active" | "Follow-up";

interface Patient {
  id: number;
  name: string;
  initials: string;
  status: PatientStatus;
  lastSession: string;
  nextAppointment: string;
  nextAppointmentTime: string;
  sessionsCompleted: number;
  sharedUpdates: number;
  summary: string;
  sharedNote: string;
  recentActivity: string[];
}

type PatientFilter = "All" | PatientStatus;

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 1,
    name: "Amel K.",
    initials: "AK",
    status: "Active",
    lastSession: "October 26, 2026",
    nextAppointment: "November 2, 2026",
    nextAppointmentTime: "10:00 AM",
    sessionsCompleted: 6,
    sharedUpdates: 2,
    summary:
      "An ongoing therapeutic relationship with regular appointments scheduled.",
    sharedNote:
      "Shared progress updates are available for the professional to review.",
    recentActivity: [
      "Completed a session on October 26",
      "Shared a personal progress update",
      "Next appointment scheduled for November 2",
    ],
  },
  {
    id: 2,
    name: "Lina B.",
    initials: "LB",
    status: "Follow-up",
    lastSession: "October 20, 2026",
    nextAppointment: "November 3, 2026",
    nextAppointmentTime: "2:00 PM",
    sessionsCompleted: 4,
    sharedUpdates: 1,
    summary:
      "A follow-up appointment is scheduled to continue the previous sessions.",
    sharedNote:
      "One shared progress update is available for the professional to review.",
    recentActivity: [
      "Completed a session on October 20",
      "Shared a progress update",
      "Follow-up appointment scheduled for November 3",
    ],
  },
  {
    id: 3,
    name: "Nour A.",
    initials: "NA",
    status: "Active",
    lastSession: "October 28, 2026",
    nextAppointment: "November 4, 2026",
    nextAppointmentTime: "11:00 AM",
    sessionsCompleted: 8,
    sharedUpdates: 0,
    summary: "An ongoing patient with a regular appointment schedule.",
    sharedNote: "There are no new shared updates to review at the moment.",
    recentActivity: [
      "Completed a session on October 28",
      "Appointment confirmed for November 4",
    ],
  },
  {
    id: 4,
    name: "Sara M.",
    initials: "SM",
    status: "Follow-up",
    lastSession: "October 16, 2026",
    nextAppointment: "November 5, 2026",
    nextAppointmentTime: "9:00 AM",
    sessionsCompleted: 3,
    sharedUpdates: 3,
    summary:
      "A follow-up is planned to review progress since the previous appointment.",
    sharedNote:
      "Three shared updates are available for the professional to review.",
    recentActivity: [
      "Completed a session on October 16",
      "Shared a new progress update",
      "Follow-up appointment scheduled for November 5",
    ],
  },
  {
    id: 5,
    name: "Yasmine R.",
    initials: "YR",
    status: "Active",
    lastSession: "October 23, 2026",
    nextAppointment: "November 6, 2026",
    nextAppointmentTime: "1:00 PM",
    sessionsCompleted: 5,
    sharedUpdates: 1,
    summary: "Regular sessions are being used to review ongoing progress.",
    sharedNote:
      "One shared progress update is available for the professional to review.",
    recentActivity: [
      "Completed a session on October 23",
      "Shared a progress update",
      "Next appointment scheduled for November 6",
    ],
  },
];

const PATIENT_FILTERS: PatientFilter[] = ["All", "Active", "Follow-up"];

const AVATAR_BACKGROUNDS = [
  "#BDCFFF",
  "#B8C0FF",
  "#C8B6FE",
  "#E7C5FF",
  "#FED5FF",
];

export default function PatientsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");
  const [patients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [activeFilter, setActiveFilter] = useState<PatientFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    setFormattedDate(
      new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    );
  }, []);

  const activeCount = patients.filter(
    (patient) => patient.status === "Active",
  ).length;

  const followUpCount = patients.filter(
    (patient) => patient.status === "Follow-up",
  ).length;

  const sharedUpdatesCount = patients.reduce(
    (total, patient) => total + patient.sharedUpdates,
    0,
  );

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesFilter =
        activeFilter === "All" || patient.status === activeFilter;

      const matchesSearch =
        !query || patient.name.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [patients, activeFilter, searchQuery]);

  function handleNavigate(label: string) {
    const routes: Record<string, string> = {
      Overview: "/",
      Calendar: "/calendar",
      Requests: "/requests",
      Patients: "/patients",
      Settings: "/settings",
    };

    setSidebarOpen(false);

    if (routes[label]) {
      router.push(routes[label]);
    }
  }

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage="Patients"
      pendingRequests={3}
      formattedDate={formattedDate}
      notificationsOpen={notificationsOpen}
      onNavigate={handleNavigate}
      onCloseSidebar={() => setSidebarOpen(false)}
      onOpenSidebar={() => setSidebarOpen(true)}
      onToggleNotifications={() => setNotificationsOpen((current) => !current)}
    >
      <div className="space-y-7">
        {/* Heading */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#8273B5]">
            <UsersRound size={17} />
            YOUR PRACTICE
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-[#352D4B]">
            Your patients
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#81788F]">
            Keep track of your patient relationships, upcoming sessions, and
            shared progress updates.
          </p>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PatientStat
            label="Total patients"
            value={patients.length}
            description="In your practice"
            icon={<UsersRound size={20} />}
            background="#BDCFFF"
            iconColor="#45639A"
          />

          <PatientStat
            label="Active patients"
            value={activeCount}
            description="Ongoing appointments"
            icon={<Heart size={20} />}
            background="#B8C0FF"
            iconColor="#5958A5"
          />

          <PatientStat
            label="Follow-ups"
            value={followUpCount}
            description="Follow-up status"
            icon={<CalendarDays size={20} />}
            background="#C8B6FE"
            iconColor="#6B56A0"
          />

          <PatientStat
            label="Shared updates"
            value={sharedUpdatesCount}
            description="Updates shared with you"
            icon={<MessageCircle size={20} />}
            background="#FED5FF"
            iconColor="#9A5C91"
          />
        </section>

        {/* Patient list */}
        <section className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_40px_rgba(79,61,113,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#403651]">
                Patient directory
              </h2>
              <p className="mt-1 text-sm text-[#91879E]">
                Browse your patients and their latest activity.
              </p>
            </div>

            <div className="relative w-full lg:max-w-xs">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A49AAF]"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search patients..."
                aria-label="Search patients"
                className="w-full rounded-2xl border border-[#ECE4F4] bg-[#FCFAFE] py-3 pl-10 pr-4 text-sm text-[#403651] outline-none transition placeholder:text-[#A49AAF] focus:border-[#B8C0FF] focus:ring-2 focus:ring-[#B8C0FF]/30"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {PATIENT_FILTERS.map((filter) => {
              const count =
                filter === "All"
                  ? patients.length
                  : patients.filter((patient) => patient.status === filter)
                      .length;

              const selected = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    selected
                      ? "bg-[#E7C5FF] text-[#65457E] shadow-sm"
                      : "bg-[#F7F3FB] text-[#81788F] hover:bg-[#F0E9FA]"
                  }`}
                >
                  {filter}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      selected
                        ? "bg-white/70 text-[#65457E]"
                        : "bg-white text-[#81788F]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Patient cards */}
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredPatients.map((patient) => {
              const avatarBackground =
                AVATAR_BACKGROUNDS[
                  (patient.id - 1) % AVATAR_BACKGROUNDS.length
                ];

              return (
                <article
                  key={patient.id}
                  className="rounded-[24px] bg-[#FCFAFE] p-5 transition hover:bg-[#FAF6FF] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-[#594A84]"
                        style={{ backgroundColor: avatarBackground }}
                      >
                        {patient.initials}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-[#403651]">
                          {patient.name}
                        </h3>

                        <PatientStatusBadge status={patient.status} />
                      </div>
                    </div>

                    {patient.sharedUpdates > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F1E9FF] px-2.5 py-1.5 text-xs font-medium text-[#775CA5]">
                        <Sparkles size={13} />
                        {patient.sharedUpdates}{" "}
                        {patient.sharedUpdates === 1 ? "update" : "updates"}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#81788F]">
                    {patient.summary}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3.5">
                      <div className="flex items-center gap-2 text-xs text-[#91879E]">
                        <Clock3 size={15} className="text-[#927FC7]" />
                        Last session
                      </div>

                      <p className="mt-2 text-sm font-medium text-[#514566]">
                        {patient.lastSession}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3.5">
                      <div className="flex items-center gap-2 text-xs text-[#91879E]">
                        <CalendarDays size={15} className="text-[#927FC7]" />
                        Next appointment
                      </div>

                      <p className="mt-2 text-sm font-medium text-[#514566]">
                        {patient.nextAppointment}
                      </p>

                      <p className="mt-1 text-xs text-[#91879E]">
                        {patient.nextAppointmentTime}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-[#91879E]">
                      {patient.sessionsCompleted} sessions completed
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedPatient(patient)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B78C6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7864B5]"
                    >
                      View profile
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredPatients.length === 0 && (
            <div className="rounded-[24px] bg-[#FCFAFE] px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7C5FF] text-[#78529B]">
                <UsersRound size={25} />
              </div>

              <h3 className="mt-4 font-semibold text-[#403651]">
                No patients found
              </h3>

              <p className="mt-2 text-sm text-[#91879E]">
                Try another name or change the selected filter.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("All");
                }}
                className="mt-4 rounded-xl bg-[#F0E9FA] px-4 py-2.5 text-sm font-medium text-[#67559A] transition hover:bg-[#E7C5FF]"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Patient profile dialog */}
      {selectedPatient && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#302541]/35 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPatient(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-profile-title"
            className="my-auto w-full max-w-xl rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_80px_rgba(48,37,65,0.2)] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-semibold text-[#594A84]"
                  style={{
                    backgroundColor:
                      AVATAR_BACKGROUNDS[
                        (selectedPatient.id - 1) % AVATAR_BACKGROUNDS.length
                      ],
                  }}
                >
                  {selectedPatient.initials}
                </div>

                <div>
                  <h2
                    id="patient-profile-title"
                    className="text-xl font-semibold text-[#403651]"
                  >
                    {selectedPatient.name}
                  </h2>

                  <PatientStatusBadge status={selectedPatient.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                aria-label="Close patient profile"
                className="rounded-xl p-2 text-[#81788F] transition hover:bg-[#F4EFF9]"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#81788F]">
              {selectedPatient.summary}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F6F2FC] p-4">
                <div className="flex items-center gap-2 text-xs text-[#81788F]">
                  <CheckCircle2 size={15} className="text-[#8B78C6]" />
                  Sessions completed
                </div>

                <p className="mt-2 text-2xl font-semibold text-[#403651]">
                  {selectedPatient.sessionsCompleted}
                </p>
              </div>

              <div className="rounded-2xl bg-[#F6F2FC] p-4">
                <div className="flex items-center gap-2 text-xs text-[#81788F]">
                  <MessageCircle size={15} className="text-[#8B78C6]" />
                  Shared updates
                </div>

                <p className="mt-2 text-2xl font-semibold text-[#403651]">
                  {selectedPatient.sharedUpdates}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#FCFAFE] p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#514566]">
                <FileText size={17} className="text-[#8B78C6]" />
                Shared information
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#81788F]">
                {selectedPatient.sharedNote}
              </p>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-[#514566]">
                Recent activity
              </h3>

              <div className="mt-3 space-y-3">
                {selectedPatient.recentActivity.map((activity, index) => (
                  <div key={activity} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length],
                      }}
                    />

                    <p className="text-sm leading-5 text-[#756A85]">
                      {activity}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#F6F2FC] p-4">
              <p className="text-xs text-[#91879E]">Next appointment</p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#514566]">
                    {selectedPatient.nextAppointment}
                  </p>

                  <p className="mt-1 text-xs text-[#81788F]">
                    {selectedPatient.nextAppointmentTime}
                  </p>
                </div>

                <CalendarDays size={20} className="text-[#8B78C6]" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPatient(null)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B78C6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7864B5]"
            >
              Close profile
              <ChevronRight size={16} />
            </button>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

function PatientStat({
  label,
  value,
  description,
  icon,
  background,
  iconColor,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  background: string;
  iconColor: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_6px_24px_rgba(79,61,113,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(79,61,113,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#81788F]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-[#403651]">{value}</p>
        </div>

        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: background, color: iconColor }}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-[#94899F]">{description}</p>
    </article>
  );
}

function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const isActive = status === "Active";

  return (
    <span
      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive ? "bg-[#E8F5EE] text-[#327653]" : "bg-[#FFF0D8] text-[#95621D]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-[#54A477]" : "bg-[#D69A3E]"
        }`}
      />
      {status}
    </span>
  );
}
