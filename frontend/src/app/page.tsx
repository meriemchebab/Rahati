"use client";

import { useState } from "react";
import {
  HeartHandshake,
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  UsersRound,
  Settings,
  Bell,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Check,
  CheckCircle2,
  CalendarCheck,
  CalendarPlus,
  ArrowUpRight,
  Eye,
  Leaf,
  SlidersHorizontal,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type RequestStatus = "Pending" | "Accepted" | "Declined";

type PatientRequest = {
  id: number;
  name: string;
  initials: string;
  age: number;
  date: string;
  time: string;
  returningPatient: boolean;
  status: RequestStatus;
  color: string;
};

type Patient = {
  id: number;
  name: string;
  initials: string;
  nextSession: string;
  shared: string[];
  actionsDone: number;
  actionsTotal: number;
  mood: "Improving" | "Stable" | "Needs attention";
  color: string;
};

type CalendarEvent = {
  id: number;
  day: number;
  date?: string;
  start: number;
  duration: number;
  title: string;
  subtitle: string;
  status: "Free" | "Pending" | "Accepted" | "Completed";
};

/* -------------------------------------------------------------------------- */
/*                                MOCK DATA                                   */
/* -------------------------------------------------------------------------- */

const navigationItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Calendar", icon: CalendarDays },
  { label: "Requests", icon: ClipboardList },
  { label: "Patients", icon: UsersRound },
  { label: "Settings", icon: Settings },
];

const initialRequests: PatientRequest[] = [
  {
    id: 1,
    name: "Amira Benali",
    initials: "AB",
    age: 26,
    date: "Today, 09:42",
    time: "10:00",
    returningPatient: false,
    status: "Pending",
    color: "bg-[#f3e6f0] text-[#906582]",
  },
  {
    id: 2,
    name: "Lina Haddad",
    initials: "LH",
    age: 31,
    date: "Today, 08:15",
    time: "14:30",
    returningPatient: true,
    status: "Pending",
    color: "bg-[#e8edf8] text-[#657da9]",
  },
  {
    id: 3,
    name: "Yasmine Karim",
    initials: "YK",
    age: 24,
    date: "Yesterday, 16:20",
    time: "11:00",
    returningPatient: false,
    status: "Pending",
    color: "bg-[#e6efe7] text-[#66876d]",
  },
];

const initialPatients: Patient[] = [
  {
    id: 1,
    name: "Sarah Mansouri",
    initials: "SM",
    nextSession: "Today, 10:00",
    shared: ["Mood", "Energy", "Journal"],
    actionsDone: 3,
    actionsTotal: 5,
    mood: "Improving",
    color: "bg-[#f3e6f0] text-[#906582]",
  },
  {
    id: 2,
    name: "Nour Belkacem",
    initials: "NB",
    nextSession: "Today, 14:30",
    shared: ["Mood", "Cycle"],
    actionsDone: 2,
    actionsTotal: 4,
    mood: "Stable",
    color: "bg-[#e8edf8] text-[#657da9]",
  },
  {
    id: 3,
    name: "Meriem Saidi",
    initials: "MS",
    nextSession: "Tomorrow, 11:00",
    shared: ["Mood", "Energy", "Journal", "Cycle"],
    actionsDone: 4,
    actionsTotal: 5,
    mood: "Improving",
    color: "bg-[#e6efe7] text-[#66876d]",
  },
  {
    id: 4,
    name: "Lina Haddad",
    initials: "LH",
    nextSession: "Thu, 15:00",
    shared: ["Mood", "Energy"],
    actionsDone: 1,
    actionsTotal: 4,
    mood: "Needs attention",
    color: "bg-[#f8e8e6] text-[#b56e72]",
  },
  {
    id: 5,
    name: "Amira Benali",
    initials: "AB",
    nextSession: "Fri, 09:30",
    shared: ["Mood", "Journal"],
    actionsDone: 2,
    actionsTotal: 5,
    mood: "Stable",
    color: "bg-[#f5ebd9] text-[#a1814d]",
  },
];

const calendarEvents: CalendarEvent[] = [
  {
    id: 1,
    day: 0,
    start: 9,
    duration: 1,
    title: "Free slot",
    subtitle: "Available",
    status: "Free",
  },
  {
    id: 2,
    day: 0,
    start: 10,
    duration: 1,
    title: "Sarah Mansouri",
    subtitle: "Individual session",
    status: "Accepted",
  },
  {
    id: 3,
    day: 0,
    start: 11,
    duration: 1,
    title: "Free slot",
    subtitle: "Available",
    status: "Free",
  },
  {
    id: 4,
    day: 1,
    start: 10,
    duration: 1,
    title: "Request pending",
    subtitle: "Awaiting response",
    status: "Pending",
  },
  {
    id: 5,
    day: 1,
    start: 11,
    duration: 1,
    title: "Meriem Saidi",
    subtitle: "Individual session",
    status: "Accepted",
  },
  {
    id: 6,
    day: 2,
    start: 9,
    duration: 1,
    title: "Nour Belkacem",
    subtitle: "Completed",
    status: "Completed",
  },
  {
    id: 7,
    day: 2,
    start: 11,
    duration: 1,
    title: "Free slot",
    subtitle: "Available",
    status: "Free",
  },
  {
    id: 8,
    day: 3,
    start: 10,
    duration: 1,
    title: "Free slot",
    subtitle: "Available",
    status: "Free",
  },
  {
    id: 9,
    day: 3,
    start: 14,
    duration: 1,
    title: "Lina Haddad",
    subtitle: "Individual session",
    status: "Accepted",
  },
  {
    id: 10,
    day: 4,
    start: 9,
    duration: 1,
    title: "Request pending",
    subtitle: "Awaiting response",
    status: "Pending",
  },
  {
    id: 11,
    day: 4,
    start: 10,
    duration: 1,
    title: "Free slot",
    subtitle: "Available",
    status: "Free",
  },
];

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const hours = [9, 10, 11, 12, 13, 14, 15, 16];

const eventStyles: Record<CalendarEvent["status"], string> = {
  Free: "border-[#c8dfcc] bg-[#eaf3eb] text-[#587a60]",
  Pending: "border-[#ead9b2] bg-[#fbf2df] text-[#99783e]",
  Accepted: "border-[#d9c6e8] bg-[#f0e7f7] text-[#84649c]",
  Completed: "border-[#cbdde9] bg-[#e7f0f6] text-[#5e8199]",
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getWeekDates(referenceDate: Date) {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + difference);

  return Array.from({ length: 5 }, (_, index) => {
    const current = new Date(date);
    current.setDate(date.getDate() + index);
    return current;
  });
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/* -------------------------------------------------------------------------- */
/*                                  COMPONENT                                 */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [requests, setRequests] = useState(initialRequests);
  const [patients] = useState(initialPatients);

  const [selectedPage, setSelectedPage] = useState("Overview");
  const [events, setEvents] = useState<CalendarEvent[]>(calendarEvents);
  const [calendarDate, setCalendarDate] = useState(() => {
    const date = new Date();

    // The calendar displays Monday through Friday: FOR NOW
    if (date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    } else if (date.getDay() === 0) {
      date.setDate(date.getDate() - 2);
    }

    return date;
  });
  const [calendarView, setCalendarView] = useState<"Week" | "Day">("Week");

  const [dialog, setDialog] = useState<"hours" | "availability" | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityTime, setAvailabilityTime] = useState("09:00");
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  const today = new Date();
  const formattedDate = formatDate(today);
  const weekDates = getWeekDates(calendarDate);

  const pendingRequests = requests.filter(
    (request) => request.status === "Pending",
  ).length;

  const acceptedRequests = requests.filter(
    (request) => request.status === "Accepted",
  ).length;

  const totalAssignedActions = patients.reduce(
    (total, patient) => total + patient.actionsTotal,
    0,
  );

  const completedActions = patients.reduce(
    (total, patient) => total + patient.actionsDone,
    0,
  );

  function updateRequest(id: number, status: "Accepted" | "Declined") {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    );
  }

  function changeWeek(direction: number) {
    setCalendarDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  }

  function handleNavigation(label: string) {
    setSelectedPage(label);
    setSidebarOpen(false);
  }
  function saveAvailability() {
    setAvailabilityMessage("");

    if (!availabilityDate) {
      setAvailabilityMessage("Please select a date.");
      return;
    }

    const selectedDate = new Date(`${availabilityDate}T00:00:00`);
    const dayOfWeek = selectedDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setAvailabilityMessage("Please select a weekday, Monday through Friday.");
      return;
    }

    const [hours, minutes] = availabilityTime.split(":").map(Number);

    if (minutes !== 0 || hours < 9 || hours > 16) {
      setAvailabilityMessage(
        "Choose a full-hour slot between 09:00 and 16:00.",
      );
      return;
    }

    const weekdayIndex = dayOfWeek - 1;

    const alreadyExists = events.some(
      (event) =>
        event.day === weekdayIndex &&
        event.start === hours &&
        (!event.date || event.date === availabilityDate),
    );

    if (alreadyExists) {
      setAvailabilityMessage(
        "There is already an event at that time. Please choose another slot.",
      );
      return;
    }

    const newEvent: CalendarEvent = {
      id: Date.now(),
      day: weekdayIndex,
      date: availabilityDate,
      start: hours,
      duration: 1,
      title: "Available",
      subtitle: "Free time slot",
      status: "Free",
    };

    setEvents((currentEvents) => [...currentEvents, newEvent]);

    // Show the week containing the newly created availability.
    setCalendarDate(selectedDate);
    setCalendarView("Week");

    setAvailabilityMessage(
      `Availability added for ${availabilityDate} at ${availabilityTime}.`,
    );
  }

  const visibleEvents = events.filter((event) => {
    // Events created through the availability form belong to an exact date.
    if (event.date) {
      const eventDate = new Date(`${event.date}T00:00:00`);

      if (calendarView === "Day") {
        return (
          event.date ===
          [
            calendarDate.getFullYear(),
            String(calendarDate.getMonth() + 1).padStart(2, "0"),
            String(calendarDate.getDate()).padStart(2, "0"),
          ].join("-")
        );
      }

      const weekDates = getWeekDates(calendarDate);
      const firstDay = weekDates[0];
      const lastDay = weekDates[4];

      if (!firstDay || !lastDay) {
        return false;
      }

      return eventDate >= firstDay && eventDate <= lastDay;
    }

    if (calendarView === "Day") {
      const selectedDay = calendarDate.getDay();
      const weekdayIndex = selectedDay === 0 ? 6 : selectedDay - 1;

      return event.day === weekdayIndex;
    }

    return true;
  });
  /* ------------------------------------------------------------------------ */
  /*                                   JSX                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-[#f7f0f5] text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-rahati-plum/25 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[84px] items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-mauve text-white">
              <HeartHandshake size={23} strokeWidth={1.8} />
            </div>

            <div>
              <h1 className="text-[25px] font-semibold tracking-tight text-rahati-plum">
                rahati
              </h1>
              <p className="text-[10px] tracking-[0.12em] text-muted-foreground">
                FOR PROFESSIONALS
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-sidebar-accent lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-7">
          <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            WORKSPACE
          </p>

          <nav aria-label="Main navigation" className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = selectedPage === item.label;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavigation(item.label)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${
                    active
                      ? "bg-white font-semibold text-rahati-mauve-dark shadow-sm"
                      : "text-sidebar-foreground hover:bg-white/60"
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2 : 1.7}
                    className={
                      active
                        ? "text-rahati-mauve-dark"
                        : "text-muted-foreground group-hover:text-rahati-mauve"
                    }
                  />

                  <span>{item.label}</span>

                  {item.label === "Requests" && pendingRequests > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rahati-pink px-1 text-[10px] font-semibold text-rahati-mauve-dark">
                      {pendingRequests}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Reminder */}
          <div className="mt-9 rounded-2xl border border-white/80 bg-white/55 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-rahati-sage">
              <Leaf size={18} className="text-[#66876D]" />
            </div>

            <p className="text-sm font-medium text-rahati-plum">
              A little reminder
            </p>

            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Taking care of yourself is part of taking care of others.
            </p>
          </div>
        </div>

        {/* Therapist profile */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rahati-pink text-sm font-semibold text-rahati-mauve-dark">
              S
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-rahati-plum">
                Dr. Sarah
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Mental health professional
              </p>
            </div>

            <Settings size={17} className="text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="min-w-0 lg:pl-[250px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-border bg-white p-2.5 text-rahati-plum lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Therapist workspace
              </p>
              <p className="mt-1 truncate text-sm font-medium text-rahati-plum">
                {formattedDate}
              </p>
            </div>
          </div>

          <div className="relative ml-3 flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-rahati-plum transition hover:bg-rahati-pink"
            >
              <Bell size={19} strokeWidth={1.8} />
              {pendingRequests > 0 && (
                <span className="absolute right-[8px] top-[7px] h-2 w-2 rounded-full border-2 border-white bg-rahati-rose" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(290px,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-4 shadow-lg">
                <h2 className="text-sm font-semibold text-rahati-plum">
                  Notifications
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  You have {pendingRequests} pending patient{" "}
                  {pendingRequests === 1 ? "request" : "requests"} to review.
                </p>
              </div>
            )}

            <div className="hidden h-9 w-px bg-border sm:block" />

            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rahati-pink text-xs font-semibold text-rahati-mauve-dark">
                S
              </div>
              <div>
                <p className="text-sm font-semibold text-rahati-plum">
                  Dr. Sarah
                </p>
                <p className="text-xs text-muted-foreground">Therapist</p>
              </div>
              <ChevronDown size={15} className="text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-[1700px] px-5 py-7 sm:px-8 sm:py-9">
          {/* Greeting and actions */}
          <section className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-rahati-mauve">
                YOUR WORKSPACE
              </p>

              <h2 className="text-2xl font-semibold tracking-tight text-rahati-plum sm:text-[30px]">
                {getGreeting()}, Dr. Sarah
                <span className="ml-2 inline-block">✦</span>
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Here&apos;s an overview of your practice and the women in your
                care.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDialog("hours")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-rahati-plum shadow-sm transition hover:border-rahati-mauve/50 hover:bg-rahati-blush"
              >
                <Clock3 size={17} />
                Weekly hours
              </button>

              <button
                type="button"
                onClick={() => {
                  setAvailabilityMessage("");
                  setDialog("availability");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rahati-mauve px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-rahati-mauve-dark"
              >
                <Plus size={18} />
                Add availability
              </button>
            </div>
          </section>

          {/* Statistics */}
          <section
            aria-label="Practice statistics"
            className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {/* Pending requests */}
            <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-pink text-rahati-mauve-dark">
                  <ClipboardList size={20} />
                </div>
                <span className="rounded-full bg-[#fbf2df] px-2.5 py-1 text-[10px] font-medium text-[#99783e]">
                  Needs review
                </span>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Pending requests
              </p>

              <div className="mt-1 flex items-end justify-between">
                <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
                  {pendingRequests}
                </p>
                <button
                  type="button"
                  onClick={() => handleNavigation("Requests")}
                  className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-rahati-mauve-dark hover:underline"
                >
                  Review <ArrowUpRight size={14} />
                </button>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {acceptedRequests} accepted in this demo
              </p>
            </article>

            {/* Today's sessions */}
            <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-lavender text-[#78638e]">
                  <CalendarCheck size={20} />
                </div>
                <span className="rounded-full bg-[#eaf3eb] px-2.5 py-1 text-[10px] font-medium text-[#587a60]">
                  Today
                </span>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Today&apos;s sessions
              </p>

              <div className="mt-1 flex items-end gap-2">
                <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
                  4
                </p>
                <span className="mb-1 text-sm text-muted-foreground">
                  sessions
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="font-medium text-[#66876d]">2 done</span>
                  {" · "}2 remaining
                </span>
                <span className="font-medium text-rahati-mauve-dark">
                  Next: 10:00
                </span>
              </div>
            </article>

            {/* Availability */}
            <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-sage text-[#66876d]">
                  <CalendarPlus size={20} />
                </div>
                <span className="rounded-full bg-rahati-sage px-2.5 py-1 text-[10px] font-medium text-[#587a60]">
                  This week
                </span>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Available slots
              </p>

              <div className="mt-1 flex items-end gap-2">
                <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
                  12
                </p>
                <span className="mb-1 text-sm text-muted-foreground">
                  slots
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  8 visible to women
                </span>
                <span className="font-medium text-[#66876d]">67%</span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0eb]">
                <div className="h-full w-2/3 rounded-full bg-[#91aa96]" />
              </div>
            </article>

            {/* Assigned actions */}
            <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8e8e6] text-[#b56e72]">
                  <CheckCircle2 size={20} />
                </div>
                <span className="rounded-full bg-rahati-lavender px-2.5 py-1 text-[10px] font-medium text-[#78638e]">
                  All patients
                </span>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Assigned actions completed
              </p>

              <div className="mt-1 flex items-end gap-2">
                <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
                  {completedActions}
                </p>
                <span className="mb-1 text-sm text-muted-foreground">
                  / {totalAssignedActions} actions
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Completed by your patients
                </span>
                <span className="font-medium text-rahati-mauve-dark">
                  {Math.round((completedActions / totalAssignedActions) * 100)}%
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rahati-pink">
                <div
                  className="h-full rounded-full bg-rahati-mauve"
                  style={{
                    width: `${(completedActions / totalAssignedActions) * 100}%`,
                  }}
                />
              </div>
            </article>
          </section>

          {/* Requests and calendar */}
          <section className="mb-8 grid grid-cols-1 items-start gap-5 2xl:grid-cols-2">
            {/* Pending requests */}
            <article className="min-w-0 overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
              <div className="flex items-center justify-between px-5 py-5 sm:px-6">
                <div>
                  <h3 className="text-base font-semibold text-rahati-plum">
                    Incoming requests
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Review appointment requests from women.
                  </p>
                </div>

                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-rahati-pink px-2 text-xs font-semibold text-rahati-mauve-dark">
                  {pendingRequests}
                </span>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {requests.filter((request) => request.status === "Pending")
                  .length === 0 ? (
                  <div className="rounded-2xl bg-[#f4f8f3] px-6 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e3eee2] text-[#66876d]">
                      <CheckCircle2 size={23} />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-rahati-plum">
                      All caught up!
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      You have no pending requests to review.
                    </p>
                  </div>
                ) : (
                  requests
                    .filter((request) => request.status === "Pending")
                    .map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl bg-[#faf5f9] p-4 transition-colors hover:bg-[#f7eef5] sm:p-5"
                      >
                        {/* Patient information */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${request.color}`}
                          >
                            {request.initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-rahati-plum">
                                {request.name}
                              </h4>

                              <span className="rounded-full bg-[#fbf2df] px-2.5 py-1 text-[10px] font-medium text-[#99783e]">
                                Pending
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {request.age} years old · Requested {request.date}
                            </p>
                          </div>
                        </div>

                        {/* Appointment details */}
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span className="inline-flex items-center gap-1.5 text-xs text-rahati-plum">
                            <CalendarDays
                              size={14}
                              className="text-rahati-mauve"
                            />
                            Requested time: {request.time}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs ${
                              request.returningPatient
                                ? "text-[#806b9a]"
                                : "text-muted-foreground"
                            }`}
                          >
                            <UsersRound size={14} />

                            {request.returningPatient
                              ? "Returning patient"
                              : "First session"}
                          </span>
                        </div>

                        {/* Request actions */}
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateRequest(request.id, "Accepted")
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rahati-mauve px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-rahati-mauve-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rahati-mauve focus-visible:ring-offset-2"
                          >
                            <Check size={15} />
                            Accept
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateRequest(request.id, "Declined")
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-[#a35e68] transition hover:bg-[#fcf1f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8a8ad] focus-visible:ring-offset-2"
                          >
                            <X size={15} />
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="border-t border-border px-5 py-3.5 sm:px-6">
                <button
                  type="button"
                  onClick={() => handleNavigation("Requests")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rahati-mauve-dark hover:underline"
                >
                  View all requests <ChevronRight size={15} />
                </button>
              </div>
            </article>

            {/* Calendar */}
            <article className="min-w-0 overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
              <div className="px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-rahati-plum">
                      Your calendar
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Manage your appointments and availability.
                    </p>
                  </div>

                  <div className="flex items-center rounded-lg border border-border p-1">
                    {(["Week", "Day"] as const).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setCalendarView(view)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          calendarView === view
                            ? "bg-rahati-pink text-rahati-mauve-dark"
                            : "text-muted-foreground hover:text-rahati-plum"
                        }`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-rahati-plum">
                      {formatShortDate(weekDates[0])}
                      {" – "}
                      {formatShortDate(weekDates[4])}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Appointment overview
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Previous week"
                      onClick={() => changeWeek(-1)}
                      className="rounded-lg border border-border p-2 text-rahati-plum hover:bg-rahati-blush"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next week"
                      onClick={() => changeWeek(1)}
                      className="rounded-lg border border-border p-2 text-rahati-plum hover:bg-rahati-blush"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border px-5 py-3 sm:px-6">
                {(
                  [
                    ["Free", "bg-[#91aa96]"],
                    ["Pending", "bg-[#d6b76f]"],
                    ["Accepted", "bg-[#a99bc4]"],
                    ["Completed", "bg-[#91b3c8]"],
                  ] as const
                ).map(([label, color]) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"
                  >
                    <span className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </span>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="overflow-x-auto p-4 sm:p-5">
                <div className="min-w-[520px]">
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `48px repeat(${
                        calendarView === "Day" ? 1 : 5
                      }, minmax(0, 1fr))`,
                    }}
                  >
                    <div className="border-b border-border pb-3" />

                    {(calendarView === "Day"
                      ? [weekDates[calendarDate.getDay() - 1]]
                      : weekDates
                    ).map((date, index) => {
                      const isToday =
                        date.toDateString() === today.toDateString();

                      return (
                        <div
                          key={date.toISOString()}
                          className="border-b border-border pb-3 text-center"
                        >
                          <p className="text-[10px] text-muted-foreground">
                            {calendarView === "Day"
                              ? weekdays[
                                  date.getDay() === 0 ? 6 : date.getDay() - 1
                                ]
                              : weekdays[index]}
                          </p>
                          <span
                            className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              isToday
                                ? "bg-rahati-mauve text-white"
                                : "text-rahati-plum"
                            }`}
                          >
                            {date.getDate()}
                          </span>
                        </div>
                      );
                    })}

                    {hours.map((hour) => (
                      <div key={hour} className="contents">
                        <div className="relative border-r border-border pr-2 pt-2 text-[10px] text-muted-foreground">
                          {`${String(hour).padStart(2, "0")}:00`}
                        </div>

                        {(calendarView === "Day"
                          ? [weekDates[calendarDate.getDay() - 1]]
                          : weekDates
                        ).map((date, columnIndex) => {
                          const actualDay =
                            calendarView === "Day"
                              ? calendarDate.getDay() - 1
                              : columnIndex;

                          const event = visibleEvents.find(
                            (item) =>
                              item.day === actualDay &&
                              item.start === hour &&
                              (!item.date ||
                                item.date ===
                                  [
                                    date.getFullYear(),
                                    String(date.getMonth() + 1).padStart(
                                      2,
                                      "0",
                                    ),
                                    String(date.getDate()).padStart(2, "0"),
                                  ].join("-")),
                          );

                          return (
                            <div
                              key={`${date.toISOString()}-${hour}`}
                              className="min-h-[49px] border-b border-r border-border/70 p-1"
                            >
                              {event && (
                                <div
                                  title={`${event.title} — ${event.subtitle}`}
                                  className={`flex h-full min-h-[39px] flex-col justify-center overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 ${eventStyles[event.status]}`}
                                >
                                  <p className="truncate text-[9px] font-semibold leading-4">
                                    {event.title}
                                  </p>
                                  <p className="truncate text-[9px] opacity-80">
                                    {event.subtitle}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-5 py-3.5 sm:px-6">
                <button
                  type="button"
                  onClick={() => handleNavigation("Calendar")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rahati-mauve-dark hover:underline"
                >
                  Open full calendar <ChevronRight size={15} />
                </button>
              </div>
            </article>
          </section>

          {/* Patient table */}
          <section className="overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
            <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h3 className="text-base font-semibold text-rahati-plum">
                  Your patients
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Women with an accepted or completed session.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-rahati-blush"
                >
                  <SlidersHorizontal size={14} />
                  Filter
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigation("Patients")}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-rahati-mauve-dark hover:bg-rahati-blush"
                >
                  View all <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-rahati-blush/70">
                    <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Patient
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Next session
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      She shares with you
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Assigned actions
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Mood trends
                    </th>
                    <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {patients.map((patient) => {
                    const progress =
                      (patient.actionsDone / patient.actionsTotal) * 100;

                    return (
                      <tr
                        key={patient.id}
                        className="transition-colors hover:bg-[#faf5f9]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${patient.color}`}
                            >
                              {patient.initials}
                            </div>
                            <div>
                              <p className="whitespace-nowrap text-sm font-medium text-rahati-plum">
                                {patient.name}
                              </p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Patient #{String(patient.id).padStart(3, "0")}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 whitespace-nowrap text-xs text-rahati-plum">
                            <CalendarDays
                              size={14}
                              className="text-rahati-mauve"
                            />
                            {patient.nextSession}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex max-w-[190px] flex-wrap gap-1.5">
                            {patient.shared.map((item) => (
                              <span
                                key={item}
                                className="rounded-md border border-[#e8dce7] bg-[#faf5f9] px-2 py-1 text-[10px] text-[#80647e]"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="w-[130px]">
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="font-medium text-rahati-plum">
                                {patient.actionsDone} of {patient.actionsTotal}
                              </span>
                              <span className="text-muted-foreground">
                                {Math.round(progress)}%
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rahati-pink">
                              <div
                                className="h-full rounded-full bg-rahati-mauve"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium ${
                              patient.mood === "Improving"
                                ? "text-[#66876d]"
                                : patient.mood === "Stable"
                                  ? "text-[#806b9a]"
                                  : "text-[#b56e72]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                patient.mood === "Improving"
                                  ? "bg-[#91aa96]"
                                  : patient.mood === "Stable"
                                    ? "bg-[#a99bc4]"
                                    : "bg-[#d99a9a]"
                              }`}
                            />
                            {patient.mood}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              alert(
                                `Patient details for ${patient.name} will be implemented in the patient details view.`,
                              );
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-rahati-plum transition hover:border-rahati-mauve hover:bg-rahati-pink"
                          >
                            <Eye size={14} />
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-border px-5 py-3.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Showing <span className="font-medium text-rahati-plum">5</span>{" "}
                patients
              </p>
              <p>Patient information shown here is fictional demo data.</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-8 flex flex-col gap-2 border-t border-border py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Rahati · A thoughtful space for mental wellbeing</p>
            <p>Designed with care ♡</p>
          </footer>
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*                              DIALOGS                               */}
      {/* ------------------------------------------------------------------ */}

      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-rahati-plum/30 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDialog(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-pink text-rahati-mauve-dark">
                  {dialog === "hours" ? (
                    <Clock3 size={20} />
                  ) : (
                    <CalendarPlus size={20} />
                  )}
                </div>

                <h2
                  id="dialog-title"
                  className="text-lg font-semibold text-rahati-plum"
                >
                  {dialog === "hours"
                    ? "Your weekly hours"
                    : "Add availability"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {dialog === "hours"
                    ? "Your current demo schedule is shown below."
                    : "Create an availability slot for your practice."}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setDialog(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-rahati-pink"
              >
                <X size={18} />
              </button>
            </div>

            {dialog === "hours" ? (
              <div className="mt-5 space-y-3">
                {[
                  ["Monday", "09:00 – 16:00"],
                  ["Tuesday", "09:00 – 16:00"],
                  ["Wednesday", "09:00 – 13:00"],
                  ["Thursday", "10:00 – 17:00"],
                  ["Friday", "09:00 – 14:00"],
                  ["Saturday", "Unavailable"],
                  ["Sunday", "Unavailable"],
                ].map(([day, time]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <span className="text-sm font-medium text-rahati-plum">
                      {day}
                    </span>
                    <span
                      className={`text-xs ${
                        time === "Unavailable"
                          ? "text-muted-foreground"
                          : "font-medium text-[#66876d]"
                      }`}
                    >
                      {time}
                    </span>
                  </div>
                ))}

                <p className="pt-1 text-xs leading-5 text-muted-foreground">
                  These hours are illustrative. Editing and saving a real
                  schedule will be handled when the backend is connected.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="availability-date"
                    className="mb-2 block text-sm font-medium text-rahati-plum"
                  >
                    Date
                  </label>
                  <input
                    id="availability-date"
                    type="date"
                    value={availabilityDate}
                    onChange={(event) => {
                      setAvailabilityDate(event.target.value);
                      setAvailabilityMessage("");
                    }}
                    className="w-full rounded-xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-rahati-mauve focus:ring-2 focus:ring-rahati-mauve/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="availability-time"
                    className="mb-2 block text-sm font-medium text-rahati-plum"
                  >
                    Start time
                  </label>
                  <input
                    id="availability-time"
                    type="time"
                    value={availabilityTime}
                    onChange={(event) =>
                      setAvailabilityTime(event.target.value)
                    }
                    className="w-full rounded-xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-rahati-mauve focus:ring-2 focus:ring-rahati-mauve/20"
                  />
                </div>

                {availabilityMessage && (
                  <p
                    aria-live="polite"
                    className="rounded-xl bg-rahati-sage p-3 text-xs leading-5 text-[#587a60]"
                  >
                    {availabilityMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={saveAvailability}
                  className="w-full rounded-xl bg-rahati-mauve px-4 py-3 text-sm font-medium text-white transition hover:bg-rahati-mauve-dark"
                >
                  Save demo availability
                </button>

                <p className="text-xs leading-5 text-muted-foreground">
                  Demo only. This does not publish a real appointment slot or
                  send information to a server.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
