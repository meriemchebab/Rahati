"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import type { CalendarItem } from "@/lib/professional-api";

interface CalendarPreviewProps {
  events: CalendarItem[];
  loading: boolean;
  onViewCalendar: () => void;
}

const statusStyles: Record<string, string> = {
  free: "bg-[#edf4ed] text-[#66876d]",
  requested: "bg-[#faf3df] text-[#a88743]",
  accepted: "bg-[#f0eaf6] text-[#806b9a]",
  completed: "bg-[#eaf2f7] text-[#63879e]",
  expired: "bg-gray-100 text-gray-500",
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
    <article className="overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
      <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-rahati-plum">
            Your calendar
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Your upcoming appointments and availability.
          </p>
        </div>

        <CalendarDays className="text-rahati-mauve" size={22} />
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
                className="flex items-center justify-between gap-3 rounded-xl bg-rahati-blush/50 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-rahati-plum">
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
                    statusStyles[event.state] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {statusLabels[event.state] || event.state}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onViewCalendar}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rahati-mauve-dark hover:underline"
        >
          Open full calendar
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}
