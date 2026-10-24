"use client";

import { Clock3, Plus } from "lucide-react";

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
    <section className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-rahati-mauve">
          YOUR WORKSPACE
        </p>

        <h2 className="text-2xl font-semibold tracking-tight text-rahati-plum sm:text-[30px]">
          {greeting} Dr. Sarah
          <span className="ml-2 inline-block">✦</span>
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Here&apos;s an overview of your practice and the women in your care.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onOpenHours}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-rahati-plum shadow-sm transition hover:border-rahati-mauve/50 hover:bg-rahati-blush"
        >
          <Clock3 size={17} />
          Weekly hours
        </button>

        <button
          type="button"
          onClick={onAddAvailability}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rahati-mauve px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-rahati-mauve-dark"
        >
          <Plus size={18} />
          Add availability
        </button>
      </div>
    </section>
  );
}
