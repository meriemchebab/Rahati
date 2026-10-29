"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  X,
  CheckCircle2,
  UserRound,
  CalendarCheck,
  CalendarPlus,
  Trash2,
  Check,
  LayoutGrid,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";

// --------------------------------------------------
// Types
// --------------------------------------------------

type AppointmentStatus = "Free" | "Pending" | "Accepted" | "Completed";
type CalendarView = "Week" | "Month";

interface CalendarEvent {
  id: number;
  date: string;
  start: string;
  end: string;
  title: string;
  subtitle: string;
  status: AppointmentStatus;
}

// --------------------------------------------------
// Global CSS color tokens
// --------------------------------------------------

const STATUS_STYLES: Record<
  AppointmentStatus,
  { background: string; text: string; border: string }
> = {
  Free: {
    background: "var(--calendar-available-bg)",
    text: "var(--calendar-available-text)",
    border: "var(--calendar-available-border)",
  },
  Pending: {
    background: "var(--calendar-pending-bg)",
    text: "var(--calendar-pending-text)",
    border: "var(--calendar-pending-border)",
  },
  Accepted: {
    background: "var(--calendar-accepted-bg)",
    text: "var(--calendar-accepted-text)",
    border: "var(--calendar-accepted-border)",
  },
  Completed: {
    background: "var(--calendar-completed-bg)",
    text: "var(--calendar-completed-text)",
    border: "var(--calendar-completed-border)",
  },
};

const HOURS = Array.from({ length: 8 }, (_, index) => index + 9);

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --------------------------------------------------
// Date helpers
// --------------------------------------------------

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());

  return result;
}

function getWeekDays(date: Date): Date[] {
  const sunday = startOfWeek(date);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + index);
    return day;
  });
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatRange(days: Date[]): string {
  const first = days[0];
  const last = days[6];

  const firstMonth = first.toLocaleDateString("en", {
    month: "short",
  });

  const lastMonth = last.toLocaleDateString("en", {
    month: "short",
  });

  if (first.getFullYear() !== last.getFullYear()) {
    return `${firstMonth} ${first.getDate()}, ${first.getFullYear()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
  }

  if (first.getMonth() !== last.getMonth()) {
    return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
  }

  return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;

  return `${twelveHour}:00 ${suffix}`;
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 5 || date.getDay() === 6;
}

function getNextWorkingDay(date: Date): Date {
  const result = new Date(date);

  while (isWeekend(result)) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

// --------------------------------------------------
// Prototype appointments
// --------------------------------------------------

function makeInitialEvents(referenceDate: Date): CalendarEvent[] {
  const week = getWeekDays(referenceDate);
  const makeDate = (dayIndex: number) => dateKey(week[dayIndex]);

  return [
    {
      id: 1,
      date: makeDate(0),
      start: "09:00",
      end: "10:00",
      title: "Available slot",
      subtitle: "Open for booking",
      status: "Free",
    },
    {
      id: 2,
      date: makeDate(0),
      start: "11:00",
      end: "12:00",
      title: "Sarah M.",
      subtitle: "Initial consultation",
      status: "Accepted",
    },
    {
      id: 3,
      date: makeDate(1),
      start: "10:00",
      end: "11:00",
      title: "Available slot",
      subtitle: "Open for booking",
      status: "Free",
    },
    {
      id: 4,
      date: makeDate(1),
      start: "14:00",
      end: "15:00",
      title: "Lina B.",
      subtitle: "Follow-up session",
      status: "Pending",
    },
    {
      id: 5,
      date: makeDate(2),
      start: "09:00",
      end: "10:00",
      title: "Amel K.",
      subtitle: "Individual session",
      status: "Accepted",
    },
    {
      id: 6,
      date: makeDate(2),
      start: "13:00",
      end: "14:00",
      title: "Available slot",
      subtitle: "Open for booking",
      status: "Free",
    },
    {
      id: 7,
      date: makeDate(3),
      start: "11:00",
      end: "12:00",
      title: "Nour A.",
      subtitle: "Follow-up session",
      status: "Completed",
    },
    {
      id: 8,
      date: makeDate(4),
      start: "10:00",
      end: "11:00",
      title: "Available slot",
      subtitle: "Open for booking",
      status: "Free",
    },
  ];
}

// --------------------------------------------------
// Calendar page
// --------------------------------------------------

export default function CalendarPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("Calendar");
  const [formattedDate, setFormattedDate] = useState("");

  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("Week");

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todayKey, setTodayKey] = useState("");

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const today = new Date();

    setTodayKey(dateKey(today));
    setCalendarDate(today);
    setEvents(makeInitialEvents(today));
    setFormDate(dateKey(getNextWorkingDay(today)));

    setFormattedDate(
      new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(today),
    );
  }, []);
  if (!calendarDate) {
    return null;
  }

  const weekDays = getWeekDays(calendarDate);

  const visibleStart =
    calendarView === "Week"
      ? weekDays[0]
      : new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);

  const visibleEnd =
    calendarView === "Week"
      ? weekDays[6]
      : new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);

  const visibleEvents = events.filter((event) => {
    const eventDate = parseDate(event.date);
    return eventDate >= visibleStart && eventDate <= visibleEnd;
  });

  const pendingRequests = visibleEvents.filter(
    (event) => event.status === "Pending",
  ).length;

  const availableSlots = visibleEvents.filter(
    (event) => event.status === "Free",
  ).length;

  const upcomingSessions = visibleEvents.filter(
    (event) =>
      event.status === "Accepted" &&
      (event.date > todayKey ||
        (event.date === todayKey &&
          event.end > new Date().toTimeString().slice(0, 5))),
  ).length;

  const allPendingRequests = events.filter(
    (event) => event.status === "Pending",
  ).length;

  // Navigation
  function handleNavigate(label: string) {
    const routes: Record<string, string> = {
      Overview: "/",
      Calendar: "/calendar",
      Requests: "/requests",
      Patients: "/patients",
      Settings: "/settings",
    };

    setSelectedPage(label);
    setSidebarOpen(false);

    if (routes[label]) {
      router.push(routes[label]);
    }
  }

  // Calendar controls
  function moveCalendar(direction: -1 | 1) {
    setCalendarDate((current) => {
      const next = new Date(current ?? new Date());

      if (calendarView === "Week") {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setDate(1);
        next.setMonth(next.getMonth() + direction);
      }

      return next;
    });
  }

  function goToToday() {
    setCalendarDate(new Date());
  }

  // Availability
  function openAvailability(date?: Date, hour?: number) {
    const proposedDate = date ?? calendarDate ?? new Date();
    const workingDate = getNextWorkingDay(proposedDate);

    setFormDate(dateKey(workingDate));

    setFormStart(
      hour !== undefined && !isWeekend(proposedDate)
        ? `${String(hour).padStart(2, "0")}:00`
        : "09:00",
    );

    setFormEnd(
      hour !== undefined && !isWeekend(proposedDate)
        ? `${String(hour + 1).padStart(2, "0")}:00`
        : "10:00",
    );

    setFormError("");
    setSuccessMessage("");
    setAvailabilityOpen(true);
  }

  function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (!formDate) {
      setFormError("Please choose a date.");
      return;
    }

    const chosenDate = parseDate(formDate);
    const startHour = Number(formStart.split(":")[0]);
    const endHour = Number(formEnd.split(":")[0]);

    if (Number.isNaN(chosenDate.getTime())) {
      setFormError("Please choose a valid date.");
      return;
    }

    if (isWeekend(chosenDate)) {
      setFormError(
        "Friday and Saturday are weekend days. Choose Sunday to Thursday.",
      );
      return;
    }

    if (
      startHour < 9 ||
      startHour > 16 ||
      endHour < 10 ||
      endHour > 17 ||
      endHour <= startHour
    ) {
      setFormError("Choose a time between 9:00 AM and 5:00 PM.");
      return;
    }

    const collision = events.some(
      (item) =>
        item.date === formDate &&
        startHour < Number(item.end.split(":")[0]) &&
        endHour > Number(item.start.split(":")[0]),
    );

    if (collision) {
      setFormError(
        "This time overlaps with an existing appointment or availability slot.",
      );
      return;
    }

    const newEvent: CalendarEvent = {
      id: Date.now(),
      date: formDate,
      start: formStart,
      end: formEnd,
      title: "Available slot",
      subtitle: "Open for booking",
      status: "Free",
    };

    setEvents((current) => [...current, newEvent]);
    setCalendarDate(chosenDate);
    setCalendarView("Week");
    setAvailabilityOpen(false);
    setSuccessMessage("Your availability has been added.");
  }

  // Appointment actions
  function updateEventStatus(eventId: number, status: AppointmentStatus) {
    setEvents((current) =>
      current.map((event) => {
        if (event.id !== eventId) return event;

        if (status === "Free") {
          return {
            ...event,
            title: "Available slot",
            subtitle: "Open for booking",
            status,
          };
        }

        return { ...event, status };
      }),
    );

    setSelectedEvent(null);

    setSuccessMessage(
      status === "Accepted"
        ? "The appointment request has been accepted."
        : status === "Completed"
          ? "The session has been marked as completed."
          : "The appointment status has been updated.",
    );
  }

  function removeAvailability(eventId: number) {
    setEvents((current) => current.filter((event) => event.id !== eventId));

    setSelectedEvent(null);
    setSuccessMessage("The availability slot has been removed.");
  }

  function changeMonthViewDate(date: Date) {
    setCalendarDate(date);
    setCalendarView("Week");
  }

  const calendarLabel =
    calendarView === "Week" ? formatRange(weekDays) : formatMonth(calendarDate);

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage={selectedPage}
      pendingRequests={allPendingRequests}
      formattedDate={formattedDate}
      notificationsOpen={notificationsOpen}
      onNavigate={handleNavigate}
      onCloseSidebar={() => setSidebarOpen(false)}
      onOpenSidebar={() => setSidebarOpen(true)}
      onToggleNotifications={() => setNotificationsOpen((current) => !current)}
    >
      <div className="space-y-5 pb-6">
        {/* Page heading */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rahati-mauve">
              <CalendarDays size={15} />
              Your schedule
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-rahati-plum">
              Your calendar
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-calendar-text-muted">
              Manage your appointments and availability in one peaceful space.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openAvailability()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-calendar-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-calendar-accent-hover focus:outline-none focus:ring-2 focus:ring-rahati-lavender focus:ring-offset-2"
          >
            <Plus size={18} />
            Add availability
          </button>
        </section>

        {/* Success feedback */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-2xl border border-calendar-success-border bg-calendar-success-bg px-4 py-3 text-sm text-calendar-success-text"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss message"
              className="rounded-lg p-1 transition hover:bg-white/70"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section
          aria-label="Schedule summary"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <SummaryCard
            icon={<CalendarCheck size={19} />}
            label="Upcoming sessions"
            value={String(upcomingSessions)}
            description="Accepted sessions in this view"
            background="var(--calendar-accent-soft)"
            iconColor="var(--calendar-accent-text)"
          />

          <SummaryCard
            icon={<CalendarPlus size={19} />}
            label="Available slots"
            value={String(availableSlots)}
            description="Open for booking in this view"
            background="var(--calendar-available-bg)"
            iconColor="var(--calendar-available-text)"
          />

          <SummaryCard
            icon={<Clock3 size={19} />}
            label="Pending requests"
            value={String(pendingRequests)}
            description="Awaiting your response"
            background="var(--calendar-pending-bg)"
            iconColor="var(--calendar-pending-text)"
          />
        </section>

        {/* Main calendar */}
        <section className="overflow-hidden rounded-[26px] border border-calendar-border bg-calendar-surface shadow-[0_8px_32px_rgba(79,61,113,0.05)]">
          <div className="flex flex-col gap-4 border-b border-calendar-border-soft p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-calendar-surface-muted p-1">
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-calendar-text transition hover:bg-calendar-surface"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => moveCalendar(-1)}
                  aria-label="Previous period"
                  className="rounded-lg p-2 text-calendar-text transition hover:bg-calendar-surface"
                >
                  <ChevronLeft size={19} />
                </button>

                <button
                  type="button"
                  onClick={() => moveCalendar(1)}
                  aria-label="Next period"
                  className="rounded-lg p-2 text-calendar-text transition hover:bg-calendar-surface"
                >
                  <ChevronRight size={19} />
                </button>
              </div>

              <h2 className="text-base font-semibold text-rahati-plum sm:text-lg">
                {calendarLabel}
              </h2>
            </div>

            <div className="flex items-center gap-1 self-start rounded-xl bg-calendar-surface-muted p-1 lg:self-auto">
              <button
                type="button"
                onClick={() => setCalendarView("Week")}
                aria-pressed={calendarView === "Week"}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  calendarView === "Week"
                    ? "bg-calendar-surface text-calendar-accent-text shadow-sm"
                    : "text-calendar-text-muted hover:text-rahati-plum"
                }`}
              >
                <CalendarRange size={16} />
                Week
              </button>

              <button
                type="button"
                onClick={() => setCalendarView("Month")}
                aria-pressed={calendarView === "Month"}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  calendarView === "Month"
                    ? "bg-calendar-surface text-calendar-accent-text shadow-sm"
                    : "text-calendar-text-muted hover:text-rahati-plum"
                }`}
              >
                <LayoutGrid size={16} />
                Month
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
            <LegendItem
              color="var(--calendar-available-bg)"
              label="Available"
            />
            <LegendItem color="var(--calendar-pending-bg)" label="Pending" />
            <LegendItem color="var(--calendar-accepted-bg)" label="Accepted" />
            <LegendItem
              color="var(--calendar-completed-bg)"
              label="Completed"
            />

            <span className="text-xs text-calendar-text-subtle sm:ml-auto">
              Weekend: Friday & Saturday
            </span>
          </div>

          {/* Week view */}
          {calendarView === "Week" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[68px_repeat(7,minmax(0,1fr))] border-y border-calendar-border-soft">
                  <div className="bg-calendar-surface-soft" />

                  {weekDays.map((day) => {
                    const weekend = isWeekend(day);
                    const isToday = dateKey(day) === todayKey;

                    return (
                      <div
                        key={dateKey(day)}
                        className={`px-2 py-3 text-center ${
                          weekend
                            ? "bg-calendar-surface-soft"
                            : "bg-calendar-surface"
                        }`}
                      >
                        <p
                          className={`text-xs font-medium ${
                            weekend
                              ? "text-calendar-text-weekend"
                              : "text-calendar-text-muted"
                          }`}
                        >
                          {SHORT_DAYS[day.getDay()]}
                        </p>

                        <div
                          className={`mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                            isToday
                              ? "bg-calendar-accent text-white"
                              : weekend
                                ? "text-calendar-text-weekend"
                                : "text-rahati-plum"
                          }`}
                        >
                          {day.getDate()}
                        </div>

                        {weekend && (
                          <p className="mt-1 text-[10px] text-calendar-text-weekend">
                            Weekend
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-[68px_repeat(7,minmax(0,1fr))]"
                  >
                    <div className="flex min-h-[88px] justify-center bg-calendar-surface-soft px-1 pt-3 text-[11px] text-calendar-text-subtle">
                      {formatHour(hour)}
                    </div>

                    {weekDays.map((day) => {
                      const weekend = isWeekend(day);

                      const slotEvents = events.filter(
                        (event) =>
                          event.date === dateKey(day) &&
                          Number(event.start.split(":")[0]) === hour,
                      );

                      return (
                        <div
                          key={`${dateKey(day)}-${hour}`}
                          className={`min-h-[88px] border-l border-t border-calendar-border-soft p-1 ${
                            weekend
                              ? "bg-calendar-surface-soft"
                              : "bg-calendar-surface transition-colors hover:bg-calendar-surface-hover/50"
                          }`}
                        >
                          {weekend ? (
                            <div className="flex h-full items-center justify-center text-[10px] text-calendar-text-weekend">
                              Weekend
                            </div>
                          ) : slotEvents.length > 0 ? (
                            <div className="space-y-1">
                              {slotEvents.map((event) => {
                                const style = STATUS_STYLES[event.status];

                                return (
                                  <button
                                    key={event.id}
                                    type="button"
                                    onClick={() => setSelectedEvent(event)}
                                    aria-label={`${event.title}, ${event.status}, ${event.start} to ${event.end}`}
                                    className="w-full rounded-lg border p-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm sm:p-2"
                                    style={{
                                      backgroundColor: style.background,
                                      borderColor: style.border,
                                      color: style.text,
                                    }}
                                  >
                                    <span className="block truncate text-[11px] font-semibold">
                                      {event.title}
                                    </span>

                                    <span className="mt-1 block truncate text-[10px] opacity-80">
                                      {event.start} – {event.end}
                                    </span>

                                    <span className="mt-1 block truncate text-[10px] opacity-80">
                                      {event.status}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAvailability(day, hour)}
                              aria-label={`Add availability on ${formatDateLong(day)} at ${formatHour(hour)}`}
                              className="flex h-full min-h-[78px] w-full items-center justify-center rounded-lg text-calendar-text-weekend transition hover:bg-calendar-surface-hover hover:text-calendar-accent focus:bg-calendar-surface-hover focus:text-calendar-accent"
                            >
                              <Plus size={17} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <MonthCalendar
              date={calendarDate}
              events={events}
              todayKey={todayKey}
              onSelectDay={changeMonthViewDate}
              onSelectEvent={setSelectedEvent}
            />
          )}

          <div className="flex flex-col gap-2 border-t border-calendar-border-soft bg-calendar-surface-soft px-5 py-3.5 text-xs text-calendar-text-subtle sm:flex-row sm:items-center sm:justify-between">
            <span>Your working days are Sunday through Thursday.</span>
            <span>
              Select an event to view its details or update its status.
            </span>
          </div>
        </section>
      </div>

      {/* Add availability modal */}
      {availabilityOpen && (
        <Modal onClose={() => setAvailabilityOpen(false)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-rahati-lavender text-rahati-mauve-dark">
                <CalendarPlus size={22} />
              </div>

              <h2 className="text-xl font-semibold text-rahati-plum">
                Add availability
              </h2>

              <p className="mt-1 text-sm text-calendar-text-muted">
                Create a new slot for women to book.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAvailabilityOpen(false)}
              aria-label="Close dialog"
              className="rounded-xl p-2 text-calendar-text-muted transition hover:bg-calendar-surface-muted"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={saveAvailability} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="availability-date"
                className="mb-2 block text-sm font-medium text-calendar-text"
              >
                Date
              </label>

              <input
                id="availability-date"
                type="date"
                required
                value={formDate}
                onChange={(event) => setFormDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground outline-none transition focus:border-rahati-mauve focus:ring-2 focus:ring-rahati-lavender"
              />

              <p className="mt-2 text-xs text-calendar-text-subtle">
                Friday and Saturday are not available for scheduling.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="availability-start"
                  className="mb-2 block text-sm font-medium text-calendar-text"
                >
                  Start time
                </label>

                <select
                  id="availability-start"
                  value={formStart}
                  onChange={(event) => {
                    const nextStart = event.target.value;
                    const nextHour = Number(nextStart.split(":")[0]);

                    setFormStart(nextStart);
                    setFormEnd(`${String(nextHour + 1).padStart(2, "0")}:00`);
                  }}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground outline-none focus:border-rahati-mauve focus:ring-2 focus:ring-rahati-lavender"
                >
                  {HOURS.filter((hour) => hour < 17).map((hour) => {
                    const value = `${String(hour).padStart(2, "0")}:00`;

                    return (
                      <option key={value} value={value}>
                        {formatHour(hour)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="availability-end"
                  className="mb-2 block text-sm font-medium text-calendar-text"
                >
                  End time
                </label>

                <select
                  id="availability-end"
                  value={formEnd}
                  onChange={(event) => setFormEnd(event.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground outline-none focus:border-rahati-mauve focus:ring-2 focus:ring-rahati-lavender"
                >
                  {Array.from({ length: 8 }, (_, index) => index + 10).map(
                    (hour) => {
                      const value = `${String(hour).padStart(2, "0")}:00`;

                      return (
                        <option key={value} value={value}>
                          {formatHour(hour)}
                        </option>
                      );
                    },
                  )}
                </select>
              </div>
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-xl bg-calendar-error-bg px-4 py-3 text-sm text-calendar-error-text"
              >
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAvailabilityOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-calendar-text-muted transition hover:bg-calendar-surface-muted"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-calendar-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-calendar-accent-hover"
              >
                <Plus size={17} />
                Save availability
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Appointment details modal */}
      {selectedEvent && (
        <Modal onClose={() => setSelectedEvent(null)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor:
                    STATUS_STYLES[selectedEvent.status].background,
                  color: STATUS_STYLES[selectedEvent.status].text,
                }}
              >
                {selectedEvent.status}
              </span>

              <h2 className="mt-3 text-xl font-semibold text-rahati-plum">
                {selectedEvent.title}
              </h2>

              <p className="mt-1 text-sm text-calendar-text-muted">
                {selectedEvent.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close details"
              className="rounded-xl p-2 text-calendar-text-muted transition hover:bg-calendar-surface-muted"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-6 space-y-4 rounded-2xl bg-calendar-surface-soft p-4">
            <div className="flex items-center gap-3 text-sm text-calendar-text">
              <CalendarDays size={18} className="text-calendar-accent" />
              {formatDateLong(parseDate(selectedEvent.date))}
            </div>

            <div className="flex items-center gap-3 text-sm text-calendar-text">
              <Clock3 size={18} className="text-calendar-accent" />
              {selectedEvent.start} – {selectedEvent.end}
            </div>

            {selectedEvent.status !== "Free" && (
              <div className="flex items-center gap-3 text-sm text-calendar-text">
                <UserRound size={18} className="text-calendar-accent" />
                Professional appointment
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {selectedEvent.status === "Pending" && (
              <button
                type="button"
                onClick={() => updateEventStatus(selectedEvent.id, "Accepted")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-calendar-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-calendar-accent-hover"
              >
                <Check size={17} />
                Accept request
              </button>
            )}

            {selectedEvent.status === "Accepted" && (
              <button
                type="button"
                onClick={() => updateEventStatus(selectedEvent.id, "Completed")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-calendar-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-calendar-accent-hover"
              >
                <CheckCircle2 size={17} />
                Mark as completed
              </button>
            )}

            {selectedEvent.status === "Free" && (
              <button
                type="button"
                onClick={() => removeAvailability(selectedEvent.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rahati-pink px-4 py-3 text-sm font-medium text-rahati-rose transition hover:bg-rahati-blush"
              >
                <Trash2 size={17} />
                Remove availability
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="rounded-xl px-4 py-3 text-sm font-medium text-calendar-text-muted transition hover:bg-calendar-surface-muted"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

// --------------------------------------------------
// Summary card
// --------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  description,
  background,
  iconColor,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  description: string;
  background: string;
  iconColor: string;
}) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-calendar-border bg-card p-4 transition hover:border-rahati-lavender hover:shadow-sm sm:p-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: background, color: iconColor }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-calendar-text-muted">{label}</p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-rahati-plum">
          {value}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-calendar-text-subtle">
          {description}
        </p>
      </div>
    </article>
  );
}

// --------------------------------------------------
// Legend item
// --------------------------------------------------

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-calendar-text">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

// --------------------------------------------------
// Month calendar
// --------------------------------------------------

function MonthCalendar({
  date,
  events,
  todayKey,
  onSelectDay,
  onSelectEvent,
}: {
  date: Date;
  events: CalendarEvent[];
  todayKey: string;
  onSelectDay: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - firstOfMonth.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-y border-calendar-border-soft bg-calendar-surface-soft">
          {SHORT_DAYS.map((day, index) => (
            <div
              key={day}
              className={`px-2 py-3 text-center text-xs font-medium ${
                index >= 5
                  ? "text-calendar-text-weekend"
                  : "text-calendar-text-muted"
              }`}
            >
              {day}
              {index === 5 || index === 6 ? " · Weekend" : ""}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dateKey(day);
            const weekend = isWeekend(day);
            const outsideMonth = day.getMonth() !== date.getMonth();
            const isToday = key === todayKey;

            const dayEvents = events.filter((event) => event.date === key);

            return (
              <div
                key={key}
                className={`min-h-[125px] border-b border-r border-calendar-border-soft p-2 ${
                  weekend ? "bg-calendar-surface-soft" : "bg-calendar-surface"
                } ${outsideMonth ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-label={`View week containing ${formatDateLong(day)}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition ${
                    isToday
                      ? "bg-calendar-accent text-white"
                      : weekend
                        ? "text-calendar-text-weekend hover:bg-calendar-surface-muted"
                        : "text-calendar-text hover:bg-calendar-surface-hover"
                  }`}
                >
                  {day.getDate()}
                </button>

                <div className="mt-2 space-y-1.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const style = STATUS_STYLES[event.status];

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className="w-full truncate rounded-lg px-2 py-1.5 text-left text-[10px] font-medium transition hover:brightness-[0.97]"
                        style={{
                          backgroundColor: style.background,
                          color: style.text,
                        }}
                      >
                        {event.start} {event.title}
                      </button>
                    );
                  })}

                  {dayEvents.length > 3 && (
                    <p className="px-1 text-[10px] text-calendar-text-muted">
                      +{dayEvents.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Reusable modal
// --------------------------------------------------

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-rahati-plum/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="my-auto w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-xl sm:p-8"
      >
        {children}
      </div>
    </div>
  );
}
