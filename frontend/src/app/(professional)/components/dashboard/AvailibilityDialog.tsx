"use client";

import { CalendarPlus, X } from "lucide-react";

interface AvailabilityDialogProps {
  availabilityDate: string;
  availabilityTime: string;
  availabilityMessage: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function AvailabilityDialog({
  availabilityDate,
  availabilityTime,
  availabilityMessage,
  onDateChange,
  onTimeChange,
  onSave,
  onClose,
}: AvailabilityDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-rahati-ink/35 p-4 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-dialog-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(17,16,24,0.16)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-lilac text-rahati-ink">
              <CalendarPlus size={20} />
            </div>

            <h2
              id="availability-dialog-title"
              className="text-lg font-semibold text-card-foreground"
            >
              Add availability
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Create an availability slot for your practice.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="availability-date"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Date
            </label>

            <input
              id="availability-date"
              type="date"
              value={availabilityDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-[#7673FF] focus:ring-2 focus:ring-[#7673FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="availability-time"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Start time
            </label>

            <input
              id="availability-time"
              type="time"
              value={availabilityTime}
              onChange={(event) => onTimeChange(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-[#7673FF] focus:ring-2 focus:ring-[#7673FF]/20"
            />
          </div>

          {availabilityMessage && (
            <p
              aria-live="polite"
              className="rounded-xl bg-calendar-success-bg p-3 text-xs leading-5 text-calendar-success-text"
            >
              {availabilityMessage}
            </p>
          )}

          <button
            type="button"
            onClick={onSave}
            className="w-full rounded-xl bg-[#7673FF] px-4 py-3 text-sm font-semibold text-[#111018] transition-colors hover:bg-[#7673FF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7673FF] focus-visible:ring-offset-2"
          >
            Save availability
          </button>

          <p className="text-xs leading-5 text-muted-foreground">
            Your availability will be saved to your professional calendar. Each
            slot lasts one hour.
          </p>
        </div>
      </section>
    </div>
  );
}
