"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardLayout from "./components/layout/DashboardLayout";
import GreetingSection from "./components/dashboard/GreetingSection";
import StatsCards from "./components/dashboard/StatsCards";
import IncomingRequests from "./components/dashboard/IncomingRequests";
import CalendarPreview from "./components/dashboard/CalendarPreview";
import PatientsTable from "./components/dashboard/PatientsTable";
import WeeklyHoursDialog from "./components/dashboard/WeeklyHoursDialog";
import AvailibilityDialog from "./components/dashboard/AvailibilityDialog";

import {
  getSessions,
  getPatients,
  getCalendar,
  updateSession,
  createSlot,
  type ProfessionalSession,
  type ProfessionalPatient,
  type CalendarItem,
} from "@/lib/professional-api";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type EndpointState = "loading" | "success" | "error";

type EndpointStates = {
  sessions: EndpointState;
  patients: EndpointState;
  calendar: EndpointState;
};

type EndpointErrors = {
  sessions: string;
  patients: string;
  calendar: string;
};

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function getGreeting(date: Date) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCalendarRange() {
  const today = new Date();

  const from = new Date(today);
  from.setDate(today.getDate() - 7);

  const to = new Date(today);
  to.setDate(today.getDate() + 30);

  return {
    from: getDateString(from),
    to: getDateString(to),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/* -------------------------------------------------------------------------- */
/*                            API STATUS COMPONENT                            */
/* -------------------------------------------------------------------------- */

function EndpointStatus({
  label,
  status,
  count,
  error,
}: {
  label: string;
  status: EndpointState;
  count: number;
  error: string;
}) {
  const statusStyles = {
    loading: "bg-[#f4edf3] text-[#94758a]",
    success: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-700",
  };

  const statusText = {
    loading: "Checking...",
    success: `Connected · ${count} records`,
    error: "Request failed",
  };

  return (
    <div className="min-w-0 rounded-xl bg-[#fcf8fb] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#67465d]">{label}</p>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
        >
          {statusText[status]}
        </span>
      </div>

      {status === "error" && error && (
        <p className="mt-2 break-words text-xs leading-relaxed text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    PAGE                                    */
/* -------------------------------------------------------------------------- */

export default function ProfessionalDashboard() {
  const router = useRouter();

  /* ------------------------------- UI STATE ------------------------------ */

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [weeklyHoursOpen, setWeeklyHoursOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityTime, setAvailabilityTime] = useState("09:00");
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  /* ------------------------------ API STATE ------------------------------ */

  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);
  const [patients, setPatients] = useState<ProfessionalPatient[]>([]);
  const [events, setEvents] = useState<CalendarItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [endpointStates, setEndpointStates] = useState<EndpointStates>({
    sessions: "loading",
    patients: "loading",
    calendar: "loading",
  });

  const [endpointErrors, setEndpointErrors] = useState<EndpointErrors>({
    sessions: "",
    patients: "",
    calendar: "",
  });

  const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(
    null,
  );

  /* ------------------------------- DATE ---------------------------------- */

  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const updateCurrentDate = () => {
      const currentDate = new Date();

      setToday(currentDate);

      setAvailabilityDate(
        (currentValue) => currentValue || getDateString(currentDate),
      );
    };

    updateCurrentDate();

    const timer = window.setInterval(updateCurrentDate, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  /* ----------------------------- LOAD DATA ------------------------------- */

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    setEndpointStates({
      sessions: "loading",
      patients: "loading",
      calendar: "loading",
    });

    setEndpointErrors({
      sessions: "",
      patients: "",
      calendar: "",
    });

    const { from, to } = getCalendarRange();

    // Each endpoint is handled independently.
    // One failed request will not prevent the others from loading.

    const results = await Promise.allSettled([
      getSessions(),
      getPatients(),
      getCalendar(from, to),
    ]);

    const [sessionResult, patientResult, calendarResult] = results;

    /* ------------------------------- SESSIONS ------------------------------ */

    if (sessionResult.status === "fulfilled") {
      setSessions(sessionResult.value);

      setEndpointStates((previous) => ({
        ...previous,
        sessions: "success",
      }));

      setEndpointErrors((previous) => ({
        ...previous,
        sessions: "",
      }));
    } else {
      setEndpointStates((previous) => ({
        ...previous,
        sessions: "error",
      }));

      setEndpointErrors((previous) => ({
        ...previous,
        sessions: getErrorMessage(
          sessionResult.reason,
          "Unable to retrieve sessions.",
        ),
      }));
    }

    /* ------------------------------- PATIENTS ------------------------------ */

    if (patientResult.status === "fulfilled") {
      setPatients(patientResult.value);

      setEndpointStates((previous) => ({
        ...previous,
        patients: "success",
      }));

      setEndpointErrors((previous) => ({
        ...previous,
        patients: "",
      }));
    } else {
      setEndpointStates((previous) => ({
        ...previous,
        patients: "error",
      }));

      setEndpointErrors((previous) => ({
        ...previous,
        patients: getErrorMessage(
          patientResult.reason,
          "Unable to retrieve patients.",
        ),
      }));
    }

    /* ------------------------------- CALENDAR ------------------------------ */

    if (calendarResult.status === "fulfilled") {
      setEvents(calendarResult.value);

      setEndpointStates((previous) => ({
        ...previous,
        calendar: "success",
      }));

      setEndpointErrors((previous) => ({
        ...previous,
        calendar: "",
      }));
    } else {
      setEndpointStates((previous) => ({
        ...previous,
        calendar: "error",
      }));

      setEndpointErrors((previous) => ({
        ...previous,
        calendar: getErrorMessage(
          calendarResult.reason,
          "Unable to retrieve calendar events.",
        ),
      }));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ----------------------------- STATISTICS ------------------------------ */

  const pendingRequests = sessions.filter(
    (session) => session.status === "requested",
  );

  const acceptedSessions = sessions.filter(
    (session) => session.status === "accepted",
  );

  const totalOpenActions = patients.reduce(
    (total, patient) => total + patient.todos.open,
    0,
  );

  const totalCompletedActions = patients.reduce(
    (total, patient) => total + patient.todos.done,
    0,
  );

  const totalAssignedActions = totalOpenActions + totalCompletedActions;

  /* -------------------------- REQUEST MANAGEMENT ------------------------ */

  const handleRequestUpdate = async (
    sessionId: number,
    status: "accepted" | "declined",
  ) => {
    setUpdatingSessionId(sessionId);
    setError("");

    try {
      await updateSession(sessionId, status);
      await loadDashboard();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update the session."));
    } finally {
      setUpdatingSessionId(null);
    }
  };

  /* -------------------------- AVAILABILITY ------------------------------- */

  const saveAvailability = async () => {
    setAvailabilityMessage("");

    if (!availabilityDate || !availabilityTime) {
      setAvailabilityMessage("Please select a date and time.");
      return;
    }

    const selectedDate = new Date(`${availabilityDate}T${availabilityTime}:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      setAvailabilityMessage("Please select a valid date and time.");
      return;
    }

    // Friday and Saturday are the weekend in Algeria.
    const day = selectedDate.getDay();

    if (day === 5 || day === 6) {
      setAvailabilityMessage(
        "Availability can only be added from Sunday to Thursday.",
      );
      return;
    }

    const [hours] = availabilityTime.split(":").map(Number);

    if (hours < 9 || hours >= 17) {
      setAvailabilityMessage(
        "Please choose a start time between 09:00 and 16:00.",
      );
      return;
    }

    const endDate = new Date(selectedDate);
    endDate.setHours(endDate.getHours() + 1);

    try {
      setAvailabilityMessage("Saving availability...");

      await createSlot({
        starts_at: selectedDate.toISOString(),
        ends_at: endDate.toISOString(),
        mode: "online",
      });

      await loadDashboard();

      setAvailabilityMessage("Your availability was saved successfully.");

      window.setTimeout(() => {
        setAvailabilityOpen(false);
        setAvailabilityMessage("");
      }, 1200);
    } catch (err) {
      setAvailabilityMessage(
        getErrorMessage(err, "Unable to save availability. Please try again."),
      );
    }
  };

  /* ----------------------------- NAVIGATION ------------------------------ */

  const handleNavigation = (label: string) => {
    const routes: Record<string, string> = {
      Overview: "/",
      Calendar: "/calendar",
      Requests: "/requests",
      Patients: "/patients",
      Settings: "/settings",
    };

    router.push(routes[label] || "/");
  };

  /* -------------------------------- RENDER ------------------------------- */

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      selectedPage="Overview"
      pendingRequests={pendingRequests.length}
      formattedDate={today ? formatDate(today) : ""}
      notificationsOpen={notificationsOpen}
      onNavigate={handleNavigation}
      onCloseSidebar={() => setSidebarOpen(false)}
      onOpenSidebar={() => setSidebarOpen(true)}
      onToggleNotifications={() =>
        setNotificationsOpen((previous) => !previous)
      }
    >
      <div className="space-y-7">
        {/* BACKEND CONNECTION STATUS */}

        <section className="rounded-2xl border border-[#eadce6] bg-white/80 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#67465d]">
                Backend connection
              </h2>

              <p className="mt-1 text-xs text-[#94758a]">
                Live results from your Django API
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-xl bg-[#f5eaf1] px-4 py-2 text-xs font-semibold text-[#805b73] transition hover:bg-[#eddce7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh data"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <EndpointStatus
              label="Sessions"
              status={endpointStates.sessions}
              count={sessions.length}
              error={endpointErrors.sessions}
            />

            <EndpointStatus
              label="Patients"
              status={endpointStates.patients}
              count={patients.length}
              error={endpointErrors.patients}
            />

            <EndpointStatus
              label="Calendar"
              status={endpointStates.calendar}
              count={events.length}
              error={endpointErrors.calendar}
            />
          </div>
        </section>

        {/* ACTION ERROR */}

        {error && (
          <div className="flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>

            <button
              onClick={() => setError("")}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* GREETING */}

        <GreetingSection
          greeting={today ? getGreeting(today) : "Welcome"}
          onOpenHours={() => setWeeklyHoursOpen(true)}
          onAddAvailability={() => {
            if (!availabilityDate && today) {
              setAvailabilityDate(getDateString(today));
            }

            setAvailabilityOpen(true);
          }}
        />

        {/* STATISTICS */}

        {loading ? (
          <div className="rounded-2xl bg-white/70 p-8 text-center text-sm text-[#94758a]">
            Loading your dashboard...
          </div>
        ) : (
          <StatsCards
            pendingRequests={pendingRequests.length}
            acceptedRequests={acceptedSessions.length}
            completedActions={totalCompletedActions}
            totalAssignedActions={totalAssignedActions}
            onReviewRequests={() => router.push("/requests")}
          />
        )}

        {/* REQUESTS AND CALENDAR */}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <IncomingRequests
            requests={sessions}
            updatingSessionId={updatingSessionId}
            onUpdateRequest={handleRequestUpdate}
            onViewAll={() => router.push("/requests")}
          />

          <CalendarPreview
            events={events}
            loading={loading}
            onViewCalendar={() => router.push("/calendar")}
          />
        </div>

        {/* PATIENTS */}

        <PatientsTable
          patients={patients}
          loading={loading}
          onViewAll={() => router.push("/patients")}
          onViewPatient={(id) => router.push(`/patients/${id}`)}
        />
      </div>

      {/* WEEKLY HOURS DIALOG */}

      {weeklyHoursOpen && (
        <WeeklyHoursDialog onClose={() => setWeeklyHoursOpen(false)} />
      )}

      {/* AVAILABILITY DIALOG */}

      {availabilityOpen && (
        <AvailibilityDialog
          availabilityDate={availabilityDate}
          availabilityTime={availabilityTime}
          availabilityMessage={availabilityMessage}
          onDateChange={setAvailabilityDate}
          onTimeChange={setAvailabilityTime}
          onSave={saveAvailability}
          onClose={() => {
            setAvailabilityOpen(false);
            setAvailabilityMessage("");
          }}
        />
      )}
    </DashboardLayout>
  );
}
