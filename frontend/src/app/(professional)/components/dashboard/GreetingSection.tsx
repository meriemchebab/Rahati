"use client";

import { CalendarDays, Plus } from "lucide-react";

interface GreetingSectionProps {
  greeting: string;
  onOpenHours: () => void;
  onAddAvailability: () => void;
}

export default function GreetingSection({
  greeting,
  onOpenHours,
  onAddAvailability,
}: GreetingSectionProps) {
  return (
    <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[12px] font-medium text-rahati-mauve-dark">
          Your professional workspace
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-rahati-plum sm:text-[30px]">
          {greeting}, Dr. Sarah
        </h1>

        <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">
          Here's what's happening with your practice today.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenHours}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rahati-mauve/20 bg-background px-4 py-2 text-[12px] font-medium text-rahati-plum transition hover:bg-rahati-blush"
        >
          <CalendarDays size={16} />
          Weekly hours
        </button>

        <button
          type="button"
          onClick={onAddAvailability}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rahati-mauve px-4 py-2 text-[12px] font-medium text-white transition hover:bg-rahati-mauve-dark"
        >
          <Plus size={16} />
          Add availability
        </button>
      </div>
    </section>
  );
}
