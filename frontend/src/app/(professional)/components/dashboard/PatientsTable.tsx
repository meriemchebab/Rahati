"use client";

import { ChevronRight, Eye, Users } from "lucide-react";
import type { ProfessionalPatient } from "@/lib/professional-api";

interface PatientsTableProps {
  patients: ProfessionalPatient[];
  loading?: boolean;
  onViewAll: () => void;
  onViewPatient?: (id: number) => void;
}

export default function PatientsTable({
  patients,
  loading = false,
  onViewAll,
  onViewPatient,
}: PatientsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
      <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-rahati-plum">
            Your patients
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Women who have shared their information with you.
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-rahati-mauve-dark hover:bg-rahati-blush"
        >
          View all
          <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          Loading patients...
        </p>
      ) : patients.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Users className="mx-auto mb-3 text-rahati-mauve" size={26} />
          <p className="text-sm font-medium text-rahati-plum">
            No patients to display yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Patients who share their information with you will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="bg-rahati-blush/70">
                <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shared information
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned actions
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Details
                </th>
              </tr>
            </thead>

            <tbody>
              {patients.map((patient) => {
                const total = patient.todos.open + patient.todos.done;
                const progress =
                  total > 0 ? (patient.todos.done / total) * 100 : 0;

                const sharedItems = Array.isArray(patient.shared)
                  ? patient.shared
                  : patient.shared
                    ? ["Shared"]
                    : [];

                return (
                  <tr
                    key={patient.id}
                    className="transition-colors hover:bg-rahati-blush/40"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-rahati-plum">
                        {patient.nickname}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Patient #{patient.id}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      {sharedItems.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sharedItems.map((item, index) => (
                            <span
                              key={`${item}-${index}`}
                              className="rounded-md bg-rahati-pink/60 px-2 py-1 text-[10px] text-rahati-mauve-dark"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No shared information
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="w-[130px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-medium text-rahati-plum">
                            {patient.todos.done} of {total}
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

                        {patient.todos.overdue > 0 && (
                          <p className="mt-1 text-[10px] text-[#b56e72]">
                            {patient.todos.overdue} overdue
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewPatient?.(patient.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-rahati-plum transition hover:border-rahati-mauve hover:bg-rahati-pink"
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
      )}

      <div className="border-t border-border px-5 py-3.5 text-xs text-muted-foreground sm:px-6">
        Showing {patients.length} patients
      </div>
    </section>
  );
}
