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
        aria-labelledby="availability-dialog-title"
        className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-pink text-rahati-mauve-dark">
              <CalendarPlus size={20} />
            </div>

            <h2
              id="availability-dialog-title"
              className="text-lg font-semibold text-rahati-plum"
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
            className="rounded-lg p-2 text-muted-foreground hover:bg-rahati-pink"
          >
            <X size={18} />
          </button>
        </div>

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
              onChange={(event) => onDateChange(event.target.value)}
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
              onChange={(event) => onTimeChange(event.target.value)}
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
            onClick={onSave}
            className="w-full rounded-xl bg-rahati-mauve px-4 py-3 text-sm font-medium text-white transition hover:bg-rahati-mauve-dark"
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
