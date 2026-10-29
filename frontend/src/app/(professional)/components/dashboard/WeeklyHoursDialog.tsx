"use client";

import { Clock3, X } from "lucide-react";

interface WeeklyHoursDialogProps {
  onClose: () => void;
}

const weeklyHours = [
  ["Monday", "09:00 – 16:00"],
  ["Tuesday", "09:00 – 16:00"],
  ["Wednesday", "09:00 – 13:00"],
  ["Thursday", "10:00 – 17:00"],
  ["Friday", "09:00 – 14:00"],
  ["Saturday", "Unavailable"],
  ["Sunday", "Unavailable"],
];

export default function WeeklyHoursDialog({ onClose }: WeeklyHoursDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-rahati-plum/30 p-4 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-hours-title"
        className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-pink text-rahati-mauve-dark">
              <Clock3 size={20} />
            </div>

            <h2
              id="weekly-hours-title"
              className="text-lg font-semibold text-rahati-plum"
            >
              Your weekly hours
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Your current demo schedule is shown below.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-rahati-pink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {weeklyHours.map(([day, time]) => (
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
            These hours are illustrative. Editing and saving a real schedule
            will be handled when the backend is connected.
          </p>
        </div>
      </section>
    </div>
  );
}
