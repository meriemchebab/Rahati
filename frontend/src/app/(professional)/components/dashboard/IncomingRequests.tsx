"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  UsersRound,
  X,
} from "lucide-react";

import type { PatientRequest, RequestStatus } from "@/types/dashboard";

interface IncomingRequestsProps {
  requests: PatientRequest[];
  onUpdateRequest: (id: number, status: RequestStatus) => void;
  onViewAll: () => void;
}

export default function IncomingRequests({
  requests,
  onUpdateRequest,
  onViewAll,
}: IncomingRequestsProps) {
  const pendingRequests = requests.filter(
    (request) => request.status === "Pending",
  );

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
      <div className="flex items-center justify-between px-5 py-5 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-rahati-plum">
            Incoming requests
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Review appointment requests from women.
          </p>
        </div>

        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-rahati-pink px-2 text-xs font-semibold text-rahati-mauve-dark">
          {pendingRequests.length}
        </span>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {pendingRequests.length === 0 ? (
          <div className="rounded-2xl bg-[#f4f8f3] px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e3eee2] text-[#66876d]">
              <CheckCircle2 size={23} />
            </div>

            <p className="mt-3 text-sm font-semibold text-rahati-plum">
              All caught up!
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              You have no pending requests to review.
            </p>
          </div>
        ) : (
          pendingRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl bg-[#faf5f9] p-4 transition-colors hover:bg-[#f7eef5] sm:p-5"
            >
              {/* Patient information */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${request.color}`}
                >
                  {request.initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-rahati-plum">
                      {request.name}
                    </h4>

                    <span className="rounded-full bg-[#fbf2df] px-2.5 py-1 text-[10px] font-medium text-[#99783e]">
                      Pending
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.age} years old · Requested {request.date}
                  </p>
                </div>
              </div>

              {/* Appointment details */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-rahati-plum">
                  <CalendarDays size={14} className="text-rahati-mauve" />
                  Requested time: {request.time}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 text-xs ${
                    request.returningPatient
                      ? "text-[#806b9a]"
                      : "text-muted-foreground"
                  }`}
                >
                  <UsersRound size={14} />

                  {request.returningPatient
                    ? "Returning patient"
                    : "First session"}
                </span>
              </div>

              {/* Request actions */}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateRequest(request.id, "Accepted")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rahati-mauve px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-rahati-mauve-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rahati-mauve focus-visible:ring-offset-2"
                >
                  <Check size={15} />
                  Accept
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateRequest(request.id, "Declined")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-[#a35e68] transition hover:bg-[#fcf1f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8a8ad] focus-visible:ring-offset-2"
                >
                  <X size={15} />
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rahati-mauve-dark hover:underline"
        >
          View all requests <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}
