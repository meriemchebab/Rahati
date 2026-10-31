"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import type { CalendarItem } from "@/lib/professional-api";

interface CalendarPreviewProps {
  events: CalendarItem[];
  loading: boolean;
  onViewCalendar: () => void;
}

const statusStyles: Record<string, string> = {
  free: "bg-calendar-available-bg text-calendar-available-text",
  requested: "bg-calendar-pending-bg text-calendar-pending-text",
  accepted: "bg-calendar-accepted-bg text-calendar-accepted-text",
  completed: "bg-calendar-completed-bg text-calendar-completed-text",
  expired: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  free: "Free",
  requested: "Pending",
  accepted: "Accepted",
  completed: "Completed",
  expired: "Expired",
};

export default function CalendarPreview({
  events,
  loading,
  onViewCalendar,
}: CalendarPreviewProps) {
  const upcomingEvents = [...events]
    .filter((event) => event.state !== "expired")
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )
    .slice(0, 5);

  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-[0_4px_24px_rgba(17,16,24,0.035)]">
      <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-card-foreground">
            Your calendar
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Your upcoming appointments and availability.
          </p>
        </div>

        <CalendarDays className="text-primary" size={22} />
      </div>

      <div className="space-y-3 px-5 pb-5 sm:px-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading calendar...
          </p>
        ) : upcomingEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No calendar events available.
          </p>
        ) : (
          upcomingEvents.map((event) => {
            const start = new Date(event.starts_at);
            const end = new Date(event.ends_at);

            return (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3 transition-colors hover:bg-rahati-lilac/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {start.toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {start.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {end.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {event.mode}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium ${
                    statusStyles[event.state] ||
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {statusLabels[event.state] || event.state}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onViewCalendar}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Open full calendar
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}
