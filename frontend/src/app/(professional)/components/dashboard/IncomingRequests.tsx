"use client";

import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";

import type { PatientRequest, RequestStatus } from "@/types/dashboard";

interface IncomingRequestsProps {
  requests: PatientRequest[];
  onUpdateRequest: (id: number, status: RequestStatus) => void;
  onViewAll: () => void;
}

const statusStyles: Record<RequestStatus, string> = {
  Pending: "bg-[#fbf2df] text-[#99783e]",
  Accepted: "bg-[#eaf3eb] text-[#587a60]",
  Declined: "bg-[#f8e9e9] text-[#a76b6b]",
};

export default function IncomingRequests({
  requests,
  onUpdateRequest,
  onViewAll,
}: IncomingRequestsProps) {
  const pendingRequests = requests.filter(
    (request) => request.status === "Pending",
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-rahati-mauve/10 bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-rahati-mauve/10 px-5 py-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-rahati-plum">
              Incoming requests
            </h2>

            {pendingRequests.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rahati-pink px-1.5 text-[10px] font-semibold text-rahati-plum">
                {pendingRequests.length}
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Review appointment requests from your patients.
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-rahati-mauve-dark transition hover:text-rahati-plum"
        >
          View all
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="divide-y divide-rahati-mauve/10">
        {requests.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rahati-blush text-rahati-mauve-dark">
              <CalendarDays size={20} />
            </span>

            <p className="mt-3 text-[13px] font-medium text-rahati-plum">
              No appointment requests
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              New requests will appear here.
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <article
              key={request.id}
              className="px-5 py-4 transition hover:bg-rahati-blush/20 sm:px-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${request.color}`}
                  >
                    {request.initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[12px] font-semibold text-rahati-plum">
                        {request.name}
                      </h3>

                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-medium ${statusStyles[request.status]}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Age {request.age}
                      {request.returningPatient && " · Returning patient"}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} />
                        {request.date}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} />
                        {request.time}
                      </span>
                    </div>
                  </div>
                </div>

                {request.status === "Pending" ? (
                  <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => onUpdateRequest(request.id, "Declined")}
                      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-rahati-mauve/15 px-3 py-2 text-[10px] font-medium text-muted-foreground transition hover:border-[#e6caca] hover:bg-[#f8e9e9] hover:text-[#a76b6b]"
                    >
                      <X size={13} />
                      Decline
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateRequest(request.id, "Accepted")}
                      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-rahati-mauve px-3 py-2 text-[10px] font-medium text-white transition hover:bg-rahati-mauve-dark"
                    >
                      <Check size={13} />
                      Accept
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    <span>
                      {request.status === "Accepted"
                        ? "Request accepted"
                        : "Request declined"}
                    </span>
                    <ArrowUpRight size={13} />
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
