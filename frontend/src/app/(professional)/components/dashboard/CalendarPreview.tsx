"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarEvent } from "@/types/dashboard";

type CalendarView = "Week" | "Day";

interface CalendarPreviewProps {
  calendarDate: Date;
  calendarView: CalendarView;
  weekDates: Date[];
  visibleEvents: CalendarEvent[];
  today: Date | null;
  weekdays: string[];
  hours: number[];
  eventStyles: Record<CalendarEvent["status"], string>;
  formatShortDate: (date: Date) => string;
  onChangeView: (view: CalendarView) => void;
  onChangeWeek: (direction: number) => void;
  onOpenCalendar: () => void;
}

export default function CalendarPreview({
  calendarDate,
  calendarView,
  weekDates,
  visibleEvents,
  today,
  weekdays,
  hours,
  eventStyles,
  formatShortDate,
  onChangeView,
  onChangeWeek,
  onOpenCalendar,
}: CalendarPreviewProps) {
  const displayedDates = calendarView === "Day" ? [calendarDate] : weekDates;

  return (
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
                onClick={() => onChangeView(view)}
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
              onClick={() => onChangeWeek(-1)}
              className="rounded-lg border border-border p-2 text-rahati-plum hover:bg-rahati-blush"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              aria-label="Next week"
              onClick={() => onChangeWeek(1)}
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
                displayedDates.length
              }, minmax(0, 1fr))`,
            }}
          >
            <div className="border-b border-border pb-3" />

            {displayedDates.map((date) => {
              const isToday =
                today !== null && date.toDateString() === today.toDateString();

              const weekdayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;

              return (
                <div
                  key={date.toISOString()}
                  className="border-b border-border pb-3 text-center"
                >
                  <p className="text-[10px] text-muted-foreground">
                    {weekdays[weekdayIndex]}
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

                {displayedDates.map((date) => {
                  const actualDay = date.getDay() === 0 ? 6 : date.getDay() - 1;

                  const dateString = [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, "0"),
                    String(date.getDate()).padStart(2, "0"),
                  ].join("-");

                  const event = visibleEvents.find(
                    (item) =>
                      item.day === actualDay &&
                      item.start === hour &&
                      (!item.date || item.date === dateString),
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
          onClick={onOpenCalendar}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rahati-mauve-dark hover:underline"
        >
          <CalendarDays size={14} />
          Open full calendar
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}
