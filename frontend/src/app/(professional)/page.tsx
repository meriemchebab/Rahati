"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "./components/layout/DashboardLayout";

import GreetingSection from "./components/dashboard/GreetingSection";
import StatsCards from "./components/dashboard/StatsCards";
import IncomingRequests from "./components/dashboard/IncomingRequests";
import CalendarPreview from "./components/dashboard/CalendarPreview";
import PatientsTable from "./components/dashboard/PatientsTable";
import WeeklyHoursDialog from "./components/dashboard/WeeklyHoursDialog";
import AvailibilityDialog from "./components/dashboard/AvailibilityDialog";

import type {
  CalendarEvent,
  Patient,
  PatientRequest,
  RequestStatus,
} from "@/types/dashboard";

/* -------------------------------------------------------------------------- */
/*                                  MOCK DATA                                 */
/* -------------------------------------------------------------------------- */

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

const initialCalendarEvents: CalendarEvent[] = [
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

const calendarHours = [9, 10, 11, 12, 13, 14, 15, 16];

const eventStyles: Record<CalendarEvent["status"], string> = {
  Free: "border-[#c8dfcc] bg-[#eaf3eb] text-[#587a60]",
  Pending: "border-[#ead9b2] bg-[#fbf2df] text-[#99783e]",
  Accepted: "border-[#d9c6e8] bg-[#f0e7f7] text-[#84649c]",
  Completed: "border-[#cbdde9] bg-[#e7f0f6] text-[#5e8199]",
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function getGreeting(hour: number) {
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

function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/* -------------------------------------------------------------------------- */
/*                                  DASHBOARD                                 */
/* -------------------------------------------------------------------------- */

export default function Home() {
  /* Greeting and current date */
  const [greeting, setGreeting] = useState("Good morning");
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();

    setGreeting(getGreeting(now.getHours()));
    setToday(now);
  }, []);

  const formattedDate = today ? formatDate(today) : "";

  /* Layout state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("Overview");

  /* Dashboard data */
  const [requests, setRequests] = useState<PatientRequest[]>(initialRequests);

  const [patients] = useState<Patient[]>(initialPatients);

  /* Calendar state */
  const [events, setEvents] = useState<CalendarEvent[]>(initialCalendarEvents);

  const [calendarDate, setCalendarDate] = useState<Date>(
    new Date("2026-01-05T00:00:00"),
  );

  const [calendarView, setCalendarView] = useState<"Week" | "Day">("Week");

  useEffect(() => {
    const date = new Date();

    // Keep the initial calendar date on a weekday.
    if (date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    } else if (date.getDay() === 0) {
      date.setDate(date.getDate() - 2);
    }

    setCalendarDate(date);
  }, []);

  /* Dialog state */
  const [dialog, setDialog] = useState<"hours" | "availability" | null>(null);

  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityTime, setAvailabilityTime] = useState("09:00");
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  /* Dashboard statistics */
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

  /* Navigation */
  function handleNavigation(label: string) {
    setSelectedPage(label);
    setSidebarOpen(false);
  }

  /* Patient requests */
  function updateRequest(id: number, status: RequestStatus) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    );
  }

  /* Calendar navigation */
  const weekDates = getWeekDates(calendarDate);

  function changeWeek(direction: number) {
    setCalendarDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  }

  /* Calendar events shown in the selected view */
  const visibleEvents = events.filter((event) => {
    if (event.date) {
      const eventDate = new Date(`${event.date}T00:00:00`);

      if (calendarView === "Day") {
        return event.date === formatDateKey(calendarDate);
      }

      const [firstDay, , , , lastDay] = getWeekDates(calendarDate);

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

  /* Add availability */
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

    const [selectedHour, selectedMinute] = availabilityTime
      .split(":")
      .map(Number);

    if (selectedMinute !== 0 || selectedHour < 9 || selectedHour > 16) {
      setAvailabilityMessage(
        "Choose a full-hour slot between 09:00 and 16:00.",
      );
      return;
    }

    const weekdayIndex = dayOfWeek - 1;

    const alreadyExists = events.some(
      (event) =>
        event.day === weekdayIndex &&
        event.start === selectedHour &&
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
      start: selectedHour,
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

  /* ------------------------------------------------------------------------ */
  /*                                    JSX                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <DashboardLayout
        sidebarOpen={sidebarOpen}
        selectedPage={selectedPage}
        pendingRequests={pendingRequests}
        formattedDate={formattedDate}
        notificationsOpen={notificationsOpen}
        onNavigate={handleNavigation}
        onCloseSidebar={() => setSidebarOpen(false)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onToggleNotifications={() => setNotificationsOpen((open) => !open)}
      >
        <main className="mx-auto w-full max-w-[1700px] px-5 py-7 sm:px-8 sm:py-9">
          <GreetingSection
            greeting={greeting}
            onOpenHours={() => setDialog("hours")}
            onAddAvailability={() => {
              setAvailabilityMessage("");
              setDialog("availability");
            }}
          />

          <StatsCards
            pendingRequests={pendingRequests}
            acceptedRequests={acceptedRequests}
            completedActions={completedActions}
            totalAssignedActions={totalAssignedActions}
            onReviewRequests={() => handleNavigation("Requests")}
          />

          <section className="mb-8 grid grid-cols-1 items-start gap-5 2xl:grid-cols-2">
            <IncomingRequests
              requests={requests}
              onUpdateRequest={updateRequest}
              onViewAll={() => handleNavigation("Requests")}
            />

            <CalendarPreview
              calendarDate={calendarDate}
              calendarView={calendarView}
              weekDates={weekDates}
              visibleEvents={visibleEvents}
              today={today}
              weekdays={weekdays}
              hours={calendarHours}
              eventStyles={eventStyles}
              formatShortDate={formatShortDate}
              onChangeView={setCalendarView}
              onChangeWeek={changeWeek}
              onOpenCalendar={() => handleNavigation("Calendar")}
            />
          </section>

          <PatientsTable
            patients={patients}
            onViewAll={() => handleNavigation("Patients")}
          />

          <footer className="mt-8 flex flex-col gap-2 border-t border-border py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Rahati · A thoughtful space for mental wellbeing</p>
            <p>Designed with care ♡</p>
          </footer>
        </main>
      </DashboardLayout>

      {dialog === "hours" && (
        <WeeklyHoursDialog onClose={() => setDialog(null)} />
      )}

      {dialog === "availability" && (
        <AvailibilityDialog
          availabilityDate={availabilityDate}
          availabilityTime={availabilityTime}
          availabilityMessage={availabilityMessage}
          onDateChange={(date) => {
            setAvailabilityDate(date);
            setAvailabilityMessage("");
          }}
          onTimeChange={setAvailabilityTime}
          onSave={saveAvailability}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
