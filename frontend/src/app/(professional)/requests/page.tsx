"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  RefreshCw,
  Check,
  X,
  Inbox,
  Video,
  MapPin,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getSessions,
  updateSession,
  type ProfessionalSession,
  type SessionStatus,
} from "@/lib/professional-api";

type Filter = "all" | "requested" | "accepted" | "completed" | "declined";

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "requested" },
  { label: "Accepted", value: "accepted" },
  { label: "Completed", value: "completed" },
  { label: "Declined", value: "declined" },
];

const statusLabels: Record<string, string> = {
  requested: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusStyle(status: string) {
  switch (status) {
    case "requested":
      return "bg-[#fff4df] text-[#9b7431]";
    case "accepted":
      return "bg-[#eee9f7] text-[#796392]";
    case "completed":
      return "bg-[#e8f2e8] text-[#66876d]";
    case "declined":
    case "cancelled":
      return "bg-[#faeaea] text-[#ad6969]";
    default:
      return "bg-[#f3edf3] text-[#80647e]";
  }
}

export default function RequestsPage() {
  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSessions = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load session requests.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function changeStatus(
    sessionId: number,
    status: "accepted" | "declined",
  ) {
    setUpdatingId(sessionId);
    setError("");
    setSuccess("");

    try {
      await updateSession(sessionId, status as SessionStatus);
      setSuccess(
        status === "accepted"
          ? "The session request has been accepted."
          : "The session request has been declined.",
      );
      await loadSessions(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update this request.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const visibleSessions = sessions
    .filter((session) => {
      if (filter === "all") return true;
      return session.status === filter;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );

  const pendingCount = sessions.filter(
    (session) => session.status === "requested",
  ).length;

  return (
    <DashboardLayout selectedPage="Requests">
      <main className="min-h-screen bg-[#f7f0f5] px-4 py-6 sm:px-7 lg:px-9">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17c99]">
                Your practice
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#67465d]">
                Session requests
              </h1>
              <p className="mt-2 text-sm text-[#927d8d]">
                Review and manage appointment requests.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadSessions(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#76556e] shadow-sm transition hover:bg-[#fbf5fa] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </header>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article className="rounded-2xl bg-white/90 p-5 shadow-sm">
              <p className="text-sm text-[#927d8d]">Total requests</p>
              <p className="mt-2 text-3xl font-semibold text-[#67465d]">
                {sessions.length}
              </p>
            </article>

            <article className="rounded-2xl bg-[#fff9ed] p-5 shadow-sm">
              <p className="text-sm text-[#927d8d]">Waiting for review</p>
              <p className="mt-2 text-3xl font-semibold text-[#9b7431]">
                {pendingCount}
              </p>
            </article>

            <article className="rounded-2xl bg-[#f0edf7] p-5 shadow-sm">
              <p className="text-sm text-[#927d8d]">Accepted sessions</p>
              <p className="mt-2 text-3xl font-semibold text-[#796392]">
                {sessions.filter((s) => s.status === "accepted").length}
              </p>
            </article>
          </section>

          {error && (
            <div className="mb-5 rounded-xl bg-[#faeaea] px-4 py-3 text-sm text-[#a34f4f]">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl bg-[#e8f2e8] px-4 py-3 text-sm text-[#55785b]">
              {success}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl bg-white/90 shadow-sm">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-[#67465d]">
                  Appointment inbox
                </h2>
                <p className="mt-1 text-xs text-[#927d8d]">
                  Requests and sessions retrieved from your account.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
                      filter === item.value
                        ? "bg-[#8d6b88] text-white"
                        : "bg-[#f7f0f5] text-[#80647e] hover:bg-[#efe4ed]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
              {loading ? (
                <div className="py-16 text-center text-sm text-[#927d8d]">
                  Loading your requests…
                </div>
              ) : visibleSessions.length === 0 ? (
                <div className="rounded-2xl bg-[#faf6f9] px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0e6ef] text-[#8d6b88]">
                    <Inbox size={22} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-[#67465d]">
                    {filter === "requested"
                      ? "No pending requests"
                      : "Nothing to display"}
                  </h3>
                  <p className="mt-1 text-xs text-[#927d8d]">
                    {filter === "requested"
                      ? "New appointment requests will appear here."
                      : "There are no sessions in this category."}
                  </p>
                </div>
              ) : (
                visibleSessions.map((session) => (
                  <article
                    key={session.id}
                    className="rounded-2xl bg-[#faf6f9] p-4 sm:p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eee4ed] text-[#896987]">
                          {session.mode === "online" ? (
                            <Video size={19} />
                          ) : (
                            <MapPin size={19} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-[#67465d]">
                              Session #{session.id}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle(
                                session.status,
                              )}`}
                            >
                              {statusLabels[session.status] ?? session.status}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-[#927d8d]">
                            Appointment request
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#80647e]">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} />
                              {formatDate(session.starts_at)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 size={14} />
                              {formatTime(session.starts_at)}
                            </span>
                            <span className="capitalize">
                              {session.mode.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {session.status === "requested" && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={updatingId === session.id}
                            onClick={() =>
                              void changeStatus(session.id, "accepted")
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#78947d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#66836c] disabled:opacity-50"
                          >
                            <Check size={15} />
                            {updatingId === session.id ? "Saving…" : "Accept"}
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === session.id}
                            onClick={() =>
                              void changeStatus(session.id, "declined")
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f5e7e7] px-4 py-2.5 text-xs font-semibold text-[#a65f63] transition hover:bg-[#f0dada] disabled:opacity-50"
                          >
                            <X size={15} />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
