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

  const cardClass =
    "rounded-2xl bg-card p-5 shadow-[0_4px_24px_rgba(17,16,24,0.035)] transition-shadow hover:shadow-[0_6px_28px_rgba(118,115,255,0.09)]";

  const iconClass =
    "flex h-10 w-10 items-center justify-center rounded-xl text-rahati-ink";

  return (
    <section
      aria-label="Practice statistics"
      className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* Pending requests */}
      <article className={cardClass}>
        <div className="flex items-start justify-between">
          <div className={`${iconClass} bg-rahati-lilac`}>
            <ClipboardList size={20} />
          </div>

          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            Needs review
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">Pending requests</p>

        <div className="mt-1 flex items-end justify-between">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {pendingRequests}
          </p>

          <button
            type="button"
            onClick={onReviewRequests}
            className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-[#7673FF] transition-colors hover:text-[#625FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7673FF] focus-visible:ring-offset-2"
          >
            Review <ArrowUpRight size={14} />
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {acceptedRequests} accepted in this demo
        </p>
      </article>

      {/* Today's sessions */}
      <article className={cardClass}>
        <div className="flex items-start justify-between">
          <div className={`${iconClass} bg-rahati-periwinkle`}>
            <CalendarCheck size={20} />
          </div>

          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            Today
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Today&apos;s sessions
        </p>

        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            4
          </p>

          <span className="mb-1 text-sm text-muted-foreground">sessions</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">2 done</span>
            {" · "}2 remaining
          </span>

          <span className="font-medium text-foreground">Next: 10:00</span>
        </div>
      </article>

      {/* Availability */}
      <article className={cardClass}>
        <div className="flex items-start justify-between">
          <div className={`${iconClass} bg-muted`}>
            <CalendarPlus size={20} />
          </div>

          <span className="rounded-full bg-rahati-lilac px-2.5 py-1 text-[10px] font-medium text-rahati-ink">
            This week
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">Available slots</p>

        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            12
          </p>

          <span className="mb-1 text-sm text-muted-foreground">slots</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">8 visible to women</span>
          <span className="font-medium text-foreground">67%</span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-[#7673FF]" />
        </div>
      </article>

      {/* Assigned actions */}
      <article className={cardClass}>
        <div className="flex items-start justify-between">
          <div className={`${iconClass} bg-rahati-light-pink/50`}>
            <CheckCircle2 size={20} />
          </div>

          <span className="rounded-full bg-rahati-periwinkle px-2.5 py-1 text-[10px] font-medium text-rahati-ink">
            All patients
          </span>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Assigned actions completed
        </p>

        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
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

          <span className="font-medium text-foreground">
            {completionPercentage}%
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#7673FF] transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </article>
    </section>
  );
}
