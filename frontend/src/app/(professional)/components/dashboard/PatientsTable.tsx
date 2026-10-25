"use client";

import {
  CalendarDays,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

import type { Patient } from "@/types/dashboard";

interface PatientsTableProps {
  patients: Patient[];
  onViewAll: () => void;
}

export default function PatientsTable({
  patients,
  onViewAll,
}: PatientsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-rahati-plum">
            Your patients
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Women with an accepted or completed session.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-rahati-blush"
          >
            <SlidersHorizontal size={14} />
            Filter
          </button>

          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-rahati-mauve-dark hover:bg-rahati-blush"
          >
            View all
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-rahati-blush/70">
              <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Patient
              </th>
              <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Next session
              </th>
              <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                She shares with you
              </th>
              <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Assigned actions
              </th>
              <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Mood trends
              </th>
              <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Details
              </th>
            </tr>
          </thead>

          <tbody>
            {patients.map((patient) => {
              const progress =
                (patient.actionsDone / patient.actionsTotal) * 100;

              return (
                <tr
                  key={patient.id}
                  className="transition-colors hover:bg-[#faf5f9]"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${patient.color}`}
                      >
                        {patient.initials}
                      </div>

                      <div>
                        <p className="whitespace-nowrap text-sm font-medium text-rahati-plum">
                          {patient.name}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Patient #{String(patient.id).padStart(3, "0")}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 whitespace-nowrap text-xs text-rahati-plum">
                      <CalendarDays size={14} className="text-rahati-mauve" />
                      {patient.nextSession}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex max-w-[190px] flex-wrap gap-1.5">
                      {patient.shared.map((item) => (
                        <span
                          key={item}
                          className="rounded-md border border-[#e8dce7] bg-[#faf5f9] px-2 py-1 text-[10px] text-[#80647e]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="w-[130px]">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="font-medium text-rahati-plum">
                          {patient.actionsDone} of {patient.actionsTotal}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(progress)}%
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rahati-pink">
                        <div
                          className="h-full rounded-full bg-rahati-mauve"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium ${
                        patient.mood === "Improving"
                          ? "text-[#66876d]"
                          : patient.mood === "Stable"
                            ? "text-[#806b9a]"
                            : "text-[#b56e72]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          patient.mood === "Improving"
                            ? "bg-[#91aa96]"
                            : patient.mood === "Stable"
                              ? "bg-[#a99bc4]"
                              : "bg-[#d99a9a]"
                        }`}
                      />
                      {patient.mood}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        alert(
                          `Patient details for ${patient.name} will be implemented in the patient details view.`,
                        );
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-rahati-plum transition hover:border-rahati-mauve hover:bg-rahati-pink"
                    >
                      <Eye size={14} />
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-5 py-3.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Showing{" "}
          <span className="font-medium text-rahati-plum">
            {patients.length}
          </span>{" "}
          patients
        </p>
        <p>Patient information shown here is fictional demo data.</p>
      </div>
    </section>
  );
}
