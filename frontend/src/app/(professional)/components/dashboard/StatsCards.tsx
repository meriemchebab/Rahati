"use client";

import {
  ClipboardList,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

interface StatsCardsProps {
  pendingRequests: number;
  acceptedRequests: number;
  completedActions: number;
  totalAssignedActions: number;
  onReviewRequests: () => void;
}

export default function StatsCards({
  pendingRequests,
  acceptedRequests,
  completedActions,
  totalAssignedActions,
  onReviewRequests,
}: StatsCardsProps) {
  const completionPercentage =
    totalAssignedActions > 0
      ? Math.round((completedActions / totalAssignedActions) * 100)
      : 0;

  return (
    <section
      aria-label="Practice statistics"
      className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* Pending requests */}
      <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-pink text-rahati-mauve-dark">
            <ClipboardList size={20} />
          </div>

          <span className="rounded-full bg-[#fbf2df] px-2.5 py-1 text-[10px] font-medium text-[#99783e]">
            Needs review
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">Pending requests</p>

        <div className="mt-1 flex items-end justify-between">
          <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
            {pendingRequests}
          </p>

          <button
            type="button"
            onClick={onReviewRequests}
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-rahati-mauve-dark hover:underline"
          >
            Review <ArrowUpRight size={14} />
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {acceptedRequests} accepted in this demo
        </p>
      </article>

      {/* Today's sessions */}
      <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-lavender text-[#78638e]">
            <CalendarCheck size={20} />
          </div>

          <span className="rounded-full bg-[#eaf3eb] px-2.5 py-1 text-[10px] font-medium text-[#587a60]">
            Today
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Today&apos;s sessions
        </p>

        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
            4
          </p>

          <span className="mb-1 text-sm text-muted-foreground">sessions</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-[#66876d]">2 done</span>
            {" · "}2 remaining
          </span>

          <span className="font-medium text-rahati-mauve-dark">
            Next: 10:00
          </span>
        </div>
      </article>

      {/* Availability */}
      <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rahati-sage text-[#66876d]">
            <CalendarPlus size={20} />
          </div>

          <span className="rounded-full bg-rahati-sage px-2.5 py-1 text-[10px] font-medium text-[#587a60]">
            This week
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">Available slots</p>

        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
            12
          </p>

          <span className="mb-1 text-sm text-muted-foreground">slots</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">8 visible to women</span>

          <span className="font-medium text-[#66876d]">67%</span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0eb]">
          <div className="h-full w-2/3 rounded-full bg-[#91aa96]" />
        </div>
      </article>

      {/* Assigned actions */}
      <article className="rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8e8e6] text-[#b56e72]">
            <CheckCircle2 size={20} />
          </div>

          <span className="rounded-full bg-rahati-lavender px-2.5 py-1 text-[10px] font-medium text-[#78638e]">
            All patients
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Assigned actions completed
        </p>

        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-tight text-rahati-plum">
            {completedActions}
          </p>

          <span className="mb-1 text-sm text-muted-foreground">
            / {totalAssignedActions} actions
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Completed by your patients
          </span>

          <span className="font-medium text-rahati-mauve-dark">
            {completionPercentage}%
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rahati-pink">
          <div
            className="h-full rounded-full bg-rahati-mauve"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </article>
    </section>
  );
}
