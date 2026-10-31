"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";

import type { ProfessionalSession } from "@/lib/professional-api";

interface IncomingRequestsProps {
  requests: ProfessionalSession[];
  updatingSessionId: number | null;
  onUpdateRequest: (id: number, status: "accepted" | "declined") => void;
  onViewAll: () => void;
}

export default function IncomingRequests({
  requests,
  updatingSessionId,
  onUpdateRequest,
  onViewAll,
}: IncomingRequestsProps) {
  const pendingRequests = requests.filter(
    (request) => request.status === "requested",
  );

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl bg-white/90 shadow-[0_4px_24px_rgba(64,53,65,0.04)]">
      <div className="flex items-center justify-between px-5 py-5 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-rahati-plum">
            Incoming requests
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Review appointment requests.
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
          pendingRequests.map((request) => {
            const isUpdating = updatingSessionId === request.id;

            return (
              <div
                key={request.id}
                className="rounded-2xl bg-[#faf5f9] p-4 transition-colors hover:bg-[#f7eef5] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-rahati-plum">
                      Appointment request
                    </h4>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Session #{request.id}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#fbf2df] px-2.5 py-1 text-[10px] font-medium text-[#99783e]">
                    Pending
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="inline-flex items-center gap-2 text-xs text-rahati-plum">
                    <CalendarDays size={14} className="text-rahati-mauve" />
                    {new Date(request.starts_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {new Date(request.starts_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {request.mode === "online" ? "Online" : "In person"}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdateRequest(request.id, "accepted")}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rahati-mauve px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-rahati-mauve-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check size={15} />
                    {isUpdating ? "Updating..." : "Accept"}
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdateRequest(request.id, "declined")}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-[#a35e68] transition hover:bg-[#fcf1f1] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={15} />
                    Decline
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rahati-mauve-dark hover:underline"
        >
          View all requests
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}
