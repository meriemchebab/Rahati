"use client";

import {
  UsersRound,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

interface StatsCardsProps {
  totalPatients: number;
  upcomingSessions: number;
  pendingRequests: number;
  completedActions: number;
  totalAssignedActions: number;
  onNavigate: (label: string) => void;
}

export default function StatsCards({
  totalPatients,
  upcomingSessions,
  pendingRequests,
  completedActions,
  totalAssignedActions,
  onNavigate,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Total patients",
      value: totalPatients,
      description: "Patients in your care",
      icon: UsersRound,
      iconStyle: "bg-rahati-lavender text-rahati-plum",
      action: "Patients",
    },
    {
      label: "Upcoming sessions",
      value: upcomingSessions,
      description: "Scheduled sessions",
      icon: CalendarDays,
      iconStyle: "bg-rahati-sage/20 text-rahati-sage",
      action: "Calendar",
    },
    {
      label: "Pending requests",
      value: pendingRequests,
      description: "Awaiting your response",
      icon: ClipboardList,
      iconStyle: "bg-rahati-pink/30 text-rahati-mauve-dark",
      action: "Requests",
    },
    {
      label: "Actions completed",
      value: `${completedActions}/${totalAssignedActions}`,
      description: "Patient actions completed",
      icon: CheckCircle2,
      iconStyle: "bg-rahati-blush text-rahati-mauve-dark",
      action: "Patients",
    },
  ];

  return (
    <section
      aria-label="Practice statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <button
            key={stat.label}
            type="button"
            onClick={() => onNavigate(stat.action)}
            className="group rounded-2xl border border-rahati-mauve/10 bg-background p-5 text-left transition hover:-translate-y-0.5 hover:border-rahati-mauve/25 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconStyle}`}
              >
                <Icon size={19} strokeWidth={1.8} />
              </span>

              <ArrowUpRight
                size={16}
                className="text-muted-foreground/60 transition group-hover:text-rahati-mauve-dark"
              />
            </div>

            <p className="mt-5 text-[12px] font-medium text-muted-foreground">
              {stat.label}
            </p>

            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-rahati-plum">
              {stat.value}
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              {stat.description}
            </p>
          </button>
        );
      })}
    </section>
  );
}
