"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CalendarDays,
  Clock3,
  UserRound,
  CheckCircle2,
  XCircle,
  Hourglass,
  Inbox,
  Check,
  X,
  Video,
  MapPin,
  ArrowRight,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";

type RequestStatus = "Pending" | "Accepted" | "Declined";
type RequestFilter = "All" | RequestStatus;

interface AppointmentRequest {
  id: number;
  patientName: string;
  initials: string;
  appointmentType: string;
  date: string;
  time: string;
  mode: "Online" | "In person";
  status: RequestStatus;
  isFirstVisit: boolean;
  message: string;
}

const INITIAL_REQUESTS: AppointmentRequest[] = [
  {
    id: 1,
    patientName: "Amel K.",
    initials: "AK",
    appointmentType: "Initial consultation",
    date: "November 2, 2026",
    time: "10:00 AM",
    mode: "Online",
    status: "Pending",
    isFirstVisit: true,
    message:
      "I would like to schedule an initial consultation to discuss my concerns.",
  },
  {
    id: 2,
    patientName: "Lina B.",
    initials: "LB",
    appointmentType: "Follow-up session",
    date: "November 3, 2026",
    time: "2:00 PM",
    mode: "In person",
    status: "Pending",
    isFirstVisit: false,
    message:
      "I would like to continue our previous sessions and discuss my progress.",
  },
  {
    id: 3,
    patientName: "Nour A.",
    initials: "NA",
    appointmentType: "Individual session",
    date: "November 4, 2026",
    time: "11:00 AM",
    mode: "Online",
    status: "Accepted",
    isFirstVisit: false,
    message: "Requesting a session at our usual time.",
  },
  {
    id: 4,
    patientName: "Sara M.",
    initials: "SM",
    appointmentType: "Initial consultation",
    date: "November 5, 2026",
    time: "9:00 AM",
    mode: "In person",
    status: "Pending",
    isFirstVisit: true,
    message:
      "I am interested in starting sessions and would like to know more about the process.",
  },
  {
    id: 5,
    patientName: "Yasmine R.",
    initials: "YR",
    appointmentType: "Follow-up session",
    date: "October 28, 2026",
    time: "3:00 PM",
    mode: "Online",
    status: "Declined",
    isFirstVisit: false,
    message: "I would like to book a follow-up session.",
  },
];

const FILTERS: RequestFilter[] = ["All", "Pending", "Accepted", "Declined"];

const STATUS_STYLES: Record<
  RequestStatus,
  { background: string; color: string; dot: string }
> = {
  Pending: {
    background: "#FFF0D8",
    color: "#95621D",
    dot: "#D69A3E",
  },
  Accepted: {
    background: "#E8F5EE",
    color: "#327653",
    dot: "#54A477",
  },
  Declined: {
    background: "#FCE8ED",
    color: "#A34D69",
    dot: "#D87996",
  },
};

export default function RequestsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");
  const [requests, setRequests] =
    useState<AppointmentRequest[]>(INITIAL_REQUESTS);
  const [activeFilter, setActiveFilter] = useState<RequestFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState("");

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

  const pendingCount = requests.filter(
    (request) => request.status === "Pending",
  ).length;

  const acceptedCount = requests.filter(
    (request) => request.status === "Accepted",
  ).length;

  const declinedCount = requests.filter(
    (request) => request.status === "Declined",
  ).length;

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter =
        activeFilter === "All" || request.status === activeFilter;

      const matchesSearch =
        !query ||
        request.patientName.toLowerCase().includes(query) ||
        request.appointmentType.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [requests, activeFilter, searchQuery]);

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

  function updateRequest(requestId: number, status: "Accepted" | "Declined") {
    const request = requests.find((item) => item.id === requestId);

    if (!request || request.status !== "Pending") {
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === requestId ? { ...item, status } : item,
      ),
    );

    setFeedback(
      status === "Accepted"
        ? `You accepted ${request.patientName}'s request.`
        : `You declined ${request.patientName}'s request.`,
    );
  }

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage="Requests"
      pendingRequests={pendingCount}
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
            <Inbox size={17} />
            YOUR INBOX
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-[#352D4B]">
            Appointment requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#81788F]">
            Review incoming requests and manage your upcoming appointments.
          </p>
        </section>

        {/* Feedback */}
        {feedback && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#C4E3D0] bg-[#EFF8F2] px-4 py-3 text-sm text-[#327653]">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              {feedback}
            </span>

            <button
              type="button"
              onClick={() => setFeedback("")}
              aria-label="Dismiss message"
              className="rounded-lg p-1 hover:bg-white/70"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <RequestStat
            label="All requests"
            value={requests.length}
            description="Requests in your inbox"
            icon={<Inbox size={20} />}
            background="#BDCFFF"
            iconColor="#45639A"
          />

          <RequestStat
            label="Awaiting review"
            value={pendingCount}
            description="Need your attention"
            icon={<Hourglass size={20} />}
            background="#E7C5FF"
            iconColor="#8755A4"
          />

          <RequestStat
            label="Accepted"
            value={acceptedCount}
            description="Confirmed appointments"
            icon={<CheckCircle2 size={20} />}
            background="#B8C0FF"
            iconColor="#5958A5"
          />

          <RequestStat
            label="Declined"
            value={declinedCount}
            description="Requests not accepted"
            icon={<XCircle size={20} />}
            background="#FED5FF"
            iconColor="#9A5C91"
          />
        </section>

        {/* Requests list */}
        <section className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_40px_rgba(79,61,113,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#403651]">
                Your requests
              </h2>
              <p className="mt-1 text-sm text-[#91879E]">
                {pendingCount === 0
                  ? "You're all caught up."
                  : `${pendingCount} ${
                      pendingCount === 1 ? "request needs" : "requests need"
                    } your attention.`}
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
                aria-label="Search requests by patient"
                className="w-full rounded-2xl border border-[#ECE4F4] bg-[#FCFAFE] py-3 pl-10 pr-4 text-sm text-[#403651] outline-none transition placeholder:text-[#A49AAF] focus:border-[#B8C0FF] focus:ring-2 focus:ring-[#B8C0FF]/30"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const count =
                filter === "All"
                  ? requests.length
                  : requests.filter((item) => item.status === filter).length;

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

          {/* Request cards */}
          <div className="mt-5 space-y-4">
            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-[24px] bg-[#FCFAFE] p-4 transition hover:bg-[#FAF6FF] sm:p-5"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-[#594A84] sm:h-14 sm:w-14"
                      style={{
                        backgroundColor:
                          request.id % 3 === 0
                            ? "#FED5FF"
                            : request.id % 3 === 1
                              ? "#BDCFFF"
                              : "#C8B6FE",
                      }}
                    >
                      {request.initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#403651]">
                          {request.patientName}
                        </h3>

                        <StatusBadge status={request.status} />
                      </div>

                      <p className="mt-1 text-sm text-[#81788F]">
                        {request.appointmentType}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#81788F]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={15} className="text-[#927FC7]" />
                          {request.date}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={15} className="text-[#927FC7]" />
                          {request.time}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          {request.mode === "Online" ? (
                            <Video size={15} className="text-[#927FC7]" />
                          ) : (
                            <MapPin size={15} className="text-[#927FC7]" />
                          )}
                          {request.mode}
                        </span>
                      </div>

                      {request.isFirstVisit && (
                        <span className="mt-3 inline-flex rounded-full bg-[#F1E9FF] px-3 py-1 text-xs font-medium text-[#775CA5]">
                          First appointment
                        </span>
                      )}

                      <p className="mt-4 max-w-2xl text-sm leading-6 text-[#756A85]">
                        {request.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                    {request.status === "Pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => updateRequest(request.id, "Declined")}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#9C5970] transition hover:bg-[#FCE8ED]"
                        >
                          <X size={16} />
                          Decline
                        </button>

                        <button
                          type="button"
                          onClick={() => updateRequest(request.id, "Accepted")}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B78C6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7864B5]"
                        >
                          <Check size={16} />
                          Accept
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm text-[#81788F]">
                        {request.status === "Accepted" ? (
                          <CheckCircle2 size={16} className="text-[#54A477]" />
                        ) : (
                          <XCircle size={16} className="text-[#D87996]" />
                        )}
                        {request.status === "Accepted"
                          ? "Request accepted"
                          : "Request declined"}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {filteredRequests.length === 0 && (
              <div className="rounded-[24px] bg-[#FCFAFE] px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7C5FF] text-[#78529B]">
                  <Inbox size={25} />
                </div>

                <h3 className="mt-4 font-semibold text-[#403651]">
                  No requests found
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#91879E]">
                  Try a different search or filter to find what you're looking
                  for.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("All");
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F0E9FA] px-4 py-2.5 text-sm font-medium text-[#67559A] transition hover:bg-[#E7C5FF]"
                >
                  Clear filters
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function RequestStat({
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

function StatusBadge({ status }: { status: RequestStatus }) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: style.background, color: style.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: style.dot }}
      />
      {status}
    </span>
  );
}
