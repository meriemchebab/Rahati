"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, Plus } from "lucide-react";
import { getProfile } from "@/lib/professional-api";

interface GreetingSectionProps {
  greeting: string;
  date?: string;
  onWeeklyHours?: () => void;
  onAddAvailability: () => void;
  onOpenHours?: () => void;
}

export default function GreetingSection({
  greeting,
  date,
  onWeeklyHours,
  onAddAvailability,
  onOpenHours,
}: GreetingSectionProps) {
  const [displayName, setDisplayName] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getProfile();

      if (typeof profile?.display_name === "string") {
        setDisplayName(profile.display_name.trim());
      }
    } catch (error) {
      console.error("Unable to load professional name:", error);
    }
  }, []);

  useEffect(() => {
    void loadProfile();

    const handleProfileUpdate = () => {
      void loadProfile();
    };

    window.addEventListener("rahati-profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("rahati-profile-updated", handleProfileUpdate);
    };
  }, [loadProfile]);

  const handleWeeklyHours = onWeeklyHours ?? onOpenHours;

  return (
    <section className="mb-7 flex flex-col justify-between gap-5 rounded-3xl border border-rahati-lilac/70 bg-gradient-to-br from-rahati-lilac via-background to-rahati-periwinkle/70 px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-center">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Your workspace
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[30px]">
          {greeting}
          {displayName ? ` ${displayName}` : ""}
          <span className="ml-2 inline-block text-[#7673FF]">✦</span>
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Here&apos;s an overview of your practice and the women in your care.
        </p>

        {date && (
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {date}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        <button
          type="button"
          onClick={handleWeeklyHours}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7673FF] focus-visible:ring-offset-2"
        >
          <Clock3 size={17} />
          Weekly hours
        </button>

        <button
          type="button"
          onClick={onAddAvailability}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7673FF] px-4 py-3 text-sm font-semibold text-[#111018] shadow-sm transition-colors hover:bg-[#7673FF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7673FF] focus-visible:ring-offset-2"
        >
          <Plus size={18} />
          Add availability
        </button>
      </div>
    </section>
  );
}
